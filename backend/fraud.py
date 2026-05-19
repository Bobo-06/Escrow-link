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

Implementation note (Feb 2026 refactor)
---------------------------------------
The previous `score_order()` was a 90-line monolith. Each rule now lives in
its own small async function returning `(points, flags)`. `score_order()` is
just a glue function that fans out the rules and tallies the result, keeping
cyclomatic complexity ≤6 and making it possible to unit-test rules in isolation.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple


HIGH_VALUE_THRESHOLD = 500_000  # TZS
NEW_ACCOUNT_HOURS = 24
VELOCITY_WINDOW_MIN = 10
VELOCITY_LIMIT = 5  # orders per window
REFUND_RATE_FLAG = 0.30
REVIEW_THRESHOLD = 70
MAX_SCORE = 100


# ─── Rule evaluators ──────────────────────────────────────────────────────
# Each rule returns `(points, [flag_strings])`. Rules are intentionally small
# and side-effect free so they can be tested with hand-rolled fixtures.

async def _rule_velocity(db, *, buyer_id: Optional[str], now: datetime) -> Tuple[int, List[str]]:
    if not buyer_id:
        return 0, []
    cutoff = now - timedelta(minutes=VELOCITY_WINDOW_MIN)
    recent = await db.orders.count_documents(
        {"buyer_id": buyer_id, "created_at": {"$gte": cutoff}}
    )
    if recent >= VELOCITY_LIMIT:
        return 30, [f"velocity:{recent}_orders_in_{VELOCITY_WINDOW_MIN}min"]
    return 0, []


async def _rule_self_deal_and_account_age(
    db, *, buyer_id: Optional[str], seller_id: Optional[str], gross: float, now: datetime
) -> Tuple[int, List[str]]:
    """
    Combined: same-id self-deal short-circuits the lookup; otherwise we look up
    both users and check (a) self-deal by phone, (b) new-account-high-value.
    Combining these two rules keeps us to one round-trip per user document.
    """
    if buyer_id and seller_id and buyer_id == seller_id:
        return 60, ["self_deal"]

    points = 0
    flags: List[str] = []
    buyer = (
        await db.users.find_one({"user_id": buyer_id}, {"_id": 0, "phone": 1, "created_at": 1})
        if buyer_id else None
    )
    seller = (
        await db.users.find_one({"user_id": seller_id}, {"_id": 0, "phone": 1})
        if seller_id else None
    )

    bp = (buyer or {}).get("phone") or ""
    sp = (seller or {}).get("phone") or ""
    # Only flag self-deal-by-phone when BOTH phones are populated (avoids
    # false positives on seeded sellers that have no phone field).
    if bp and sp and bp == sp:
        points += 60
        flags.append("self_deal_phone_match")

    if buyer and gross >= HIGH_VALUE_THRESHOLD:
        ca = buyer.get("created_at")
        if isinstance(ca, datetime) and (now - ca).total_seconds() < NEW_ACCOUNT_HOURS * 3600:
            points += 25
            flags.append("new_account_high_value")
    return points, flags


async def _rule_refund_rate(db, *, seller_id: Optional[str]) -> Tuple[int, List[str]]:
    if not seller_id:
        return 0, []
    seller_orders = await db.orders.count_documents(
        {"seller_id": seller_id, "status": {"$in": ["settled", "refunded"]}}
    )
    if seller_orders < 5:
        return 0, []
    refunded = await db.orders.count_documents({"seller_id": seller_id, "status": "refunded"})
    rate = refunded / seller_orders
    if rate >= REFUND_RATE_FLAG:
        return 20, [f"high_refund_rate:{rate:.2f}"]
    return 0, []


async def _rule_watchlist(db, *, user_id: Optional[str], party: str) -> Tuple[int, List[str]]:
    """`party` is 'buyer' or 'seller' — used only for the flag string."""
    if not user_id:
        return 0, []
    wl = await db.fraud_watchlist.find_one({"user_id": user_id})
    if not wl:
        return 0, []
    reason = (wl.get("reason") or "")[:40]
    return 50, [f"{party}_watchlisted:{reason}"]


# ─── Public API ───────────────────────────────────────────────────────────

async def score_order(db, *, order: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compute fraud signals for a freshly created order. Persists a
    `fraud_signals` doc and stamps `fraud_score` + `fraud_flags` onto the
    order itself for admin visibility.

    Returns the signal dict (suitable for API response).
    """
    buyer_id = order.get("buyer_id")
    seller_id = order.get("seller_id")
    gross = float(order.get("gross_amount") or 0)
    now = datetime.now(timezone.utc)

    score = 0
    flags: List[str] = []

    for points, rule_flags in (
        await _rule_velocity(db, buyer_id=buyer_id, now=now),
        await _rule_self_deal_and_account_age(
            db, buyer_id=buyer_id, seller_id=seller_id, gross=gross, now=now
        ),
        await _rule_refund_rate(db, seller_id=seller_id),
        await _rule_watchlist(db, user_id=buyer_id, party="buyer"),
        await _rule_watchlist(db, user_id=seller_id, party="seller"),
    ):
        score += points
        flags.extend(rule_flags)

    score = min(score, MAX_SCORE)
    requires_review = score >= REVIEW_THRESHOLD

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
