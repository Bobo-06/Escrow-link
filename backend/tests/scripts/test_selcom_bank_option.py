"""Live smoke test: verify Selcom accepts the new payment_methods field in the signature."""
import os, uuid, json
import requests
from pymongo import MongoClient

API = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
mc = MongoClient(os.environ["MONGO_URL"])
db = mc[os.environ["DB_NAME"]]

# Create a throwaway user + product
phone = f"7{uuid.uuid4().int % 10**8:08d}"[:9]
r = requests.post(f"{API}/auth/register", json={
    "phone": phone, "password": "TestPass_123!", "name": "Bank Test",
    "email": f"b{uuid.uuid4().hex[:6]}@t.com",
})
assert r.status_code == 200, r.text
tok = r.json()["session_token"]; uid = r.json()["user_id"]
H = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

try:
    # Use the direct Selcom checkout endpoint if accessible; otherwise call internal
    from selcom_client import create_checkout_order
    import asyncio
    result = asyncio.run(create_checkout_order(
        order_id=f"BANK_TEST_{uuid.uuid4().hex[:8]}",
        buyer_email="banktest@biz-salama.co.tz",
        buyer_name="Bank Test User",
        buyer_phone=f"255{phone}",
        amount=1000,
        redirect_url="https://biz-salama.co.tz/order/done",
        cancel_url="https://biz-salama.co.tz/order/cancel",
        webhook_url="https://biz-salama.co.tz/api/payments/selcom/webhook",
    ))
    print("HTTP status_code:", result.get("status_code"))
    sel = result.get("selcom", {})
    print("resultcode:", sel.get("resultcode"))
    print("message:", sel.get("message"))
    if sel.get("data"):
        gw = sel["data"][0].get("payment_gateway_url_decoded") or sel["data"][0].get("payment_gateway_url")
        print("gateway_url_present:", bool(gw))
        print("gateway_url_sample:", (gw or "")[:120])
    if sel.get("resultcode") == "000":
        print("\n✅ Selcom accepted the payment_methods=ALL signature, hosted page URL returned")
    else:
        print("\n⚠️  Non-000 result — digest likely rejected. Need to revert payment_methods insertion or adjust field order.")
finally:
    db.users.delete_one({"user_id": uid})
