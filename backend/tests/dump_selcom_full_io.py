"""Dump the FULL request/response for Selcom support.

Output is intended to be copy-pasted verbatim into a Selcom support ticket.
Both the wallet/pushussd and checkout/create-order endpoints are exercised.
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv  # noqa: E402
load_dotenv("/app/backend/.env")

import httpx  # noqa: E402
import selcom_client as sc  # noqa: E402


def line(c="="):
    print(c * 80)


def dump_request(method: str, url: str, headers: dict, body: dict):
    line()
    print(f"REQUEST  {method} {url}")
    line("-")
    print("HEADERS:")
    for k, v in headers.items():
        print(f"  {k}: {v}")
    print()
    print("BODY (JSON):")
    print(json.dumps(body, indent=2))


def dump_response(resp: httpx.Response):
    line("-")
    print(f"RESPONSE  HTTP {resp.status_code} {resp.reason_phrase}")
    line("-")
    print("HEADERS:")
    for k, v in resp.headers.items():
        print(f"  {k}: {v}")
    print()
    print("BODY:")
    try:
        print(json.dumps(resp.json(), indent=2))
    except Exception:
        print(resp.text)


async def call(label: str, url: str, payload: dict, signed_fields: list[str]):
    line("#")
    print(f"# {label}")
    line("#")
    headers = sc._build_headers(payload, signed_fields)
    dump_request("POST", url, headers, payload)
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(url, json=payload, headers=headers)
    dump_response(resp)
    print()


async def main():
    base = sc._cfg("SELCOM_BASE_URL").rstrip("/")
    vendor = sc._cfg("SELCOM_VENDOR")

    # ---- Outbound IP context ----
    line("#")
    print("# Source-IP context (what Selcom's gateway sees)")
    line("#")
    async with httpx.AsyncClient(timeout=10) as c:
        for svc in ("https://api.ipify.org", "https://ifconfig.me", "https://ipinfo.io/ip"):
            try:
                r = await c.get(svc)
                print(f"  {svc:35s} -> {r.text.strip()}")
            except Exception as e:
                print(f"  {svc:35s} -> ERROR {e}")
    print()

    # ---- 1. Checkout create-order ----
    co_payload = {
        "vendor": vendor,
        "order_id": "BSL-SUPPORT-DUMP-001",
        "buyer_email": "support-test@biz-salama.co.tz",
        "buyer_name": "Selcom Support Test",
        "buyer_phone": "255712345678",
        "amount": 1500,
        "currency": "TZS",
        "redirect_url": sc._b64("https://www.biz-salama.co.tz/payment/selcom/callback"),
        "cancel_url": sc._b64("https://www.biz-salama.co.tz/payment/selcom/cancel"),
        "webhook": sc._b64("https://www.biz-salama.co.tz/api/payments/selcom/webhook"),
        "buyer_remarks": "NONE",
        "merchant_remarks": "NONE",
        "no_of_items": 1,
    }
    co_signed = [
        "vendor", "order_id", "buyer_email", "buyer_name", "buyer_phone",
        "amount", "currency", "redirect_url", "cancel_url", "webhook",
        "buyer_remarks", "merchant_remarks", "no_of_items",
    ]
    await call("Endpoint 1: POST /v1/checkout/create-order",
               f"{base}/checkout/create-order", co_payload, co_signed)

    # ---- 2. Wallet push USSD ----
    wp_payload = {
        "transid": "BSL-SUPPORT-DUMP-PUSH-001",
        "utilityref": "BSL-SUPPORT-DUMP-001",
        "amount": 1500,
        "vendor": vendor,
        "msisdn": "255712345678",
    }
    wp_signed = ["transid", "utilityref", "amount", "vendor", "msisdn"]
    await call("Endpoint 2: POST /v1/wallet/pushussd",
               f"{base}/wallet/pushussd", wp_payload, wp_signed)

    # ---- 3. Show the canonical signing string for the first request ----
    line("#")
    print("# Canonical signing strings (for Selcom signature audit)")
    line("#")
    ts = sc._now_iso()
    print("Checkout signing string (timestamp= prefix + &field=value... in Signed-Fields order):")
    sig1 = sc._signing_string(ts, co_payload, co_signed)
    print(f"  {sig1}")
    print()
    print("Wallet-push signing string:")
    sig2 = sc._signing_string(ts, wp_payload, wp_signed)
    print(f"  {sig2}")


asyncio.run(main())
