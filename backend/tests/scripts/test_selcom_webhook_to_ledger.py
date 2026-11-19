"""Simulates a Selcom webhook identical to what a real bank payment will produce.
Verifies the entire ledger chain fires correctly, is idempotent, and that the
new trace endpoint returns the expected forensic data."""
import os, uuid, hmac, hashlib, base64, json
from datetime import datetime, timezone
import requests
from pymongo import MongoClient

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
mc = MongoClient(os.environ["MONGO_URL"])
db = mc[os.environ["DB_NAME"]]

# ─── Setup: create an admin user + a direct order in 'created' state
phone = f"7{uuid.uuid4().int % 10**8:08d}"[:9]
r = requests.post(f"{API}/auth/register", json={
    "phone": phone, "password": "TestPass_123!", "name": "Webhook Probe",
    "email": f"wp{uuid.uuid4().hex[:6]}@t.com",
})
assert r.status_code == 200, r.text
tok = r.json()["session_token"]; uid = r.json()["user_id"]
H = {"Authorization": f"Bearer {tok}"}
db.users.update_one({"user_id": uid}, {"$set": {"role": "admin"}})

oid = f"PROBE_{uuid.uuid4().hex[:10]}"
gross = 5000.0
db.orders.insert_one({
    "order_id": oid, "status": "pending_payment", "mode": "direct",
    "buyer_id": uid, "seller_id": "SELLER_PROBE",
    "gross_amount": gross, "seller_amount": 4800.0, "agent_commission": 0.0, "platform_fee": 200.0,
    "buyer_phone": f"255{phone}", "seller_phone": "0712345678",
})

try:
    # ─── Build a realistic Selcom webhook body + valid HMAC signature
    secret = os.environ["SELCOM_SECRET"]
    api_key = os.environ["SELCOM_API_KEY"]
    transid = f"BANK_{uuid.uuid4().hex[:10].upper()}"
    # EAT timestamp
    from zoneinfo import ZoneInfo
    eat = ZoneInfo("Africa/Dar_es_Salaam")
    ts = datetime.now(eat).strftime("%Y-%m-%dT%H:%M:%S%z")
    ts = ts[:-2] + ":" + ts[-2:]
    body = {
        "transid": transid,
        "order_id": oid,
        "reference": f"SEL{uuid.uuid4().hex[:8].upper()}",
        "result": "SUCCESS",
        "resultcode": "000",
        "payment_status": "COMPLETED",
        "amount": int(gross),
        "payment_method": "BANK",   # simulating a BANK channel (real bank tab payment)
        "channel": "CRDB",
    }
    # Sign: timestamp=<ts>&field1=<v1>&...
    fields = ["transid","order_id","reference","result","resultcode","payment_status"]
    parts = [f"timestamp={ts}"] + [f"{f}={body[f]}" for f in fields]
    sig_str = "&".join(parts)
    digest = base64.b64encode(
        hmac.new(secret.encode(), sig_str.encode(), hashlib.sha256).digest()
    ).decode()
    auth = "SELCOM " + base64.b64encode(api_key.encode()).decode()
    webhook_headers = {
        "Content-Type": "application/json",
        "Authorization": auth,
        "Digest-Method": "HS256",
        "Digest": digest,
        "Timestamp": ts,
        "Signed-Fields": ",".join(fields),
    }

    # ─── Fire the webhook
    r = requests.post(f"{API}/payments/selcom/webhook", headers=webhook_headers, json=body, timeout=15)
    print("Webhook 1st delivery:", r.status_code, r.json())
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True
    assert r.json().get("duplicate") is not True

    # ─── Verify order moved to 'paid'
    o = db.orders.find_one({"order_id": oid})
    assert o["status"] == "paid", o
    assert o["selcom_tx_id"] == transid
    print("✓ Order status: paid, selcom_tx_id captured")

    # ─── Verify ledger: cash_clearing_selcom debit + buyer_escrow_liability credit
    entries = list(db.ledger_entries.find({"order_id": oid}, {"_id": 0}))
    codes = sorted((e["account_code"], e["entry_type"]) for e in entries)
    expected = [("buyer_escrow_liability", "credit"), ("cash_clearing_selcom", "debit")]
    assert codes == expected, f"Got {codes}, expected {expected}"
    debit_total = sum(e["amount"] for e in entries if e["entry_type"] == "debit")
    assert debit_total == gross, f"debit total {debit_total} != gross {gross}"
    print(f"✓ Ledger entries: cash_clearing_selcom DR {gross} / buyer_escrow_liability CR {gross}")

    # ─── Verify escrow_events has funds_received
    events = list(db.escrow_events.find({"order_id": oid}, {"_id": 0}))
    types = [e["event_type"] for e in events]
    assert "funds_received" in types, types
    print(f"✓ Escrow events written: {types}")

    # ─── Idempotency: fire the SAME webhook again → should be no-op
    r2 = requests.post(f"{API}/payments/selcom/webhook", headers=webhook_headers, json=body, timeout=15)
    print("Webhook 2nd delivery (retry):", r2.status_code, r2.json())
    assert r2.status_code == 200
    assert r2.json().get("duplicate") is True
    entries2 = list(db.ledger_entries.find({"order_id": oid}, {"_id": 0}))
    assert len(entries2) == 2, f"Duplicate webhook created extra ledger entries: {len(entries2)}"
    print("✓ Duplicate webhook correctly ignored (still 2 ledger entries)")

    # ─── Hit the new /admin/escrow/trace endpoint
    tr = requests.get(f"{API}/admin/escrow/trace/{oid}", headers=H, timeout=15)
    assert tr.status_code == 200, tr.text
    trace = tr.json()
    print("✓ /admin/escrow/trace returns:")
    print(f"    order_status={trace['summary']['order_status']}")
    print(f"    ledger_entry_count={trace['summary']['ledger_entry_count']}")
    print(f"    event_count={trace['summary']['event_count']}")
    print(f"    txn_count={trace['summary']['txn_count']}")
    print(f"    webhook_seen={trace['summary']['webhook_seen']}")
    assert trace["summary"]["order_status"] == "paid"
    assert trace["summary"]["ledger_entry_count"] == 2
    assert trace["summary"]["event_count"] >= 1
    assert trace["summary"]["webhook_seen"] is True

    print("\n✅ WEBHOOK → LEDGER chain is wired correctly for live bank payments")
finally:
    db.users.delete_one({"user_id": uid})
    db.orders.delete_many({"order_id": {"$regex": "^PROBE_"}})
    db.ledger_entries.delete_many({"order_id": {"$regex": "^PROBE_"}})
    db.escrow_events.delete_many({"order_id": {"$regex": "^PROBE_"}})
    db.payment_transactions.delete_many({"order_id": {"$regex": "^PROBE_"}})
    db.processed_webhooks.delete_many({"event_id": {"$regex": "^BANK_"}})
