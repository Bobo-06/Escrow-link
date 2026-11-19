"""Test Selcom disburse endpoints — simulated path (no PIN configured)."""
import os, sys, uuid, json
import requests
from pymongo import MongoClient

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
mc = MongoClient(os.environ["MONGO_URL"])
db = mc[os.environ["DB_NAME"]]

# Create admin-grade user
phone = f"7{uuid.uuid4().int % 10**8:08d}"[:9]
r = requests.post(f"{API}/auth/register", json={
    "phone": phone, "password": "TestPass_123!", "name": "Disb Test",
    "email": f"d{uuid.uuid4().hex[:6]}@t.com",
})
assert r.status_code == 200, r.text
tok = r.json()["session_token"]; uid = r.json()["user_id"]
H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
prev_role = db.users.find_one({"user_id": uid}).get("role")
db.users.update_one({"user_id": uid}, {"$set": {"role": "admin"}})

try:
    # Create a seeded payout in queued state
    pid = f"pay_test_{uuid.uuid4().hex[:8]}"
    oid = f"TEST_DISB_{uuid.uuid4().hex[:8]}"
    db.orders.insert_one({
        "order_id": oid, "status": "settled", "mode": "direct",
        "buyer_id": uid, "seller_id": "SELLER_TEST",
        "gross_amount": 10000.0, "seller_amount": 9800.0, "agent_commission": 0.0, "platform_fee": 200.0,
    })
    # Need a buyer-liability credit for the balance invariant on payout
    db.ledger_entries.insert_many([
        {"entry_id": "led_t1", "order_id": oid, "account_code": "cash_trust_azania",
         "entry_type": "debit", "amount": 9800.0, "memo": "seed", "created_at": __import__("datetime").datetime.utcnow()},
        {"entry_id": "led_t2", "order_id": oid, "account_code": "seller_payable",
         "entry_type": "credit", "amount": 9800.0, "memo": "seed", "created_at": __import__("datetime").datetime.utcnow()},
    ])
    db.payouts.insert_one({
        "payout_id": pid, "order_id": oid,
        "beneficiary_user_id": "SELLER_TEST", "beneficiary_role": "seller",
        "amount": 9800.0, "destination": "255712345678",
        "status": "queued", "provider": "mock",
        "created_at": __import__("datetime").datetime.utcnow(),
        "updated_at": __import__("datetime").datetime.utcnow(),
    })

    # Test 1: disburse-via-selcom (simulated — PIN unset)
    r = requests.post(f"{API}/admin/payouts/{pid}/disburse-via-selcom", headers=H, json={"network":"auto"})
    print("Test 1 disburse-via-selcom (simulated):", r.status_code, r.json())
    assert r.status_code == 200, r.text
    assert r.json()["configured"] is False, "Expected configured=False with no SELCOM_PIN"
    assert r.json()["status"] in {"disbursing", "pending"}, r.json()
    print("  → status flipped to disbursing (as expected with simulated response)")

    # Test 2: duplicate disburse should 409
    r2 = requests.post(f"{API}/admin/payouts/{pid}/disburse-via-selcom", headers=H, json={"network":"auto"})
    print("Test 2 duplicate disburse:", r2.status_code, r2.json().get("detail", ""))
    assert r2.status_code == 400, f"Expected 400 (not queued): got {r2.status_code}"

    # Test 3: poll status
    r3 = requests.post(f"{API}/admin/payouts/{pid}/selcom-status", headers=H)
    print("Test 3 poll status:", r3.status_code, r3.json())
    assert r3.status_code == 200, r3.text

    # Test 4: non-admin blocked
    db.users.update_one({"user_id": uid}, {"$unset": {"role": ""}})
    r4 = requests.post(f"{API}/admin/payouts/{pid}/disburse-via-selcom", headers=H, json={"network":"auto"})
    print("Test 4 non-admin blocked:", r4.status_code)
    assert r4.status_code == 403, r4.text

    print("\n✅ Selcom disburse endpoints OK (simulated path)")
finally:
    if prev_role is None:
        db.users.update_one({"user_id": uid}, {"$unset": {"role": ""}})
    else:
        db.users.update_one({"user_id": uid}, {"$set": {"role": prev_role}})
    db.users.delete_one({"user_id": uid})
    db.orders.delete_many({"order_id": {"$regex": "^TEST_DISB_"}})
    db.ledger_entries.delete_many({"order_id": {"$regex": "^TEST_DISB_"}})
    db.payouts.delete_many({"payout_id": {"$regex": "^pay_test_"}})
