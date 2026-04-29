"""
Iter10 — Financial Ledger HTTP API tests
Covers: chart of accounts, fee quote, webhook→fund→release→payout flow,
disputes (open/resolve/agree), and authorization edges.
"""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "biz_salama_db")

TEST_PHONE = "+255712345678"
TEST_PASS = "test1234"


# ─── Fixtures ─────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def mongo():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="session")
def session_token():
    r = requests.post(f"{API}/auth/login", json={"phone": TEST_PHONE, "password": TEST_PASS}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text[:200]}")
    return r.json()["session_token"]


@pytest.fixture(scope="session")
def user_id(session_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {session_token}"}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["user_id"]


@pytest.fixture
def auth_headers(session_token):
    return {"Authorization": f"Bearer {session_token}", "Content-Type": "application/json"}


# ─── Chart of accounts ────────────────────────────────────────────────────
def test_ledger_accounts_returns_5_seeded():
    r = requests.get(f"{API}/ledger/accounts", timeout=15)
    assert r.status_code == 200, r.text
    accounts = r.json()["accounts"]
    codes = {a["code"] for a in accounts}
    assert codes == {"cash_clearing", "escrow_liability", "seller_payable", "agent_payable", "platform_revenue"}


# ─── Fee quote ────────────────────────────────────────────────────────────
def test_quote_direct_invariant():
    r = requests.post(f"{API}/ledger/quote", json={"mode": "direct", "deal_value": 100000}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["gross_amount"] == 103000
    assert d["seller_amount"] == 98000
    assert d["agent_commission"] == 0
    assert d["platform_fee"] == 5000
    assert d["seller_amount"] + d["agent_commission"] + d["platform_fee"] == d["gross_amount"]


def test_quote_three_party_invariant():
    r = requests.post(
        f"{API}/ledger/quote",
        json={"mode": "three_party", "deal_value": 100000, "supplier_cost": 80000},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["gross_amount"] == 103000
    assert d["seller_amount"] == 78400
    assert d["agent_commission"] == 19600
    assert d["platform_fee"] == 5000
    assert d["seller_amount"] + d["agent_commission"] + d["platform_fee"] == d["gross_amount"]


@pytest.mark.parametrize("payload", [
    {"mode": "weird", "deal_value": 100000},
    {"mode": "direct", "deal_value": -50},
    {"mode": "three_party", "deal_value": 100000, "supplier_cost": 100000},
    {"mode": "three_party", "deal_value": 100000},  # missing supplier_cost
])
def test_quote_invalid_inputs_return_400(payload):
    r = requests.post(f"{API}/ledger/quote", json=payload, timeout=15)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"


# ─── End-to-end: webhook → fund → release → payout ────────────────────────
@pytest.fixture
def funded_order(mongo, user_id):
    """Insert a direct-mode order for the test buyer; returns the order doc."""
    quote = requests.post(f"{API}/ledger/quote", json={"mode": "direct", "deal_value": 100000}, timeout=15).json()
    order_id = f"TEST_ord_{uuid.uuid4().hex[:10]}"
    seller_id = f"TEST_seller_{uuid.uuid4().hex[:8]}"
    doc = {
        "order_id": order_id,
        "buyer_id": user_id,
        "seller_id": seller_id,
        "seller_phone": "+255700000001",
        "mode": "direct",
        "status": "created",
        "gross_amount": quote["gross_amount"],
        "seller_amount": quote["seller_amount"],
        "agent_commission": quote["agent_commission"],
        "platform_fee": quote["platform_fee"],
        "payout_provider": "mock",
    }
    mongo.orders.insert_one(doc)
    yield doc
    # Cleanup
    mongo.orders.delete_one({"order_id": order_id})
    mongo.ledger_entries.delete_many({"order_id": order_id})
    mongo.payouts.delete_many({"order_id": order_id})
    mongo.payment_transactions.delete_many({"order_id": order_id})
    mongo.processed_webhooks.delete_many({"event_id": {"$regex": f"^evt_{order_id}"}})
    mongo.disputes.delete_many({"order_id": order_id})


def test_webhook_funds_order_and_is_idempotent(mongo, funded_order, auth_headers):
    order_id = funded_order["order_id"]
    event_id = f"evt_{order_id}_1"
    payload = {
        "provider": "mock", "event_id": event_id, "order_id": order_id,
        "provider_txn_id": f"TX_{order_id}", "amount": funded_order["gross_amount"], "status": "paid",
    }
    r = requests.post(f"{API}/payments/webhook", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True, "duplicate": False}

    # Order flipped to funded
    o = mongo.orders.find_one({"order_id": order_id})
    assert o["status"] == "funded"

    # Ledger has 2 entries, balanced
    fin_r = requests.get(f"{API}/ledger/order/{order_id}", headers=auth_headers, timeout=15)
    assert fin_r.status_code == 200, fin_r.text
    fin = fin_r.json()
    assert len(fin["entries"]) == 2
    assert fin["ledger_position"]["debit"] == fin["ledger_position"]["credit"] == funded_order["gross_amount"]

    # Replay → duplicate
    r2 = requests.post(f"{API}/payments/webhook", json=payload, timeout=15)
    assert r2.status_code == 200
    assert r2.json() == {"ok": True, "duplicate": True}
    fin2 = requests.get(f"{API}/ledger/order/{order_id}", headers=auth_headers, timeout=15).json()
    assert len(fin2["entries"]) == 2  # unchanged


def test_webhook_amount_mismatch_400(mongo, funded_order):
    order_id = funded_order["order_id"]
    payload = {
        "provider": "mock", "event_id": f"evt_{order_id}_bad",
        "order_id": order_id, "provider_txn_id": "TX_BAD",
        "amount": 1.0, "status": "paid",
    }
    r = requests.post(f"{API}/payments/webhook", json=payload, timeout=15)
    assert r.status_code == 400, r.text


def test_release_buyer_only_and_balanced(mongo, funded_order, auth_headers, user_id):
    order_id = funded_order["order_id"]
    # Fund first
    requests.post(f"{API}/payments/webhook", json={
        "provider": "mock", "event_id": f"evt_{order_id}_fund",
        "order_id": order_id, "provider_txn_id": f"TX_{order_id}",
        "amount": funded_order["gross_amount"], "status": "paid",
    }, timeout=15)

    # Release as buyer → 200
    r = requests.post(f"{API}/orders/{order_id}/release", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["payouts_queued"] >= 1

    fin = requests.get(f"{API}/ledger/order/{order_id}", headers=auth_headers, timeout=15).json()
    # 2 fund + 3 release (escrow debit, seller credit, platform credit) = 5 (no agent for direct)
    assert len(fin["entries"]) == 5
    assert fin["ledger_position"]["debit"] == fin["ledger_position"]["credit"]

    # Re-release on settled order → 400
    r2 = requests.post(f"{API}/orders/{order_id}/release", headers=auth_headers, timeout=15)
    assert r2.status_code == 400


def test_release_non_buyer_403(mongo, funded_order, auth_headers):
    order_id = funded_order["order_id"]
    requests.post(f"{API}/payments/webhook", json={
        "provider": "mock", "event_id": f"evt_{order_id}_fund2",
        "order_id": order_id, "provider_txn_id": f"TX_{order_id}_2",
        "amount": funded_order["gross_amount"], "status": "paid",
    }, timeout=15)
    # Flip buyer_id to someone else
    mongo.orders.update_one({"order_id": order_id}, {"$set": {"buyer_id": "someone_else"}})
    r = requests.post(f"{API}/orders/{order_id}/release", headers=auth_headers, timeout=15)
    assert r.status_code == 403, r.text


def test_release_non_funded_400(mongo, funded_order, auth_headers):
    # Order is in 'created' state (no webhook fired)
    r = requests.post(f"{API}/orders/{funded_order['order_id']}/release", headers=auth_headers, timeout=15)
    assert r.status_code == 400


# ─── Payouts ──────────────────────────────────────────────────────────────
def test_payouts_list_non_admin_scoped(auth_headers):
    r = requests.get(f"{API}/payouts", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "payouts" in data and "count" in data


def test_payout_disburse_non_admin_403(mongo, auth_headers):
    # Insert a fake queued payout — non-admin call should still 403 even if found.
    pid = f"TEST_pay_{uuid.uuid4().hex[:8]}"
    mongo.payouts.insert_one({
        "payout_id": pid, "order_id": "TEST_FAKE", "beneficiary_user_id": "x",
        "beneficiary_role": "seller", "amount": 100.0, "status": "queued",
    })
    try:
        r = requests.post(f"{API}/payouts/{pid}/disburse", headers=auth_headers, timeout=15)
        assert r.status_code == 403, r.text
    finally:
        mongo.payouts.delete_one({"payout_id": pid})


def test_payout_disburse_admin_path(mongo, user_id, funded_order, auth_headers):
    """Promote user to admin temporarily, exercise disburse, revert."""
    order_id = funded_order["order_id"]
    # Fund + release to create a queued payout
    requests.post(f"{API}/payments/webhook", json={
        "provider": "mock", "event_id": f"evt_{order_id}_admfund",
        "order_id": order_id, "provider_txn_id": f"TX_{order_id}_a",
        "amount": funded_order["gross_amount"], "status": "paid",
    }, timeout=15)
    rel = requests.post(f"{API}/orders/{order_id}/release", headers=auth_headers, timeout=15)
    assert rel.status_code == 200, rel.text

    payout = mongo.payouts.find_one({"order_id": order_id, "status": "queued"})
    assert payout, "no queued payout found"

    prev_role = mongo.users.find_one({"user_id": user_id}, {"role": 1}).get("role")
    mongo.users.update_one({"user_id": user_id}, {"$set": {"role": "admin"}})
    try:
        r = requests.post(f"{API}/payouts/{payout['payout_id']}/disburse", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["provider_ref"].startswith("MOCK_")

        after = mongo.payouts.find_one({"payout_id": payout["payout_id"]})
        assert after["status"] == "paid"

        fin = requests.get(f"{API}/ledger/order/{order_id}", headers=auth_headers, timeout=15).json()
        assert fin["ledger_position"]["debit"] == fin["ledger_position"]["credit"]
    finally:
        if prev_role is None:
            mongo.users.update_one({"user_id": user_id}, {"$unset": {"role": ""}})
        else:
            mongo.users.update_one({"user_id": user_id}, {"$set": {"role": prev_role}})


# ─── Disputes ─────────────────────────────────────────────────────────────
def test_dispute_lifecycle_open_and_resolve_admin(mongo, user_id, funded_order, auth_headers):
    order_id = funded_order["order_id"]
    requests.post(f"{API}/payments/webhook", json={
        "provider": "mock", "event_id": f"evt_{order_id}_dfund",
        "order_id": order_id, "provider_txn_id": f"TX_{order_id}_d",
        "amount": funded_order["gross_amount"], "status": "paid",
    }, timeout=15)

    # Open dispute
    r = requests.post(f"{API}/disputes", headers=auth_headers,
                      json={"order_id": order_id, "reason": "Item not as described"}, timeout=15)
    assert r.status_code == 200, r.text
    dispute_id = r.json()["dispute_id"]

    # Order now disputed
    o = mongo.orders.find_one({"order_id": order_id})
    assert o["status"] == "dispute"
    d = mongo.disputes.find_one({"dispute_id": dispute_id})
    assert d["auto_resolve_at"] is not None

    # Cannot open second
    r2 = requests.post(f"{API}/disputes", headers=auth_headers,
                       json={"order_id": order_id, "reason": "again"}, timeout=15)
    assert r2.status_code == 400

    # Promote to admin → resolve refund_to_buyer
    prev = mongo.users.find_one({"user_id": user_id}, {"role": 1}).get("role")
    mongo.users.update_one({"user_id": user_id}, {"$set": {"role": "admin"}})
    try:
        rr = requests.post(f"{API}/disputes/{dispute_id}/resolve", headers=auth_headers,
                           json={"resolution": "refund_to_buyer", "resolution_note": "buyer wins"}, timeout=15)
        assert rr.status_code == 200, rr.text
        oo = mongo.orders.find_one({"order_id": order_id})
        assert oo["status"] == "refunded"
        fin = requests.get(f"{API}/ledger/order/{order_id}", headers=auth_headers, timeout=15).json()
        assert fin["ledger_position"]["debit"] == fin["ledger_position"]["credit"]
    finally:
        if prev is None:
            mongo.users.update_one({"user_id": user_id}, {"$unset": {"role": ""}})
        else:
            mongo.users.update_one({"user_id": user_id}, {"$set": {"role": prev}})


def test_dispute_mutual_agree(mongo, user_id, funded_order, auth_headers):
    order_id = funded_order["order_id"]
    # Set buyer + seller both = test user so both agreements use the same auth
    mongo.orders.update_one({"order_id": order_id}, {"$set": {"seller_id": user_id}})

    requests.post(f"{API}/payments/webhook", json={
        "provider": "mock", "event_id": f"evt_{order_id}_mfund",
        "order_id": order_id, "provider_txn_id": f"TX_{order_id}_m",
        "amount": funded_order["gross_amount"], "status": "paid",
    }, timeout=15)

    r = requests.post(f"{API}/disputes", headers=auth_headers,
                      json={"order_id": order_id, "reason": "mutual test"}, timeout=15)
    dispute_id = r.json()["dispute_id"]

    # Buyer agrees release_to_seller
    a1 = requests.post(f"{API}/disputes/{dispute_id}/agree", headers=auth_headers,
                       json={"role": "buyer", "decision": "release_to_seller"}, timeout=15)
    assert a1.status_code == 200, a1.text
    assert a1.json().get("status") == "open"

    # Seller agrees same → mutual finalize
    a2 = requests.post(f"{API}/disputes/{dispute_id}/agree", headers=auth_headers,
                       json={"role": "seller", "decision": "release_to_seller"}, timeout=15)
    assert a2.status_code == 200, a2.text
    assert a2.json().get("resolved_by") == "mutual"

    o = mongo.orders.find_one({"order_id": order_id})
    assert o["status"] == "settled"


def test_disputes_list_non_admin_scoped(auth_headers):
    r = requests.get(f"{API}/disputes", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    assert "disputes" in r.json()


# ─── Regression: Iter5/6/8 sanity ─────────────────────────────────────────
def test_regression_login_phone_formats():
    for fmt in ["+255712345678", "255712345678", "0712345678", "712345678"]:
        r = requests.post(f"{API}/auth/login", json={"phone": fmt, "password": TEST_PASS}, timeout=15)
        assert r.status_code == 200, f"{fmt}: {r.status_code} {r.text}"


def test_regression_sellers_trending():
    r = requests.get(f"{API}/sellers/trending", timeout=15)
    assert r.status_code == 200
    assert "sellers" in r.json() or isinstance(r.json(), list)


def test_regression_products_public():
    r = requests.get(f"{API}/products/public", timeout=15)
    assert r.status_code == 200


def test_regression_watches_list(auth_headers):
    """Just sanity-check list endpoint; full CRUD already covered by test_iter6_watches.py."""
    r = requests.get(f"{API}/watches", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
