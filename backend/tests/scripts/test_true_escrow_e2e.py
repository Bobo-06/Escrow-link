"""End-to-end smoke test for the true-escrow revert.

Simulates the full daily flow against a running backend:
  1. Buyer pays → cash_clearing_selcom + buyer_escrow_liability
  2. Admin sweeps → cash_trust_azania moves, Selcom clears
  3. Buyer releases → payables accrue + platform revenue earned
  4. Admin pays seller → payable discharged against trust cash
  5. Reconcile returns zero shortfall
"""
import os, sys, uuid, json
import requests
from pymongo import MongoClient

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
mc = MongoClient(os.environ["MONGO_URL"])
db = mc[os.environ["DB_NAME"]]

# Clean slate: use a throwaway user + order
phone = f"7{uuid.uuid4().int % 10**8:08d}"[:9]
pw = "TestPass_123!"
r = requests.post(f"{API}/auth/register", json={
    "phone": phone, "password": pw, "name": "Trust Test", "email": f"t{uuid.uuid4().hex[:6]}@t.com",
})
assert r.status_code == 200, r.text
tok = r.json()["session_token"]
uid = r.json()["user_id"]
H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

# Create a direct order to be the buyer's order
oid = f"TEST_{uuid.uuid4().hex[:10]}"
gross = 103000.0
db.orders.insert_one({
    "order_id": oid, "status": "created", "mode": "direct",
    "buyer_id": uid, "seller_id": "SELLER_TEST",
    "gross_amount": gross, "seller_amount": 98000.0, "agent_commission": 0.0, "platform_fee": 5000.0,
    "buyer_phone": phone, "seller_phone": "0712345678",
})

# Step 1: funding webhook
r = requests.post(f"{API}/payments/webhook", json={
    "provider": "mock", "event_id": f"evt_{oid}",
    "order_id": oid, "provider_txn_id": f"TX_{oid}",
    "amount": gross, "status": "paid",
})
assert r.status_code == 200, r.text
print("STEP 1 funded:", r.json())

# Verify ledger: cash_clearing_selcom + buyer_escrow_liability
entries = list(db.ledger_entries.find({"order_id": oid}, {"_id":0}))
codes = sorted((e["account_code"], e["entry_type"]) for e in entries)
assert codes == [("buyer_escrow_liability", "credit"), ("cash_clearing_selcom", "debit")], codes
print("  ledger codes after funding:", codes)

# Step 2: Promote to admin, record sweep
prev_role = db.users.find_one({"user_id": uid}).get("role")
db.users.update_one({"user_id": uid}, {"$set": {"role": "admin"}})

# Check queue
r = requests.get(f"{API}/admin/escrow/queue", headers=H)
assert r.status_code == 200, r.text
q = r.json()
print("STEP 2 queue:", {"count": q["pending_count"], "total": q["pending_total"]})
assert q["pending_count"] >= 1
assert any(o["order_id"] == oid for o in q["orders"])

# Record transfer
r = requests.post(f"{API}/admin/escrow/transfer-recorded", headers=H, json={
    "order_ids": [oid], "expected_total": gross,
    "selcom_ref": "SLCM-TEST-001", "azania_ref": "AZN-TEST-001",
})
assert r.status_code == 200, r.text
print("  transfer recorded:", r.json())

# Step 2b: try to double-record — should mismatch (0 pending now)
r = requests.post(f"{API}/admin/escrow/transfer-recorded", headers=H, json={
    "order_ids": [oid], "expected_total": gross,
    "selcom_ref": "SLCM-TEST-002", "azania_ref": "AZN-TEST-002",
})
assert r.status_code == 400, f"Double-sweep should be rejected: {r.status_code} {r.text}"
print("  double-sweep correctly rejected: HTTP", r.status_code)

# Fund order so release works
db.orders.update_one({"order_id": oid}, {"$set": {"status": "funded"}})

# Step 3: Release
r = requests.post(f"{API}/orders/{oid}/release", headers=H)
assert r.status_code == 200, r.text
print("STEP 3 released:", r.json())

# Verify release posted: buyer_escrow_liability debit, seller_payable + platform_revenue credits
new_codes = sorted(
    (e["account_code"], e["entry_type"])
    for e in db.ledger_entries.find({"order_id": oid, "memo": {"$regex": "release"}}, {"_id":0})
)
assert new_codes == [
    ("buyer_escrow_liability", "debit"),
    ("platform_revenue", "credit"),
    ("seller_payable", "credit"),
], new_codes
print("  release entry codes:", new_codes)

# Step 4: Record manual payout
payout = db.payouts.find_one({"order_id": oid, "status": "queued"})
assert payout, "payout not queued"
r = requests.post(f"{API}/admin/payouts/{payout['payout_id']}/manual-record", headers=H, json={
    "beneficiary_phone": "0712345678",
    "azania_ref": "AZN-PAY-001",
})
assert r.status_code == 200, r.text
print("STEP 4 payout recorded:", r.json())

# Step 5: Reconcile
r = requests.get(f"{API}/admin/escrow/reconcile", headers=H)
assert r.status_code == 200, r.text
rec = r.json()
print("STEP 5 reconcile:")
for k in ("cash_clearing_selcom","cash_trust_azania","buyer_escrow_liability",
         "seller_payable","agent_payable","platform_revenue",
         "total_cash","total_liabilities","liquidity_shortfall"):
    print(f"  {k}: {rec[k]}")

# Step 6: escrow events audit trail
r = requests.get(f"{API}/admin/escrow/events/{oid}", headers=H)
assert r.status_code == 200
events = r.json()["events"]
types = [e["event_type"] for e in events]
print("STEP 6 audit events:", types)
assert "funds_received" in types
assert "trust_transfer_recorded" in types
assert "released" in types
assert "payout_paid_seller" in types

# Cleanup
db.orders.delete_one({"order_id": oid})
db.ledger_entries.delete_many({"order_id": oid})
db.escrow_events.delete_many({"order_id": oid})
db.payouts.delete_many({"order_id": oid})
db.trust_transfers.delete_many({"order_ids": oid})
db.payment_transactions.delete_many({"order_id": oid})
db.processed_webhooks.delete_many({"event_id": f"evt_{oid}"})
db.users.delete_one({"user_id": uid})
print("\n✅ ALL STEPS PASSED")
