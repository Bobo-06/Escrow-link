"""Iteration 5 backend tests — Discovery endpoints + i18n regression smoke.
Covers:
- GET /api/sellers/trending
- GET /api/products/related/{product_id}
- GET /api/products/related/UNKNOWN_ID -> empty (no 500)
- GET /api/products/public is_lowest_price tagging
- Regression: /api/auth/login with seeded credentials
- Regression smoke: /api/voice/transcribe, /api/escrow/three-party/{tx_id}
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
TIMEOUT = 30

TEST_PHONE = "+255712345678"
TEST_PWD = "test1234"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"phone": TEST_PHONE, "password": TEST_PWD},
                     timeout=TIMEOUT)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text[:200]}")
    return r.json().get("session_token")


# ---------------- Trending Sellers ----------------
class TestTrendingSellers:
    def test_default_response_shape(self, session):
        r = session.get(f"{BASE_URL}/api/sellers/trending", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "sellers" in data and "count" in data
        assert isinstance(data["sellers"], list)
        assert data["count"] == len(data["sellers"])

    def test_with_limit_and_seeded(self, session):
        r = session.get(f"{BASE_URL}/api/sellers/trending?limit=6", timeout=TIMEOUT)
        assert r.status_code == 200
        data = r.json()
        assert data["count"] >= 1, f"expected >=1 trending seller, got {data}"
        for s in data["sellers"]:
            for k in ("seller_id", "name", "is_verified", "product_count",
                      "min_price", "categories", "location", "rating"):
                assert k in s, f"missing field {k} in seller {s}"
            assert isinstance(s["categories"], list)
            assert s["product_count"] >= 1


# ---------------- Related Products ----------------
class TestRelatedProducts:
    def test_unknown_id_returns_empty_no_500(self, session):
        r = session.get(f"{BASE_URL}/api/products/related/UNKNOWN_ID_XYZ", timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data == {"products": [], "count": 0} or (data["count"] == 0 and data["products"] == [])

    def test_related_for_real_product(self, session):
        r = session.get(f"{BASE_URL}/api/products/public", timeout=TIMEOUT)
        assert r.status_code == 200
        prods = r.json().get("products", [])
        assert len(prods) >= 1, "no public products to use as base"
        base = prods[0]
        pid = base["product_id"]
        base_cat = base.get("category")
        rel = session.get(f"{BASE_URL}/api/products/related/{pid}?limit=6", timeout=TIMEOUT)
        assert rel.status_code == 200
        data = rel.json()
        assert "products" in data and "count" in data
        for p in data["products"]:
            assert p["product_id"] != pid, "base product leaked into related"
            if base_cat is not None and p.get("category") is not None:
                assert p["category"] == base_cat, f"category mismatch base={base_cat} got={p.get('category')}"
        # Closest-price ordering: distances should be non-decreasing
        if data["count"] >= 2:
            base_price = float(base.get("price") or 0)
            dists = [abs(float(p.get("price") or 0) - base_price) for p in data["products"]]
            assert dists == sorted(dists), f"not sorted by price distance: {dists}"


# ---------------- Lowest-price tagging ----------------
class TestLowestPriceTagging:
    def test_public_products_lowest_price_flag(self, session):
        r = session.get(f"{BASE_URL}/api/products/public", timeout=TIMEOUT)
        assert r.status_code == 200
        prods = r.json().get("products", [])
        assert len(prods) >= 1
        # Group products by category and check tagging logic
        by_cat = {}
        for p in prods:
            by_cat.setdefault(p.get("category") or "general", []).append(p)
        flagged_seen = False
        for cat, items in by_cat.items():
            tagged = [it for it in items if it.get("is_lowest_price")]
            if len(items) >= 2:
                prices = [it.get("price") or 0 for it in items]
                if min(prices) < max(prices):
                    # exactly one should be tagged
                    assert len(tagged) == 1, f"category {cat}: expected 1 lowest, got {len(tagged)}"
                    cheapest_price = min(prices)
                    assert (tagged[0].get("price") or 0) == cheapest_price
                    flagged_seen = True
                else:
                    assert len(tagged) == 0, f"flat-price category {cat} should not flag"
            else:
                assert len(tagged) == 0, f"single-item category {cat} should not flag"
        # Not strictly required but document outcome
        print(f"is_lowest_price flagged in any category: {flagged_seen}")


# ---------------- Regression: auth ----------------
class TestAuthRegression:
    def test_login_seeded_user(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login",
                         json={"phone": TEST_PHONE, "password": TEST_PWD},
                         timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "session_token" in data
        assert data.get("phone", "").endswith("712345678")


# ---------------- Regression: voice + 3-party ----------------
class TestVoiceAndThreeParty:
    def test_voice_transcribe_endpoint_exists(self, session):
        # Empty body should respond (validation error or 4xx) but not 5xx
        r = session.post(f"{BASE_URL}/api/voice/transcribe", json={}, timeout=TIMEOUT)
        assert r.status_code < 500, f"voice transcribe 5xx: {r.status_code} {r.text[:200]}"

    def test_three_party_known_tx_lookup(self, session):
        # public verify endpoint shape (test_credentials lists 3P_747c13debea4)
        tx_id = "3P_747c13debea4"
        # Try a known three-party endpoint shape from server
        r = session.get(f"{BASE_URL}/api/escrow/three-party/{tx_id}", timeout=TIMEOUT)
        # Must not 5xx; expected 200 or 401/404 depending on auth requirement
        assert r.status_code < 500, f"3-party 5xx: {r.status_code} {r.text[:200]}"
