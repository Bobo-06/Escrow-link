"""Probe Selcom sandbox with credential-format variants to isolate the 403."""
import asyncio
import base64
import hashlib
import hmac
import os
import sys
from datetime import datetime, timezone, timedelta

import httpx

sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv  # noqa: E402
load_dotenv("/app/backend/.env")

VENDOR_FULL = os.environ["SELCOM_VENDOR"]
APIKEY_FULL = os.environ["SELCOM_API_KEY"]
SECRET_FULL = os.environ["SELCOM_SECRET"]
BASE = os.environ["SELCOM_BASE_URL"].rstrip("/")
EAT = timezone(timedelta(hours=3))


def iso_eat():
    t = datetime.now(EAT)
    s = t.strftime("%Y-%m-%dT%H:%M:%S%z")
    return s[:-2] + ":" + s[-2:]


def sign(secret: str, msg: str) -> str:
    return base64.b64encode(
        hmac.new(secret.encode(), msg.encode(), hashlib.sha256).digest()
    ).decode()


def b64(s: str) -> str:
    return base64.b64encode(s.encode()).decode()


async def try_variant(name: str, *, api_key: str, secret: str, auth_encode: bool, vendor: str):
    """Make a wallet/pushussd call with the given credential mutation."""
    ts = iso_eat()
    payload = {
        "transid": f"PROBE-{name[:8]}",
        "utilityref": f"REF-{name[:8]}",
        "amount": 100,
        "vendor": vendor,
        "msisdn": "255712345678",
    }
    signed_fields = ["transid", "utilityref", "amount", "vendor", "msisdn"]
    sig_str = f"timestamp={ts}&" + "&".join(f"{k}={payload[k]}" for k in signed_fields)
    digest = sign(secret, sig_str)
    auth_token = b64(api_key) if auth_encode else api_key
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"SELCOM {auth_token}",
        "Digest-Method": "HS256",
        "Digest": digest,
        "Timestamp": ts,
        "Signed-Fields": ",".join(signed_fields),
    }
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{BASE}/wallet/pushussd", json=payload, headers=headers)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text[:200]}
    msg = body.get("message", "—") if isinstance(body, dict) else "—"
    rc = body.get("resultcode", "—") if isinstance(body, dict) else "—"
    ref = body.get("reference", "—") if isinstance(body, dict) else "—"
    print(f"  http={r.status_code:3d}  resultcode={rc:>4s}  ref={ref:<14s}  msg={msg}")
    return body


SUFFIX_ONLY = APIKEY_FULL.split("-", 1)[1] if "-" in APIKEY_FULL else APIKEY_FULL
SECRET_NO_HYPHEN = SECRET_FULL.replace("-", "")
SECRET_B64DECODED = None
try:
    # Try interpreting secret as already base64
    SECRET_B64DECODED = base64.b64decode(SECRET_FULL + "==").decode("latin-1", errors="replace")
except Exception as e:
    SECRET_B64DECODED = f"<not b64: {e}>"


async def main():
    print("\n=== BASELINE (current code) — full keys, base64 Authorization ===")
    await try_variant("BASELINE", api_key=APIKEY_FULL, secret=SECRET_FULL, auth_encode=True, vendor=VENDOR_FULL)

    print("\n=== VARIANT A — API key WITHOUT vendor prefix (use only suffix) ===")
    print(f"  apikey={SUFFIX_ONLY!r}")
    await try_variant("A_SUFFIX", api_key=SUFFIX_ONLY, secret=SECRET_FULL, auth_encode=True, vendor=VENDOR_FULL)

    print("\n=== VARIANT B — Secret WITHOUT hyphens ===")
    print(f"  secret={SECRET_NO_HYPHEN!r}")
    await try_variant("B_SECNOHY", api_key=APIKEY_FULL, secret=SECRET_NO_HYPHEN, auth_encode=True, vendor=VENDOR_FULL)

    print("\n=== VARIANT C — API key NOT base64 in Authorization (raw) ===")
    await try_variant("C_RAW", api_key=APIKEY_FULL, secret=SECRET_FULL, auth_encode=False, vendor=VENDOR_FULL)

    print("\n=== VARIANT D — suffix-only API key + NO-hyphen secret ===")
    await try_variant("D_BOTH", api_key=SUFFIX_ONLY, secret=SECRET_NO_HYPHEN, auth_encode=True, vendor=VENDOR_FULL)

    print("\n=== VARIANT E — suffix-only API key + raw Authorization ===")
    await try_variant("E_SFXRAW", api_key=SUFFIX_ONLY, secret=SECRET_FULL, auth_encode=False, vendor=VENDOR_FULL)

    print("\n=== VARIANT F — secret interpreted as already-base64, decoded ===")
    if isinstance(SECRET_B64DECODED, str) and not SECRET_B64DECODED.startswith("<"):
        await try_variant("F_B64DEC", api_key=APIKEY_FULL, secret=SECRET_B64DECODED, auth_encode=True, vendor=VENDOR_FULL)
    else:
        print(f"  skipped: {SECRET_B64DECODED}")

    print("\n=== VARIANT G — bogus signature (should still echo SAME 'API User not found' if signature is irrelevant to that error) ===")
    await try_variant("G_BADSIG", api_key=APIKEY_FULL, secret="WRONG-SECRET-DELIBERATELY", auth_encode=True, vendor=VENDOR_FULL)


asyncio.run(main())
