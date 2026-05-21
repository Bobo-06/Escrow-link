"""Iter16: Self-service & admin KYC document storage tests."""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DOC_TYPES = ("national_id", "business_registration", "memart_extract", "tin_certificate", "business_license")
TEST_USER = {"phone": "+255712345678", "password": "test1234"}
ADMIN_USER = {"phone": "+255700000001", "password": "AdminPass123!"}

# ~2KB base64 string of fake JPEG bytes
SMALL_IMG_B64 = base64.b64encode(b"\xff\xd8\xff\xe0" + b"A" * 1500).decode()


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    token = data.get("session_token") or data.get("token")
    assert token, f"no session_token in login response: {data}"
    return token, data


@pytest.fixture(scope="module")
def user_token():
    # ensure user exists; try register, ignore if exists
    requests.post(f"{API}/auth/register", json={**TEST_USER, "name": "Test User"}, timeout=20)
    tok, _ = _login(TEST_USER)
    return tok


@pytest.fixture(scope="module")
def admin_token():
    tok, _ = _login(ADMIN_USER)
    return tok


@pytest.fixture(scope="module")
def user_id(user_token):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {user_token}"}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["user_id"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


# ── Auth on KYC GET ─────────────────────────────────────────────────────
class TestKycAuth:
    def test_unauthenticated_kyc_documents_returns_401(self):
        r = requests.get(f"{API}/auth/kyc/documents", timeout=20)
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text[:200]}"

    def test_authenticated_kyc_documents_shape(self, user_token):
        r = requests.get(f"{API}/auth/kyc/documents", headers=_h(user_token), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "kyc_status" in data
        assert "is_verified" in data
        assert "documents" in data
        assert isinstance(data["documents"], dict)
        assert "required" in data and set(data["required"]) == set(DOC_TYPES)
        assert "labels" in data
        for d in DOC_TYPES:
            assert d in data["labels"]


# ── Upload validation ──────────────────────────────────────────────────
class TestKycUploadValidation:
    def test_invalid_doc_type_returns_400(self, user_token):
        r = requests.post(
            f"{API}/auth/kyc/documents",
            headers=_h(user_token),
            json={"doc_type": "bogus", "image_b64": SMALL_IMG_B64},
            timeout=20,
        )
        assert r.status_code == 400, r.text
        assert "doc_type must be one of" in (r.json().get("detail") or "")

    def test_image_too_small_returns_400(self, user_token):
        r = requests.post(
            f"{API}/auth/kyc/documents",
            headers=_h(user_token),
            json={"doc_type": "national_id", "image_b64": "tiny"},
            timeout=20,
        )
        assert r.status_code == 400, r.text
        assert "image_b64" in (r.json().get("detail") or "")

    def test_image_too_large_returns_400(self, user_token):
        big = "A" * (6 * 1024 * 1024 + 100)
        r = requests.post(
            f"{API}/auth/kyc/documents",
            headers=_h(user_token),
            json={"doc_type": "national_id", "image_b64": big},
            timeout=60,
        )
        assert r.status_code == 400, r.text
        assert "too large" in (r.json().get("detail") or "").lower()


# ── Upload + submit happy path ─────────────────────────────────────────
class TestKycUploadFlow:
    def test_upload_all_five_then_submit(self, user_token):
        # Upload each one sequentially
        for doc in DOC_TYPES:
            r = requests.post(
                f"{API}/auth/kyc/documents",
                headers=_h(user_token),
                json={"doc_type": doc, "image_b64": SMALL_IMG_B64},
                timeout=30,
            )
            assert r.status_code == 200, f"{doc} upload failed: {r.status_code} {r.text[:200]}"
            data = r.json()
            assert data["kyc_status"] == "pending_review"
            assert data["documents"].get(doc, {}).get("captured") is True

        # All 5 captured → submit succeeds
        r = requests.post(f"{API}/auth/kyc/submit", headers=_h(user_token), timeout=20)
        assert r.status_code == 200, r.text
        assert r.json()["kyc_status"] == "pending_review"

    def test_submit_with_missing_docs_returns_400(self, user_token, admin_token, user_id):
        # Reset by having admin reject one — easier: delete one doc via Mongo? Not accessible here.
        # Instead create a brand-new fresh user.
        import uuid
        fresh_phone = f"+25571{uuid.uuid4().int % 10000000:07d}"
        reg = requests.post(f"{API}/auth/register", json={"phone": fresh_phone, "password": "Demo1234!", "name": "Submit Empty"}, timeout=20)
        if reg.status_code not in (200, 201):
            pytest.skip(f"register failed: {reg.status_code} {reg.text[:200]}")
        tok, _ = _login({"phone": fresh_phone, "password": "Demo1234!"})
        r = requests.post(f"{API}/auth/kyc/submit", headers=_h(tok), timeout=20)
        assert r.status_code == 400, r.text
        detail = r.json().get("detail") or ""
        assert "Missing documents" in detail
        # All 5 should be in missing list
        for d in DOC_TYPES:
            assert d in detail


# ── Admin endpoints ────────────────────────────────────────────────────
class TestAdminKycEndpoints:
    def test_admin_get_seller_docs_excludes_image_b64(self, admin_token, user_id):
        r = requests.get(f"{API}/admin/sellers/{user_id}/documents", headers=_h(admin_token), timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        for k, v in data["documents"].items():
            assert "image_b64" not in v, f"image_b64 leaked for {k}"
            assert "size_bytes" in v

    def test_admin_get_nonexistent_user_404(self, admin_token):
        r = requests.get(f"{API}/admin/sellers/nonexistent_user_xyz/documents", headers=_h(admin_token), timeout=20)
        assert r.status_code == 404, r.text

    def test_admin_upload_doc_review_status_approved(self, admin_token, user_id):
        r = requests.post(
            f"{API}/admin/sellers/{user_id}/documents",
            headers=_h(admin_token),
            json={"doc_type": "tin_certificate", "image_b64": SMALL_IMG_B64},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["documents"]["tin_certificate"]["review_status"] == "approved"

    def test_admin_per_doc_reject(self, admin_token, user_id):
        r = requests.post(
            f"{API}/admin/sellers/{user_id}/kyc/review",
            headers=_h(admin_token),
            json={"doc_type": "national_id", "approve": False, "rejection_reason": "blurry"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["documents"]["national_id"]["review_status"] == "rejected"
        assert data["documents"]["national_id"]["rejection_reason"] == "blurry"

    def test_admin_whole_batch_approve_sets_is_verified(self, admin_token, user_id):
        r = requests.post(
            f"{API}/admin/sellers/{user_id}/kyc/review",
            headers=_h(admin_token),
            json={"approve": True},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["kyc_status"] == "approved"
        assert data["is_verified"] is True

    def test_non_admin_review_returns_403(self, user_token, user_id):
        r = requests.post(
            f"{API}/admin/sellers/{user_id}/kyc/review",
            headers=_h(user_token),
            json={"approve": True},
            timeout=20,
        )
        assert r.status_code == 403, r.text

    def test_unauthenticated_admin_review_returns_401(self, user_id):
        r = requests.post(
            f"{API}/admin/sellers/{user_id}/kyc/review",
            json={"approve": True},
            timeout=20,
        )
        assert r.status_code == 401, r.text
