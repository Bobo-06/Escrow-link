"""Biz-Salama end-to-end backend tests (iteration 1).

Covers:
- Phone normalization login matrix (5 formats)
- Register + login with new phone (different format)
- Wrong password 401
- /og-image.png SEO asset
- Three-party escrow: create, public verify (minimal), supplier view, buyer view
- Counter-offer transition → counter_offered
- Edit tx → resets to pending_approval + recomputed split
- Accept tx → approval_snapshot contains ONLY supplier-side data
- Fee invariant at buyer_price=1,850,000 / supplier_cost=1,650,000
"""
import os
import time
import uuid
import random
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PRIMARY_PHONE = "+255712345678"
PRIMARY_PWD = "test1234"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ========== AUTH / PHONE NORMALIZATION ==========

@pytest.mark.parametrize("phone_format", [
    "+255712345678",
    "255712345678",
    "0712345678",
    "712345678",
    "+255 712 345 678",
])
def test_login_phone_format_matrix(session, phone_format):
    """All 5 TZ phone formats must authenticate the same user."""
    r = session.post(f"{API}/auth/login", json={"phone": phone_format, "password": PRIMARY_PWD})
    assert r.status_code == 200, f"Format {phone_format!r} failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    assert "session_token" in data
    assert data["phone"] == PRIMARY_PHONE, f"Phone not normalized: got {data['phone']}"


def test_login_wrong_password(session):
    r = session.post(f"{API}/auth/login", json={"phone": PRIMARY_PHONE, "password": "wrong_pw_xxx"})
    assert r.status_code == 401


def test_register_and_relogin_different_format(session):
    """Register with one format, login with a different format."""
    suffix = str(random.randint(10000000, 99999999))
    raw_phone = f"0799{suffix[:6]}"  # 10-digit national
    canonical = f"+255799{suffix[:6]}"
    pwd = "Demo1234!"
    reg = session.post(f"{API}/auth/register", json={
        "phone": raw_phone,
        "password": pwd,
        "name": f"TEST_{suffix}",
    })
    assert reg.status_code == 200, f"Register failed: {reg.status_code} {reg.text[:200]}"
    rdata = reg.json()
    assert rdata["phone"] == canonical, f"Register didn't normalize phone: {rdata['phone']}"

    # Login with E.164
    alt = f"+255 799 {suffix[:3]} {suffix[3:6]}"
    r = session.post(f"{API}/auth/login", json={"phone": alt, "password": pwd})
    assert r.status_code == 200, f"Relogin in different format failed: {r.text[:200]}"
    assert r.json()["phone"] == canonical


# ========== SEO / STATIC ==========

def test_og_image_served():
    r = requests.get(f"{BASE_URL}/og-image.png", timeout=15)
    assert r.status_code == 200
    ctype = r.headers.get("content-type", "")
    assert "image" in ctype, f"Expected image content-type, got {ctype}"
    assert len(r.content) > 1000, "og-image should be non-trivial PNG"


# ========== 3-PARTY ESCROW ==========

@pytest.fixture(scope="module")
def hawker_token(session):
    """Register a fresh hawker and return session_token."""
    suffix = str(random.randint(10000000, 99999999))
    pwd = "Demo1234!"
    r = session.post(f"{API}/auth/register", json={
        "phone": f"+2557881{suffix[:5]}",
        "password": pwd,
        "name": f"TEST_Hawker_{suffix}",
    })
    assert r.status_code == 200, r.text
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def three_party_tx(session, hawker_token):
    """Create a fresh 3-party tx with the exact fee-invariant numbers."""
    suffix = str(random.randint(10000000, 99999999))
    supplier_phone = f"+2557552{suffix[:5]}"
    body = {
        "supplier_phone": supplier_phone,
        "supplier_name": "TEST Supplier",
        "supplier_location": "Kariakoo",
        "supplier_cost": 1650000,
        "buyer_price": 1850000,
        "item_name": "TEST Samsung S24",
        "item_description": "Sealed unit",
        "item_condition": "new",
        "notes": "tx-test",
        "quantity": 1,
    }
    r = session.post(
        f"{API}/escrow/three-party/create",
        json=body,
        headers={"Authorization": f"Bearer {hawker_token}"},
    )
    assert r.status_code == 200, f"Create 3P failed: {r.status_code} {r.text[:300]}"
    d = r.json()
    return {
        "tx_id": d["tx_id"],
        "supplier_token": d["supplier_token"],
        "hawker_token_hmac": d["hawker_token"],
        "supplier_phone": supplier_phone,
    }


def test_public_verify_minimal_view(three_party_tx):
    """No token → PUBLIC view. No supplier_cost, no supplier_name, no commission, no fees, no hawker_name."""
    tx_id = three_party_tx["tx_id"]
    r = requests.get(f"{API}/escrow/verify/{tx_id}", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("view") == "public"
    leaked = [k for k in (
        "supplier_cost", "supplier_name", "supplier_phone", "commission",
        "buyer_fee", "platform_fee", "supplier_payout", "supply_fee",
        "hawker_commission_visible", "hawker_name"
    ) if k in data]
    assert not leaked, f"Public view leaked private fields: {leaked}"


def test_supplier_verify_view(three_party_tx):
    tx_id = three_party_tx["tx_id"]
    tok = three_party_tx["supplier_token"]
    r = requests.get(f"{API}/escrow/verify/{tx_id}?token={tok}&role=supplier", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("view") == "supplier"
    # MUST have
    for f in ("supplier_cost", "supplier_payout", "supply_fee", "hawker_commission_visible", "supplier_name", "hawker_name"):
        assert f in data and data[f] is not None, f"Supplier view missing {f}"
    # MUST NOT have
    for f in ("buyer_fee", "platform_fee", "commission"):
        assert f not in data, f"Supplier view leaked {f}"


def test_buyer_verify_view(three_party_tx):
    tx_id = three_party_tx["tx_id"]
    tok = three_party_tx["hawker_token_hmac"]
    r = requests.get(f"{API}/escrow/verify/{tx_id}?token={tok}&role=buyer", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("view") == "buyer"
    for f in ("buyer_price", "buyer_fee", "seller_name"):
        assert f in data and data[f] is not None, f"Buyer view missing {f}"
    assert abs(data["buyer_fee"] - 55500) < 0.01, f"Buyer fee wrong: {data['buyer_fee']}"
    for f in ("supplier_cost", "supplier_name", "supplier_phone", "supply_fee",
              "commission", "supplier_payout", "hawker_commission_visible"):
        assert f not in data, f"Buyer view leaked {f}"


def test_counter_offer_transitions_status(session, hawker_token):
    """Fresh tx → counter_offer → status=counter_offered."""
    # create fresh tx
    suffix = str(random.randint(10000000, 99999999))
    body = {
        "supplier_phone": f"+2557553{suffix[:5]}",
        "supplier_name": "TEST Supplier B",
        "supplier_cost": 1700000,
        "buyer_price": 1850000,
        "item_name": "TEST Phone B",
        "quantity": 1,
    }
    c = session.post(f"{API}/escrow/three-party/create", json=body,
                     headers={"Authorization": f"Bearer {hawker_token}"})
    assert c.status_code == 200, c.text
    tx_id = c.json()["tx_id"]

    r = requests.post(
        f"{API}/escrow/three-party/{tx_id}/supplier-response",
        json={"accepted": False, "counter_offer": True, "supplier_cost": 1720000, "note": "price bump"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "counter_offered"


def test_edit_resets_pending_and_recomputes(session, hawker_token):
    """Create → counter_offer → edit → status=pending_approval with new split."""
    suffix = str(random.randint(10000000, 99999999))
    body = {
        "supplier_phone": f"+2557554{suffix[:5]}",
        "supplier_cost": 1500000,
        "buyer_price": 1700000,
        "item_name": "TEST edit tx",
        "quantity": 1,
    }
    c = session.post(f"{API}/escrow/three-party/create", json=body,
                     headers={"Authorization": f"Bearer {hawker_token}"})
    tx_id = c.json()["tx_id"]
    # counter offer
    requests.post(f"{API}/escrow/three-party/{tx_id}/supplier-response",
                  json={"accepted": False, "counter_offer": True, "supplier_cost": 1600000}, timeout=15)
    # edit
    r = session.post(
        f"{API}/escrow/three-party/{tx_id}/edit",
        json={"buyer_price": 1850000, "supplier_cost": 1650000},
        headers={"Authorization": f"Bearer {hawker_token}"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "pending_approval"

    # Verify recomputed by fetching supplier view
    supplier_tok = _hmac_sig(tx_id, "supplier", body["supplier_phone"])
    v = requests.get(f"{API}/escrow/verify/{tx_id}?token={supplier_tok}&role=supplier", timeout=15)
    assert v.status_code == 200, v.text
    d = v.json()
    assert d["supplier_cost"] == 1650000
    assert d["buyer_price"] == 1850000
    assert abs(d["supply_fee"] - 33000) < 0.01
    assert abs(d["supplier_payout"] - 1617000) < 0.01


def _hmac_sig(tx_id, role, identifier):
    import hmac, hashlib
    secret = "biz-salama-secret-change-in-prod-2026"
    msg = f"{tx_id}:{role}:{identifier or ''}".encode()
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()[:16]


def test_accept_creates_scrubbed_snapshot(session, hawker_token):
    """Approval snapshot contains supplier-side ONLY — no buyer_fee / platform_fee."""
    suffix = str(random.randint(10000000, 99999999))
    supplier_phone = f"+2557555{suffix[:5]}"
    body = {
        "supplier_phone": supplier_phone,
        "supplier_cost": 1650000,
        "buyer_price": 1850000,
        "item_name": "TEST accept tx",
        "quantity": 1,
    }
    c = session.post(f"{API}/escrow/three-party/create", json=body,
                     headers={"Authorization": f"Bearer {hawker_token}"})
    tx_id = c.json()["tx_id"]

    r = requests.post(
        f"{API}/escrow/three-party/{tx_id}/supplier-response",
        json={"accepted": True, "counter_offer": False, "supplier_cost": 1650000},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "supplier_approved"
    snap = d.get("snapshot")
    assert snap, "Expected approval_snapshot"
    # Must have supplier side
    for f in ("buyer_price", "supplier_cost", "supplier_payout", "supply_fee", "hawker_commission_visible"):
        assert f in snap, f"Snapshot missing {f}"
    # Must NOT have buyer-side
    for f in ("buyer_fee", "platform_fee", "commission"):
        assert f not in snap, f"Snapshot leaked {f}"


def test_fee_invariant(session, hawker_token):
    """buyer_price=1,850,000, supplier_cost=1,650,000 → exact fee split."""
    suffix = str(random.randint(10000000, 99999999))
    supplier_phone = f"+2557556{suffix[:5]}"
    body = {
        "supplier_phone": supplier_phone,
        "supplier_cost": 1650000,
        "buyer_price": 1850000,
        "item_name": "TEST fee invariant",
        "quantity": 1,
    }
    c = session.post(f"{API}/escrow/three-party/create", json=body,
                     headers={"Authorization": f"Bearer {hawker_token}"})
    tx_id = c.json()["tx_id"]
    # Accept
    requests.post(f"{API}/escrow/three-party/{tx_id}/supplier-response",
                  json={"accepted": True, "supplier_cost": 1650000}, timeout=15)

    # Fetch raw tx via three-party/{tx_id}
    r = requests.get(f"{API}/escrow/three-party/{tx_id}", timeout=15)
    assert r.status_code == 200, r.text
    tx = r.json()
    assert abs(tx["supplier_payout"] - 1617000) < 0.01, tx.get("supplier_payout")
    assert abs(tx["supply_fee"] - 33000) < 0.01
    assert abs(tx["buyer_fee"] - 55500) < 0.01
    assert abs(tx["commission"] - 144500) < 0.01
    assert abs(tx["platform_fee"] - 88500) < 0.01
    # sum invariant
    total = tx["supplier_payout"] + tx["commission"] + tx["platform_fee"]
    assert abs(total - tx["buyer_price"]) < 0.01, f"sum {total} != buyer_price {tx['buyer_price']}"
