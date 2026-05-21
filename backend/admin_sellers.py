"""Admin-direct seller registration.

Distinct from `seller_onboarding.py` which is the *field-rep* onboarding flow
(rep collects 5 docs in the field → submits → admin reviews → seller created
with `password_pending`).

This module covers the simpler **admin-trusted** path: an admin clicks
"Add seller" in the back-office, fills the form, optionally uploads docs and
a starter product, and a fully-verified seller account exists immediately.
"""
from __future__ import annotations

import csv
import io
import secrets
import uuid
from datetime import UTC, datetime
from typing import Any

import bcrypt
from pydantic import BaseModel


class StarterProduct(BaseModel):
    """Optional first listing to seed the new seller's store."""
    name: str
    price: float
    description: str | None = None
    image_b64: str | None = None
    category: str | None = "general"
    location: str | None = None


class AdminSellerCreate(BaseModel):
    name: str
    phone: str  # validated upstream via normalize_tz_phone
    email: str | None = None
    business_name: str | None = None
    location: str | None = None
    bio: str | None = None
    picture: str | None = None  # full data URL acceptable
    # Auth strategy: admin EITHER sets a password directly OR triggers an SMS
    # set-password link. If both are missing, default behaviour is the link.
    password: str | None = None
    send_set_password_link: bool = False
    # Optional KYC docs. None of these are required for an admin-trusted seller.
    documents: dict[str, str] | None = None
    starter_product: StarterProduct | None = None


class AdminSellerUpdate(BaseModel):
    name: str | None = None
    business_name: str | None = None
    location: str | None = None
    bio: str | None = None
    picture: str | None = None
    is_active: bool | None = None
    is_verified: bool | None = None


def _hash_pw(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _gen_reset_token() -> str:
    return secrets.token_urlsafe(24)


async def create_seller(
    db,
    *,
    payload: AdminSellerCreate,
    admin_user_id: str,
    normalized_phone: str,
    base_url: str | None,
    send_sms,  # injected to avoid circular import
    calculate_fees,
) -> dict[str, Any]:
    """Create a verified seller account in one shot. Idempotency by phone (409 if exists)."""
    # Uniqueness by phone (primary) and email (secondary if provided).
    if await db.users.find_one({"phone": normalized_phone}):
        raise LookupError(f"PHONE_EXISTS:{normalized_phone}")
    if payload.email:
        em = payload.email.strip().lower()
        if await db.users.find_one({"email": em}):
            raise LookupError(f"EMAIL_EXISTS:{em}")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(UTC)

    # Auth strategy resolution
    auth_type = "phone"
    password_hash: str | None = None
    reset_token: str | None = None
    reset_token_expires: datetime | None = None
    if payload.password and payload.password.strip():
        if len(payload.password) < 6:
            raise ValueError("Password must be at least 6 characters")
        password_hash = _hash_pw(payload.password.strip())
    else:
        # Either explicitly requested OR no password given → SMS reset link.
        auth_type = "password_pending"
        reset_token = _gen_reset_token()
        reset_token_expires = now.replace(microsecond=0)
        # 72 hours
        from datetime import timedelta
        reset_token_expires = now + timedelta(hours=72)

    doc = {
        "user_id": user_id,
        "name": payload.name.strip(),
        "phone": normalized_phone,
        "email": (payload.email or "").strip().lower() or None,
        "business_name": (payload.business_name or "").strip() or None,
        "location": (payload.location or "").strip() or None,
        "bio": (payload.bio or "").strip() or None,
        "picture": payload.picture or None,
        "role": "seller",
        "password_hash": password_hash,
        "auth_type": auth_type,
        "is_verified": True,
        "is_active": True,
        "kyc_status": "verified",
        "created_at": now,
        "created_by_admin_id": admin_user_id,
    }
    if reset_token:
        doc["password_reset_token"] = reset_token
        doc["password_reset_expires"] = reset_token_expires

    # Stash docs alongside the user record (small admin-trusted set; full doc
    # KYC still happens in seller_onboarding.py for field-rep flow).
    if payload.documents:
        doc["admin_uploaded_documents"] = {
            k: v for k, v in (payload.documents or {}).items() if v
        }

    await db.users.insert_one(doc)

    # Starter product (best-effort — failure here doesn't reverse the seller create).
    starter_product_id: str | None = None
    if payload.starter_product:
        sp = payload.starter_product
        if sp.price > 0 and sp.name.strip():
            pid = f"prod_{uuid.uuid4().hex[:12]}"
            payment_link_code = secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8].lower()
            fees = calculate_fees(sp.price, is_international=False)
            await db.products.insert_one({
                "product_id": pid,
                "seller_id": user_id,
                "seller_name": doc["business_name"] or doc["name"],
                "name": sp.name.strip(),
                "price": sp.price,
                "price_tzs": sp.price,
                "currency": "TZS",
                "description": (sp.description or "").strip() or None,
                "image_b64": sp.image_b64,
                "category": sp.category or "general",
                "location": (sp.location or doc["location"]) or None,
                "payment_link_code": payment_link_code,
                "is_active": True,
                "listed_via_voice": False,
                "buyer_protection_fee": fees['buyer_protection_fee'],
                "seller_acquisition_fee": fees['seller_acquisition_fee'],
                "total_buyer_pays": fees['total_buyer_pays'],
                "seller_receives": fees['seller_receives'],
                "international_shipping": False,
                "shipping_countries": [],
                "created_at": now,
                "created_by_admin_id": admin_user_id,
            })
            starter_product_id = pid

    # If admin chose SMS-link path, send it now (best-effort).
    if reset_token and (payload.send_set_password_link or not payload.password):
        link_base = base_url or ""
        link = f"{link_base}/reset-password?token={reset_token}&phone={normalized_phone}"
        await send_sms(
            normalized_phone,
            (
                f"Karibu Biz-Salama! Akaunti yako ya muuzaji imefunguliwa. "
                f"Weka neno la siri hapa: {link} (Inafanya kazi kwa masaa 72.)"
            ),
            (
                f"Welcome to Biz-Salama! Your seller account is ready. "
                f"Set your password here: {link} (Link valid for 72 hours.)"
            ),
        )

    return {
        "user_id": user_id,
        "name": doc["name"],
        "phone": doc["phone"],
        "email": doc["email"],
        "business_name": doc["business_name"],
        "location": doc["location"],
        "auth_type": auth_type,
        "is_verified": True,
        "is_active": True,
        "starter_product_id": starter_product_id,
        "password_set_link_sent": bool(reset_token),
        "set_password_link": (
            f"{base_url or ''}/reset-password?token={reset_token}&phone={normalized_phone}"
            if reset_token else None
        ),
        "created_at": now.isoformat(),
    }


async def list_sellers(db, *, search: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    """All users with role='seller', with their product counts."""
    import re
    query: dict[str, Any] = {"role": "seller"}
    if search:
        # Case-insensitive substring match on name / business_name / phone.
        # Escape regex metacharacters so admin can't accidentally craft a slow
        # or injected pattern (e.g. searching for "$" would break the query).
        regex = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [
            {"name": regex},
            {"business_name": regex},
            {"phone": regex},
        ]
    sellers = await db.users.find(
        query,
        {
            "_id": 0,
            "user_id": 1, "name": 1, "phone": 1, "email": 1,
            "business_name": 1, "location": 1, "bio": 1, "picture": 1,
            "is_verified": 1, "is_active": 1, "auth_type": 1,
            "kyc_status": 1, "created_at": 1, "created_by_admin_id": 1,
        },
    ).sort("created_at", -1).to_list(limit)

    # Bulk product counts (avoid N+1).
    if sellers:
        ids = [s["user_id"] for s in sellers]
        pipeline = [
            {"$match": {"seller_id": {"$in": ids}}},
            {"$group": {"_id": "$seller_id", "count": {"$sum": 1}}},
        ]
        counts_map: dict[str, int] = {}
        async for row in db.products.aggregate(pipeline):
            counts_map[row["_id"]] = row["count"]
        for s in sellers:
            s["products_count"] = counts_map.get(s["user_id"], 0)
            if isinstance(s.get("created_at"), datetime):
                s["created_at"] = s["created_at"].isoformat()
    return sellers


async def update_seller(db, *, user_id: str, payload: AdminSellerUpdate) -> dict[str, Any]:
    existing = await db.users.find_one(
        {"user_id": user_id, "role": "seller"}, {"_id": 0}
    )
    if not existing:
        raise LookupError("Seller not found")

    update_set: dict[str, Any] = {}
    for field in ("name", "business_name", "location", "bio", "picture"):
        v = getattr(payload, field)
        if v is not None:
            update_set[field] = v
    if payload.is_active is not None:
        update_set["is_active"] = payload.is_active
    if payload.is_verified is not None:
        update_set["is_verified"] = payload.is_verified

    if not update_set:
        return existing
    update_set["updated_at"] = datetime.now(UTC)
    await db.users.update_one({"user_id": user_id}, {"$set": update_set})
    refreshed = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if isinstance(refreshed.get("created_at"), datetime):
        refreshed["created_at"] = refreshed["created_at"].isoformat()
    if isinstance(refreshed.get("updated_at"), datetime):
        refreshed["updated_at"] = refreshed["updated_at"].isoformat()
    return refreshed


async def resend_set_password_link(
    db, *, user_id: str, base_url: str | None, send_sms,
) -> dict[str, Any]:
    user = await db.users.find_one({"user_id": user_id, "role": "seller"}, {"_id": 0})
    if not user:
        raise LookupError("Seller not found")
    from datetime import timedelta
    now = datetime.now(UTC)
    token = _gen_reset_token()
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "password_reset_token": token,
            "password_reset_expires": now + timedelta(hours=72),
            "auth_type": "password_pending",
        }},
    )
    phone = user.get("phone")
    link = f"{base_url or ''}/reset-password?token={token}&phone={phone}"
    if phone:
        await send_sms(
            phone,
            f"Biz-Salama: Weka neno la siri hapa: {link} (Masaa 72)",
            f"Biz-Salama: Set your password here: {link} (Valid for 72 hours)",
        )
    return {"sent": True, "set_password_link": link}



# ──────────────────────────────────────────────────────────────────────────
# Bulk CSV import
# ──────────────────────────────────────────────────────────────────────────
BULK_CSV_REQUIRED = ("name", "phone")
BULK_CSV_OPTIONAL = ("email", "business_name", "location", "bio")
BULK_CSV_HEADERS = BULK_CSV_REQUIRED + BULK_CSV_OPTIONAL


def parse_bulk_csv(csv_text: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Parse the admin's pasted/uploaded CSV.

    Returns (`rows`, `errors`). Each row is a dict with stripped values plus a
    `_row` int holding the CSV line number. Errors are per-row dicts
    `{row, error}` (row 0 = header-level fatal error).
    """
    rows: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    if csv_text.startswith("\ufeff"):
        csv_text = csv_text.lstrip("\ufeff")
    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        errors.append({"row": 0, "error": "CSV has no header row"})
        return rows, errors

    header_map = {(h or "").strip().lower(): (h or "") for h in reader.fieldnames}
    missing = [c for c in BULK_CSV_REQUIRED if c not in header_map]
    if missing:
        errors.append({
            "row": 0,
            "error": f"Missing required column(s): {', '.join(missing)}. "
                     f"Expected headers: {', '.join(BULK_CSV_HEADERS)}",
        })
        return rows, errors

    for i, raw in enumerate(reader, start=2):  # row 1 is the header
        clean: dict[str, str] = {}
        for col in BULK_CSV_HEADERS:
            actual = header_map.get(col)
            if actual is not None:
                v = (raw.get(actual) or "").strip()
                if v:
                    clean[col] = v
        if not clean.get("name") or not clean.get("phone"):
            errors.append({"row": i, "error": "Empty name or phone"})
            continue
        clean["_row"] = i  # int, not str — consistent with row-0 header errors
        rows.append(clean)
    return rows, errors


async def bulk_import(
    db,
    *,
    csv_text: str,
    admin_user_id: str,
    base_url: str | None,
    send_sms,
    calculate_fees,
    normalize_tz_phone,
) -> dict[str, Any]:
    """Create one verified seller per CSV row (SMS-link password path).

    Per-row failures (invalid phone, duplicate, etc.) are collected so the
    batch doesn't bail on the first bad row.
    """
    rows, parse_errors = parse_bulk_csv(csv_text)
    created: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = list(parse_errors)
    if parse_errors and any(e.get("row") == 0 for e in parse_errors):
        return {"created": created, "errors": errors, "summary": {"created": 0, "failed": len(errors), "total_rows": 0}}

    for r in rows:
        row_n = r.get("_row")
        try:
            normalized = normalize_tz_phone(r["phone"])
            if not normalized:
                errors.append({"row": row_n, "phone": r.get("phone"), "error": "Invalid TZ phone"})
                continue
            payload = AdminSellerCreate(
                name=r["name"],
                phone=normalized,
                email=r.get("email"),
                business_name=r.get("business_name"),
                location=r.get("location"),
                bio=r.get("bio"),
                send_set_password_link=True,
            )
            result = await create_seller(
                db,
                payload=payload,
                admin_user_id=admin_user_id,
                normalized_phone=normalized,
                base_url=base_url,
                send_sms=send_sms,
                calculate_fees=calculate_fees,
            )
            created.append({
                "user_id": result["user_id"],
                "name": result["name"],
                "phone": result["phone"],
                "set_password_link": result.get("set_password_link"),
            })
        except (LookupError, ValueError) as e:
            errors.append({"row": row_n, "phone": r.get("phone"), "error": str(e)})

    return {
        "created": created,
        "errors": errors,
        "summary": {
            "created": len(created),
            "failed": len(errors),
            "total_rows": len(rows),
        },
    }

