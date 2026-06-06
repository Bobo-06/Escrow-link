"""Live sandbox smoke test — hits Selcom's real sandbox API.

Not a unit test (excluded by EXCLUDE_DIRS in security_lint). Run manually:
    cd /app/backend && python3 -m tests.test_selcom_sandbox_live
"""
import asyncio
import json
import os
import sys
import uuid

# Path bootstrap so `import selcom_client` works when run from /app/backend/tests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Load .env BEFORE importing selcom_client (it reads env at module scope).
from dotenv import load_dotenv  # noqa: E402
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
import selcom_client  # noqa: E402


async def main():
    print(f"Selcom configured: {selcom_client.is_configured()}")
    print(f"Vendor: {selcom_client.SELCOM_VENDOR}")
    print(f"Base:   {selcom_client.SELCOM_BASE_URL}")

    # 1. Checkout create-order
    order_id = f"BSL-TEST-{uuid.uuid4().hex[:10]}"
    print(f"\n=== POST /checkout/create-order  (order_id={order_id}) ===")
    res = await selcom_client.create_checkout_order(
        order_id=order_id,
        buyer_email="test@biz-salama.co.tz",
        buyer_name="Sandbox Test Buyer",
        buyer_phone="255712345678",
        amount=1500,
        redirect_url="https://www.biz-salama.co.tz/payment/selcom/callback",
        cancel_url="https://www.biz-salama.co.tz/payment/selcom/cancel",
        webhook_url="https://salama-secure.preview.emergentagent.com/api/payments/selcom/webhook",
    )
    print(json.dumps(res, indent=2, default=str)[:2000])

    # 2. Wallet push USSD
    transid = selcom_client.new_transid()
    print(f"\n=== POST /wallet/pushussd  (transid={transid}) ===")
    res2 = await selcom_client.wallet_push_ussd(
        transid=transid,
        utilityref=order_id,
        amount=1500,
        msisdn="255712345678",
    )
    print(json.dumps(res2, indent=2, default=str)[:2000])


if __name__ == "__main__":
    asyncio.run(main())
