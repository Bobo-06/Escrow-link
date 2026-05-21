"""
Iter13 — Backend tests for seller "My Products" management:
- GET    /api/products/mine             auth -> {products, count}; unauth -> 401
- PATCH  /api/products/{id}             owner partial update + fee recalc + updated_at;
                                        validation errors (name='', price<=0);
                                        non-owner -> 404 (no info leak);
                                        unauth -> 401;
                                        no-op when body empty;
                                        is_active=false hides product from public seller list.
- DELETE /api/products/{id}             regression (owner deletes; non-owner 404).
- GET    /api/products                  legacy bare-list still works.
"""
import os
import uuid
import base64
import pytest
import requests


def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if not url:
        env_path = "/app/frontend/.env"
        if os.path.exists(env_path):
            with open(env_path) as fh:
                for line in fh:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
    if not url:
        raise RuntimeError("REACT_APP_BACKEND_URL not set")
    return url.rstrip("/")


BASE_URL = _load_base_url()
PRIMARY_PHONE = "+255712345678"
PRIMARY_PASSWORD = "test1234"
SECONDARY_PHONE = "+255712333444"
SECONDARY_PASSWORD = "Demo1234!"

TINY_JPEG_B64 = base64.b64encode(b"\xff\xd8\xff\xe0FAKEJPGBYTES").decode("ascii")
TINY_JPEG_B64_2 = base64.b64encode(b"\xff\xd8\xff\xe0DIFFERENTIMG").decode("ascii")


def _login(phone, password):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE_URL}/api/auth/login", json={"phone": phone, "password": password})
    if r.status_code != 200:
        return None, None
    tok = r.json().get("session_token")
    if not tok:
        return None, None
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s, tok


@pytest.fixture(scope="module")
def primary():
    s, tok = _login(PRIMARY_PHONE, PRIMARY_PASSWORD)
    if not s:
        pytest.skip("Primary login failed")
    return s


@pytest.fixture(scope="module")
def secondary():
    s, tok = _login(SECONDARY_PHONE, SECONDARY_PASSWORD)
    if not s:
        # Try to register a fresh secondary
        r = requests.post(f"{BASE_URL}/api/auth/register",
                          json={"phone": SECONDARY_PHONE, "password": SECONDARY_PASSWORD,
                                "name": "Iter13 Secondary"})
        s, tok = _login(SECONDARY_PHONE, SECONDARY_PASSWORD)
        if not s:
            pytest.skip(f"Secondary login/register failed: register={r.status_code}")
    return s


def _create_product(sess, name_suffix="iter13", price=10000):
    name = f"TEST_iter13_{name_suffix}_{uuid.uuid4().hex[:6]}"
    r = sess.post(f"{BASE_URL}/api/products", json={
        "name": name, "price": price, "currency": "TZS",
        "category": "general", "description": "iter13 product",
    })
    assert r.status_code == 200, f"create failed {r.status_code}: {r.text[:300]}"
    return r.json()


# ---------------- GET /api/products/mine ----------------

class TestGetMyProducts:
    def test_authenticated_returns_wrapped(self, primary):
        # Ensure at least one product exists
        created = _create_product(primary, "mine_list")
        r = primary.get(f"{BASE_URL}/api/products/mine")
        assert r.status_code == 200, f"got {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "products" in data and "count" in data
        assert isinstance(data["products"], list)
        assert data["count"] == len(data["products"])
        # Each product has required fields
        sample = next((p for p in data["products"] if p.get("product_id") == created["product_id"]), None)
        assert sample is not None, "newly-created product not in /mine"
        for f in ("product_id", "name", "price", "payment_link_code", "is_active"):
            assert f in sample, f"missing field {f} in product: {list(sample.keys())}"

    def test_unauthenticated_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/products/mine")
        assert r.status_code == 401, f"expected 401, got {r.status_code}"

    def test_mine_includes_inactive(self, primary):
        created = _create_product(primary, "inactive_check")
        pid = created["product_id"]
        # Hide it
        r = primary.patch(f"{BASE_URL}/api/products/{pid}", json={"is_active": False})
        assert r.status_code == 200, f"patch hide failed {r.status_code}: {r.text[:200]}"
        # Listing /mine should still include it
        mine = primary.get(f"{BASE_URL}/api/products/mine").json()
        found = next((p for p in mine["products"] if p["product_id"] == pid), None)
        assert found is not None, "inactive product missing from /mine"
        assert found["is_active"] is False


# ---------------- PATCH /api/products/{id} ----------------

class TestPatchProduct:
    def test_owner_price_change_recalcs_fees_and_sets_updated_at(self, primary):
        created = _create_product(primary, "fee_recalc", price=10000)
        pid = created["product_id"]
        old_total = created.get("total_buyer_pays")
        r = primary.patch(f"{BASE_URL}/api/products/{pid}", json={"price": 50000})
        assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
        d = r.json()
        assert d["price"] == 50000
        assert d.get("total_buyer_pays") != old_total, "fees were not recalculated"
        assert d.get("updated_at"), "updated_at not set"

    def test_empty_name_400(self, primary):
        created = _create_product(primary, "empty_name")
        r = primary.patch(f"{BASE_URL}/api/products/{created['product_id']}", json={"name": ""})
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:200]}"
        assert "Product name" in r.text or "Jina" in r.text

    def test_zero_or_negative_price_400(self, primary):
        created = _create_product(primary, "neg_price")
        r = primary.patch(f"{BASE_URL}/api/products/{created['product_id']}", json={"price": 0})
        assert r.status_code == 400, f"expected 400, got {r.status_code}: {r.text[:200]}"
        r2 = primary.patch(f"{BASE_URL}/api/products/{created['product_id']}", json={"price": -5})
        assert r2.status_code == 400

    def test_is_active_false_hides_from_public_seller_list(self, primary):
        created = _create_product(primary, "hide_public")
        pid = created["product_id"]
        # Get current user id to query public list
        me = primary.get(f"{BASE_URL}/api/auth/me").json()
        seller_id = me["user_id"]
        # Pre-hide: product is in public list
        r0 = requests.get(f"{BASE_URL}/api/sellers/{seller_id}")
        if r0.status_code == 200:
            pre = r0.json()
            pre_products = pre.get("products", []) if isinstance(pre, dict) else pre
            pre_ids = [p.get("product_id") for p in pre_products]
            assert pid in pre_ids, "newly-created active product should be visible publicly"
        # Hide
        pr = primary.patch(f"{BASE_URL}/api/products/{pid}", json={"is_active": False})
        assert pr.status_code == 200
        # After: not in public list
        r1 = requests.get(f"{BASE_URL}/api/sellers/{seller_id}")
        if r1.status_code == 200:
            post = r1.json()
            post_products = post.get("products", []) if isinstance(post, dict) else post
            post_ids = [p.get("product_id") for p in post_products]
            assert pid not in post_ids, "inactive product still in public seller list"
        # But /mine still contains it
        mine_ids = [p["product_id"] for p in primary.get(f"{BASE_URL}/api/products/mine").json()["products"]]
        assert pid in mine_ids

    def test_non_owner_gets_404_not_info_leak(self, primary, secondary):
        created = _create_product(primary, "ownership")
        pid = created["product_id"]
        r = secondary.patch(f"{BASE_URL}/api/products/{pid}", json={"name": "HACKED"})
        assert r.status_code == 404, f"expected 404 for non-owner, got {r.status_code}: {r.text[:200]}"

    def test_unauthenticated_returns_401(self, primary):
        created = _create_product(primary, "anon_patch")
        r = requests.patch(f"{BASE_URL}/api/products/{created['product_id']}", json={"name": "x"})
        assert r.status_code == 401, f"expected 401, got {r.status_code}"

    def test_empty_body_is_noop_returns_current(self, primary):
        created = _create_product(primary, "noop")
        pid = created["product_id"]
        r = primary.patch(f"{BASE_URL}/api/products/{pid}", json={})
        assert r.status_code == 200
        d = r.json()
        assert d["product_id"] == pid
        # No updated_at should be set since it was a no-op
        assert "updated_at" not in d or not d.get("updated_at"), \
            f"no-op patch should not write updated_at, got {d.get('updated_at')}"

    def test_image_b64_replacement(self, primary):
        # Create with one image
        name = f"TEST_iter13_imgreplace_{uuid.uuid4().hex[:6]}"
        cr = primary.post(f"{BASE_URL}/api/products", json={
            "name": name, "price": 1000, "currency": "TZS",
            "category": "general", "image_b64": TINY_JPEG_B64,
        })
        assert cr.status_code == 200, cr.text[:200]
        pid = cr.json()["product_id"]
        # PATCH with new image
        r = primary.patch(f"{BASE_URL}/api/products/{pid}", json={"image_b64": TINY_JPEG_B64_2})
        assert r.status_code == 200
        # GET to verify
        det = primary.get(f"{BASE_URL}/api/products/{pid}").json()
        stored = det.get("image_b64") or det.get("image") or ""
        assert TINY_JPEG_B64_2[:30] in stored, "image_b64 was not replaced"


# ---------------- DELETE /api/products/{id} regression ----------------

class TestDeleteProduct:
    def test_owner_delete_succeeds_and_disappears_from_mine(self, primary):
        created = _create_product(primary, "delete_me")
        pid = created["product_id"]
        r = primary.delete(f"{BASE_URL}/api/products/{pid}")
        assert r.status_code == 200, f"delete failed {r.status_code}: {r.text[:200]}"
        # Confirm gone from /mine
        mine = primary.get(f"{BASE_URL}/api/products/mine").json()
        ids = [p["product_id"] for p in mine["products"]]
        assert pid not in ids
        # Detail returns 404
        det = primary.get(f"{BASE_URL}/api/products/{pid}")
        assert det.status_code == 404

    def test_non_owner_delete_returns_404(self, primary, secondary):
        created = _create_product(primary, "del_owned")
        pid = created["product_id"]
        r = secondary.delete(f"{BASE_URL}/api/products/{pid}")
        assert r.status_code == 404, f"non-owner delete should be 404, got {r.status_code}"
        # Verify product still exists for primary
        det = primary.get(f"{BASE_URL}/api/products/{pid}")
        assert det.status_code == 200


# ---------------- Legacy GET /api/products ----------------

class TestLegacyList:
    def test_bare_list_no_wrap(self, primary):
        r = primary.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200, f"legacy list failed {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert isinstance(data, list), f"legacy /products must be a bare list, got {type(data).__name__}"
