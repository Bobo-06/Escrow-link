"""Iter6 — Watch this product / price-drop alert tests.

Covers:
- POST /api/watches  (create + idempotency + 404 + auth)
- GET  /api/watches  (list + best_match + savings)
- GET  /api/watches/check/{product_id}
- DELETE /api/watches/{watch_id}  (200 + 404)
- Price-drop fan-out via POST /api/products  (new product cheaper than anchor)
- Negative fan-out: new product priced >= anchor must NOT alert
- Regression: /api/products/related/{id}, /api/sellers/trending, /api/products/public, /api/auth/login
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
LOGIN_PHONE = "+255712345678"
LOGIN_PASSWORD = "test1234"

# ---------- fixtures ----------

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"phone": LOGIN_PHONE, "password": LOGIN_PASSWORD}, timeout=20)
    if r.status_code != 200:
        pytest.skip(f"login failed: {r.status_code} {r.text[:200]}")
    tok = r.json().get("session_token")
    assert tok, f"no session_token in login resp: {r.json()}"
    return tok


@pytest.fixture(scope="module")
def auth(session, auth_token):
    session.headers.update({"Authorization": f"Bearer {auth_token}"})
    return session


@pytest.fixture(scope="module")
def me(auth):
    """Pre-clean: delete every existing watch on the test user so we get a clean slate."""
    r = auth.get(f"{BASE_URL}/api/watches", timeout=20)
    if r.status_code == 200:
        for w in r.json().get("watches", []):
            auth.delete(f"{BASE_URL}/api/watches/{w['watch_id']}", timeout=10)
    return True


@pytest.fixture(scope="module")
def public_products(session):
    r = session.get(f"{BASE_URL}/api/products/public", timeout=20)
    assert r.status_code == 200
    items = r.json().get("products") or r.json().get("items") or []
    assert isinstance(items, list) and items, "no public products to test against"
    return items


# ---------- happy path ----------

class TestWatchesCRUD:

    def test_create_watch(self, auth, me, public_products):
        anchor = public_products[0]
        pid = anchor["product_id"]
        r = auth.post(f"{BASE_URL}/api/watches", json={"product_id": pid}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "watch" in body and body["already_watching"] is False
        w = body["watch"]
        assert w["product_id"] == pid
        assert w["watch_id"].startswith("watch_")
        assert "price_at_watch" in w and w["price_at_watch"] >= 0
        assert "category" in w
        # store for later tests
        pytest.shared_watch_id = w["watch_id"]
        pytest.shared_anchor = anchor

    def test_create_watch_idempotent(self, auth, public_products):
        anchor = pytest.shared_anchor
        r = auth.post(f"{BASE_URL}/api/watches", json={"product_id": anchor["product_id"]}, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert body["already_watching"] is True
        assert body["watch"]["watch_id"] == pytest.shared_watch_id

    def test_create_watch_unknown_product_404(self, auth):
        r = auth.post(f"{BASE_URL}/api/watches", json={"product_id": f"prod_NONEXISTENT_{uuid.uuid4().hex[:8]}"}, timeout=15)
        assert r.status_code == 404, r.text

    def test_create_watch_unauth(self, session):
        # use bare session (no Authorization header) — but `session` already has one;
        # do a fresh requests call with no cookies/headers.
        r = requests.post(f"{BASE_URL}/api/watches", json={"product_id": "x"}, timeout=15)
        assert r.status_code in (401, 403), r.status_code

    def test_check_watch_true(self, auth):
        pid = pytest.shared_anchor["product_id"]
        r = auth.get(f"{BASE_URL}/api/watches/check/{pid}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["watching"] is True
        assert body.get("watch_id") == pytest.shared_watch_id

    def test_check_watch_false(self, auth):
        r = auth.get(f"{BASE_URL}/api/watches/check/prod_definitely_not_watched_xyz", timeout=15)
        assert r.status_code == 200
        assert r.json()["watching"] is False

    def test_list_watches_shape(self, auth):
        r = auth.get(f"{BASE_URL}/api/watches", timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert "watches" in body and isinstance(body["watches"], list)
        assert any(w["watch_id"] == pytest.shared_watch_id for w in body["watches"])
        for w in body["watches"]:
            for key in ("watch_id", "product_id", "price_at_watch", "category", "alerts"):
                assert key in w, f"missing {key}"
            assert "best_match" in w  # nullable but key present


# ---------- fan-out ----------

class TestPriceDropFanOut:

    def test_alert_appended_when_cheaper_listed(self, auth):
        anchor = pytest.shared_anchor
        anchor_price = float(anchor.get("price") or 0)
        category = anchor.get("category") or "general"
        # ensure we have a sensible drop
        delta = max(round(anchor_price * 0.05), 1000) if anchor_price > 0 else 5000
        new_price = max(anchor_price - delta, 1.0)
        if anchor_price <= 1:
            pytest.skip(f"anchor product price too low ({anchor_price}) to test fan-out")

        new_name = f"TEST_iter6_drop_{uuid.uuid4().hex[:6]}"
        r = auth.post(
            f"{BASE_URL}/api/products",
            json={
                "name": new_name,
                "price": new_price,
                "currency": "TZS",
                "description": "iter6 fan-out test",
                "category": category,
                "location": "Dar es Salaam",
            },
            timeout=20,
        )
        assert r.status_code in (200, 201), r.text
        new_pid = r.json().get("product", {}).get("product_id") or r.json().get("product_id")
        assert new_pid, f"no product_id in {r.json()}"
        pytest.shared_new_pid = new_pid
        pytest.shared_new_price = new_price
        pytest.shared_delta = round(anchor_price - new_price)

        # fan-out is fire-and-forget — poll for up to ~5s
        deadline = time.time() + 6
        matched = None
        while time.time() < deadline:
            time.sleep(1)
            lr = auth.get(f"{BASE_URL}/api/watches", timeout=15)
            assert lr.status_code == 200
            for w in lr.json().get("watches", []):
                if w["watch_id"] == pytest.shared_watch_id:
                    for a in w.get("alerts") or []:
                        if a.get("matched_product_id") == new_pid:
                            matched = (w, a)
                            break
                if matched:
                    break
            if matched:
                break
        assert matched, "no alert appended after price drop within 6s"
        w, a = matched
        assert abs(float(a["matched_price"]) - new_price) < 0.5
        assert int(a["savings"]) == pytest.shared_delta
        assert w["last_alerted_at"], "last_alerted_at must be set"
        assert w["best_match"] is not None
        # best_match should be at most equal to our new (cheapest) listing
        assert float(w["best_match"]["price"]) <= new_price + 0.5

    def test_no_alert_when_not_cheaper(self, auth):
        """Listing in same category at price >= anchor must NOT add an alert."""
        anchor = pytest.shared_anchor
        anchor_price = float(anchor.get("price") or 0)
        category = anchor.get("category") or "general"
        higher_price = anchor_price + 100  # strictly >= anchor
        # capture current alert count for this watch
        lr = auth.get(f"{BASE_URL}/api/watches", timeout=15)
        before_count = 0
        for w in lr.json().get("watches", []):
            if w["watch_id"] == pytest.shared_watch_id:
                before_count = len(w.get("alerts") or [])
                break

        r = auth.post(
            f"{BASE_URL}/api/products",
            json={
                "name": f"TEST_iter6_noalert_{uuid.uuid4().hex[:6]}",
                "price": higher_price,
                "currency": "TZS",
                "category": category,
                "location": "Dar es Salaam",
            },
            timeout=20,
        )
        assert r.status_code in (200, 201)
        time.sleep(2.5)

        lr2 = auth.get(f"{BASE_URL}/api/watches", timeout=15)
        after_count = 0
        for w in lr2.json().get("watches", []):
            if w["watch_id"] == pytest.shared_watch_id:
                after_count = len(w.get("alerts") or [])
                break
        assert after_count == before_count, f"alerts grew from {before_count} to {after_count} on equal-or-higher price listing"


# ---------- delete + 404 ----------

class TestWatchDelete:

    def test_delete_unknown_404(self, auth):
        r = auth.delete(f"{BASE_URL}/api/watches/watch_does_not_exist_xyz", timeout=15)
        assert r.status_code == 404

    def test_delete_existing(self, auth):
        wid = pytest.shared_watch_id
        r = auth.delete(f"{BASE_URL}/api/watches/{wid}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("deleted") is True

        # check is now false
        pid = pytest.shared_anchor["product_id"]
        cr = auth.get(f"{BASE_URL}/api/watches/check/{pid}", timeout=15)
        assert cr.json()["watching"] is False


# ---------- regression ----------

class TestRegression:

    def test_login(self, session):
        r = session.post(f"{BASE_URL}/api/auth/login", json={"phone": LOGIN_PHONE, "password": LOGIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        assert "session_token" in r.json()

    def test_products_public(self, session):
        r = session.get(f"{BASE_URL}/api/products/public", timeout=15)
        assert r.status_code == 200

    def test_sellers_trending(self, session):
        r = session.get(f"{BASE_URL}/api/sellers/trending", timeout=15)
        assert r.status_code == 200

    def test_related_products(self, session, public_products):
        pid = public_products[0]["product_id"]
        r = session.get(f"{BASE_URL}/api/products/related/{pid}", timeout=15)
        assert r.status_code == 200
        assert "products" in r.json()
