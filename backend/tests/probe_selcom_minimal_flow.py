"""Test the create-order-minimal + wallet-payment flow Selcom told us to use.

Reference:
  https://developers.selcommobile.com/#create-order-minimal
  https://developers.selcommobile.com/#process-order-wallet-pull-payment
"""
import asyncio
import json
import os
import sys
import uuid

sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv  # noqa: E402
load_dotenv("/app/backend/.env")

import httpx  # noqa: E402
import selcom_client as sc  # noqa: E402


def line(c="="):
    print(c * 80)


async def post(label: str, url: str, payload: dict, signed_fields: list[str]):
    headers = sc._build_headers(payload, signed_fields)
    line()
    print(f"# {label}")
    print(f"POST {url}")
    print("Signed-Fields:", ",".join(signed_fields))
    print("Body:", json.dumps(payload))
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(url, json=payload, headers=headers)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text[:300]}
    print(f"HTTP {r.status_code}  →  {json.dumps(body)[:500]}")
    return body


async def main():
    base = sc._cfg("SELCOM_BASE_URL").rstrip("/")
    vendor = sc._cfg("SELCOM_VENDOR")
    order_id = f"BSL-MIN-{uuid.uuid4().hex[:8].upper()}"
    transid = f"BSL-WPL-{uuid.uuid4().hex[:8].upper()}"
    msisdn = "255712345678"

    # ── STEP 1: create-order-minimal ──────────────────────────────────────
    # Per docs: webhook is a RAW URL here (NOT base64) — different from full
    # create-order. Per the docs' own inconsistency, the signed-fields header
    # lists slightly different names than the body. Try the body-field
    # ordering first; if that fails, fall back to the doc-header naming.
    payload1 = {
        "vendor": vendor,
        "order_id": order_id,
        "buyer_email": "test@biz-salama.co.tz",
        "buyer_name": "Selcom Test",
        "buyer_phone": msisdn,
        "amount": 1500,
        "currency": "TZS",
        "webhook": "https://salama-secure.preview.emergentagent.com/api/payments/selcom/webhook",
        "buyer_remarks": "None",
        "merchant_remarks": "None",
        "no_of_items": 1,
    }
    signed1_A = [
        "vendor", "order_id", "buyer_email", "buyer_name", "buyer_phone",
        "amount", "currency", "webhook", "buyer_remarks", "merchant_remarks",
        "no_of_items",
    ]
    res1 = await post(
        "STEP 1A — create-order-minimal (body-field naming)",
        f"{base}/checkout/create-order-minimal", payload1, signed1_A,
    )

    # Also try the doc-header naming if 1A fails for signature reasons
    if not (res1 and res1.get("result") == "SUCCESS"):
        # Try the names listed in the header example
        payload1B = {
            "vendor": vendor,
            "order_id": order_id + "-B",
            "buyer_email": "test@biz-salama.co.tz",
            "buyer_name": "Selcom Test",
            "buyer_user_id": "BSL-USER-1",
            "buyer_phone": msisdn,
            "amount": 1500,
            "currency": "TZS",
            "payment_methods": "ALL",
            "webhook": "https://salama-secure.preview.emergentagent.com/api/payments/selcom/webhook",
            "payer_remarks": "None",
            "merchant_remarks": "None",
            "order_items": 1,
        }
        signed1_B = [
            "vendor", "order_id", "buyer_email", "buyer_name", "buyer_user_id",
            "buyer_phone", "amount", "currency", "payment_methods", "webhook",
            "payer_remarks", "merchant_remarks", "order_items",
        ]
        res1B = await post(
            "STEP 1B — create-order-minimal (doc-header naming)",
            f"{base}/checkout/create-order-minimal", payload1B, signed1_B,
        )
        if res1B and res1B.get("result") == "SUCCESS":
            order_id = payload1B["order_id"]
            res1 = res1B

    # ── STEP 2: wallet-payment (only if create succeeded) ────────────────
    if res1 and res1.get("result") == "SUCCESS":
        payload2 = {
            "transid": transid,
            "order_id": order_id,
            "msisdn": msisdn,
        }
        signed2 = ["transid", "order_id", "msisdn"]
        await post(
            "STEP 2 — wallet-payment",
            f"{base}/checkout/wallet-payment", payload2, signed2,
        )
    else:
        print("\n⚠️  Skipping STEP 2: create-order-minimal did not succeed.")


asyncio.run(main())
