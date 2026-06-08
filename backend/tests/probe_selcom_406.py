"""Try create-order-minimal with various Content-Type / encoding combinations
to track down the 406 Not Acceptable."""
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


async def try_post(label: str, url: str, payload: dict, signed_fields: list[str],
                   content_type: str = "application/json", as_form: bool = False):
    headers = sc._build_headers(payload, signed_fields)
    headers["Content-Type"] = content_type
    print(f"\n# {label}")
    print(f"  Content-Type: {content_type}  as_form={as_form}")
    async with httpx.AsyncClient(timeout=20) as c:
        if as_form:
            r = await c.post(url, data=payload, headers=headers)
        else:
            r = await c.post(url, json=payload, headers=headers)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text[:300]}
    print(f"  HTTP {r.status_code}  →  {json.dumps(body)[:400]}")
    return r.status_code, body


def b64(s: str) -> str:
    import base64
    return base64.b64encode(s.encode()).decode()


async def main():
    base = sc._cfg("SELCOM_BASE_URL").rstrip("/")
    vendor = sc._cfg("SELCOM_VENDOR")
    url = f"{base}/checkout/create-order-minimal"

    def gen_payload(b64_webhook: bool, amount_int: bool, n=1):
        oid = f"BSL-{uuid.uuid4().hex[:8]}"
        webhook = "https://salama-secure.preview.emergentagent.com/api/payments/selcom/webhook"
        return {
            "vendor": vendor,
            "order_id": oid,
            "buyer_email": "test@biz-salama.co.tz",
            "buyer_name": "Selcom Test",
            "buyer_phone": "255712345678",
            "amount": 1500 if amount_int else "1500",
            "currency": "TZS",
            "webhook": b64(webhook) if b64_webhook else webhook,
            "buyer_remarks": "None",
            "merchant_remarks": "None",
            "no_of_items": n,
        }

    signed = ["vendor", "order_id", "buyer_email", "buyer_name", "buyer_phone",
              "amount", "currency", "webhook", "buyer_remarks", "merchant_remarks",
              "no_of_items"]

    # V1: JSON body, raw webhook, int amount
    await try_post("V1 JSON / raw webhook / int amount", url, gen_payload(False, True), signed)

    # V2: JSON body, base64 webhook, int amount
    await try_post("V2 JSON / base64 webhook / int amount", url, gen_payload(True, True), signed)

    # V3: JSON body, base64 webhook, string amount
    await try_post("V3 JSON / base64 webhook / string amount", url, gen_payload(True, False), signed)

    # V4: Form-urlencoded body, raw webhook
    await try_post("V4 form-urlencoded / raw webhook / int amount",
                   url, gen_payload(False, True), signed,
                   content_type="application/x-www-form-urlencoded", as_form=True)

    # V5: Form-urlencoded body, base64 webhook
    await try_post("V5 form-urlencoded / base64 webhook / int amount",
                   url, gen_payload(True, True), signed,
                   content_type="application/x-www-form-urlencoded", as_form=True)

    # V6: Minimal-minimal: only the fields shown in docs sample, no remarks/items
    p6 = {
        "vendor": vendor,
        "order_id": f"BSL-{uuid.uuid4().hex[:8]}",
        "buyer_email": "test@biz-salama.co.tz",
        "buyer_name": "Selcom Test",
        "buyer_phone": "255712345678",
        "amount": 1500,
        "currency": "TZS",
        "webhook": b64("https://salama-secure.preview.emergentagent.com/api/payments/selcom/webhook"),
    }
    s6 = ["vendor", "order_id", "buyer_email", "buyer_name", "buyer_phone",
          "amount", "currency", "webhook"]
    await try_post("V6 reduced body, base64 webhook", url, p6, s6)


asyncio.run(main())
