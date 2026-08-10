"""
Biz-Salama Financial Ledger
───────────────────────────
Production-grade double-entry bookkeeping on top of MongoDB. Implements the
schema the user shared (PostgreSQL design) 1:1 as Mongo collections with the
same guarantees:

* Ledger entries are immutable (append-only). We never `update_one` an entry.
* Every order's debits MUST equal credits at all times. `assert_balanced()`
  enforces this and is called after every posting batch.
* Webhook handlers are idempotent via `processed_webhooks` (provider, event_id).
* All money math uses `Decimal` with quantization to 2dp to avoid float drift.

Fee model (locked in by user, Apr 2026):
    2% supply-side  (from supplier payout)
    2% hawker       (from hawker / agent commission, 3-party only)
    3% buyer-side   (from buyer, on top of the deal value)
    → Platform takes ~5% of the net deal value.

Order modes:
    "direct"   — buyer ↔ seller (no agent). agent_commission = 0.
    "three_party" — buyer ↔ hawker(agent) ↔ supplier(seller).

Collections created lazily on first use:
    ledger_accounts          — chart of accounts (seeded once)
    ledger_entries           — append-only debits/credits
    payment_transactions     — gateway records (idempotent via provider_txn_id)
    payouts                  — disbursements queue
    disputes                 — buyer/seller dispute lifecycle
    processed_webhooks       — (provider, event_id) dedupe table
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, UTC
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

# ─── Money helpers ─────────────────────────────────────────────────────────
TWO = Decimal("0.01")


def D(x) -> Decimal:
    """Coerce a number to a Decimal quantized to 2 decimal places."""
    if isinstance(x, Decimal):
        return x.quantize(TWO, rounding=ROUND_HALF_UP)
    return Decimal(str(x or 0)).quantize(TWO, rounding=ROUND_HALF_UP)


def to_float(x) -> float:
    """For Mongo storage — convert Decimal back to a numeric type Mongo can index."""
    return float(D(x))


# ─── Chart of accounts (Merchant-of-Record model) ──────────────────────────
# Biz-Salama is the legal Merchant of Record for every buyer transaction.
# Buyer funds enter as REVENUE on receipt (not as third-party liability), and
# payments to suppliers / PDSA agents are booked as COGS / OpEx respectively.
# This eliminates the NPSA-2015 "on behalf of a user" trigger and removes the
# PSP-licence requirement. See /app/memory/PRD.md — 2026-07 reframe.
ACCOUNTS = [
    {"code": "cash_clearing",           "name": "Gateway Clearing Cash",              "type": "asset"},
    {"code": "revenue_facilitation",    "name": "Commerce Facilitation Revenue",      "type": "revenue"},
    {"code": "cogs_supplier",           "name": "Cost of Sales — Supplier Payments",  "type": "expense"},
    {"code": "opex_agent_commission",   "name": "Contractor Commission — PDSA/Agent", "type": "expense"},
    {"code": "seller_payable",          "name": "Supplier Payables (pending release)", "type": "liability"},
    {"code": "agent_payable",           "name": "Agent Commission Payable (pending)",  "type": "liability"},
    # Retained for backwards-compatible refund posting only. Not used on new
    # inflows. Any legacy documents referencing "escrow" continue to balance.
    {"code": "escrow_liability",        "name": "Legacy — Pre-reframe liability",     "type": "liability"},
    {"code": "platform_revenue",        "name": "Legacy — Platform Revenue (pre-reframe)", "type": "revenue"},
]
VALID_CODES = {a["code"] for a in ACCOUNTS}


# ─── Fee splits ───────────────────────────────────────────────────────────
SUPPLY_PCT = Decimal("0.02")   # taken from supplier
HAWKER_PCT = Decimal("0.02")   # taken from hawker commission (3-party only)
BUYER_PCT  = Decimal("0.03")   # added on top, paid by buyer


def _split_direct(deal: Decimal) -> dict[str, Decimal]:
    """Direct (2-party) mode: buyer pays deal × 1.03; seller keeps deal × 0.98."""
    gross = deal * (Decimal("1") + BUYER_PCT)
    supply_fee = deal * SUPPLY_PCT
    buyer_fee = deal * BUYER_PCT
    return {
        "gross": gross,
        "seller_amount": deal - supply_fee,
        "agent_commission": D(0),
        "platform_fee": supply_fee + buyer_fee,
        "supply_fee": supply_fee,
        "hawker_fee": D(0),
        "buyer_fee": buyer_fee,
    }


def _split_three_party(deal: Decimal, supplier_cost: Decimal) -> dict[str, Decimal]:
    """3-party mode: deal = supplier_cost + hawker_markup; fees split across all three sides."""
    if supplier_cost <= 0 or supplier_cost >= deal:
        raise ValueError("supplier_cost must satisfy 0 < supplier_cost < deal_value")
    markup = deal - supplier_cost
    supply_fee = supplier_cost * SUPPLY_PCT
    hawker_fee = markup * HAWKER_PCT
    buyer_fee = deal * BUYER_PCT
    return {
        "gross": deal * (Decimal("1") + BUYER_PCT),
        "seller_amount": supplier_cost - supply_fee,
        "agent_commission": markup - hawker_fee,
        "platform_fee": supply_fee + hawker_fee + buyer_fee,
        "supply_fee": supply_fee,
        "hawker_fee": hawker_fee,
        "buyer_fee": buyer_fee,
    }


def _reconcile_pennies(split: dict[str, Decimal]) -> dict[str, Decimal]:
    """
    Quantize everything once and absorb any rounding drift into the platform fee
    so the invariant `gross == seller + agent + platform` always holds exactly.
    """
    gross = D(split["gross"])
    seller_amount = D(split["seller_amount"])
    agent_commission = D(split["agent_commission"])
    platform_fee = D(split["platform_fee"])

    drift = gross - (seller_amount + agent_commission + platform_fee)
    if drift != 0:
        platform_fee = D(platform_fee + drift)

    # Ledger invariant — must NEVER be an `assert` because production servers
    # typically run with `python -O` which strips asserts at byte-code level.
    # A silent money-routing bug would be catastrophic; raise a real error.
    if seller_amount + agent_commission + platform_fee != gross:
        raise RuntimeError(
            f"split invariant broken: {seller_amount}+{agent_commission}+{platform_fee} != {gross}"
        )
    return {
        **split,
        "gross": gross,
        "seller_amount": seller_amount,
        "agent_commission": agent_commission,
        "platform_fee": platform_fee,
    }


def calculate_split(
    *,
    mode: str,
    deal_value: Decimal,
    supplier_cost: Decimal | None = None,
) -> dict[str, float]:
    """
    Compute the canonical money split.

    For `direct` mode, `deal_value` is the price the seller asks. For
    `three_party`, `deal_value` is the *pre-fee* buyer price (= supplier_cost +
    hawker_markup) and `supplier_cost` MUST be provided.

    Returns a dict with all numbers stored alongside the order doc:
        gross_amount       — buyer pays this (incl. the 3% buyer fee)
        seller_amount      — what the seller (or supplier) actually receives
        agent_commission   — what the hawker receives (0 in direct mode)
        platform_fee       — total platform revenue
        supply_fee         — 2% slice of supplier_cost   (audit only)
        hawker_fee         — 2% slice of hawker markup   (audit only)
        buyer_fee          — 3% slice of deal_value      (audit only)

    Invariant (asserted): gross_amount == seller_amount + agent_commission + platform_fee.
    """
    if mode not in {"direct", "three_party"}:
        raise ValueError(f"Unknown order mode: {mode}")
    deal = D(deal_value)
    if deal <= 0:
        raise ValueError("deal_value must be > 0")

    if mode == "direct":
        raw = _split_direct(deal)
    else:
        if supplier_cost is None:
            raise ValueError("supplier_cost is required for three_party mode")
        raw = _split_three_party(deal, D(supplier_cost))

    final = _reconcile_pennies(raw)
    return {
        "gross_amount":     to_float(final["gross"]),
        "seller_amount":    to_float(final["seller_amount"]),
        "agent_commission": to_float(final["agent_commission"]),
        "platform_fee":     to_float(final["platform_fee"]),
        "supply_fee":       to_float(final["supply_fee"]),
        "hawker_fee":       to_float(final["hawker_fee"]),
        "buyer_fee":        to_float(final["buyer_fee"]),
    }


# ─── Async helpers (db is the motor.AsyncIOMotorDatabase passed in) ───────
async def seed_chart_of_accounts(db) -> int:
    """Idempotent — creates the 5 baseline accounts if missing. Safe on every boot."""
    inserted = 0
    for a in ACCOUNTS:
        res = await db.ledger_accounts.update_one(
            {"code": a["code"]},
            {"$setOnInsert": {**a, "created_at": datetime.now(UTC)}},
            upsert=True,
        )
        if res.upserted_id is not None:
            inserted += 1
    return inserted


async def _post_entries(db, *, order_id: str, batch: list[dict[str, Any]], memo: str) -> list[str]:
    """
    Append a balanced batch of debits/credits to `ledger_entries`.

    `batch` is a list of dicts: {"account_code": ..., "entry_type": "debit"|"credit", "amount": ...}
    Validates the batch is internally balanced (sum debits == sum credits) before
    inserting, so we never persist a half-posted transaction.
    """
    debit_sum = D(0)
    credit_sum = D(0)
    for e in batch:
        if e["account_code"] not in VALID_CODES:
            raise ValueError(f"Unknown account code: {e['account_code']}")
        if e["entry_type"] not in {"debit", "credit"}:
            raise ValueError(f"Invalid entry_type: {e['entry_type']}")
        amt = D(e["amount"])
        if amt <= 0:
            raise ValueError(f"Entry amount must be > 0: {amt}")
        if e["entry_type"] == "debit":
            debit_sum += amt
        else:
            credit_sum += amt

    if debit_sum != credit_sum:
        raise ValueError(f"Unbalanced batch: debits={debit_sum} credits={credit_sum}")

    now = datetime.now(UTC)
    docs = []
    ids: list[str] = []
    for e in batch:
        eid = f"led_{uuid.uuid4().hex[:14]}"
        docs.append({
            "entry_id": eid,
            "order_id": order_id,
            "account_code": e["account_code"],
            "entry_type": e["entry_type"],
            "amount": to_float(e["amount"]),
            "memo": memo,
            "created_at": now,
        })
        ids.append(eid)

    if docs:
        await db.ledger_entries.insert_many(docs)
    return ids


async def assert_balanced(db, order_id: str) -> dict[str, float]:
    """Assert the ledger for an order is currently balanced. Returns the position."""
    cursor = db.ledger_entries.find({"order_id": order_id}, {"_id": 0, "entry_type": 1, "amount": 1})
    debit = D(0)
    credit = D(0)
    async for e in cursor:
        amt = D(e["amount"])
        if e["entry_type"] == "debit":
            debit += amt
        else:
            credit += amt
    if debit != credit:
        raise AssertionError(
            f"Ledger out of balance for order {order_id}: debit={debit} credit={credit}"
        )
    return {"debit": to_float(debit), "credit": to_float(credit)}


# ─── High-level transaction posters ───────────────────────────────────────
async def post_funds_received(
    db, *, order_id: str, gross_amount, provider: str, provider_txn_id: str, raw_payload: dict | None = None,
) -> str:
    """
    Buyer payment confirmed by gateway — booked as Merchant-of-Record revenue:
        debit  cash_clearing
        credit revenue_facilitation
    Returns the payment_transactions doc id.

    Idempotent on (provider, provider_txn_id) via a unique-style guard.
    """
    if not provider_txn_id:
        raise ValueError("provider_txn_id required")

    existing = await db.payment_transactions.find_one(
        {"provider": provider, "provider_txn_id": provider_txn_id},
        {"_id": 0, "tx_id": 1, "status": 1},
    )
    if existing:
        return existing["tx_id"]

    tx_id = f"ptx_{uuid.uuid4().hex[:14]}"
    now = datetime.now(UTC)
    await db.payment_transactions.insert_one({
        "tx_id": tx_id,
        "order_id": order_id,
        "provider": provider,
        "provider_txn_id": provider_txn_id,
        "amount": to_float(gross_amount),
        "status": "paid",
        "raw_payload": raw_payload or {},
        "created_at": now,
        "updated_at": now,
    })

    await _post_entries(
        db,
        order_id=order_id,
        memo=f"Buyer payment received via {provider}",
        batch=[
            {"account_code": "cash_clearing",           "entry_type": "debit",  "amount": gross_amount},
            {"account_code": "revenue_facilitation",    "entry_type": "credit", "amount": gross_amount},
        ],
    )
    await assert_balanced(db, order_id)
    return tx_id


async def post_release(db, *, order: dict[str, Any]) -> None:
    """
    Delivery confirmed → book supplier COGS and agent commission as expenses,
    against corresponding payables (which will be cleared when the outbound
    payment executes via `post_payout_paid`).

    Under the Merchant-of-Record model:
        debit  cogs_supplier          (supplier amount — cost of sales)
        debit  opex_agent_commission  (agent commission — operating expense)
        credit seller_payable         (supplier amount)
        credit agent_payable          (agent commission)
    The platform's margin remains in revenue_facilitation (booked at receipt);
    no separate release entry is needed for the fee.
    """
    order_id = order["order_id"]
    gross = D(order["gross_amount"])
    seller = D(order.get("seller_amount", 0))
    agent  = D(order.get("agent_commission", 0))
    platform = D(order.get("platform_fee", 0))

    if seller + agent + platform != gross:
        raise ValueError(
            f"Release split mismatch: {seller}+{agent}+{platform} != {gross}"
        )

    batch: list[dict[str, Any]] = [
        {"account_code": "cogs_supplier",  "entry_type": "debit",  "amount": seller},
        {"account_code": "seller_payable", "entry_type": "credit", "amount": seller},
    ]
    if agent > 0:
        batch.append({"account_code": "opex_agent_commission", "entry_type": "debit",  "amount": agent})
        batch.append({"account_code": "agent_payable",         "entry_type": "credit", "amount": agent})

    await _post_entries(db, order_id=order_id, batch=batch, memo="Supplier + agent expense accrual on delivery")
    await assert_balanced(db, order_id)


async def post_refund(db, *, order_id: str, amount) -> None:
    """
    Dispute resolved in buyer's favour — reverse the facilitation revenue:
        debit  revenue_facilitation
        credit cash_clearing
    Reverses the funds-received posting under the Merchant-of-Record model.
    """
    await _post_entries(
        db,
        order_id=order_id,
        memo="Refund — dispute resolved for buyer",
        batch=[
            {"account_code": "revenue_facilitation", "entry_type": "debit",  "amount": amount},
            {"account_code": "cash_clearing",        "entry_type": "credit", "amount": amount},
        ],
    )
    await assert_balanced(db, order_id)


async def post_payout_paid(db, *, payout: dict[str, Any]) -> None:
    """
    Disbursement provider confirmed payout was sent:
        debit  seller_payable | agent_payable
        credit cash_clearing
    """
    role = payout["beneficiary_role"]
    code = "seller_payable" if role == "seller" else "agent_payable"
    await _post_entries(
        db,
        order_id=payout["order_id"],
        memo=f"Payout to {role} via {payout.get('provider', 'mock')}",
        batch=[
            {"account_code": code,           "entry_type": "debit",  "amount": payout["amount"]},
            {"account_code": "cash_clearing","entry_type": "credit", "amount": payout["amount"]},
        ],
    )
    await assert_balanced(db, payout["order_id"])


# ─── Reconciliation views ─────────────────────────────────────────────────
async def order_financials(db, order_id: str) -> dict[str, Any]:
    """The Mongo equivalent of the SQL `v_order_financials` view."""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        return {"order_id": order_id, "found": False}

    paid_out = D(0)
    async for p in db.payouts.find({"order_id": order_id, "status": "paid"}, {"_id": 0, "amount": 1}):
        paid_out += D(p.get("amount", 0))

    pos = await assert_balanced(db, order_id)
    return {
        "order_id": order_id,
        "status": order.get("status"),
        "gross_amount": order.get("gross_amount"),
        "paid_out": to_float(paid_out),
        "ledger_position": pos,
        "found": True,
    }


async def webhook_already_processed(db, *, provider: str, event_id: str) -> bool:
    """Idempotency guard for incoming gateway webhooks."""
    existing = await db.processed_webhooks.find_one(
        {"provider": provider, "event_id": event_id}, {"_id": 0, "event_id": 1}
    )
    return existing is not None


async def mark_webhook_processed(db, *, provider: str, event_id: str) -> None:
    await db.processed_webhooks.update_one(
        {"provider": provider, "event_id": event_id},
        {"$setOnInsert": {"provider": provider, "event_id": event_id,
                          "created_at": datetime.now(UTC)}},
        upsert=True,
    )


# ─── Disputes auto-resolve ────────────────────────────────────────────────
DISPUTE_AUTO_RESOLVE_DAYS = 3


async def find_auto_resolvable_disputes(db) -> list[dict[str, Any]]:
    """Disputes with status=open older than DISPUTE_AUTO_RESOLVE_DAYS."""
    cutoff = datetime.now(UTC) - timedelta(days=DISPUTE_AUTO_RESOLVE_DAYS)
    rows = await db.disputes.find(
        {"status": "open", "created_at": {"$lt": cutoff}}, {"_id": 0}
    ).to_list(200)
    return rows
