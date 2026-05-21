"""Iter15 — Admin bulk CSV seller import tests.

Covers POST /api/admin/sellers/bulk-csv:
- happy path (3 fresh rows)
- mixed (valid + invalid phone + duplicate)
- missing required header
- empty csv_text → 400
- oversized csv_text → 413
- non-admin → 403
- unauthenticated → 401
- case-insensitive headers
- created sellers visible in GET /api/admin/sellers
"""
from __future__ import annotations

import os
import random
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_PHONE = "+255700000001"
ADMIN_PASS = "AdminPass123!"
NONADMIN_PHONE = "+255712345678"
NONADMIN_PASS = "test1234"


def _login(phone: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login", json={"phone": phone, "password": password}, timeout=20)
    assert r.status_code == 200, f"Login {phone} failed: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def admin_token() -> str:
    return _login(ADMIN_PHONE, ADMIN_PASS)


@pytest.fixture(scope="module")
def nonadmin_token() -> str:
    return _login(NONADMIN_PHONE, NONADMIN_PASS)


@pytest.fixture(scope="module")
def admin_headers(admin_token: str) -> dict:
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def nonadmin_headers(nonadmin_token: str) -> dict:
    return {"Authorization": f"Bearer {nonadmin_token}", "Content-Type": "application/json"}


def _rand_phone() -> str:
    """Generate a fresh TZ phone in 071xxxxxxx form (10 digits: 0+712+6 random)."""
    return "0712" + "".join(random.choices("0123456789", k=6))


# Module-level state to share between tests
created_phones: list[str] = []
created_user_ids: list[str] = []
existing_phone_for_dup: str | None = None


class TestBulkCsvImport:
    def test_01_happy_path_three_fresh_rows(self, admin_headers):
        p1, p2, p3 = _rand_phone(), _rand_phone(), _rand_phone()
        # ensure uniqueness in batch
        while len({p1, p2, p3}) < 3:
            p1, p2, p3 = _rand_phone(), _rand_phone(), _rand_phone()
        csv_text = (
            "name,phone,email,business_name,location,bio\n"
            f"TEST_iter15_a,{p1},,TEST_iter15_biz_a,Dar,bio-a\n"
            f"TEST_iter15_b,{p2},,,Arusha,\n"
            f"TEST_iter15_c,{p3},,,,\n"
        )
        r = requests.post(f"{API}/admin/sellers/bulk-csv",
                          headers=admin_headers, json={"csv_text": csv_text}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["summary"] == {"created": 3, "failed": 0, "total_rows": 3}, data["summary"]
        assert len(data["created"]) == 3
        assert data["errors"] == []
        for entry in data["created"]:
            assert entry["user_id"].startswith("user_")
            assert entry["name"].startswith("TEST_iter15_")
            assert entry["phone"].startswith("+255")
            assert entry["set_password_link"] and "/reset-password?token=" in entry["set_password_link"]
            created_phones.append(entry["phone"])
            created_user_ids.append(entry["user_id"])
        # Save the first phone for duplicate test
        global existing_phone_for_dup
        existing_phone_for_dup = created_phones[0]

    def test_02_mixed_valid_invalid_duplicate(self, admin_headers):
        assert existing_phone_for_dup is not None, "prior test must have run"
        v1, v2 = _rand_phone(), _rand_phone()
        while v1 == v2:
            v2 = _rand_phone()
        csv_text = (
            "name,phone,email,business_name,location,bio\n"
            f"TEST_iter15_valid1,{v1},,,,\n"
            f"TEST_iter15_valid2,{v2},,,,\n"
            f"TEST_iter15_bad,abc,,,,\n"
            f"TEST_iter15_dup,{existing_phone_for_dup},,,,\n"
        )
        r = requests.post(f"{API}/admin/sellers/bulk-csv",
                          headers=admin_headers, json={"csv_text": csv_text}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["summary"]["created"] == 2, data
        assert data["summary"]["failed"] == 2, data
        assert data["summary"]["total_rows"] == 4, data
        # Find error rows
        errs = data["errors"]
        assert len(errs) == 2
        bad_err = next((e for e in errs if e.get("phone") == "abc"), None)
        dup_err = next((e for e in errs if e.get("phone") == existing_phone_for_dup), None)
        assert bad_err is not None, errs
        assert "Invalid TZ phone" in bad_err["error"], bad_err
        assert "row" in bad_err and bad_err["row"] is not None
        assert dup_err is not None, errs
        assert dup_err["error"].startswith("PHONE_EXISTS"), dup_err
        # cleanup tracking
        for e in data["created"]:
            created_phones.append(e["phone"])
            created_user_ids.append(e["user_id"])

    def test_03_missing_required_header(self, admin_headers):
        csv_text = "phone\n+255713111222\n"
        r = requests.post(f"{API}/admin/sellers/bulk-csv",
                          headers=admin_headers, json={"csv_text": csv_text}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["summary"]["created"] == 0, data
        assert len(data["errors"]) >= 1
        row0 = [e for e in data["errors"] if e.get("row") == 0]
        assert len(row0) == 1
        assert row0[0]["error"].startswith("Missing required column(s):"), row0[0]

    def test_04_empty_csv_text(self, admin_headers):
        r = requests.post(f"{API}/admin/sellers/bulk-csv",
                          headers=admin_headers, json={"csv_text": ""}, timeout=20)
        assert r.status_code == 400, r.text
        assert "empty" in r.json().get("detail", "").lower()

    def test_04b_whitespace_csv_text(self, admin_headers):
        r = requests.post(f"{API}/admin/sellers/bulk-csv",
                          headers=admin_headers, json={"csv_text": "   \n  "}, timeout=20)
        assert r.status_code == 400, r.text

    def test_05_oversized_csv_text(self, admin_headers):
        big = "name,phone\n" + ("TEST_iter15_x,0712000000\n" * 12000)  # >256 KB
        assert len(big) > 256 * 1024
        r = requests.post(f"{API}/admin/sellers/bulk-csv",
                          headers=admin_headers, json={"csv_text": big}, timeout=30)
        assert r.status_code == 413, f"{r.status_code} {r.text[:200]}"

    def test_06_nonadmin_forbidden(self, nonadmin_headers):
        csv_text = "name,phone\nTEST_iter15_x,0712000111\n"
        r = requests.post(f"{API}/admin/sellers/bulk-csv",
                          headers=nonadmin_headers, json={"csv_text": csv_text}, timeout=20)
        assert r.status_code == 403, r.text
        assert "admin" in r.json().get("detail", "").lower()

    def test_07_unauthenticated(self):
        csv_text = "name,phone\nTEST_iter15_x,0712000111\n"
        r = requests.post(f"{API}/admin/sellers/bulk-csv",
                          json={"csv_text": csv_text}, timeout=20)
        assert r.status_code == 401, r.text

    def test_08_case_insensitive_headers(self, admin_headers):
        p = _rand_phone()
        csv_text = (
            "Name,Phone,Business_Name\n"
            f"TEST_iter15_case,{p},TEST_iter15_biz_case\n"
        )
        r = requests.post(f"{API}/admin/sellers/bulk-csv",
                          headers=admin_headers, json={"csv_text": csv_text}, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["summary"] == {"created": 1, "failed": 0, "total_rows": 1}, data
        entry = data["created"][0]
        assert entry["name"] == "TEST_iter15_case"
        created_phones.append(entry["phone"])
        created_user_ids.append(entry["user_id"])

    def test_09_created_visible_in_list(self, admin_headers):
        assert created_user_ids, "previous tests must have created sellers"
        r = requests.get(f"{API}/admin/sellers", headers=admin_headers, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        sellers = body["sellers"] if isinstance(body, dict) else body
        assert isinstance(sellers, list)
        # Build map for fast lookup
        by_id = {s["user_id"]: s for s in sellers}
        # Sample first created user (most recently created should be present)
        sample_uid = created_user_ids[0]
        assert sample_uid in by_id, f"created seller {sample_uid} missing from GET /admin/sellers"
        seller = by_id[sample_uid]
        assert seller.get("auth_type") == "password_pending", seller
        assert seller.get("is_verified") is True, seller


class TestRegression:
    """Iter14 regression smoke — ensure single-row endpoints + auth still work."""

    def test_10_single_row_post(self, admin_headers):
        p = _rand_phone()
        r = requests.post(
            f"{API}/admin/sellers",
            headers=admin_headers,
            json={
                "name": "TEST_iter15_single",
                "phone": p,
                "business_name": "TEST_iter15_single_biz",
                "location": "Dar",
            },
            timeout=20,
        )
        assert r.status_code in (200, 201), r.text
        data = r.json()
        assert data.get("user_id", "").startswith("user_")
        assert data.get("auth_type") == "password_pending"
        # capture for next tests
        TestRegression.single_uid = data["user_id"]

    def test_11_get_sellers(self, admin_headers):
        r = requests.get(f"{API}/admin/sellers", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        body = r.json()
        # API may return list or {count, sellers}
        if isinstance(body, dict):
            assert "sellers" in body
            assert isinstance(body["sellers"], list)
        else:
            assert isinstance(body, list)

    def test_12_patch_seller(self, admin_headers):
        uid = getattr(TestRegression, "single_uid", None)
        if not uid:
            pytest.skip("single_row test did not run")
        r = requests.patch(
            f"{API}/admin/sellers/{uid}",
            headers=admin_headers,
            json={"location": "Mwanza"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        assert r.json().get("location") == "Mwanza"

    def test_13_resend_link(self, admin_headers):
        uid = getattr(TestRegression, "single_uid", None)
        if not uid:
            pytest.skip("single_row test did not run")
        r = requests.post(
            f"{API}/admin/sellers/{uid}/resend-password-link",
            headers=admin_headers,
            timeout=20,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("sent") is True
        assert "/reset-password?token=" in body.get("set_password_link", "")

    def test_14_set_password_with_token(self, admin_headers):
        uid = getattr(TestRegression, "single_uid", None)
        if not uid:
            pytest.skip("single_row test did not run")
        # Get fresh token via resend
        r = requests.post(
            f"{API}/admin/sellers/{uid}/resend-password-link",
            headers=admin_headers, timeout=20,
        )
        assert r.status_code == 200, r.text
        link = r.json()["set_password_link"]
        # Parse token + phone from link
        import urllib.parse as up
        qs = up.urlparse(link).query
        params = dict(up.parse_qsl(qs))
        token = params["token"]
        phone = params["phone"]
        r2 = requests.post(
            f"{API}/auth/set-password-with-token",
            json={"token": token, "phone": phone, "new_password": "NewPass123!"},
            timeout=20,
        )
        assert r2.status_code == 200, r2.text
        # Verify can now login
        r3 = requests.post(f"{API}/auth/login",
                           json={"phone": phone, "password": "NewPass123!"}, timeout=20)
        assert r3.status_code == 200, r3.text
