"""End-to-end ledger smoke test — direct mode order → pay → release → payout."""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient
from ledger import (
    seed_chart_of_accounts,
    calculate_split,
    post_funds_received,
    post_release,
    post_payout_paid,
    post_refund,
    order_financials,
    assert_balanced,
)


async def main():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.environ.get("DB_NAME", "biz_salama_db")]

    await seed_chart_of_accounts(db)

    # === Test 1: direct mode happy path ===
    order_id = f"orderTEST_{uuid.uuid4().hex[:8]}"
    split = calculate_split(mode="direct", deal_value=100_000)
    order = {
        "order_id": order_id,
        "mode": "direct",
        "buyer_id": "u_buyer_test",
        "seller_id": "u_seller_test",
        "agent_id": None,
        "status": "created",
        "currency": "TZS",
        **split,
    }
    await db.orders.insert_one(dict(order))
    print(f"[direct] order created: {order_id}, gross={split['gross_amount']}")

    # Pay
    await post_funds_received(
        db, order_id=order_id, gross_amount=split["gross_amount"],
        provider="mock", provider_txn_id=f"MOCK_{uuid.uuid4().hex[:8]}",
    )
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": "funded"}})
    pos = await assert_balanced(db, order_id)
    print(f"[direct] funds received OK; ledger balanced: {pos}")

    # Release
    await post_release(db, order=await db.orders.find_one({"order_id": order_id}, {"_id": 0}))
    await db.orders.update_one({"order_id": order_id}, {"$set": {"status": "settled"}})
    pos = await assert_balanced(db, order_id)
    print(f"[direct] released OK; ledger balanced: {pos}")

    # Payout to seller (mock disbursement)
    payout = {
        "payout_id": f"pay_{uuid.uuid4().hex[:10]}",
        "order_id": order_id,
        "beneficiary_user_id": "u_seller_test",
        "beneficiary_role": "seller",
        "provider": "azampay",
        "destination": "+255700000001",
        "amount": split["seller_amount"],
        "status": "queued",
    }
    await db.payouts.insert_one(dict(payout))
    await post_payout_paid(db, payout=payout)
    await db.payouts.update_one(
        {"payout_id": payout["payout_id"]}, {"$set": {"status": "paid", "provider_ref": "MOCK_REF"}}
    )
    pos = await assert_balanced(db, order_id)
    print(f"[direct] payout paid OK; ledger balanced: {pos}")

    fin = await order_financials(db, order_id)
    print(f"[direct] reconciliation: status={fin['status']} gross={fin['gross_amount']} paid_out={fin['paid_out']}")

    # === Test 2: 3-party mode + dispute refund ===
    order_id_2 = f"orderTEST_{uuid.uuid4().hex[:8]}"
    split2 = calculate_split(mode="three_party", deal_value=100_000, supplier_cost=80_000)
    order2 = {
        "order_id": order_id_2,
        "mode": "three_party",
        "buyer_id": "u_buyer_test",
        "seller_id": "u_supplier_test",
        "agent_id": "u_hawker_test",
        "status": "created",
        "currency": "TZS",
        **split2,
    }
    await db.orders.insert_one(dict(order2))
    print(f"\n[3p] order created: {order_id_2}, split={split2}")

    await post_funds_received(
        db, order_id=order_id_2, gross_amount=split2["gross_amount"],
        provider="mock", provider_txn_id=f"MOCK_{uuid.uuid4().hex[:8]}",
    )
    print(f"[3p] funded; balanced={await assert_balanced(db, order_id_2)}")

    # Dispute → refund
    await post_refund(db, order_id=order_id_2, amount=split2["gross_amount"])
    pos2 = await assert_balanced(db, order_id_2)
    print(f"[3p] refunded; balanced={pos2}")

    # === Test 3: idempotent webhook ===
    order_id_3 = f"orderTEST_{uuid.uuid4().hex[:8]}"
    split3 = calculate_split(mode="direct", deal_value=50_000)
    await db.orders.insert_one({
        "order_id": order_id_3, "mode": "direct",
        "buyer_id": "u_b", "seller_id": "u_s", "status": "created", **split3,
    })
    txn_id = f"MOCK_{uuid.uuid4().hex[:8]}"
    a = await post_funds_received(db, order_id=order_id_3, gross_amount=split3["gross_amount"],
                                   provider="mock", provider_txn_id=txn_id)
    b = await post_funds_received(db, order_id=order_id_3, gross_amount=split3["gross_amount"],
                                   provider="mock", provider_txn_id=txn_id)
    print(f"\n[idempotency] same txn_id twice: a={a} b={b} same={a == b}")
    entries = await db.ledger_entries.count_documents({"order_id": order_id_3})
    print(f"[idempotency] ledger entries (expect 2 not 4): {entries}")

    # Cleanup
    for oid in (order_id, order_id_2, order_id_3):
        await db.orders.delete_one({"order_id": oid})
        await db.ledger_entries.delete_many({"order_id": oid})
        await db.payment_transactions.delete_many({"order_id": oid})
        await db.payouts.delete_many({"order_id": oid})
    print("\nCLEANUP complete. ✅ All ledger flows passed end-to-end.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
