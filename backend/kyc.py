"""
KYC (Know Your Customer)
────────────────────────
Identity verification module. Buyers can transact at low limits without KYC,
but sellers, hawkers, and high-value transactions require verified KYC.

Lifecycle:
    pending  → submitted by user
    verified → approved by admin
    rejected → admin rejected; user can resubmit

The user document already has `kyc_status` (default "pending"). This module
adds a `kyc_submissions` collection for the actual document/photo references
and a small audit trail.
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


VALID_DOC_TYPES = {"national_id", "voter_id", "passport", "drivers_license"}


async def submit_kyc(db, *, user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Persist a KYC submission. Stored as base64 document images so we don't
    need an external object store for the MVP. Production should swap to S3.
    """
    doc_type = payload.get("document_type")
    if doc_type not in VALID_DOC_TYPES:
        raise ValueError(f"document_type must be one of {VALID_DOC_TYPES}")
    if not payload.get("document_number") or not payload.get("full_name"):
        raise ValueError("document_number and full_name are required")

    sub_id = f"kyc_{uuid.uuid4().hex[:12]}"
    doc = {
        "submission_id": sub_id,
        "user_id": user_id,
        "document_type": doc_type,
        "document_number": payload["document_number"],
        "full_name": payload["full_name"],
        "selfie_b64": payload.get("selfie_b64") or "",
        "document_b64": payload.get("document_b64") or "",
        "status": "pending",
        "rejection_reason": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "created_at": datetime.now(timezone.utc),
    }
    await db.kyc_submissions.insert_one(doc)
    # Strip Mongo-injected _id so the dict is JSON-serializable when returned.
    doc.pop("_id", None)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": "pending", "kyc_submission_id": sub_id}},
    )
    return doc


async def review_kyc(db, *, submission_id: str, decision: str, reviewer_id: str, reason: str = "") -> Dict[str, Any]:
    """Admin marks the KYC submission as verified or rejected."""
    if decision not in {"verified", "rejected"}:
        raise ValueError("decision must be 'verified' or 'rejected'")
    sub = await db.kyc_submissions.find_one({"submission_id": submission_id}, {"_id": 0})
    if not sub:
        raise ValueError("Submission not found")

    now = datetime.now(timezone.utc)
    await db.kyc_submissions.update_one(
        {"submission_id": submission_id},
        {"$set": {
            "status": decision,
            "rejection_reason": reason if decision == "rejected" else None,
            "reviewed_by": reviewer_id,
            "reviewed_at": now,
        }},
    )
    await db.users.update_one(
        {"user_id": sub["user_id"]},
        {"$set": {"kyc_status": decision, "kyc_reviewed_at": now}},
    )
    sub.update({"status": decision, "reviewed_by": reviewer_id, "reviewed_at": now})
    return sub


async def list_pending(db, limit: int = 50) -> List[Dict[str, Any]]:
    """Admin queue — pending submissions oldest-first."""
    rows = await db.kyc_submissions.find(
        {"status": "pending"}, {"_id": 0}
    ).sort("created_at", 1).limit(limit).to_list(limit)
    for r in rows:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
        # Strip heavy base64 from list view; admins fetch detail separately.
        r["selfie_b64"] = "[present]" if r.get("selfie_b64") else ""
        r["document_b64"] = "[present]" if r.get("document_b64") else ""
    return rows


async def get_user_kyc_status(db, user_id: str) -> Dict[str, Any]:
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "kyc_status": 1, "kyc_submission_id": 1})
    if not user:
        return {"kyc_status": "unknown"}
    out = {"kyc_status": user.get("kyc_status", "pending")}
    sid = user.get("kyc_submission_id")
    if sid:
        sub = await db.kyc_submissions.find_one(
            {"submission_id": sid},
            {"_id": 0, "submission_id": 1, "status": 1, "rejection_reason": 1, "created_at": 1, "reviewed_at": 1},
        )
        if sub:
            for f in ("created_at", "reviewed_at"):
                if isinstance(sub.get(f), datetime):
                    sub[f] = sub[f].isoformat()
            out["submission"] = sub
    return out
