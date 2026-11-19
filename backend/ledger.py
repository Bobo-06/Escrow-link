"""
Biz-Salama Financial Ledger — True Escrow (bank-trusteed)
──────────────────────────────────────────────────────────
Production-grade double-entry bookkeeping on top of MongoDB. Models the real
flow for a bank-trusteed escrow service in Tanzania:

    Buyer ─(Selcom)─► cash_clearing_selcom
                              │   (admin records daily sweep)
                              ▼
                     cash_trust_azania  ◄── funds here belong to buyers
                              │   (buyer confirms delivery)
                              ▼
                      seller_payable + agent_payable + platform_revenue
                              │   (admin records payout from Azania IB)
                              ▼
                      seller / agent mobile wallet  +  Biz-Salama ops account

Guarantees:
* Ledger entries are immutable (append-only). We never `update_one` an entry.
* Every order's debits MUST equal credits at all times. `assert_balanced()`
  enforces this and is called after every posting batch.
* Webhook handlers are idempotent via `processed_webhooks` (provider, event_id).
* All money math uses `Decimal` with quantization to 2dp to avoid float drift.

Fee model (locked in by user, Apr 2026):
    2% supply-side  (from supplier payout)
    2% hawker       (from hawker / agent commission, 3-party only)
    3% buyer-side   (from buyer, on top of the deal value)
    → Platform takes ~5% of the net deal value, recognised as revenue on
      release (NOT at receipt — funds are a buyer liability until then).

Order modes:
    "direct"      — buyer ↔ seller (no agent). agent_commission = 0.
    "three_party" — buyer ↔ hawker(agent) ↔ supplier(seller).

Collections created lazily on first use:
    ledger_accounts        — chart of accounts (seeded once)
    ledger_entries         — append-only debits/credits
    payment_transactions   — gateway records (idempotent via provider_txn_id)
    payouts                — disbursements queue
    disputes               — buyer/seller dispute lifecycle
    processed_webhooks     — (provider, event_id) dedupe table
    escrow_events          — append-only audit trail of state transitions
    trust_transfers        — admin records of Selcom → Azania bank sweeps
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


# ─── Chart of accounts (True-escrow / bank-trusteed model) ────────────────
# Biz-Salama operates escrow through Azania Bank's licensed Trust Services.
# Buyer funds are a liability on our books (owed back to buyer until delivery
# is confirmed), NOT revenue. Platform fee is recognised only on release.
#
# Trustee: Azania Bank PLC. Settlor: Biz-Salama Ltd. Beneficiaries: buyers.
ACCOUNTS = [
    # ─── Assets ───
    {"code": "cash_clearing_selcom",    "name": "Selcom Clearing Cash (pre-sweep to Azania)",      "type": "asset"},
    {"code": "cash_trust_azania",       "name": "Azania Trust Escrow Account",                      "type": "asset"},

    # ─── Liabilities ───
    {"code": "buyer_escrow_liability",  "name": "Buyer Escrow Liability (funds owed back until release)", "type": "liability"},
    {"code": "seller_payable",          "name": "Seller Payable (owed after release)",              "type": "liability"},
    {"code": "agent_payable",           "name": "Agent/Hawker Commission Payable",                  "type": "liability"},

    # ─── Revenue ───
    {"code": "platform_revenue",        "name": "Platform Facilitation Revenue (earned on release)", "type": "revenue"},

    # ─── Legacy accounts (retained so pre-revert historical entries still balance) ───
    # NEW entries MUST NOT use these codes. Kept for read-only historical records
    # from the brief 2026-07 Merchant-of-Record reframe. See PRD.md.
    {"code": "cash_clearing",           "name": "Legacy — Gateway Clearing (pre-trust revert)",     "type": "asset"},
    {"code": "revenue_facilitation",    "name": "Legacy — Commerce Facilitation Revenue (pre-revert)", "type": "revenue"},
    {"code": "cogs_supplier",           "name": "Legacy — COGS Supplier Payments (pre-revert)",     "type": "expense"},
    {"code": "opex_agent_commission",   "name": "Legacy — Agent OpEx (pre-revert)",                 "type": "expense"},
    {"code": "escrow_liability",        "name": "Legacy — Pre-reframe liability (pre-reframe)",     "type": "liability"},
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

    Returns a dict with all numbers stored alongside the order doc.
    Invariant (checked): gross_amount == seller_amount + agent_commission + platform_fee.
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
    """Idempotent — creates the baseline accounts if missing. Safe on every boot."""
    inserted = 0
    for a in ACCOUNTS:
        res = await db.ledger_accounts.update_one(
            {"code": a["code"]},
            {"$setOnInsert": {**a, "created_at": datetime.now(UTC)}},
            upsert=True,
        )
        if res.upserted_id is not None:
            inserted += 1
    # Backfill: legacy rows created before the Oct-2026 revert may have an
    # outdated `name` field. Refresh them so the admin UI shows accurate labels.
    for a in ACCOUNTS:
        await db.ledger_accounts.update_one(
            {"code": a["code"]},
            {"$set": {"name": a["name"], "type": a["type"]}},
        )
    return inserted


async def _post_entries(db, *, order_id: str, batch: list[dict[str, Any]], memo: str) -> list[str]:
    """
    Append a balanced batch of debits/credits to `ledger_entries`.

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


# ─── High-level transaction posters (true-escrow model) ───────────────────
async def post_funds_received(
    db, *, order_id: str, gross_amount, provider: str, provider_txn_id: str, raw_payload: dict | None = None,
) -> str:
    """
    Buyer payment confirmed by gateway (currently Selcom):
        debit  cash_clearing_selcom     (asset ↑ — money sits with Selcom)
        credit buyer_escrow_liability   (liability ↑ — owed back to buyer)

    No revenue recognised here. Platform fee accrues on release.
    Returns the payment_transactions doc id.

    Idempotent on (provider, provider_txn_id).
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
        memo=f"Buyer payment received via {provider} (pending Azania sweep)",
        batch=[
            {"account_code": "cash_clearing_selcom",   "entry_type": "debit",  "amount": gross_amount},
            {"account_code": "buyer_escrow_liability", "entry_type": "credit", "amount": gross_amount},
        ],
    )
    await assert_balanced(db, order_id)
    await record_escrow_event(
        db, order_id=order_id, event_type="funds_received",
        actor=f"{provider}:{provider_txn_id}", meta={"amount": to_float(gross_amount), "provider": provider},
    )
    return tx_id


async def post_trust_transfer(
    db, *, order_id: str, amount, selcom_ref: str, azania_ref: str, admin_user_id: str,
) -> None:
    """
    Admin records that funds moved from Selcom to the Azania trust account:
        debit  cash_trust_azania         (asset ↑ — now held at Azania trust)
        credit cash_clearing_selcom      (asset ↓ — swept out of Selcom)

    This is a manual step: once/day, the admin logs into Selcom internet
    banking, transfers the day's collected funds to the Azania trust account,
    and then records both references here. The accounting moves the asset
    between two custodians; the buyer liability is unaffected.
    """
    await _post_entries(
        db,
        order_id=order_id,
        memo=f"Sweep Selcom→Azania (selcom={selcom_ref}, azania={azania_ref})",
        batch=[
            {"account_code": "cash_trust_azania",    "entry_type": "debit",  "amount": amount},
            {"account_code": "cash_clearing_selcom", "entry_type": "credit", "amount": amount},
        ],
    )
    await assert_balanced(db, order_id)
    await record_escrow_event(
        db, order_id=order_id, event_type="trust_transfer_recorded",
        actor=f"admin:{admin_user_id}",
        meta={"amount": to_float(amount), "selcom_ref": selcom_ref, "azania_ref": azania_ref},
    )


async def post_release(db, *, order: dict[str, Any]) -> None:
    """
    Buyer confirmed delivery (or dispute resolved for seller) → release escrow:
        debit  buyer_escrow_liability    (liability ↓ — buyer no longer owed)
        credit seller_payable            (liability ↑ — seller now owed)
        credit agent_payable             (liability ↑ — agent now owed, 3-party)
        credit platform_revenue          (revenue ↑ — platform fee earned)

    The cash position (cash_trust_azania) is unchanged at this stage —
    nothing has left the Azania account yet. The subsequent `post_payout_paid`
    calls will discharge seller_payable + agent_payable against cash_trust_azania.
    Platform fee will be swept separately via `post_fee_sweep`.
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
        {"account_code": "buyer_escrow_liability", "entry_type": "debit",  "amount": gross},
        {"account_code": "seller_payable",         "entry_type": "credit", "amount": seller},
        {"account_code": "platform_revenue",       "entry_type": "credit", "amount": platform},
    ]
    if agent > 0:
        batch.append({"account_code": "agent_payable", "entry_type": "credit", "amount": agent})

    await _post_entries(db, order_id=order_id, batch=batch, memo="Escrow release — delivery confirmed")
    await assert_balanced(db, order_id)
    await record_escrow_event(
        db, order_id=order_id, event_type="released",
        actor=f"buyer:{order.get('buyer_id', '?')}",
        meta={
            "seller_amount": to_float(seller),
            "agent_commission": to_float(agent),
            "platform_fee": to_float(platform),
        },
    )


async def post_refund(db, *, order_id: str, amount) -> None:
    """
    Dispute resolved for buyer OR stray payment refund:
        debit  buyer_escrow_liability   (liability ↓ — we no longer owe buyer here)
        credit cash_trust_azania        (asset ↓ — money leaves Azania trust to buyer)

    Caller is responsible for deciding whether funds have reached Azania yet.
    If the refund happens while funds still sit in cash_clearing_selcom (rare —
    very fast refund same day as payment), the caller should instead issue a
    direct refund via Selcom and post against `cash_clearing_selcom`. This
    function assumes the standard case: funds have already been swept to Azania.
    """
    await _post_entries(
        db,
        order_id=order_id,
        memo="Refund to buyer from Azania trust",
        batch=[
            {"account_code": "buyer_escrow_liability", "entry_type": "debit",  "amount": amount},
            {"account_code": "cash_trust_azania",      "entry_type": "credit", "amount": amount},
        ],
    )
    await assert_balanced(db, order_id)
    await record_escrow_event(
        db, order_id=order_id, event_type="refunded",
        actor="admin", meta={"amount": to_float(amount)},
    )


async def post_payout_paid(db, *, payout: dict[str, Any]) -> None:
    """
    Disbursement from the Azania trust account to a beneficiary (seller/agent):
        debit  seller_payable | agent_payable    (liability ↓ — paid)
        credit cash_trust_azania                 (asset ↓ — cash leaves trust)
    """
    role = payout["beneficiary_role"]
    code = "seller_payable" if role == "seller" else "agent_payable"
    await _post_entries(
        db,
        order_id=payout["order_id"],
        memo=f"Payout to {role} via {payout.get('provider', 'manual')}",
        batch=[
            {"account_code": code,               "entry_type": "debit",  "amount": payout["amount"]},
            {"account_code": "cash_trust_azania","entry_type": "credit", "amount": payout["amount"]},
        ],
    )
    await assert_balanced(db, payout["order_id"])
    await record_escrow_event(
        db, order_id=payout["order_id"], event_type=f"payout_paid_{role}",
        actor=f"admin:{payout.get('admin_user_id', '?')}",
        meta={
            "amount": to_float(payout["amount"]),
            "beneficiary_user_id": payout.get("beneficiary_user_id"),
            "provider_ref": payout.get("provider_ref"),
        },
    )


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


# ─── Append-only escrow audit trail ───────────────────────────────────────
# Collection: escrow_events
# Fields: event_id, order_id, event_type, actor, meta, created_at
# NEVER updated, NEVER deleted. This is the auditor/bank/BoT evidence log.
ESCROW_EVENT_TYPES = {
    "funds_received",            # buyer paid via Selcom
    "trust_transfer_recorded",   # admin recorded Selcom → Azania bank move
    "released",                  # buyer confirmed delivery → release posted
    "payout_paid_seller",        # Azania → seller mobile money
    "payout_paid_agent",         # Azania → agent mobile money
    "fee_sweep_recorded",        # Azania → Biz-Salama ops (platform fee)
    "refunded",                  # funds returned to buyer
    "dispute_opened",
    "dispute_resolved",
    "mismatch_flagged",          # amount or duplicate payment anomaly
}


async def record_escrow_event(
    db, *, order_id: str, event_type: str, actor: str | None = None, meta: dict | None = None,
) -> str:
    """
    Append-only audit log of escrow state transitions. Treat each row as
    immutable evidence; collection should be protected with read-mostly perms
    and a periodic backup to cold storage.
    """
    if event_type not in ESCROW_EVENT_TYPES:
        raise ValueError(f"Unknown escrow event type: {event_type}")
    event_id = f"ev_{uuid.uuid4().hex[:16]}"
    await db.escrow_events.insert_one({
        "event_id": event_id,
        "order_id": order_id,
        "event_type": event_type,
        "actor": actor,
        "meta": meta or {},
        "created_at": datetime.now(UTC),
    })
    return event_id


async def list_escrow_events(db, order_id: str, limit: int = 500) -> list[dict[str, Any]]:
    """Return the full event trail for an order, oldest first."""
    cursor = db.escrow_events.find({"order_id": order_id}, {"_id": 0}).sort("created_at", 1).limit(limit)
    rows = []
    async for r in cursor:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
        rows.append(r)
    return rows


# ─── Disputes auto-resolve ────────────────────────────────────────────────
DISPUTE_AUTO_RESOLVE_DAYS = 3


async def find_auto_resolvable_disputes(db) -> list[dict[str, Any]]:
    """Disputes with status=open older than DISPUTE_AUTO_RESOLVE_DAYS."""
    cutoff = datetime.now(UTC) - timedelta(days=DISPUTE_AUTO_RESOLVE_DAYS)
    rows = await db.disputes.find(
        {"status": "open", "created_at": {"$lt": cutoff}}, {"_id": 0}
    ).to_list(200)
    return rows


# ─── Account balance roll-up (for the admin reconciliation page) ──────────
async def account_balance(db, code: str) -> float:
    """
    Sum of (debits - credits) for an asset/expense account, or (credits - debits)
    for a liability/revenue account. Returns a positive number representing the
    current balance in that account as a cash-equivalent.
    """
    if code not in VALID_CODES:
        raise ValueError(f"Unknown account code: {code}")
    account = next(a for a in ACCOUNTS if a["code"] == code)
    is_debit_natural = account["type"] in {"asset", "expense"}

    debit = D(0)
    credit = D(0)
    cursor = db.ledger_entries.find({"account_code": code}, {"_id": 0, "entry_type": 1, "amount": 1})
    async for e in cursor:
        amt = D(e["amount"])
        if e["entry_type"] == "debit":
            debit += amt
        else:
            credit += amt
    bal = (debit - credit) if is_debit_natural else (credit - debit)
    return to_float(bal)


async def trust_account_summary(db) -> dict[str, Any]:
    """
    Executive summary of the Azania trust / Selcom clearing position.
    Used by the admin reconciliation page.
    """
    clearing = await account_balance(db, "cash_clearing_selcom")
    trust = await account_balance(db, "cash_trust_azania")
    buyer_liab = await account_balance(db, "buyer_escrow_liability")
    seller_pay = await account_balance(db, "seller_payable")
    agent_pay = await account_balance(db, "agent_payable")
    revenue = await account_balance(db, "platform_revenue")
    return {
        "cash_clearing_selcom":   clearing,
        "cash_trust_azania":      trust,
        "buyer_escrow_liability": buyer_liab,
        "seller_payable":         seller_pay,
        "agent_payable":          agent_pay,
        "platform_revenue":       revenue,
        # Liquidity check: total cash on hand must cover all outstanding
        # liabilities to buyers/sellers/agents. A negative shortfall is a bug
        # or an un-recorded Selcom→Azania sweep.
        "total_cash":             round(clearing + trust, 2),
        "total_liabilities":      round(buyer_liab + seller_pay + agent_pay, 2),
        "liquidity_shortfall":    round((buyer_liab + seller_pay + agent_pay) - (clearing + trust), 2),
    }
