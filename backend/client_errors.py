"""
Lightweight browser-side error / debug-log collector.

Why this module exists
======================
We added intent-comment `console.debug(...)` calls across the React app in
places where we silently swallow exceptions (e.g. Web Share API rejections,
verify-link fetch timeouts on flaky 3G). They help developers debugging
locally — but they're invisible to operators reading production traffic
from Tanzanian mobile users on cellular.

This module accepts those events at `/api/client-errors`, stores them with
a 30-day TTL, and exposes admin-only read endpoints. It's an opt-in,
self-hosted alternative to Sentry: no paid SaaS, no PII other than what the
caller chooses to ship, and small enough to delete in one commit.

Contract (kept deliberately tiny)
---------------------------------
- A single document per event. No batching collapsing — we lean on Mongo.
- Hard caps: 8 KB per message+stack, 2 KB per meta payload. Strict server-
  side trimming, never relying on the browser.
- Soft rate-limit: 30 events / minute / IP. Bursts beyond that drop with a
  202 (Accepted-but-ignored) so the browser never retries-storms us.
- Levels: debug, info, warn, error. Unknown levels coerce to "info".

Everything else (filters, stats, purge) is admin-only.
"""

from __future__ import annotations

import time
import uuid
from collections import defaultdict, deque
from datetime import datetime, timedelta, UTC
from typing import Any


COLLECTION = "client_errors"
TTL_DAYS = 30
MAX_MESSAGE_LEN = 4_000
MAX_STACK_LEN = 4_000
MAX_URL_LEN = 1_000
MAX_UA_LEN = 500
MAX_META_BYTES = 2_048
ALLOWED_LEVELS = ("debug", "info", "warn", "error")

# In-process token bucket per source IP. Sized for a small platform; if you
# scale to multi-replica, swap for Redis or move the limiter to the ingress.
_RATE_WINDOW_SECONDS = 60
_RATE_MAX_EVENTS = 30
_rate_buckets: dict[str, deque[float]] = defaultdict(deque)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _truncate(value: Any, limit: int) -> str:
    """Coerce to string and hard-truncate, marking the cut."""
    if value is None:
        return ""
    s = str(value)
    return s if len(s) <= limit else s[: limit - 3] + "..."


def _safe_meta(meta: Any) -> dict[str, Any]:
    """Shallow-clone meta dict, dropping anything that bloats the doc."""
    if not isinstance(meta, dict):
        return {}
    out: dict[str, Any] = {}
    running = 0
    for k, v in meta.items():
        # Stringify nested structures so the doc stays predictable in Mongo
        if isinstance(v, (dict, list)):
            sv = str(v)
        else:
            sv = str(v) if v is not None else ""
        sv = sv[:500]
        running += len(k) + len(sv)
        if running > MAX_META_BYTES:
            out["_truncated"] = True
            break
        out[str(k)[:80]] = sv
    return out


def _normalize_level(level: Any) -> str:
    if isinstance(level, str) and level.lower() in ALLOWED_LEVELS:
        return level.lower()
    return "info"


def _rate_limit_ok(ip: str) -> bool:
    """Return False if this IP exceeded the per-minute event quota."""
    if not ip:
        ip = "_anon"
    now = time.monotonic()
    bucket = _rate_buckets[ip]
    cutoff = now - _RATE_WINDOW_SECONDS
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= _RATE_MAX_EVENTS:
        return False
    bucket.append(now)
    return True


def _client_ip(request) -> str:
    # Honour the K8s ingress / Cloudflare-style forwarding chain. We only ever
    # use this for rate-limiting, never for trust decisions.
    xff = request.headers.get("x-forwarded-for") if request else None
    if xff:
        return xff.split(",")[0].strip()
    if request and request.client and request.client.host:
        return request.client.host
    return "_anon"


# ---------------------------------------------------------------------------
# Public API used by server.py routes
# ---------------------------------------------------------------------------

async def ensure_indexes(db) -> None:
    """Idempotently create the TTL index. Called from FastAPI startup."""
    try:
        await db[COLLECTION].create_index("expire_at", expireAfterSeconds=0)
        await db[COLLECTION].create_index([("level", 1), ("created_at", -1)])
    except Exception:  # noqa: BLE001 — startup must not crash the app
        # If Mongo rejects (e.g. existing conflicting index), we degrade silently.
        # Operators will see no TTL purge — a known-good fallback for a debug tool.
        pass


async def ingest(db, *, request, payload: dict[str, Any]) -> tuple[bool, str]:
    """
    Validate, trim and insert one event. Returns (accepted, status_string).
    `accepted=False` for rate-limited callers — endpoint should still 202 so
    the browser stops retrying.
    """
    ip = _client_ip(request)
    if not _rate_limit_ok(ip):
        return False, "rate_limited"

    level = _normalize_level(payload.get("level"))
    message = _truncate(payload.get("message"), MAX_MESSAGE_LEN)
    if not message:
        return False, "missing_message"

    doc = {
        "event_id": uuid.uuid4().hex,
        "level": level,
        "message": message,
        "stack": _truncate(payload.get("stack"), MAX_STACK_LEN),
        "url": _truncate(payload.get("url"), MAX_URL_LEN),
        "user_agent": _truncate(payload.get("user_agent") or (request.headers.get("user-agent") if request else ""), MAX_UA_LEN),
        "user_id": _truncate(payload.get("user_id"), 80) or None,
        "session_id": _truncate(payload.get("session_id"), 80) or None,
        "app_version": _truncate(payload.get("app_version"), 40) or None,
        "online": bool(payload.get("online", True)),
        "viewport": _truncate(payload.get("viewport"), 40),
        "meta": _safe_meta(payload.get("meta")),
        "ip": ip,
        "created_at": datetime.now(UTC),
        "expire_at": datetime.now(UTC) + timedelta(days=TTL_DAYS),
    }
    await db[COLLECTION].insert_one(doc)
    # Mongo mutates the dict to add `_id`. We never return this dict from a
    # route, so leakage isn't a concern — but stripping keeps the contract obvious.
    doc.pop("_id", None)
    return True, "accepted"


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    """Make a Mongo doc JSON-safe (datetimes → ISO; drop _id defensively)."""
    out = {k: v for k, v in doc.items() if k != "_id"}
    for f in ("created_at", "expire_at"):
        v = out.get(f)
        if isinstance(v, datetime):
            out[f] = v.isoformat()
    return out


async def list_events(
    db,
    *,
    level: str | None = None,
    since_iso: str | None = None,
    q: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Admin-only listing with simple filters."""
    query: dict[str, Any] = {}
    if level and level in ALLOWED_LEVELS:
        query["level"] = level
    if since_iso:
        try:
            since = datetime.fromisoformat(since_iso.replace("Z", "+00:00"))
            query["created_at"] = {"$gte": since}
        except ValueError:
            # Silently ignore malformed timestamps — admin UI is the only caller.
            pass
    if q:
        # Substring match across message+url. Anchored regex would let us index,
        # but our volume is tiny so a $regex scan is fine.
        safe_q = q[:120]
        query["$or"] = [
            {"message": {"$regex": safe_q, "$options": "i"}},
            {"url": {"$regex": safe_q, "$options": "i"}},
        ]
    limit = max(1, min(int(limit or 100), 500))
    cursor = db[COLLECTION].find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(limit)
    return [_serialize(r) for r in rows]


async def stats(db) -> dict[str, Any]:
    """Operator dashboard summary."""
    now = datetime.now(UTC)
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    total = await db[COLLECTION].count_documents({})
    last_24h_count = await db[COLLECTION].count_documents({"created_at": {"$gte": last_24h}})
    last_7d_count = await db[COLLECTION].count_documents({"created_at": {"$gte": last_7d}})

    # Per-level breakdown for the last 7 days — cheap aggregation.
    by_level: dict[str, int] = {lvl: 0 for lvl in ALLOWED_LEVELS}
    pipeline = [
        {"$match": {"created_at": {"$gte": last_7d}}},
        {"$group": {"_id": "$level", "n": {"$sum": 1}}},
    ]
    async for row in db[COLLECTION].aggregate(pipeline):
        lvl = row.get("_id") or "info"
        by_level[lvl] = row.get("n", 0)

    return {
        "total": total,
        "last_24h": last_24h_count,
        "last_7d": last_7d_count,
        "by_level_7d": by_level,
        "retention_days": TTL_DAYS,
    }


async def purge(db, *, older_than_days: int | None = None) -> int:
    """Admin-only delete. With no argument, wipes everything."""
    if older_than_days is None:
        result = await db[COLLECTION].delete_many({})
        return result.deleted_count
    cutoff = datetime.now(UTC) - timedelta(days=max(0, older_than_days))
    result = await db[COLLECTION].delete_many({"created_at": {"$lt": cutoff}})
    return result.deleted_count
