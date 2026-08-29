"""Transactions ledger + audit log — the dashboard's data surface.

`GET /transactions` is the browsable ledger behind the Transactions tab and the
per-class tabs: every row the merchant sees, with the AI classification tags and
the derived recovery outcome (playbook, channel, stopping rule, time-to-recovery)
pulled from the append-only audit trail. `GET /transactions/{id}` opens the full
story of one transaction (its audit timeline + the Gemini diagnosis). `GET /audit`
exposes the immutable trail itself for the Audit Log tab.

Customer contact is PII: it is stored encrypted and only ever leaves here masked.
"""

from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.enums import ActionType, NodeName
from app.models import AuditTrail, TransactionState

router = APIRouter(tags=["transactions"])


def _mask(contact: str) -> str:
    """Keep the last four digits; mask the rest (never expose PII in the clear)."""
    if not contact:
        return "****"
    tail = contact[-4:]
    return "*" * max(4, len(contact) - 4) + tail


def _audits_by_txn(db: Session, txn_ids: list[str]) -> dict[str, list[AuditTrail]]:
    if not txn_ids:
        return {}
    rows = (
        db.query(AuditTrail)
        .filter(AuditTrail.transaction_id.in_(txn_ids))
        .order_by(AuditTrail.id)
        .all()
    )
    grouped: dict[str, list[AuditTrail]] = defaultdict(list)
    for r in rows:
        grouped[r.transaction_id].append(r)
    return grouped


def _derive(trail: list[AuditTrail]) -> dict:
    """Pull the outcome-defining facts out of a transaction's audit trail."""
    playbook = channel = stopping_rule = None
    for a in trail:
        payload = a.payload if isinstance(a.payload, dict) else {}
        if a.action_type == ActionType.INTERVENTION_DISPATCH:
            playbook = payload.get("playbook", playbook)
            channel = payload.get("channel", channel)
        if payload.get("stopping_rule"):
            stopping_rule = payload["stopping_rule"]
    return {"playbook": playbook, "channel": channel, "stopping_rule": stopping_rule}


def _row(txn: TransactionState, trail: list[AuditTrail]) -> dict:
    meta = txn.metadata_json or {}
    recovered = txn.current_state.value == "RECOVERED"
    at_risk = bool(meta.get("is_at_risk", True))
    ttr = (
        round((txn.updated_at - txn.created_at).total_seconds(), 2)
        if recovered and at_risk
        else None
    )
    return {
        "transaction_id": txn.transaction_id,
        "razorpay_payment_id": txn.razorpay_payment_id,
        "failure_class": int(txn.failure_class),
        "class_label": meta.get("class_label"),
        "archetype": meta.get("archetype"),
        "ai_tag": meta.get("ai_tag"),
        "is_at_risk": at_risk,
        "confidence": meta.get("confidence"),
        "event_type": meta.get("event_type"),
        "error_code": meta.get("error_code"),
        "status": txn.current_state.value,
        "amount_inr": round(txn.amount_minor / 100, 2),
        "currency": txn.currency,
        "customer_name": meta.get("customer_name"),
        "customer_contact_masked": _mask(txn.customer_contact),
        "time_to_recovery_seconds": ttr,
        "created_at": txn.created_at.isoformat(),
        "updated_at": txn.updated_at.isoformat(),
        **_derive(trail),
    }


@router.get("/transactions")
def list_transactions(
    db: Session = Depends(get_db),
    failure_class: int | None = Query(None, ge=1, le=4),
    status_: str | None = Query(None, alias="status"),
    archetype: str | None = None,
    q: str | None = None,
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> dict:
    query = db.query(TransactionState)
    if failure_class is not None:
        query = query.filter(TransactionState.failure_class == failure_class)
    if status_:
        query = query.filter(TransactionState.current_state == status_)

    rows = query.order_by(TransactionState.created_at.desc()).all()

    # A per-class view is about that class's *failures*: healthy volume is
    # attributed to a nominal class only for its amount profile, so exclude it
    # whenever the caller narrows to a class (the all-transactions view keeps it).
    if failure_class is not None:
        rows = [t for t in rows if (t.metadata_json or {}).get("archetype") != "HEALTHY"]

    # metadata (archetype) and customer-name search live in JSON, so filter in
    # Python after the SQL-level filters have narrowed the set.
    if archetype:
        rows = [t for t in rows if (t.metadata_json or {}).get("archetype") == archetype]
    if q:
        needle = q.lower()
        rows = [
            t
            for t in rows
            if needle in t.transaction_id.lower()
            or needle in str((t.metadata_json or {}).get("customer_name", "")).lower()
        ]

    total = len(rows)
    page = rows[offset : offset + limit]
    trails = _audits_by_txn(db, [t.transaction_id for t in page])
    items = [_row(t, trails.get(t.transaction_id, [])) for t in page]
    return {"total": total, "items": items}


@router.get("/transactions/{transaction_id}")
def get_transaction(transaction_id: str, db: Session = Depends(get_db)) -> dict:
    txn = (
        db.query(TransactionState)
        .filter_by(transaction_id=transaction_id)
        .one_or_none()
    )
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    trail = _audits_by_txn(db, [transaction_id]).get(transaction_id, [])
    diagnosis = {}
    for a in trail:
        if a.node_name == NodeName.DIAGNOSE and isinstance(a.payload, dict):
            diagnosis = {
                "root_cause": a.payload.get("root_cause"),
                "recommended_playbook": a.payload.get("recommended_playbook"),
                "confidence": a.payload.get("confidence"),
            }
            break

    return {
        **_row(txn, trail),
        "diagnosis": diagnosis,
        "audit_trail": [
            {
                "id": a.id,
                "node_name": a.node_name.value,
                "action_type": a.action_type.value,
                "payload": a.payload,
                "outcome": a.outcome.value,
                "timestamp": a.timestamp.isoformat(),
            }
            for a in trail
        ],
    }


@router.get("/audit")
def list_audit(
    db: Session = Depends(get_db),
    transaction_id: str | None = None,
    limit: int = Query(200, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> dict:
    query = db.query(AuditTrail)
    if transaction_id:
        query = query.filter(AuditTrail.transaction_id == transaction_id)
    total = query.count()
    rows = query.order_by(AuditTrail.id.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": a.id,
                "transaction_id": a.transaction_id,
                "node_name": a.node_name.value,
                "action_type": a.action_type.value,
                "payload": a.payload,
                "outcome": a.outcome.value,
                "timestamp": a.timestamp.isoformat(),
            }
            for a in rows
        ],
    }
