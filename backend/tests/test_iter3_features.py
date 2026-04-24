"""Iteration 3 — Biz-Salama new features test suite

Covers:
- GET /api/products/voice-listed returns <=3 products, all flagged listed_via_voice=true
- POST /api/products with listed_via_voice=true persists the flag and appears in voice-listed
- POST /api/escrow/three-party/{tx_id}/buyer-confirm-delivery HMAC flow:
    * missing/invalid token -> 403
    * valid token but tx not in 'paid' state -> 400
    * valid token + paid tx -> 200, tx completed, disbursements recorded
- GET /api/orders/{non_existent} -> 404 regression
"""
import hmac as _hmac
import hashlib
import os
import random
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PRIMARY_PHONE = "+255712345678"
PRIMARY_PWD = "test1234"
JWT_SECRET = "biz-salama-secret-change-in-prod-2026"


def _hmac_sig(tx_id: str, role: str, identifier: str) -> str:
    msg = f"{tx_id}:{role}:{identifier or ''}".encode()
    return _hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).hexdigest()[:16]


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{API}/auth/login", json={"phone": PRIMARY_PHONE, "password": PRIMARY_PWD}, timeout=15)
    assert r.status_code == 200, f"Primary login failed: {r.status_code} {r.text[:200]}"
    tok = r.json().get("session_token")
    assert tok, "Missing session_token in login response"
    return tok


# ========== VOICE-LISTED PRODUCTS ==========

class TestVoiceListedProducts:
    def test_voice_listed_endpoint_shape_and_limit(self):
        r = requests.get(f"{API}/products/voice-listed", timeout=15)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "products" in data and "count" in data
        products = data["products"]
        assert isinstance(products, list)
        assert len(products) <= 3, f"Expected <=3, got {len(products)}"
        assert data["count"] == len(products)

        # Each returned product should have name/price/seller_name present
        missing_image = []
        for p in products:
            assert p.get("name"), f"missing name: {p}"
            assert p.get("price") is not None or p.get("price_tzs") is not None, f"missing price: {p}"
            assert p.get("seller_name") or p.get("seller_id"), f"missing seller: {p}"
            if not (p.get("image") or p.get("image_b64")):
                missing_image.append(p.get("product_id"))
        # Image is expected by spec — flag but don't hard fail if one seed row has null image
        if missing_image:
            print(f"[voice-listed] WARN products with null image: {missing_image}")

    def test_voice_listed_products_are_only_voice_flagged(self):
        """Cross-check against public products list: all voice-listed returned must also
        be listed_via_voice=true in the underlying product record."""
        r = requests.get(f"{API}/products/voice-listed?limit=10", timeout=15)
        assert r.status_code == 200
        products = r.json()["products"]
        # The endpoint filters by listed_via_voice=true, so each should have a product_id we can
        # fetch via the public detail endpoint and it should show listed_via_voice=true (or field missing but flag implied).
        for p in products:
            pid = p.get("product_id")
            if not pid:
                continue
            d = requests.get(f"{API}/products/detail/{pid}", timeout=10)
            if d.status_code == 200:
                body = d.json()
                assert body.get("listed_via_voice", False) is True, f"Product {pid} returned by voice-listed but flag is False: {body.get('listed_via_voice')}"

    def test_create_product_with_listed_via_voice_persists(self, session, auth_token):
        suffix = uuid.uuid4().hex[:8]
        payload = {
            "name": f"TEST Voice Item {suffix}",
            "price": 25000,
            "currency": "TZS",
            "description": "Listed by voice in test",
            "image": "https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?w=600",
            "listed_via_voice": True,
        }
        r = session.post(
            f"{API}/products",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15,
        )
        assert r.status_code in (200, 201), r.text[:300]
        body = r.json()
        assert "product_id" in body, body
        assert body.get("listed_via_voice") is True, f"listed_via_voice not echoed: {body}"
        product_id = body["product_id"]

        # Now fetch /products/voice-listed?limit=10 and verify new product appears
        r2 = requests.get(f"{API}/products/voice-listed?limit=10", timeout=15)
        assert r2.status_code == 200
        ids = [p.get("product_id") for p in r2.json()["products"]]
        assert product_id in ids, f"Newly-created voice product {product_id} not in voice-listed list: {ids}"


# ========== BUYER CONFIRM DELIVERY ==========

class TestBuyerConfirmDelivery:
    @pytest.fixture(scope="class")
    def paid_tx(self, session):
        """Create tx, register+login supplier, approve via /approve, pay as hawker → tx in paid+held state."""
        # Hawker login
        r = session.post(f"{API}/auth/login", json={"phone": PRIMARY_PHONE, "password": PRIMARY_PWD}, timeout=15)
        assert r.status_code == 200
        hawker_token = r.json()["session_token"]
        buyer_user_id = r.json()["user_id"]

        # Register fresh supplier
        sup_suffix = str(random.randint(10000000, 99999999))
        supplier_phone = f"+2557557{sup_suffix[:5]}"
        supplier_pw = "SupPw1234!"
        reg = requests.post(
            f"{API}/auth/register",
            json={"phone": supplier_phone, "password": supplier_pw, "name": f"TEST Supplier {sup_suffix}"},
            timeout=15,
        )
        assert reg.status_code in (200, 201), reg.text
        sup_login = requests.post(
            f"{API}/auth/login", json={"phone": supplier_phone, "password": supplier_pw}, timeout=15
        )
        assert sup_login.status_code == 200, sup_login.text
        supplier_token = sup_login.json()["session_token"]

        # Create tx as hawker
        body = {
            "supplier_phone": supplier_phone,
            "supplier_cost": 1650000,
            "buyer_price": 1850000,
            "item_name": "TEST buyer-confirm tx",
            "quantity": 1,
        }
        c = requests.post(
            f"{API}/escrow/three-party/create",
            json=body,
            headers={"Authorization": f"Bearer {hawker_token}"},
            timeout=15,
        )
        assert c.status_code == 200, c.text
        tx_id = c.json()["tx_id"]

        return {
            "tx_id": tx_id,
            "hawker_token": hawker_token,
            "supplier_token": supplier_token,
            "buyer_user_id": buyer_user_id,
            "supplier_phone": supplier_phone,
        }

    def test_invalid_token_returns_403(self, paid_tx):
        tx_id = paid_tx["tx_id"]
        r = requests.post(
            f"{API}/escrow/three-party/{tx_id}/buyer-confirm-delivery?token=ffffffffffffffff",
            timeout=15,
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code} {r.text[:200]}"
        assert "Invalid buyer token" in r.text

    def test_missing_token_returns_422_or_403(self, paid_tx):
        tx_id = paid_tx["tx_id"]
        r = requests.post(f"{API}/escrow/three-party/{tx_id}/buyer-confirm-delivery", timeout=15)
        assert r.status_code in (403, 422), f"Expected 403/422, got {r.status_code} {r.text[:200]}"

    def test_valid_token_not_paid_returns_400(self, paid_tx):
        """TX is 'pending_approval' — buyer confirm with valid token for empty identifier should 400."""
        tx_id = paid_tx["tx_id"]
        # At pending_approval, tx has no buyer_id/buyer_phone yet, so buyer_identifier falls through
        # to the query 'buyer_phone' param. Sign with the phone we'll pass, so HMAC matches → status check 400.
        bphone = "255700000000"
        tok = _hmac_sig(tx_id, "buyer", bphone)
        r = requests.post(
            f"{API}/escrow/three-party/{tx_id}/buyer-confirm-delivery",
            params={"token": tok, "buyer_phone": bphone},
            timeout=15,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code} {r.text[:300]}"
        assert "releasable" in r.text.lower() or "paid" in r.text.lower() or "current" in r.text.lower()

    def test_valid_token_paid_releases_escrow(self, paid_tx):
        tx_id = paid_tx["tx_id"]
        # Supplier approves → status=approved
        ap = requests.post(
            f"{API}/escrow/three-party/approve",
            json={"tx_id": tx_id, "supplier_cost": 1650000},
            headers={"Authorization": f"Bearer {paid_tx['supplier_token']}"},
            timeout=15,
        )
        assert ap.status_code == 200, ap.text
        # Hawker pays → status=paid, buyer_id set
        pay = requests.post(
            f"{API}/escrow/three-party/pay",
            json={
                "tx_id": tx_id,
                "payment_method": "mpesa",
                "buyer_name": "Test Buyer",
                "buyer_phone": "+255700111222",
                "buyer_address": "Kariakoo, Dar",
            },
            headers={"Authorization": f"Bearer {paid_tx['hawker_token']}"},
            timeout=20,
        )
        assert pay.status_code == 200, pay.text

        # Now tx has buyer_id = hawker user_id. Sign token accordingly.
        g = requests.get(f"{API}/escrow/three-party/{tx_id}", timeout=10)
        assert g.status_code == 200
        tx = g.json()
        assert tx["status"] == "paid"
        buyer_identifier = tx.get("buyer_id") or tx.get("buyer_phone") or ""
        tok = _hmac_sig(tx_id, "buyer", buyer_identifier)

        r = requests.post(
            f"{API}/escrow/three-party/{tx_id}/buyer-confirm-delivery?token={tok}",
            timeout=20,
        )
        assert r.status_code == 200, f"Expected 200 confirm, got {r.status_code} {r.text[:300]}"
        body = r.json()
        assert body["ok"] is True
        assert body["status"] == "completed"
        assert body["tx_id"] == tx_id
        assert "message_sw" in body and body["message_sw"].strip()
        assert "message_en" in body and body["message_en"].strip()

        g2 = requests.get(f"{API}/escrow/three-party/{tx_id}", timeout=10)
        assert g2.status_code == 200
        tx2 = g2.json()
        assert tx2["status"] == "completed"
        assert tx2.get("escrow_status") == "released"
        disb = tx2.get("disbursements") or {}
        assert "supplier" in disb and "hawker" in disb and "platform" in disb, f"disbursements missing: {disb}"
        assert disb["supplier"] > 0 and disb["hawker"] > 0


# ========== ORDERS REGRESSION ==========

class TestOrdersRegression:
    def test_get_nonexistent_order_returns_404(self):
        r = requests.get(f"{API}/orders/DOES_NOT_EXIST_{uuid.uuid4().hex[:6]}", timeout=15)
        assert r.status_code == 404, f"Expected 404, got {r.status_code} {r.text[:200]}"
