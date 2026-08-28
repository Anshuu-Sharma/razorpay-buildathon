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


class InterventionChannel(str, Enum):
    """Outbound channels a recovery action can use."""

    WHATSAPP = "WHATSAPP"
    VOICE = "VOICE"
    PAYMENT_LINK = "PAYMENT_LINK"


class InterventionAction(str, Enum):
    """The concrete recovery actions the orchestrator can propose.

    Every one of these must clear the PolicySandbox before it reaches a channel
    adapter - this enum is the closed set of things the engine is even allowed
    to attempt.
    """

    SEND_WHATSAPP = "SEND_WHATSAPP"
    VOICE_CALL = "VOICE_CALL"
    OFFER_FEE_WAIVER = "OFFER_FEE_WAIVER"
    GENERATE_PAYMENT_LINK = "GENERATE_PAYMENT_LINK"
    RETRY_CHARGE = "RETRY_CHARGE"
    CANCEL_SUBSCRIPTION = "CANCEL_SUBSCRIPTION"


class StoppingRule(str, Enum):
    """Named, regulatory/compliance stopping rules.

    Each is emitted to the audit trail and counted in the recovery metrics, so a
    judge can see exactly which rule halted a workflow and how often.
    """

    NO_DOUBLE_CHARGE = "NO_DOUBLE_CHARGE"              # C1 late settlement
    CROSS_DEVICE_COMPLETION = "CROSS_DEVICE_COMPLETION"  # C2 completed elsewhere
    RBI_MAX_RETRIES = "RBI_MAX_RETRIES"                # C3 <=3 auto-debit retries
    EXPLICIT_CANCEL = "EXPLICIT_CANCEL"                # user asked to cancel plan
    OPT_OUT = "OPT_OUT"                                # user opted out of contact
    DISPUTE_FREEZE = "DISPUTE_FREEZE"                  # C4 dispute -> human queue
    TRAI_QUIET_HOURS = "TRAI_QUIET_HOURS"              # 20:00-09:00 IST no contact
    VOICE_ATTEMPT_CAP = "VOICE_ATTEMPT_CAP"            # <=2 voice calls / 72h


class EscalationStatus(str, Enum):
    """Lifecycle of a human-handoff ticket."""

    OPEN = "OPEN"
    RESOLVED = "RESOLVED"
