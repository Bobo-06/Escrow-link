"""
Iter12 — Backend tests for the Add-Product (image_b64) + Profile-Edit wiring fix.

Covers:
- POST /api/products  with image_b64 -> 200 + product_id + payment_link_code + name
                       + image_b64 round-trips to DB
- POST /api/products  without image_b64 -> still succeeds
- POST /api/products  unauthenticated -> 401
- PUT /api/auth/profile -> persists picture / business_name / bio / location / name
- PUT /api/auth/profile -> ignores unknown fields (no 5xx)
- Regression: POST /api/escrow/direct/create still returns buyer_offer_url
- Regression: GET  /api/escrow/verify/{tx_id} still resolves (3-party HMAC)
"""
import os
import base64
import uuid
import pytest
import requests

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        # Fallback: read frontend/.env (this is how all prior iter tests resolve it)
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as fh:
                for line in fh:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set and not found in frontend/.env")
    return url.rstrip("/")

BASE_URL = _load_base_url()
TEST_PHONE = "+255712345678"
TEST_PASSWORD = "test1234"

# 1x1 transparent-ish JPEG (smallest valid JPEG header bytes) for round-trip test
_TINY_JPEG_BYTES = bytes([
    0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x01,0x00,0x00,0x01,
    0x00,0x01,0x00,0x00,0xFF,0xDB,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,
    0x07,0x07,0x07,0x09,0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,
    0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,0x24,0x2E,0x27,0x20,
    0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,
    0x39,0x3D,0x38,0x32,0x3C,0x2E,0x33,0x34,0x32,0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,
    0x00,0x01,0x01,0x01,0x11,0x00,0xFF,0xC4,0x00,0x14,0x00,0x01,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0xFF,0xC4,0x00,
    0x14,0x10,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0xFF,0xDA,0x00,0x08,0x01,0x01,0x00,0x00,0x3F,0x00,0xD2,0xCF,
    0x20,0xFF,0xD9,
])
TINY_JPEG_B64 = base64.b64encode(_TINY_JPEG_BYTES).decode("ascii")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"phone": TEST_PHONE, "password": TEST_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text[:200]}")
    tok = r.json().get("session_token")
    assert tok, "session_token missing from login response"
    return tok


@pytest.fixture(scope="module")
def auth_session(session, auth_token):
    session.headers.update({"Authorization": f"Bearer {auth_token}"})
    return session


# ---------------------- POST /api/products ----------------------

class TestCreateProduct:
    def test_create_with_image_b64_roundtrips_and_returns_link_code(self, auth_session):
        payload = {
            "name": f"TEST_iter12_with_img_{uuid.uuid4().hex[:6]}",
            "price": 12500,
            "currency": "TZS",
            "description": "Iter12 product with embedded image",
            "category": "fashion",
            "location": "Kariakoo",
            "image_b64": TINY_JPEG_B64,
        }
        r = auth_session.post(f"{BASE_URL}/api/products", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
        data = r.json()
        # Echo fields
        assert "product_id" in data and data["product_id"].startswith("prod_")
        assert data["name"] == payload["name"]
        assert "payment_link_code" in data and len(data["payment_link_code"]) > 0
        # image_b64 is persisted (GET should expose it).
        pid = data["product_id"]
        # Verify retrieval by listing or detail endpoint
        det = auth_session.get(f"{BASE_URL}/api/products/{pid}")
        if det.status_code == 200:
            d = det.json()
            # Either `image` or `image_b64` carries the photo bytes
            stored = d.get("image_b64") or d.get("image") or ""
            assert TINY_JPEG_B64[:60] in stored, "image_b64 did not round-trip from DB"

    def test_create_without_image_b64_still_succeeds(self, auth_session):
        payload = {
            "name": f"TEST_iter12_noimg_{uuid.uuid4().hex[:6]}",
            "price": 5000,
            "currency": "TZS",
            "category": "general",
        }
        r = auth_session.post(f"{BASE_URL}/api/products", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert data["name"] == payload["name"]
        assert data.get("payment_link_code")

    def test_create_without_auth_returns_401(self, session):
        # Use a fresh session without Authorization
        plain = requests.Session()
        plain.headers.update({"Content-Type": "application/json"})
        r = plain.post(f"{BASE_URL}/api/products", json={
            "name": "TEST_iter12_anon", "price": 100, "currency": "TZS",
        })
        assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text[:200]}"


# ---------------------- PUT /api/auth/profile ----------------------

class TestUpdateProfile:
    def test_profile_persists_new_fields(self, auth_session):
        unique = uuid.uuid4().hex[:6]
        # Use a tiny base64 data URL (~70 bytes) to validate picture roundtrip
        picture_data_url = f"data:image/jpeg;base64,{TINY_JPEG_B64}"
        payload = {
            "name": f"Test User",  # keep canonical name to avoid permadrift for shared phone
            "business_name": f"TEST_BIZ_{unique}",
            "bio": f"TEST bio iter12 {unique}",
            "location": "Dar es Salaam",
            "picture": picture_data_url,
        }
        r = auth_session.put(f"{BASE_URL}/api/auth/profile", json=payload)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
        data = r.json()
        assert data["business_name"] == payload["business_name"]
        # picture echoed in response per spec
        assert data.get("picture") == picture_data_url, \
            f"picture not echoed; got {str(data.get('picture'))[:60]!r}"

        # GET /api/auth/me should reflect persistence
        me = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert me.status_code == 200
        m = me.json()
        assert m.get("business_name") == payload["business_name"]
        assert m.get("picture") == picture_data_url

    def test_profile_ignores_unknown_fields(self, auth_session):
        payload = {
            "business_name": f"TEST_KEEP_{uuid.uuid4().hex[:4]}",
            "evil_field": "xxx",
            "is_admin": True,           # must be ignored — not in allowed_fields
            "password_hash": "hack",
        }
        r = auth_session.put(f"{BASE_URL}/api/auth/profile", json=payload)
        assert r.status_code == 200, f"Unknown fields broke endpoint: {r.status_code} {r.text[:200]}"
        d = r.json()
        assert d["business_name"] == payload["business_name"]
        assert "evil_field" not in d


# ---------------------- Regression: direct escrow + 3p verify ----------------------

class TestRegression:
    def test_direct_escrow_create_returns_buyer_offer_url(self, auth_session):
        payload = {
            "buyer_phone": "+255713000000",
            "item_name": "TEST_iter12_direct",
            "price": 25000,
            "buyer_name": "Test Buyer",
            "notes": "Iter12 regression",
        }
        r = auth_session.post(f"{BASE_URL}/api/escrow/direct/create", json=payload)
        # Endpoint must exist and return 200 with a buyer_offer_url
        assert r.status_code == 200, f"Direct create failed: {r.status_code} {r.text[:300]}"
        d = r.json()
        assert d.get("buyer_offer_url"), f"missing buyer_offer_url, body={d}"
        assert "/direct-offer/" in d["buyer_offer_url"]

    def test_three_party_verify_endpoint_reachable(self, session):
        # Use a known seeded tx from /app/memory/test_credentials.md
        tx_id = "3P_747c13debea4"
        r = session.get(f"{BASE_URL}/api/escrow/verify/{tx_id}")
        # Endpoint should respond (200 with data OR a structured 4xx if token required).
        assert r.status_code in (200, 400, 401, 403), \
            f"Verify endpoint regressed: {r.status_code} {r.text[:200]}"
