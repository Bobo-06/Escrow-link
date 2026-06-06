"""Selcom Pay (Tanzania) gateway client.

Implements the documented signing scheme from developers.selcommobile.com:

    Authorization  = "SELCOM " + base64(API_KEY)
    Digest-Method  = "HS256"
    Digest         = base64( HMAC_SHA256(API_SECRET, signing_string) )
    Timestamp      = ISO-8601 with offset, e.g. "2026-02-15T09:30:46+03:00"
    Signed-Fields  = comma-separated payload field names, in order

Where signing_string is:

    "timestamp=<ts>&<f1>=<v1>&<f2>=<v2>&..."

with fields listed in the exact order of `Signed-Fields`. URL-valued payload
fields (`redirect_url`, `cancel_url`, `webhook`) are base64-encoded before
inclusion in the JSON body.

References:
- https://developers.selcommobile.com
- https://selcom-developers.github.io/node-selcom/

Endpoints used:
- POST {base}/checkout/create-order   — hosted checkout
- POST {base}/wallet/pushussd          — STK-like wallet push
- Webhook (inbound, our server)        — Selcom POSTs us payment status

Webhook signature verification follows the same HMAC scheme, but with
Selcom-supplied headers (Authorization / Digest / Signed-Fields / Timestamp).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ─────────────────────────── Config (env) ──────────────────────────────
# Env is read lazily via accessors so this module can be imported before
# `load_dotenv()` runs in the host app.

# East Africa Time (UTC+3) — Selcom expects offset-aware timestamps.
_EAT = timezone(timedelta(hours=3))


def _cfg(key: str, default: str = "") -> str:
    return os.environ.get(key, default)


# Backwards-compat module-level read (also lazy via __getattr__ below).
def __getattr__(name: str):
    mapping = {
        "SELCOM_VENDOR": ("SELCOM_VENDOR", ""),
        "SELCOM_API_KEY": ("SELCOM_API_KEY", ""),
        "SELCOM_SECRET": ("SELCOM_SECRET", ""),
        "SELCOM_BASE_URL": ("SELCOM_BASE_URL", "https://apigw.selcommobile.com/v1"),
    }
    if name in mapping:
        env_key, default = mapping[name]
        v = os.environ.get(env_key, default)
        if name == "SELCOM_BASE_URL":
            v = v.rstrip("/")
        return v
    raise AttributeError(name)


def is_configured() -> bool:
    return bool(_cfg("SELCOM_VENDOR") and _cfg("SELCOM_API_KEY") and _cfg("SELCOM_SECRET"))


# ─────────────────────────── Signing core ──────────────────────────────


def _b64(s: str) -> str:
    return base64.b64encode(s.encode("utf-8")).decode("ascii")


def _now_iso() -> str:
    """ISO-8601 in East Africa Time (UTC+3) — Selcom's expected format."""
    return datetime.now(_EAT).strftime("%Y-%m-%dT%H:%M:%S%z")[:-2] + ":" + datetime.now(_EAT).strftime("%z")[-2:]


def _signing_string(timestamp: str, payload: dict[str, Any], signed_fields: list[str]) -> str:
    """Build the canonical "timestamp=...&field=value&..." string.

    Values are taken straight from `payload` without re-quoting. Field order
    is the exact order of `signed_fields`. Numbers are str()-ified so the
    string matches what Selcom will reconstruct on its side from the JSON body.
    """
    parts = [f"timestamp={timestamp}"]
    for f in signed_fields:
        v = payload[f]  # KeyError here = developer bug — fail loud
        parts.append(f"{f}={v}")
    return "&".join(parts)


def _sign(secret: str, msg: str) -> str:
    return base64.b64encode(
        hmac.new(secret.encode("utf-8"), msg.encode("utf-8"), hashlib.sha256).digest()
    ).decode("ascii")


def _build_headers(payload: dict[str, Any], signed_fields: list[str]) -> dict[str, str]:
    """Build the 5 required Selcom auth headers for an outbound request."""
    ts = _now_iso()
    sig_str = _signing_string(ts, payload, signed_fields)
    digest = _sign(_cfg("SELCOM_SECRET"), sig_str)
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": f"SELCOM {_b64(_cfg('SELCOM_API_KEY'))}",
        "Digest-Method": "HS256",
        "Digest": digest,
        "Timestamp": ts,
        "Signed-Fields": ",".join(signed_fields),
    }


# ─────────────────────────── Public API ────────────────────────────────


async def create_checkout_order(
    *,
    order_id: str,
    buyer_email: str,
    buyer_name: str,
    buyer_phone: str,
    amount: int,  # integer TZS
    redirect_url: str,
    cancel_url: str,
    webhook_url: str,
    no_of_items: int = 1,
    buyer_remarks: str = "",
    merchant_remarks: str = "",
) -> dict[str, Any]:
    """POST {base}/checkout/create-order with correct signing.

    URL fields are base64-encoded as required by Selcom's spec. Buyer identity
    fields stay as plain UTF-8 strings.
    """
    if not is_configured():
        return {
            "ok": True,
            "simulated": True,
            "message": "Selcom not configured — simulated response",
            "order_id": order_id,
        }

    payload = {
        "vendor": _cfg("SELCOM_VENDOR"),
        "order_id": order_id,
        "buyer_email": buyer_email,
        "buyer_name": buyer_name,
        "buyer_phone": buyer_phone,
        "amount": int(amount),
        "currency": "TZS",
        "redirect_url": _b64(redirect_url),
        "cancel_url": _b64(cancel_url),
        "webhook": _b64(webhook_url),
        "buyer_remarks": buyer_remarks or "NONE",
        "merchant_remarks": merchant_remarks or "NONE",
        "no_of_items": int(no_of_items),
    }
    # IMPORTANT: signed-fields order must match the order Selcom verifies. The
    # documented ordering follows the table in the API reference.
    signed_fields = [
        "vendor",
        "order_id",
        "buyer_email",
        "buyer_name",
        "buyer_phone",
        "amount",
        "currency",
        "redirect_url",
        "cancel_url",
        "webhook",
        "buyer_remarks",
        "merchant_remarks",
        "no_of_items",
    ]
    headers = _build_headers(payload, signed_fields)
    url = f"{_cfg('SELCOM_BASE_URL', 'https://apigw.selcommobile.com/v1').rstrip('/')}/checkout/create-order"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
    try:
        body = resp.json()
    except Exception:
        body = {"raw": resp.text}
    return {"ok": resp.is_success, "status_code": resp.status_code, "selcom": body}


async def wallet_push_ussd(
    *,
    transid: str,
    utilityref: str,
    amount: int,
    msisdn: str,
) -> dict[str, Any]:
    """POST {base}/wallet/pushussd — STK-equivalent for Selcom wallet.

    Triggers the USSD PIN-entry prompt on the user's handset.
    """
    if not is_configured():
        return {
            "ok": True,
            "simulated": True,
            "status": "pending",
            "transid": transid,
        }

    payload = {
        "transid": transid,
        "utilityref": utilityref,
        "amount": int(amount),
        "vendor": _cfg("SELCOM_VENDOR"),
        "msisdn": msisdn,
    }
    signed_fields = ["transid", "utilityref", "amount", "vendor", "msisdn"]
    headers = _build_headers(payload, signed_fields)
    url = f"{_cfg('SELCOM_BASE_URL', 'https://apigw.selcommobile.com/v1').rstrip('/')}/wallet/pushussd"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(url, json=payload, headers=headers)
    try:
        body = resp.json()
    except Exception:
        body = {"raw": resp.text}
    return {"ok": resp.is_success, "status_code": resp.status_code, "selcom": body}


# ─────────────────────────── Webhook verify ────────────────────────────


def verify_webhook(
    *,
    headers: dict[str, str],
    body_json: dict[str, Any],
    max_skew_seconds: int = 600,
) -> tuple[bool, str | None]:
    """Verify an inbound Selcom webhook signature.

    Selcom signs callbacks using the same canonical
    `timestamp=...&field=value&...` HMAC scheme. We rebuild the string from
    the headers and JSON body and compare with the supplied `Digest` using
    constant-time comparison.

    Returns (is_valid, error_reason).
    """
    if not is_configured():
        return False, "selcom not configured"

    # Header keys are case-insensitive — normalise once.
    h = {k.lower(): v for k, v in headers.items()}
    sig = h.get("digest")
    signed = h.get("signed-fields")
    ts = h.get("timestamp")
    if not (sig and signed and ts):
        return False, "missing signature headers"

    # Optional replay window. Selcom's webhook timestamp format is
    # `yyyy-dd-mm H:i:s` per the node-selcom docs — but in practice we also
    # accept ISO-8601 to be forgiving across docs versions.
    try:
        # Try ISO-8601 first
        parsed = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime.strptime(ts, "%Y-%d-%m %H:%M:%S").replace(tzinfo=_EAT)
        except ValueError:
            return False, f"unparseable timestamp: {ts!r}"
    now_eat = datetime.now(_EAT)
    if abs((now_eat - parsed).total_seconds()) > max_skew_seconds:
        return False, "timestamp skew exceeds window"

    signed_fields = [s.strip() for s in signed.split(",") if s.strip()]
    try:
        sig_str = _signing_string(ts, body_json, signed_fields)
    except KeyError as e:
        return False, f"signed-field {e} missing from payload"

    expected = _sign(_cfg("SELCOM_SECRET"), sig_str)
    if not hmac.compare_digest(expected, sig):
        return False, "digest mismatch"
    return True, None


def new_transid(prefix: str = "BSL") -> str:
    """Helper — generate a unique transaction id for wallet push."""
    return f"{prefix}-{uuid.uuid4().hex[:14].upper()}"
