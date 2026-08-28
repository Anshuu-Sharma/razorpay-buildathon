"""Domain enumerations.

Centralising the allowed values here lets both the SQLAlchemy models (via
``Enum`` columns / check constraints) and the Pydantic schemas share a single
source of truth, so an invalid state can't be persisted from either layer.
"""

from enum import Enum, IntEnum


class FailureClass(IntEnum):
    """The four payment-failure classes the recovery engine routes on.

    Kept as an ``IntEnum`` so the numeric contract from the PRD (classes 1-4)
    is preserved on the wire while still being validated. Names mirror the PRD's
    locked taxonomy so the code reads the way the product spec does.
    """

    REALTIME_DEGRADATION = 1   # Class 1 - infra/switch timeout, needs re-routing
    CHECKOUT_ABANDONMENT = 2   # Class 2 - high-intent drop-off at the payment modal
    SUBSCRIPTION_MANDATE = 3   # Class 3 - e-mandate/subscription churn (salary cycle)
    B2B_RECEIVABLES = 4        # Class 4 - overdue invoice / promise-to-pay chasing


class TransactionLifecycleState(str, Enum):
    """Lifecycle a transaction moves through inside the orchestrator."""

    PENDING = "PENDING"
    DIAGNOSING = "DIAGNOSING"
    WAITING = "WAITING"          # Class 3 salary-cycle pause
    INTERVENING = "INTERVENING"
    RECOVERED = "RECOVERED"     # money captured - loop closed
    ESCALATED = "ESCALATED"     # routed to the human queue
    CANCELLED = "CANCELLED"     # compliant stop: opt-out / stopping-rule termination
    FAILED = "FAILED"           # retries exhausted without recovery


class NodeName(str, Enum):
    """Orchestrator DAG nodes that emit audit entries."""

    INGEST = "INGEST"
    DIAGNOSE = "DIAGNOSE"
    WAIT = "WAIT"
    EXECUTE_INTERVENTION = "EXECUTE_INTERVENTION"


class ActionType(str, Enum):
    """The kind of action an audit entry records."""

    STATE_TRANSITION = "STATE_TRANSITION"
    INTERVENTION_DISPATCH = "INTERVENTION_DISPATCH"
    RETRY_SCHEDULED = "RETRY_SCHEDULED"
    ESCALATION = "ESCALATION"


class Outcome(str, Enum):
    """Result of an audited action."""

    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"
    ESCALATED = "ESCALATED"
