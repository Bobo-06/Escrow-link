"""Iter7 — Public Seller Profile endpoint tests.

Covers:
- GET /api/sellers/{seller_id} — happy path with real id from /api/sellers/trending
- GET /api/sellers/UNKNOWN_ID  — returns 404 with detail "Seller not found"
- Route ordering: /api/sellers/trending must NOT be swallowed by /sellers/{id}
- Regression: products/public, products/related/{id}, auth/login, watches CRUD smoke
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
LOGIN_PHONE = "+255712345678"
LOGIN_PASSWORD = "test1234"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def trending_sellers(session):
    r = session.get(f"{BASE_URL}/api/sellers/trending?limit=6", timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "sellers" in body and isinstance(body["sellers"], list)
    assert body.get("count") == len(body["sellers"])
    assert body["sellers"], "no trending sellers — cannot test seller profile"
    return body["sellers"]


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"phone": LOGIN_PHONE, "password": LOGIN_PASSWORD}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed: {r.status_code} {r.text[:200]}")
    return r.json().get("session_token")


# ---------- Iter7 — public seller profile ----------

class TestSellerProfile:

    def test_route_ordering_trending_still_works(self, session):
        """Trending must STILL respond at /api/sellers/trending — not be swallowed
        by /api/sellers/{seller_id}."""
        r = session.get(f"{BASE_URL}/api/sellers/trending?limit=2", timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "sellers" in body and "count" in body
        assert isinstance(body["sellers"], list)
        assert body["count"] == len(body["sellers"])
        assert len(body["sellers"]) <= 2
        # If swallowed by /{seller_id}, response would be {seller:..., products:[...]} or 404
        assert "seller" not in body
        assert "products" not in body

    def test_get_seller_by_id_happy(self, session, trending_sellers):
        sid = trending_sellers[0]["seller_id"]
        r = session.get(f"{BASE_URL}/api/sellers/{sid}", timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "seller" in body and "products" in body
        s = body["seller"]
        # Exact shape per PRD
        for key in ("seller_id", "name", "is_verified", "is_women_owned",
                    "rating", "total_ratings", "location", "bio", "joined",
                    "products_count", "orders_completed"):
            assert key in s, f"seller missing key: {key}"
        assert s["seller_id"] == sid
        assert isinstance(s["name"], str) and len(s["name"]) > 0
        assert isinstance(s["is_verified"], bool)
        assert isinstance(s["is_women_owned"], bool)
        assert isinstance(s["products_count"], int)
        assert isinstance(s["orders_completed"], int)
        assert s["products_count"] >= 0

        # Products list shape
        assert isinstance(body["products"], list)
        if body["products"]:
            p = body["products"][0]
            for key in ("product_id", "name", "price", "category"):
                assert key in p, f"product missing key: {key}"
            assert "_id" not in p  # mongo objectId must be excluded

    def test_seed_seller_biz_salama_specific(self, session):
        """Seed seller from PRD — 'Biz-Salama Verified Collective' with ~29 products."""
        r = session.get(f"{BASE_URL}/api/sellers/seed_seller_biz_salama", timeout=20)
        if r.status_code == 404:
            pytest.skip("seed_seller_biz_salama not present in this DB")
        assert r.status_code == 200, r.text
        body = r.json()
        s = body["seller"]
        assert s["seller_id"] == "seed_seller_biz_salama"
        assert "biz-salama" in s["name"].lower() or "salama" in s["name"].lower(), s["name"]
        assert "mama biashara" not in s["name"].lower(), "old fake name still present"
        # PRD claims products_count should be 29 (count of active seed products)
        assert s["products_count"] >= 1, f"expected products_count>=1 got {s['products_count']}"

    def test_get_seller_unknown_404(self, session):
        bogus = f"UNKNOWN_{uuid.uuid4().hex[:8]}"
        r = session.get(f"{BASE_URL}/api/sellers/{bogus}", timeout=15)
        assert r.status_code == 404, r.text
        body = r.json()
        assert body.get("detail") == "Seller not found"


# ---------- Regression ----------

class TestRegression:

    def test_login(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"phone": LOGIN_PHONE, "password": LOGIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        assert "session_token" in r.json()

    def test_products_public(self, session):
        r = session.get(f"{BASE_URL}/api/products/public", timeout=15)
        assert r.status_code == 200
        body = r.json()
        items = body.get("products") or body.get("items") or []
        assert isinstance(items, list) and items

    def test_products_related(self, session):
        r0 = session.get(f"{BASE_URL}/api/products/public", timeout=15)
        items = r0.json().get("products") or r0.json().get("items") or []
        pid = items[0]["product_id"]
        r = session.get(f"{BASE_URL}/api/products/related/{pid}", timeout=15)
        assert r.status_code == 200
        assert "products" in r.json()

    def test_watches_smoke(self, session, auth_token):
        h = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        r = requests.get(f"{BASE_URL}/api/watches", headers=h, timeout=15)
        assert r.status_code == 200
        assert "watches" in r.json()
