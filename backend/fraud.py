"""
Fraud Monitoring
────────────────
Lightweight rule-based fraud signals. Real ML can come later — for now we
score every order at creation time using cheap, explainable heuristics:

    1. Velocity        — too many orders from one buyer in N minutes
    2. Self-deal       — buyer phone matches seller phone
    3. New-account     — buyer account < 24h old + high-value order
    4. Refund-rate     — seller's historical refund rate > threshold
    5. Watchlist       — explicit buyer/seller flags from admin

Score is 0-100. Orders scoring >= 70 are flagged for manual review.
This is intentionally conservative — better to false-positive a few orders
into manual review than to miss real fraud.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List


HIGH_VALUE_THRESHOLD = 500_000  # TZS
NEW_ACCOUNT_HOURS = 24
VELOCITY_WINDOW_MIN = 10
VELOCITY_LIMIT = 5  # orders per window
REFUND_RATE_FLAG = 0.30


async def score_order(db, *, order: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute fraud signals for a freshly created order. Persists a
    `fraud_signals` doc and stamps `fraud_score` + `fraud_flags` onto the
    order itself for admin visibility.

    Returns the signal dict (suitable for API response).
    """
    score = 0
    flags: List[str] = []
    buyer_id = order.get("buyer_id")
    seller_id = order.get("seller_id")
    gross = float(order.get("gross_amount") or 0)
    now = datetime.now(timezone.utc)

    # Rule 1 — velocity
    if buyer_id:
        cutoff = now - timedelta(minutes=VELOCITY_WINDOW_MIN)
        recent = await db.orders.count_documents(
            {"buyer_id": buyer_id, "created_at": {"$gte": cutoff}}
        )
        if recent >= VELOCITY_LIMIT:
            score += 30
            flags.append(f"velocity:{recent}_orders_in_{VELOCITY_WINDOW_MIN}min")

    # Rule 2 — self-deal
    if buyer_id and seller_id and buyer_id == seller_id:
        score += 60
        flags.append("self_deal")
    else:
        buyer = await db.users.find_one({"user_id": buyer_id}, {"_id": 0, "phone": 1, "created_at": 1}) if buyer_id else None
        seller = await db.users.find_one({"user_id": seller_id}, {"_id": 0, "phone": 1}) if seller_id else None
        # Only flag self-deal-by-phone when BOTH phones are populated (avoids
        # false positives on seeded sellers that have no phone field).
        bp = (buyer or {}).get("phone") or ""
        sp = (seller or {}).get("phone") or ""
        if bp and sp and bp == sp:
            score += 60
            flags.append("self_deal_phone_match")

        # Rule 3 — new account + high-value
        if buyer and gross >= HIGH_VALUE_THRESHOLD:
            ca = buyer.get("created_at")
            if isinstance(ca, datetime) and (now - ca).total_seconds() < NEW_ACCOUNT_HOURS * 3600:
                score += 25
                flags.append("new_account_high_value")

    # Rule 4 — seller refund rate
    if seller_id:
        seller_orders = await db.orders.count_documents({"seller_id": seller_id, "status": {"$in": ["settled", "refunded"]}})
        if seller_orders >= 5:
            refunded = await db.orders.count_documents({"seller_id": seller_id, "status": "refunded"})
            rate = refunded / seller_orders
            if rate >= REFUND_RATE_FLAG:
                score += 20
                flags.append(f"high_refund_rate:{rate:.2f}")

    # Rule 5 — watchlist
    if buyer_id:
        wl = await db.fraud_watchlist.find_one({"user_id": buyer_id})
        if wl:
            score += 50
            flags.append(f"buyer_watchlisted:{wl.get('reason','')[:40]}")
    if seller_id:
        wl = await db.fraud_watchlist.find_one({"user_id": seller_id})
        if wl:
            score += 50
            flags.append(f"seller_watchlisted:{wl.get('reason','')[:40]}")

    score = min(score, 100)
    requires_review = score >= 70

    signal = {
        "signal_id": f"frd_{uuid.uuid4().hex[:12]}",
        "order_id": order.get("order_id"),
        "buyer_id": buyer_id,
        "seller_id": seller_id,
        "score": score,
        "flags": flags,
        "requires_review": requires_review,
        "reviewed": False,
        "created_at": now,
    }
    await db.fraud_signals.insert_one(dict(signal))
    signal.pop("_id", None)
    if order.get("order_id"):
        await db.orders.update_one(
            {"order_id": order["order_id"]},
            {"$set": {"fraud_score": score, "fraud_flags": flags, "fraud_review_required": requires_review}},
        )
    return signal


async def list_flagged(db, *, status: str = "pending", limit: int = 100) -> List[Dict[str, Any]]:
    """Admin dashboard — recent signals requiring review."""
    q: Dict[str, Any] = {"requires_review": True}
    if status == "pending":
        q["reviewed"] = False
    elif status == "reviewed":
        q["reviewed"] = True
    rows = await db.fraud_signals.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for r in rows:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
    return rows


async def add_to_watchlist(db, *, user_id: str, reason: str, added_by: str) -> Dict[str, Any]:
    doc = {
        "user_id": user_id,
        "reason": reason,
        "added_by": added_by,
        "created_at": datetime.now(timezone.utc),
    }
    await db.fraud_watchlist.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)
    return doc


async def mark_reviewed(db, *, signal_id: str, reviewer_id: str, action: str, note: str = "") -> Dict[str, Any]:
    if action not in {"clear", "block_order"}:
        raise ValueError("action must be 'clear' or 'block_order'")
    sig = await db.fraud_signals.find_one_and_update(
        {"signal_id": signal_id},
        {"$set": {
            "reviewed": True,
            "review_action": action,
            "review_note": note,
            "reviewed_by": reviewer_id,
            "reviewed_at": datetime.now(timezone.utc),
        }},
        return_document=True,
        projection={"_id": 0},
    )
    if not sig:
        raise ValueError("Signal not found")

    # If admin chose to block, mark the related order as cancelled.
    if action == "block_order" and sig.get("order_id"):
        await db.orders.update_one(
            {"order_id": sig["order_id"]},
            {"$set": {"status": "cancelled", "cancelled_reason": "fraud_review", "cancelled_at": datetime.now(timezone.utc)}},
        )
    return sig
