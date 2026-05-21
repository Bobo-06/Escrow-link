"""Self-service & admin KYC document storage on the user record.

The pre-existing `seller_onboarding.py` covers the *field-rep* flow (rep
captures docs for a NEW seller before the account exists). This module covers
the two other cases:

1. **Self-service** — an already-registered seller uploads their own KYC docs
   from `/my-documents`. Docs land on `users.kyc_documents` and status
   transitions to `pending_review`.
2. **Admin direct** — admin attaches/replaces docs for an existing seller
   from `/admin/sellers`. Same storage location, but bypasses the pending
   queue (admin-trusted).

Doc storage shape::

    users.kyc_documents = {
        "national_id":           {image_b64, uploaded_at, uploaded_by, review_status, rejection_reason},
        "business_registration": {...},
        ...
    }
    users.kyc_status: "unsubmitted" | "pending_review" | "approved" | "rejected"
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel

DOC_TYPES = (
    "national_id",
    "business_registration",
    "memart_extract",
    "tin_certificate",
    "business_license",
)
DOC_LABELS = {
    "national_id":           {"en": "National ID (NIDA)",            "sw": "Kitambulisho cha Taifa (NIDA)"},
    "business_registration": {"en": "Business Registration",         "sw": "Cheti cha Usajili wa Biashara"},
    "memart_extract":        {"en": "Memart / Registrar Extract",    "sw": "Memart / Nukuu ya Msajili"},
    "tin_certificate":       {"en": "TIN Certificate",               "sw": "Cheti cha TIN"},
    "business_license":      {"en": "Business License",              "sw": "Leseni ya Biashara"},
}
# Max base64 size — ≈4.4 MB raw. Frontend compresses to ≤1.5 MB so this is
# a hard backstop, not the normal path.
MAX_DOC_BYTES = 6 * 1024 * 1024


class DocumentUpload(BaseModel):
    doc_type: str
    image_b64: str
    note: str | None = None


def _now() -> datetime:
    return datetime.now(UTC)


def _serialize_docs(raw: dict[str, Any]) -> dict[str, Any]:
    """Strip image_b64 from list payloads (they're huge); only meta + size."""
    out: dict[str, Any] = {}
    for k, d in (raw or {}).items():
        if not isinstance(d, dict):
            continue
        out[k] = {
            "captured": bool(d.get("image_b64")),
            "uploaded_at": d.get("uploaded_at").isoformat() if isinstance(d.get("uploaded_at"), datetime) else d.get("uploaded_at"),
            "size_bytes": len(d.get("image_b64") or ""),
            "review_status": d.get("review_status", "pending"),
            "rejection_reason": d.get("rejection_reason"),
            "uploaded_by": d.get("uploaded_by"),
            "note": d.get("note"),
        }
    return out


async def upload_doc(
    db,
    *,
    user_id: str,
    doc_type: str,
    image_b64: str,
    note: str | None,
    uploader_id: str,
    is_admin_upload: bool,
) -> dict[str, Any]:
    """Upsert a single KYC doc onto the user record."""
    if doc_type not in DOC_TYPES:
        raise ValueError(f"doc_type must be one of {list(DOC_TYPES)}")
    if not image_b64 or len(image_b64) < 100:
        raise ValueError("image_b64 missing or too small (need a real photo)")
    if len(image_b64) > MAX_DOC_BYTES:
        raise ValueError(f"Photo too large (max {MAX_DOC_BYTES // (1024 * 1024)} MB)")

    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "kyc_status": 1, "kyc_documents": 1})
    if user is None:
        raise LookupError("User not found")

    # If the previous status was approved/rejected, kick it back to pending on
    # a new upload — admin re-reviews. Admin-direct uploads stay approved.
    next_kyc_status = user.get("kyc_status", "unsubmitted")
    if not is_admin_upload:
        next_kyc_status = "pending_review"

    entry = {
        "image_b64": image_b64,
        "note": (note or "").strip() or None,
        "uploaded_at": _now(),
        "uploaded_by": uploader_id,
        "review_status": "approved" if is_admin_upload else "pending",
        "rejection_reason": None,
    }
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            f"kyc_documents.{doc_type}": entry,
            "kyc_status": next_kyc_status,
            "updated_at": _now(),
        }},
    )
    refreshed = await db.users.find_one({"user_id": user_id}, {"_id": 0, "kyc_documents": 1, "kyc_status": 1})
    return {
        "kyc_status": refreshed.get("kyc_status", "unsubmitted"),
        "documents": _serialize_docs(refreshed.get("kyc_documents") or {}),
    }


async def list_docs(db, *, user_id: str) -> dict[str, Any]:
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "kyc_documents": 1, "kyc_status": 1, "is_verified": 1})
    if user is None:
        raise LookupError("User not found")
    return {
        "kyc_status": user.get("kyc_status", "unsubmitted"),
        "is_verified": bool(user.get("is_verified")),
        "documents": _serialize_docs(user.get("kyc_documents") or {}),
        "required": list(DOC_TYPES),
        "labels": DOC_LABELS,
    }


async def get_doc_image(db, *, user_id: str, doc_type: str) -> str | None:
    if doc_type not in DOC_TYPES:
        return None
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "kyc_documents": 1})
    if not user:
        return None
    doc = (user.get("kyc_documents") or {}).get(doc_type)
    return (doc or {}).get("image_b64")


async def submit_for_review(db, *, user_id: str) -> dict[str, Any]:
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "kyc_documents": 1})
    if user is None:
        raise LookupError("User not found")
    docs = user.get("kyc_documents") or {}
    missing = [d for d in DOC_TYPES if not (docs.get(d) or {}).get("image_b64")]
    if missing:
        raise ValueError(f"Missing documents: {missing}")
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": "pending_review", "kyc_submitted_at": _now(), "updated_at": _now()}},
    )
    return await list_docs(db, user_id=user_id)


async def admin_review(
    db,
    *,
    user_id: str,
    doc_type: str | None,
    approve: bool,
    rejection_reason: str | None = None,
    reviewer_id: str,
) -> dict[str, Any]:
    """Approve or reject either a specific doc OR the whole submission."""
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "kyc_documents": 1})
    if user is None:
        raise LookupError("User not found")

    set_payload: dict[str, Any] = {"updated_at": _now()}
    if doc_type:
        if doc_type not in DOC_TYPES:
            raise ValueError(f"doc_type must be one of {list(DOC_TYPES)}")
        set_payload[f"kyc_documents.{doc_type}.review_status"] = "approved" if approve else "rejected"
        set_payload[f"kyc_documents.{doc_type}.rejection_reason"] = None if approve else (rejection_reason or "rejected by admin")
        set_payload[f"kyc_documents.{doc_type}.reviewed_at"] = _now()
        set_payload[f"kyc_documents.{doc_type}.reviewed_by"] = reviewer_id
    else:
        # Whole-batch decision
        set_payload["kyc_status"] = "approved" if approve else "rejected"
        set_payload["kyc_reviewed_at"] = _now()
        set_payload["kyc_reviewed_by"] = reviewer_id
        if approve:
            set_payload["is_verified"] = True

    await db.users.update_one({"user_id": user_id}, {"$set": set_payload})
    return await list_docs(db, user_id=user_id)
