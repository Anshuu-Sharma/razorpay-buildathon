"""Domain enumerations.

Centralising the allowed values here lets both the SQLAlchemy models (via
``Enum`` columns / check constraints) and the Pydantic schemas share a single
source of truth, so an invalid state can't be persisted from either layer.
"""

from enum import Enum, IntEnum


class FailureClass(IntEnum):
    """The four payment-failure classes the recovery engine routes on.

    Kept as an ``IntEnum`` so the numeric contract from the PRD (classes 1-4)
    is preserved on the wire while still being validated.
    """

    NETWORK_DEGRADATION = 1   # Class 1 - issuer/node degradation, needs re-routing
    INSUFFICIENT_FUNDS = 2    # Class 2 - hard decline, retry with backoff
    SALARY_CYCLE = 3          # Class 3 - timing failure, wait for salary credit
    TECHNICAL_DECLINE = 4     # Class 4 - transient technical error


class TransactionLifecycleState(str, Enum):
    """Lifecycle a transaction moves through inside the orchestrator."""

    PENDING = "PENDING"
    DIAGNOSING = "DIAGNOSING"
    WAITING = "WAITING"          # Class 3 salary-cycle pause
    INTERVENING = "INTERVENING"
    RECOVERED = "RECOVERED"
    ESCALATED = "ESCALATED"
    FAILED = "FAILED"


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
