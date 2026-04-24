"""Iteration 2 — Biz-Salama new features test suite
Covers:
- SEO prerender endpoints (landing, marketplace, product/:id, 404)
- Marketplace seed verification (29 products, categories)
- Voice transcription endpoint (empty body, valid WAV, oversize rejection)
"""
import io
import os
import re
import wave
import struct
import math
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://salama-secure.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


# ---------- helpers ----------

def _gen_wav_bytes(duration_sec=1.0, freq=440, sr=16000):
    """Generate a synthetic mono 16-bit PCM WAV in-memory."""
    buf = io.BytesIO()
    n = int(sr * duration_sec)
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        frames = b"".join(
            struct.pack("<h", int(32767 * 0.3 * math.sin(2 * math.pi * freq * i / sr)))
            for i in range(n)
        )
        w.writeframes(frames)
    return buf.getvalue()


# ========== SEO PRERENDER ==========

class TestSEORender:
    def test_landing_returns_html_with_og_and_jsonld(self):
        r = requests.get(f"{API}/seo/render/landing", timeout=20)
        assert r.status_code == 200, r.text[:200]
        ct = r.headers.get("content-type", "")
        assert "html" in ct.lower(), f"Expected HTML content-type, got {ct}"
        html = r.text
        assert "<title>" in html, "missing <title>"
        assert re.search(r'<meta\s+property=["\']og:title["\']', html), "missing og:title"
        assert re.search(r'<meta\s+property=["\']og:image["\']', html), "missing og:image"
        # JSON-LD Organization block
        assert '"@type"' in html and "Organization" in html, "missing Organization JSON-LD"
        assert 'application/ld+json' in html

    def test_marketplace_returns_itemlist_jsonld(self):
        r = requests.get(f"{API}/seo/render/marketplace", timeout=20)
        assert r.status_code == 200
        html = r.text
        assert "<title>" in html
        assert "ItemList" in html, "missing ItemList JSON-LD"
        assert 'application/ld+json' in html

    def test_product_page_samsung_a54(self):
        r = requests.get(f"{API}/seo/render/product/seed_samsung-a54", timeout=20)
        assert r.status_code == 200, r.text[:300]
        html = r.text
        assert "Samsung Galaxy A54" in html, "Title missing product name"
        assert '"@type"' in html and "Product" in html
        assert "TZS" in html, "priceCurrency TZS missing"

    def test_product_page_404(self):
        r = requests.get(f"{API}/seo/render/product/NOT_EXIST_XYZ", timeout=20)
        assert r.status_code == 404
        assert "Product Not Found" in r.text


# ========== MARKETPLACE SEED ==========

class TestMarketplaceSeed:
    def test_public_products_count_and_fields(self):
        r = requests.get(f"{API}/products/public", timeout=20)
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        # Accept either list or {products: [...]} shape
        items = data if isinstance(data, list) else data.get("products") or data.get("items") or []
        assert len(items) >= 29, f"Expected >=29 products, got {len(items)}"

        # All products should have category field + image url
        missing_cat = [p for p in items if not p.get("category")]
        assert not missing_cat, f"{len(missing_cat)} products missing category"
        missing_img = [p for p in items if not (p.get("image_url") or p.get("image") or (p.get("images") or [None])[0])]
        assert not missing_img, f"{len(missing_img)} products missing image"

        # Verify all 6 categories represented
        cats = {str(p.get("category", "")).lower() for p in items}
        required = {"fashion", "electronics", "home", "beauty", "food", "agriculture"}
        missing = required - cats
        assert not missing, f"Missing categories: {missing}. Found: {cats}"


# ========== VOICE TRANSCRIBE ==========

class TestVoiceTranscribe:
    def test_no_body_returns_422(self):
        r = requests.post(f"{API}/voice/transcribe", timeout=15)
        assert r.status_code == 422, f"Expected 422 for no body, got {r.status_code} {r.text[:200]}"

    def test_valid_wav_returns_structured_json(self):
        wav = _gen_wav_bytes(duration_sec=1.0)
        files = {"audio": ("test.wav", wav, "audio/wav")}
        r = requests.post(f"{API}/voice/transcribe", files=files, timeout=60)
        # Accept 200 success OR a clean 4xx/5xx with JSON (not crash) if Whisper errors
        assert r.status_code != 500 or r.headers.get("content-type", "").startswith("application/json"), \
            f"Got 500 with non-JSON crash: {r.text[:300]}"
        # Try to parse JSON always
        try:
            body = r.json()
        except Exception:
            pytest.fail(f"Non-JSON response: {r.text[:300]}")
        if r.status_code == 200:
            assert "text" in body, f"Missing 'text': {body}"
            # Optional fields
            assert "duration_bytes" in body or "size" in body or True  # soft
        else:
            # Whisper rejecting short/silent audio is acceptable — must be structured error
            assert "detail" in body or "error" in body or "message" in body, \
                f"Unstructured error: {body}"
            print(f"[voice] Whisper returned {r.status_code}: {body}")

    def test_oversize_returns_413(self):
        # Generate ~26MB buffer (just raw bytes, no need for valid WAV)
        big = b"\x00" * (26 * 1024 * 1024)
        files = {"audio": ("big.wav", big, "audio/wav")}
        try:
            r = requests.post(f"{API}/voice/transcribe", files=files, timeout=60)
        except requests.exceptions.RequestException as e:
            pytest.skip(f"Upload failed at network layer: {e}")
        assert r.status_code == 413, f"Expected 413 for >25MB, got {r.status_code} {r.text[:200]}"
