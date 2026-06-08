"""Full happy-path: create-order-minimal → wallet-payment.

Confirms the entire Selcom flow Selcom support told us to use."""
import asyncio
import json
import os
import sys
import uuid
import base64

sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv  # noqa: E402
load_dotenv("/app/backend/.env")

import httpx  # noqa: E402
import selcom_client as sc  # noqa: E402


async def main():
    base = sc._cfg("SELCOM_BASE_URL").rstrip("/")
    vendor = sc._cfg("SELCOM_VENDOR")
    order_id = f"BSL-E2E-{uuid.uuid4().hex[:8].upper()}"
    transid = f"BSL-WAL-{uuid.uuid4().hex[:8].upper()}"
    webhook = "https://salama-secure.preview.emergentagent.com/api/payments/selcom/webhook"

    # ── STEP 1 ──
    payload1 = {
        "vendor": vendor,
        "order_id": order_id,
        "buyer_email": "test@biz-salama.co.tz",
        "buyer_name": "Selcom E2E Test",
        "buyer_phone": "255712345678",
        "amount": 1500,
        "currency": "TZS",
        "webhook": base64.b64encode(webhook.encode()).decode(),
        "buyer_remarks": "None",
        "merchant_remarks": "None",
        "no_of_items": 1,
    }
    signed1 = ["vendor", "order_id", "buyer_email", "buyer_name", "buyer_phone",
               "amount", "currency", "webhook", "buyer_remarks", "merchant_remarks",
               "no_of_items"]
    h1 = sc._build_headers(payload1, signed1)
    async with httpx.AsyncClient(timeout=20) as c:
        r1 = await c.post(f"{base}/checkout/create-order-minimal", json=payload1, headers=h1)
    body1 = r1.json()
    print("=" * 80)
    print("STEP 1 — create-order-minimal")
    print(f"  order_id: {order_id}")
    print(f"  HTTP {r1.status_code}  result={body1.get('result')}  msg={body1.get('message')}")
    if body1.get("result") != "SUCCESS":
        print("  ABORT:", json.dumps(body1))
        return

    data1 = body1["data"][0] if body1.get("data") else {}
    pay_token = data1.get("payment_token")
    gateway_url = data1.get("payment_gateway_url")
    if gateway_url:
        try:
            gateway_url_decoded = base64.b64decode(gateway_url).decode()
        except Exception:
            gateway_url_decoded = gateway_url
    else:
        gateway_url_decoded = None
    print(f"  payment_token: {pay_token}")
    print(f"  payment_gateway_url (decoded): {gateway_url_decoded}")

    # ── STEP 2 ──
    payload2 = {
        "transid": transid,
        "order_id": order_id,
        "msisdn": "255712345678",
    }
    signed2 = ["transid", "order_id", "msisdn"]
    h2 = sc._build_headers(payload2, signed2)
    async with httpx.AsyncClient(timeout=20) as c:
        r2 = await c.post(f"{base}/checkout/wallet-payment", json=payload2, headers=h2)
    try:
        body2 = r2.json()
    except Exception:
        body2 = {"raw": r2.text[:300]}
    print()
    print("=" * 80)
    print("STEP 2 — wallet-payment")
    print(f"  HTTP {r2.status_code}  →  {json.dumps(body2)}")


asyncio.run(main())
