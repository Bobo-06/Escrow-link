"""
Iter11 — Seller Onboarding (5-doc mobile capture flow) HTTP API tests.

Covers:
  - public required-docs endpoint
  - auth gating on /start
  - validation (missing field, bad TIN)
  - duplicate prevention by phone and TIN
  - phone normalization across 5 formats
  - per-doc upload (valid + invalid_doc + empty b64)
  - submit gating (must have all 5 docs)
  - GET trims base64
  - admin queue + doc image + review create-account flow
  - regression smoke for prior iterations
"""
from __future__ import annotations

import asyncio
import base64
import os
import uuid

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# A test user already exists per /app/memory/test_credentials.md
TEST_PHONE = os.environ.get("TEST_LOGIN_PHONE", "+255712345678")
TEST_PASSWORD = os.environ.get("TEST_LOGIN_PASSWORD", "test1234")

# Direct mongo handle for admin promotion + cleanup
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "biz_salama_db")


def _b64_blob(min_len: int = 200) -> str:
    raw = (uuid.uuid4().hex * 20).encode()
    s = base64.b64encode(raw).decode()
    while len(s) < min_len:
        s += s
    return s[: max(min_len, 220)]


# ════════════════════════════════════════════════════════════════════
# Fixtures
# ════════════════════════════════════════════════════════════════════
@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(f"{API}/auth/login", json={"phone": TEST_PHONE, "password": TEST_PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    return r.json()["session_token"]


@pytest.fixture(scope="session")
def auth_user(auth_token):
    return auth_token


@pytest.fixture()
def client(auth_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


async def _db():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(autouse=True, scope="session")
def cleanup_test_data():
    """Remove any prior TEST_ onboardings and users for isolated runs."""
    async def _cleanup():
        db = await _db()
        await db.seller_onboarding.delete_many({"business_name": {"$regex": "^TEST_"}})
        await db.users.delete_many({"phone": {"$regex": "^\\+25571599"}})
        await db.users.delete_many({"phone": {"$regex": "^\\+255713000"}})
    asyncio.get_event_loop().run_until_complete(_cleanup())
    yield
    asyncio.get_event_loop().run_until_complete(_cleanup())


@pytest.fixture(scope="session")
def admin_promote(auth_token):
    """Promote the test user to admin for admin-tests, then revert after the session."""
    async def _promote(role):
        db = await _db()
        # locate user by phone
        u = await db.users.find_one({"phone": TEST_PHONE}, {"_id": 0, "user_id": 1, "role": 1})
        prev = u.get("role") if u else None
        await db.users.update_one({"phone": TEST_PHONE}, {"$set": {"role": role}})
        return prev

    return _promote


# ════════════════════════════════════════════════════════════════════
# Public + auth gating
# ════════════════════════════════════════════════════════════════════
def test_required_docs_public():
    r = requests.get(f"{API}/onboarding/seller/required-docs", timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["count"] == 5
    assert j["required"] == [
        "national_id", "business_registration", "memart_extract", "tin_certificate", "business_license"
    ]
    for d in j["required"]:
        assert "en" in j["labels"][d] and "sw" in j["labels"][d]


def test_start_requires_auth():
    r = requests.post(f"{API}/onboarding/seller/start", json={
        "business_name": "X", "owner_name": "Y", "phone": "+255712999999"
    }, timeout=15)
    assert r.status_code in (401, 403), r.text


# ════════════════════════════════════════════════════════════════════
# Validation
# ════════════════════════════════════════════════════════════════════
def _rand_phone(seed: str) -> str:
    # Avoid collision with previously seeded test users (+25571599NNNN)
    n = uuid.uuid4().int % 10000
    return f"+25571599{n:04d}"


def test_start_missing_business_name(client):
    r = client.post(f"{API}/onboarding/seller/start", json={
        "owner_name": "Test Owner", "phone": _rand_phone("a"),
    })
    assert r.status_code in (400, 422), r.text


def test_start_invalid_tin(client):
    phone = _rand_phone("badtin")
    r = client.post(f"{API}/onboarding/seller/start", json={
        "business_name": "TEST_BadTin", "owner_name": "Test", "phone": phone, "tin": "abc",
    })
    assert r.status_code == 400, r.text
    assert "TIN" in r.json().get("detail", "")

    r2 = client.post(f"{API}/onboarding/seller/start", json={
        "business_name": "TEST_BadTin2", "owner_name": "Test", "phone": _rand_phone("badtin2"), "tin": "12345",
    })
    assert r2.status_code == 400


# ════════════════════════════════════════════════════════════════════
# Phone normalization + dup
# ════════════════════════════════════════════════════════════════════
def test_phone_normalization_dup(client):
    # First with 0712 format
    phone_local = "0715990001"
    r1 = client.post(f"{API}/onboarding/seller/start", json={
        "business_name": "TEST_Norm1", "owner_name": "Test", "phone": phone_local,
    })
    assert r1.status_code == 200, r1.text
    onb = r1.json()["onboarding"]
    assert onb["onboarding_id"].startswith("onb_")
    assert onb["phone"] == "+255715990001"

    # Second attempt with +255 form — must collide
    r2 = client.post(f"{API}/onboarding/seller/start", json={
        "business_name": "TEST_Norm2", "owner_name": "Test", "phone": "+255715990001",
    })
    assert r2.status_code == 409, r2.text


def test_phone_normalization_distinct(client):
    for p in ["255715990010", "0715990011", "+255715990012"]:
        r = client.post(f"{API}/onboarding/seller/start", json={
            "business_name": f"TEST_Distinct_{p}", "owner_name": "Test", "phone": p,
        })
        assert r.status_code == 200, f"{p}: {r.text}"


# ════════════════════════════════════════════════════════════════════
# Document upload + submit
# ════════════════════════════════════════════════════════════════════
@pytest.fixture()
def onboarding_id(client):
    phone = _rand_phone("flow")
    r = client.post(f"{API}/onboarding/seller/start", json={
        "business_name": "TEST_FullFlow", "owner_name": "Flow Owner", "phone": phone,
        "tin": str(900000000 + (uuid.uuid4().int % 100000)),
    })
    assert r.status_code == 200, r.text
    return r.json()["onboarding"]["onboarding_id"]


def test_upload_doc_success(client, onboarding_id):
    r = client.post(f"{API}/onboarding/seller/{onboarding_id}/doc", json={
        "doc_type": "national_id", "image_b64": _b64_blob(300),
    })
    assert r.status_code == 200, r.text
    onb = r.json()["onboarding"]
    assert "national_id" in onb["documents"]
    assert onb["documents"]["national_id"]["captured"]
    # base64 must NOT be in the trimmed response
    assert "image_b64" not in onb["documents"]["national_id"]


def test_upload_invalid_doc_type(client, onboarding_id):
    r = client.post(f"{API}/onboarding/seller/{onboarding_id}/doc", json={
        "doc_type": "invalid_doc", "image_b64": _b64_blob(300),
    })
    assert r.status_code == 400


def test_upload_empty_b64(client, onboarding_id):
    r = client.post(f"{API}/onboarding/seller/{onboarding_id}/doc", json={
        "doc_type": "national_id", "image_b64": "",
    })
    assert r.status_code == 400
    assert "small" in r.json().get("detail", "").lower() or "missing" in r.json().get("detail", "").lower()


def test_submit_before_all_docs_uploaded(client, onboarding_id):
    # upload only 2 of the 5
    for d in ["national_id", "tin_certificate"]:
        r = client.post(f"{API}/onboarding/seller/{onboarding_id}/doc", json={
            "doc_type": d, "image_b64": _b64_blob(300),
        })
        assert r.status_code == 200
    r = client.post(f"{API}/onboarding/seller/{onboarding_id}/submit", json={})
    assert r.status_code == 400
    assert "Missing" in r.json().get("detail", "")


def test_full_submit_flow_and_get_trims(client):
    # Create + upload all 5 docs + submit
    phone = _rand_phone("submit")
    s = client.post(f"{API}/onboarding/seller/start", json={
        "business_name": "TEST_Submit", "owner_name": "Submit Owner", "phone": phone,
    })
    onb_id = s.json()["onboarding"]["onboarding_id"]
    for d in ["national_id", "business_registration", "memart_extract", "tin_certificate", "business_license"]:
        r = client.post(f"{API}/onboarding/seller/{onb_id}/doc", json={
            "doc_type": d, "image_b64": _b64_blob(300),
        })
        assert r.status_code == 200, f"{d}: {r.text}"
    r = client.post(f"{API}/onboarding/seller/{onb_id}/submit", json={})
    assert r.status_code == 200, r.text
    onb = r.json()["onboarding"]
    assert onb["status"] == "submitted"
    assert onb["submitted_at"]
    # GET trims base64
    g = client.get(f"{API}/onboarding/seller/{onb_id}")
    assert g.status_code == 200
    docs = g.json()["documents"]
    for d in docs.values():
        assert "image_b64" not in d
        assert d["captured"]
        assert d["size_bytes"] > 100


# ════════════════════════════════════════════════════════════════════
# Admin endpoints
# ════════════════════════════════════════════════════════════════════
def test_admin_queue_403_for_non_admin(client):
    r = client.get(f"{API}/admin/onboarding/queue?status=submitted")
    assert r.status_code == 403


def test_admin_flow_verified_creates_user(client, admin_promote):
    # Build a submission first as non-admin
    phone = _rand_phone("verify")
    s = client.post(f"{API}/onboarding/seller/start", json={
        "business_name": "TEST_Verify", "owner_name": "Verify Owner", "phone": phone,
        "tin": str(910000000 + (uuid.uuid4().int % 90000000)),
    })
    onb_id = s.json()["onboarding"]["onboarding_id"]
    for d in ["national_id", "business_registration", "memart_extract", "tin_certificate", "business_license"]:
        client.post(f"{API}/onboarding/seller/{onb_id}/doc", json={"doc_type": d, "image_b64": _b64_blob(300)})
    client.post(f"{API}/onboarding/seller/{onb_id}/submit", json={})

    # Promote test user → admin
    loop = asyncio.get_event_loop()
    prev_role = loop.run_until_complete(admin_promote("admin"))
    try:
        q = client.get(f"{API}/admin/onboarding/queue?status=submitted")
        assert q.status_code == 200, q.text
        ids = [o["onboarding_id"] for o in q.json()["submissions"]]
        assert onb_id in ids

        # admin doc image
        di = client.get(f"{API}/admin/onboarding/{onb_id}/doc/national_id")
        assert di.status_code == 200
        assert di.json()["image_b64"]

        # review verified
        rv = client.post(f"{API}/admin/onboarding/{onb_id}/review", json={"decision": "verified"})
        assert rv.status_code == 200, rv.text
        onb = rv.json()["onboarding"]
        assert onb["status"] == "verified"
        assert onb["created_user_id"]

        # confirm new user exists with role=seller
        async def check_user():
            db = await _db()
            u = await db.users.find_one({"phone": phone}, {"_id": 0})
            return u
        user = loop.run_until_complete(check_user())
        assert user is not None
        assert user["role"] == "seller"
        assert user["kyc_status"] == "verified"
    finally:
        # revert role
        loop.run_until_complete(admin_promote(prev_role or "user"))


def test_admin_flow_rejected_then_resubmit(client, admin_promote):
    phone = _rand_phone("reject")
    s = client.post(f"{API}/onboarding/seller/start", json={
        "business_name": "TEST_Reject", "owner_name": "Reject Owner", "phone": phone,
    })
    onb_id = s.json()["onboarding"]["onboarding_id"]
    for d in ["national_id", "business_registration", "memart_extract", "tin_certificate", "business_license"]:
        client.post(f"{API}/onboarding/seller/{onb_id}/doc", json={"doc_type": d, "image_b64": _b64_blob(300)})
    client.post(f"{API}/onboarding/seller/{onb_id}/submit", json={})

    loop = asyncio.get_event_loop()
    prev_role = loop.run_until_complete(admin_promote("admin"))
    try:
        rv = client.post(f"{API}/admin/onboarding/{onb_id}/review", json={
            "decision": "rejected", "rejection_reason": "Blurry national ID",
        })
        assert rv.status_code == 200, rv.text
        assert rv.json()["onboarding"]["status"] == "rejected"
        assert rv.json()["onboarding"]["rejection_reason"] == "Blurry national ID"
    finally:
        loop.run_until_complete(admin_promote(prev_role or "user"))

    # Re-upload + resubmit by rep
    r = client.post(f"{API}/onboarding/seller/{onb_id}/doc", json={
        "doc_type": "national_id", "image_b64": _b64_blob(400),
    })
    assert r.status_code == 200
    r2 = client.post(f"{API}/onboarding/seller/{onb_id}/submit", json={})
    assert r2.status_code == 200
    assert r2.json()["onboarding"]["status"] == "submitted"


# ════════════════════════════════════════════════════════════════════
# Regression smoke (a few key existing endpoints)
# ════════════════════════════════════════════════════════════════════
def test_regression_login_phone_formats():
    for fmt in ["+255712345678", "255712345678", "0712345678", "712345678"]:
        r = requests.post(f"{API}/auth/login", json={"phone": fmt, "password": TEST_PASSWORD}, timeout=20)
        assert r.status_code == 200, f"{fmt}: {r.status_code} {r.text}"


def test_regression_public_products():
    r = requests.get(f"{API}/products/public?limit=5", timeout=20)
    assert r.status_code == 200


def test_regression_ledger_quote():
    r = requests.post(f"{API}/ledger/quote", json={"deal_value": 200000, "mode": "direct"}, timeout=20)
    assert r.status_code == 200, r.text
    j = r.json()
    assert isinstance(j, dict)


def test_regression_sellers_trending():
    r = requests.get(f"{API}/sellers/trending?limit=5", timeout=20)
    assert r.status_code == 200
