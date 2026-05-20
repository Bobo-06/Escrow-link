"""
Seller Onboarding
─────────────────
Mobile-first onboarding flow for Tanzanian businesses joining Biz-Salama.

Captures 5 regulatory documents per seller, each as a base64-encoded camera
snapshot from the rep's phone:

    1. national_id              — Owner's National ID (NIDA)
    2. business_registration    — Certificate of Registration / Incorporation
    3. memart_extract           — Memart / Extract of Registrar (BRELA)
    4. tin_certificate          — Tax Identification Number certificate
    5. business_license          — Trading / business license

Uniqueness model:
    `phone` (normalized to +255) is the PRIMARY identifier — every seller has one.
    `tin` is the SECONDARY identifier — enforced unique once captured (TIN is
    Tanzania's national tax ID, ~10 digits, one per legal entity).
    Either field collision returns a clear 409 so the rep can resolve in the
    field (e.g. update the existing seller instead of creating a duplicate).

Flow:
    POST /api/onboarding/seller/start      → creates a `seller_onboarding` doc
                                              (status='draft'), returns onboarding_id
    POST /api/onboarding/seller/{id}/doc   → uploads one document at a time
                                              (so each camera snap is its own request)
    POST /api/onboarding/seller/{id}/submit → marks as 'submitted', flips the
                                              user's role to 'seller', kyc_status='pending'
    GET  /api/onboarding/seller/{id}       → progress view (which of the 5 captured)
    GET  /api/admin/onboarding/queue       → admin pending queue
    POST /api/admin/onboarding/{id}/review → admin verifies/rejects each doc + the whole submission
"""
from __future__ import annotations
import uuid
import re
from datetime import datetime, UTC
from typing import Any


# The 5 documents required from every Tanzanian seller. Order is preserved
# for the wizard UI so reps capture in a predictable sequence.
REQUIRED_DOCS = [
    "national_id",
    "business_registration",
    "memart_extract",
    "tin_certificate",
    "business_license",
]
REQUIRED_DOC_LABELS = {
    "national_id":           {"en": "National ID (NIDA)",                "sw": "Kitambulisho cha Taifa (NIDA)"},
    "business_registration": {"en": "Certificate of Registration",       "sw": "Cheti cha Usajili wa Biashara"},
    "memart_extract":        {"en": "Memart / Extract of Registrar",     "sw": "Memart / Nukuu ya Msajili"},
    "tin_certificate":       {"en": "TIN Certificate",                   "sw": "Cheti cha TIN"},
    "business_license":      {"en": "Business License",                  "sw": "Leseni ya Biashara"},
}

# TIN: Tanzania Revenue Authority issues 9-10 digit numeric identifiers.
TIN_REGEX = re.compile(r"^\d{9,12}$")


def _now() -> datetime:
    return datetime.now(UTC)


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _public(doc: dict[str, Any]) -> dict[str, Any]:
    """Strip Mongo internals + ISO-format dates + trim heavy base64 bodies."""
    out = {k: v for k, v in doc.items() if k != "_id"}
    for f in ("created_at", "updated_at", "submitted_at", "reviewed_at"):
        if isinstance(out.get(f), datetime):
            out[f] = out[f].isoformat()
    docs = out.get("documents") or {}
    trimmed = {}
    for k, d in docs.items():
        if not isinstance(d, dict):
            continue
        trimmed[k] = {
            "captured": bool(d.get("image_b64")),
            "uploaded_at": _iso(d.get("uploaded_at")),
            "note": d.get("note", ""),
            "size_bytes": len(d.get("image_b64") or ""),
            "review_status": d.get("review_status", "pending"),
            "rejection_reason": d.get("rejection_reason"),
        }
    out["documents"] = trimmed
    return out


async def start_onboarding(
    db,
    *,
    rep_user_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    """
    Begin a new seller onboarding. The rep (currently-authenticated admin /
    sales agent) is recorded so we can audit who collected the data.

    `payload` requires: business_name, owner_name, phone.
    Optional now (can be added later via /doc): tin, business_email, location.

    Uniqueness:
      - phone collision in users OR seller_onboarding → 409
      - tin collision in users OR seller_onboarding → 409 (if tin provided)
    """
    business_name = (payload.get("business_name") or "").strip()
    owner_name = (payload.get("owner_name") or "").strip()
    phone = (payload.get("phone") or "").strip()
    tin = (payload.get("tin") or "").strip() or None

    if not business_name or not owner_name or not phone:
        raise ValueError("business_name, owner_name, and phone are required")
    if tin and not TIN_REGEX.match(tin):
        raise ValueError("TIN must be 9-12 digits")

    # Uniqueness — phone is THE primary key for sellers.
    if await db.users.find_one({"phone": phone, "role": "seller"}, {"_id": 1}):
        raise PermissionError(f"A seller already exists with phone {phone}")
    in_flight = await db.seller_onboarding.find_one(
        {"phone": phone, "status": {"$in": ["draft", "submitted"]}}, {"_id": 1},
    )
    if in_flight:
        raise PermissionError(f"Onboarding already in progress for phone {phone}")
    if tin:
        if await db.users.find_one({"tin": tin}, {"_id": 1}):
            raise PermissionError(f"A seller already exists with TIN {tin}")
        if await db.seller_onboarding.find_one(
            {"tin": tin, "status": {"$in": ["draft", "submitted", "verified"]}}, {"_id": 1},
        ):
            raise PermissionError(f"Onboarding already in progress for TIN {tin}")

    onboarding_id = f"onb_{uuid.uuid4().hex[:12]}"
    doc = {
        "onboarding_id": onboarding_id,
        "business_name": business_name,
        "owner_name": owner_name,
        "phone": phone,
        "tin": tin,
        "business_email": (payload.get("business_email") or "").strip() or None,
        "location": (payload.get("location") or "").strip() or None,
        "category": (payload.get("category") or "general").strip(),
        "rep_user_id": rep_user_id,
        "documents": {},          # filled in by /doc
        "status": "draft",
        "submitted_at": None,
        "reviewed_at": None,
        "reviewed_by": None,
        "rejection_reason": None,
        "created_user_id": None,  # set on review when we create the seller's account
        "created_at": _now(),
        "updated_at": _now(),
    }
    await db.seller_onboarding.insert_one(doc)
    doc.pop("_id", None)
    return _public(doc)


async def upload_document(
    db,
    *,
    onboarding_id: str,
    doc_type: str,
    image_b64: str,
    note: str = "",
    rep_user_id: str = "",
) -> dict[str, Any]:
    """One camera snap at a time — each /doc call uploads ONE of the 5 docs."""
    if doc_type not in REQUIRED_DOCS:
        raise ValueError(f"doc_type must be one of {REQUIRED_DOCS}")
    if not image_b64 or len(image_b64) < 100:
        raise ValueError("image_b64 missing or too small (need a real photo)")
    # Soft cap: ~6 MB base64 (≈4.4 MB raw). Mongo doc limit is 16 MB but we
    # want to leave room for 5 photos plus metadata.
    if len(image_b64) > 6 * 1024 * 1024:
        raise ValueError("Photo too large (max ~4 MB raw). Re-take at lower quality.")

    existing = await db.seller_onboarding.find_one(
        {"onboarding_id": onboarding_id}, {"_id": 0, "status": 1},
    )
    if not existing:
        raise LookupError("Onboarding not found")
    if existing.get("status") not in {"draft", "rejected"}:
        raise ValueError(f"Cannot add documents while onboarding is '{existing.get('status')}'")

    doc_entry = {
        "doc_type": doc_type,
        "image_b64": image_b64,
        "note": note,
        "uploaded_by": rep_user_id,
        "uploaded_at": _now(),
        "review_status": "pending",
        "rejection_reason": None,
    }
    await db.seller_onboarding.update_one(
        {"onboarding_id": onboarding_id},
        {"$set": {
            f"documents.{doc_type}": doc_entry,
            "updated_at": _now(),
        }},
    )
    updated = await db.seller_onboarding.find_one({"onboarding_id": onboarding_id}, {"_id": 0})
    return _public(updated)


async def submit_for_review(db, *, onboarding_id: str) -> dict[str, Any]:
    """Mark onboarding submission complete — must have all 5 docs captured."""
    existing = await db.seller_onboarding.find_one({"onboarding_id": onboarding_id}, {"_id": 0})
    if not existing:
        raise LookupError("Onboarding not found")
    if existing.get("status") not in {"draft", "rejected"}:
        raise ValueError(f"Already '{existing.get('status')}'")

    docs = existing.get("documents") or {}
    missing = [d for d in REQUIRED_DOCS if not (docs.get(d) or {}).get("image_b64")]
    if missing:
        raise ValueError(f"Missing documents: {missing}")

    await db.seller_onboarding.update_one(
        {"onboarding_id": onboarding_id},
        {"$set": {
            "status": "submitted",
            "submitted_at": _now(),
            "updated_at": _now(),
            "rejection_reason": None,
        }},
    )
    updated = await db.seller_onboarding.find_one({"onboarding_id": onboarding_id}, {"_id": 0})
    return _public(updated)


async def get_onboarding(db, *, onboarding_id: str) -> dict[str, Any]:
    doc = await db.seller_onboarding.find_one({"onboarding_id": onboarding_id}, {"_id": 0})
    if not doc:
        raise LookupError("Onboarding not found")
    return _public(doc)


async def get_document_image(db, *, onboarding_id: str, doc_type: str) -> str | None:
    """Admin endpoint helper — return the raw base64 image so the reviewer can see it."""
    doc = await db.seller_onboarding.find_one(
        {"onboarding_id": onboarding_id},
        {"_id": 0, f"documents.{doc_type}.image_b64": 1},
    )
    if not doc:
        return None
    return ((doc.get("documents") or {}).get(doc_type) or {}).get("image_b64")


async def list_for_admin(db, *, status: str = "submitted", limit: int = 50) -> list[dict[str, Any]]:
    q: dict[str, Any] = {}
    if status != "all":
        q["status"] = status
    rows = await db.seller_onboarding.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return [_public(r) for r in rows]


async def review_onboarding(
    db,
    *,
    onboarding_id: str,
    decision: str,
    reviewer_id: str,
    reason: str = "",
    create_account: bool = True,
) -> dict[str, Any]:
    """
    Admin verify or reject the entire onboarding package.

    On `verified`:
      - Create (or update) the seller's user record (role='seller')
      - Promote kyc_status='verified', is_verified=True
      - Stamp seller_onboarding.created_user_id

    On `rejected`:
      - Status flips to 'rejected'; rep can re-upload corrected docs and resubmit
    """
    if decision not in {"verified", "rejected"}:
        raise ValueError("decision must be 'verified' or 'rejected'")
    existing = await db.seller_onboarding.find_one({"onboarding_id": onboarding_id}, {"_id": 0})
    if not existing:
        raise LookupError("Onboarding not found")
    if existing.get("status") != "submitted":
        raise ValueError(f"Cannot review onboarding in status '{existing.get('status')}'")

    now = _now()
    update_set: dict[str, Any] = {
        "status": decision,
        "reviewed_at": now,
        "reviewed_by": reviewer_id,
        "rejection_reason": reason if decision == "rejected" else None,
        "updated_at": now,
    }

    created_user_id = existing.get("created_user_id")
    if decision == "verified" and create_account:
        # If a user record already exists for this phone (e.g. they signed up
        # as a buyer first), promote them to seller. Otherwise create fresh.
        user = await db.users.find_one({"phone": existing["phone"]}, {"_id": 0, "user_id": 1})
        if user:
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$set": {
                    "role": "seller",
                    "kyc_status": "verified",
                    "is_verified": True,
                    "business_name": existing["business_name"],
                    "tin": existing.get("tin"),
                    "owner_name": existing["owner_name"],
                    "location": existing.get("location"),
                    "kyc_reviewed_at": now,
                    "onboarding_id": onboarding_id,
                }},
            )
            created_user_id = user["user_id"]
        else:
            # Fresh seller account. Password is unset — they'll set it via the
            # SMS link / "forgot password" flow on first login. This keeps the
            # rep's phone out of the credential loop.
            new_uid = f"usr_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": new_uid,
                "phone": existing["phone"],
                "name": existing["owner_name"],
                "business_name": existing["business_name"],
                "owner_name": existing["owner_name"],
                "tin": existing.get("tin"),
                "location": existing.get("location"),
                "email": existing.get("business_email"),
                "role": "seller",
                "auth_type": "password_pending",
                "password_hash": None,    # forces password reset flow
                "kyc_status": "verified",
                "is_verified": True,
                "is_active": True,
                "onboarding_id": onboarding_id,
                "created_at": now,
                "kyc_reviewed_at": now,
            })
            created_user_id = new_uid

        update_set["created_user_id"] = created_user_id

    await db.seller_onboarding.update_one(
        {"onboarding_id": onboarding_id},
        {"$set": update_set},
    )
    refreshed = await db.seller_onboarding.find_one({"onboarding_id": onboarding_id}, {"_id": 0})
    return _public(refreshed)
