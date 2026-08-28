"""Recovery reconciliation ledger - the money metric.

Answers the headline question the recovery bar asks: how much at-risk revenue did
the engine actually win back across the batch? Everything here is derived from
the durable tables (TransactionState, AuditTrail, EscalationQueue), so the number
is auditable rather than asserted.

Amounts are stored in paise; the ``*_inr`` fields are rupees for readability.
"""

from sqlalchemy.orm import Session

from app.enums import (
    ActionType,
    FailureClass,
    TransactionLifecycleState,
)
from app.models import AuditTrail, EscalationQueue, TransactionState

_PAISE_PER_RUPEE = 100


def _inr(paise: int | None) -> float:
    return round((paise or 0) / _PAISE_PER_RUPEE, 2)


def compute_metrics(db: Session) -> dict:
    transactions = db.query(TransactionState).all()

    at_risk_paise = sum(t.amount_minor for t in transactions)
    recovered_paise = sum(
        t.amount_minor
        for t in transactions
        if t.current_state == TransactionLifecycleState.RECOVERED
    )

    by_class: dict[str, dict[str, float]] = {}
    for fc in FailureClass:
        rows = [t for t in transactions if int(t.failure_class) == int(fc)]
        by_class[str(int(fc))] = {
            "at_risk_inr": _inr(sum(t.amount_minor for t in rows)),
            "recovered_inr": _inr(
                sum(
                    t.amount_minor
                    for t in rows
                    if t.current_state == TransactionLifecycleState.RECOVERED
                )
            ),
            "count": len(rows),
        }

    def _count_state(state: TransactionLifecycleState) -> int:
        return sum(1 for t in transactions if t.current_state == state)

    interventions = (
        db.query(AuditTrail)
        .filter(AuditTrail.action_type == ActionType.INTERVENTION_DISPATCH)
        .count()
    )
    # A stopping rule leaves its name in the audit payload; count those entries.
    stopping_rules_fired = sum(
        1
        for a in db.query(AuditTrail).all()
        if isinstance(a.payload, dict) and "stopping_rule" in a.payload
    )
    escalations = db.query(EscalationQueue).count()

    recovered_txns = [
        t for t in transactions if t.current_state == TransactionLifecycleState.RECOVERED
    ]
    avg_ttr = 0.0
    if recovered_txns:
        avg_ttr = round(
            sum((t.updated_at - t.created_at).total_seconds() for t in recovered_txns)
            / len(recovered_txns),
            2,
        )

    return {
        "at_risk_inr": _inr(at_risk_paise),
        "recovered_inr": _inr(recovered_paise),
        "grrr": round(recovered_paise / at_risk_paise, 4) if at_risk_paise else 0.0,
        "by_class": by_class,
        "counts": {
            "interventions": interventions,
            "escalations": escalations,
            "stopping_rules_fired": stopping_rules_fired,
            "recovered": _count_state(TransactionLifecycleState.RECOVERED),
            "cancelled": _count_state(TransactionLifecycleState.CANCELLED),
            "failed": _count_state(TransactionLifecycleState.FAILED),
        },
        "avg_time_to_recovery_seconds": avg_ttr,
    }
