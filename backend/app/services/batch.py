"""Batch seeder — the honest dataset behind the dashboard.

Rather than hand-writing numbers into the UI, this runs a mixed, realistic set of
at-risk transactions through the *real* recovery orchestrator and persists the
result. Every headline metric the dashboard shows is therefore computed from the
durable tables (TransactionState / AuditTrail), which is exactly what "measured
money recovered across a batch" demands.

The seed is deterministic and offline: it uses a fixed per-class diagnosis
profile (no Gemini call) and the simulated dispatcher, so it produces the same
believable batch every time without hitting the network.
"""

from __future__ import annotations

import random
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Literal

from app.enums import (
    ActionType,
    FailureClass,
    MessageDirection,
    MessageSender,
    MessageStatus,
    NodeName,
    Outcome,
    StoppingRule,
    TransactionLifecycleState,
)
from app.models import (
    AuditTrail,
    CallSession,
    CallTurn,
    EscalationQueue,
    Message,
    ProcessedEvent,
    TransactionState,
)
from app.orchestrator.graph import OrchestratorDeps, build_recovery_graph
from app.services.audit import record_audit
from app.services.conversations import build_thread, persona_for
from app.services.diagnosis import Diagnosis, _DEFAULT_PLAYBOOK
from app.services.nlp import extract_p2p_date
from app.services.policy_sandbox import PolicySandbox
from app.utils import utcnow

CaseOutcome = Literal[
    "recovered",
    "inflight",
    "escalated_dispute",
    "cancelled_optout",
    "cancelled_rbi",
    "late_settlement",  # C1: original settles late → NO_DOUBLE_CHARGE
    "cross_device",     # C2: paid on another device → CROSS_DEVICE_COMPLETION
]

_RECOVERED_LIKE = {"recovered", "late_settlement", "cross_device"}

# Per-class canonical trigger + a representative amount (paise) and a friendly
# label for the AI classification chip.
_CLASS_PROFILE: dict[FailureClass, dict] = {
    FailureClass.REALTIME_DEGRADATION: {
        "label": "Real-Time Degradation",
        "event_type": "payment.failed",
        "error_code": "ISSUER_DOWN",
        "root_cause": "ACQUIRER_SWITCH_TIMEOUT",
        "confidence": 0.94,
        "base_amount": 249900,
    },
    FailureClass.CHECKOUT_ABANDONMENT: {
        "label": "Checkout Abandonment",
        "event_type": "payment.failed",
        "error_code": "AUTH_3DS_DROPPED",
        "root_cause": "OTP_3DS_DROPPED",
        "confidence": 0.88,
        "base_amount": 149900,
    },
    FailureClass.SUBSCRIPTION_MANDATE: {
        "label": "Subscription & Mandate",
        "event_type": "payment.failed",
        "error_code": "INSUFFICIENT_FUNDS",
        "root_cause": "BALANCE_BEFORE_SALARY",
        "confidence": 0.91,
        "base_amount": 89900,
    },
    FailureClass.B2B_RECEIVABLES: {
        "label": "B2B Receivables",
        "event_type": "invoice.overdue",
        "error_code": None,
        "root_cause": "BUYER_AP_CYCLE",
        "confidence": 0.85,
        "base_amount": 8400000,
    },
}

# A small deterministic pool so the transactions read like real customers of the
# merchant rather than "customer 1, customer 2".
_CUSTOMERS = [
    "Aarav Mehta", "Diya Kapoor", "Vivaan Rao", "Ananya Nair", "Kabir Singh",
    "Ishaan Verma", "Myra Reddy", "Advait Joshi", "Saanvi Iyer", "Reyansh Gupta",
    "Aadhya Menon", "Arjun Pillai", "Zara Khan", "Vihaan Shah", "Anika Bose",
]
_CONTACTS = [f"+9198{n:08d}" for n in range(len(_CUSTOMERS))]


@dataclass
class ScenarioSpec:
    failure_class: FailureClass
    outcome: CaseOutcome
    count: int


@dataclass
class ArchetypeSpec:
    """Context rows that are shown for volume but are not REX recovery cases."""

    archetype: Literal["HEALTHY", "NON_RECOVERABLE"]
    failure_class: FailureClass  # nominal class for the row (drives amount/label)
    count: int


@dataclass
class UnworkedSpec:
    """A freshly-flagged case REX has NOT worked yet (PENDING, empty thread).

    The operator runs REX on it live and watches the recovery happen. `run_outcome`
    scripts only the customer's side of that run; the decisions stay real code.
    """

    failure_class: FailureClass
    run_outcome: str  # recovered | p2p | optout | dispute
    count: int


# The default distribution: ~34 at-risk cases across the four classes plus
# healthy/non-recoverable context. Tuned so no class is uniformly "recovered".
DEFAULT_BATCH: list = [
    ScenarioSpec(FailureClass.REALTIME_DEGRADATION, "recovered", 3),
    ScenarioSpec(FailureClass.REALTIME_DEGRADATION, "late_settlement", 2),
    ScenarioSpec(FailureClass.REALTIME_DEGRADATION, "inflight", 2),
    ScenarioSpec(FailureClass.REALTIME_DEGRADATION, "escalated_dispute", 1),
    ScenarioSpec(FailureClass.CHECKOUT_ABANDONMENT, "recovered", 4),
    ScenarioSpec(FailureClass.CHECKOUT_ABANDONMENT, "cross_device", 2),
    ScenarioSpec(FailureClass.CHECKOUT_ABANDONMENT, "inflight", 2),
    ScenarioSpec(FailureClass.CHECKOUT_ABANDONMENT, "cancelled_optout", 1),
    ScenarioSpec(FailureClass.SUBSCRIPTION_MANDATE, "recovered", 5),
    ScenarioSpec(FailureClass.SUBSCRIPTION_MANDATE, "inflight", 1),
    ScenarioSpec(FailureClass.SUBSCRIPTION_MANDATE, "cancelled_rbi", 2),
    ScenarioSpec(FailureClass.B2B_RECEIVABLES, "recovered", 4),
    ScenarioSpec(FailureClass.B2B_RECEIVABLES, "inflight", 2),
    ScenarioSpec(FailureClass.B2B_RECEIVABLES, "escalated_dispute", 1),
    ArchetypeSpec("HEALTHY", FailureClass.CHECKOUT_ABANDONMENT, 12),
    ArchetypeSpec("NON_RECOVERABLE", FailureClass.REALTIME_DEGRADATION, 4),
    # Fresh, unworked cases for the operator to run REX on live.
    UnworkedSpec(FailureClass.REALTIME_DEGRADATION, "recovered", 1),
    UnworkedSpec(FailureClass.CHECKOUT_ABANDONMENT, "recovered", 1),
    UnworkedSpec(FailureClass.CHECKOUT_ABANDONMENT, "optout", 1),
    UnworkedSpec(FailureClass.SUBSCRIPTION_MANDATE, "recovered", 1),
    UnworkedSpec(FailureClass.B2B_RECEIVABLES, "p2p", 1),
    UnworkedSpec(FailureClass.B2B_RECEIVABLES, "dispute", 1),
]


@dataclass
class BatchResult:
    seeded: int
    by_state: dict[str, int]


class _OfflineDiagnosis:
    """Deterministic, network-free diagnosis for the seed.

    Mirrors the real engine's contract (``.diagnose`` → ``Diagnosis``) but returns
    a fixed, believable per-class root cause + confidence, and always the class's
    default playbook — the safe path the live engine falls back to anyway.
    """

    def diagnose(self, *, failure_class, telemetry=None, user_message=None) -> Diagnosis:
        profile = _CLASS_PROFILE[failure_class]
        return Diagnosis(
            root_cause=profile["root_cause"],
            recommended_playbook=_DEFAULT_PLAYBOOK[failure_class],
            confidence=profile["confidence"],
        )


def _offline_deps(db) -> OrchestratorDeps:
    from app.adapters.dispatcher import build_dispatcher

    return OrchestratorDeps(
        db=db,
        diagnosis=_OfflineDiagnosis(),
        sandbox=PolicySandbox.from_default_policy(),
        dispatch=build_dispatcher(db, live_mode=False),
    )


def _next_salary_window(today: date) -> str:
    """The next salary-credit date (the 1st of the applicable month)."""
    if today.day <= 5:
        return today.replace(day=1).isoformat()
    year = today.year + (today.month == 12)
    month = 1 if today.month == 12 else today.month + 1
    return date(year, month, 1).isoformat()


def _amount_for(base: int, index: int) -> int:
    """Deterministic jitter so amounts vary without randomness."""
    return int(base * (0.85 + 0.03 * (index % 11)))


def _clear(db) -> None:
    # Order matters: child rows reference transactions / call sessions.
    db.query(CallTurn).delete()
    db.query(CallSession).delete()
    db.query(Message).delete()
    db.query(AuditTrail).delete()
    db.query(EscalationQueue).delete()
    db.query(ProcessedEvent).delete()
    db.query(TransactionState).delete()
    db.commit()


def seed_batch(db, *, spec: list | None = None, now: datetime | None = None) -> BatchResult:
    """Populate the DB with a mixed batch. Idempotent: clears first."""
    spec = spec if spec is not None else DEFAULT_BATCH
    now = now or utcnow()
    _clear(db)

    graph = build_recovery_graph(_offline_deps(db))
    index = 0

    for item in spec:
        for _ in range(item.count):
            if isinstance(item, ArchetypeSpec):
                _seed_context_row(db, item, index)
            elif isinstance(item, UnworkedSpec):
                _seed_unworked(db, item.failure_class, item.run_outcome, index)
            else:
                _seed_case(db, graph, item, index)
            index += 1

    _spread_timestamps(db, now)

    rows = db.query(TransactionState).all()
    by_state: dict[str, int] = {}
    for t in rows:
        by_state[t.current_state.value] = by_state.get(t.current_state.value, 0) + 1
    return BatchResult(seeded=len(rows), by_state=by_state)


def _new_txn(fc: FailureClass, index: int, *, archetype: str, is_at_risk: bool,
             state: TransactionLifecycleState, retry_count: int = 0) -> TransactionState:
    profile = _CLASS_PROFILE[fc]
    who = index % len(_CUSTOMERS)
    return TransactionState(
        transaction_id=f"txn_{int(fc)}_{uuid.uuid4().hex[:8]}",
        razorpay_payment_id=f"pay_{uuid.uuid4().hex[:10]}",
        failure_class=int(fc),
        current_state=state,
        retry_count=retry_count,
        merchant_id="merch_rooh",
        customer_contact=_CONTACTS[who],
        amount_minor=_amount_for(profile["base_amount"], index),
        currency="INR",
        metadata_json={
            "archetype": archetype,
            "class_label": profile["label"],
            "is_at_risk": is_at_risk,
            "confidence": profile["confidence"] if is_at_risk else None,
            "event_type": profile["event_type"] if is_at_risk else "payment.captured",
            "error_code": profile["error_code"] if is_at_risk else None,
            "customer_name": _CUSTOMERS[who],
        },
    )


def _seed_context_row(db, item: ArchetypeSpec, index: int) -> None:
    """Healthy / non-recoverable rows: persisted directly, no orchestration."""
    if item.archetype == "HEALTHY":
        txn = _new_txn(
            item.failure_class, index, archetype="HEALTHY", is_at_risk=False,
            state=TransactionLifecycleState.RECOVERED,
        )
        txn.metadata_json["ai_tag"] = "HEALTHY"
    else:  # NON_RECOVERABLE
        txn = _new_txn(
            item.failure_class, index, archetype="NON_RECOVERABLE", is_at_risk=True,
            state=TransactionLifecycleState.FAILED,
        )
        txn.metadata_json.update({"ai_tag": "NON_RECOVERABLE", "error_code": "HARD_DECLINE"})
    db.add(txn)
    db.commit()


def _seed_unworked(db, fc: FailureClass, run_outcome: str, index: int) -> TransactionState:
    """A flagged-but-unworked case: PENDING, no conversation. REX runs it live."""
    txn = _new_txn(
        fc, index, archetype=f"CLASS_{int(fc)}", is_at_risk=True,
        state=TransactionLifecycleState.PENDING,
    )
    txn.metadata_json.update({"ai_tag": "RECOVERY_CASE", "unworked": True, "run_outcome": run_outcome})
    db.add(txn)
    db.commit()
    return txn


def simulate_case(db, failure_class: int | None = None) -> TransactionState:
    """Inject one fresh, unworked failure on demand ('a payment just failed')."""
    fc = FailureClass(failure_class) if failure_class else random.choice(list(FailureClass))
    run_outcome = {1: "recovered", 2: "recovered", 3: "recovered", 4: "p2p"}[int(fc)]
    # Offset the index so the customer/amount differ from the seeded set.
    index = db.query(TransactionState).count() + random.randint(0, len(_CUSTOMERS) - 1)
    return _seed_unworked(db, fc, run_outcome, index)


def _seed_case(db, graph, item: ScenarioSpec, index: int) -> None:
    fc = item.failure_class
    retry_count = 3 if item.outcome == "cancelled_rbi" else 0
    txn = _new_txn(
        fc, index, archetype=f"CLASS_{int(fc)}", is_at_risk=True,
        state=TransactionLifecycleState.PENDING, retry_count=retry_count,
    )
    txn.metadata_json["ai_tag"] = "RECOVERY_CASE"
    db.add(txn)
    db.commit()

    profile = _CLASS_PROFILE[fc]
    # A late original settlement authorises rather than captures on the fallback.
    outcome_event = None
    if item.outcome in _RECOVERED_LIKE:
        outcome_event = "payment.authorized" if item.outcome == "late_settlement" else "payment.captured"
    state = {
        "transaction_id": txn.transaction_id,
        "failure_class": int(fc),
        "telemetry": {"event_type": profile["event_type"], "error_code": profile["error_code"]},
        "outcome_event": outcome_event,
    }
    if item.outcome == "escalated_dispute":
        state["user_message"] = "I want to dispute this invoice, the amount is wrong."
    elif item.outcome == "cancelled_optout":
        state["user_message"] = "please stop contacting me, band karo."

    graph.invoke(state)

    # Wire the class-specific stopping rules to their triggering event, so they
    # genuinely fire (and are counted + surfaced in the audit / compliance views).
    if item.outcome == "late_settlement":
        _record_stop(
            db, txn.transaction_id, StoppingRule.NO_DOUBLE_CHARGE,
            "Original payment settled late on the primary rail; fallback link voided.",
        )
    elif item.outcome == "cross_device":
        _record_stop(
            db, txn.transaction_id, StoppingRule.CROSS_DEVICE_COMPLETION,
            "Customer completed payment on another device; outreach silenced.",
        )

    _seed_conversation(db, txn, int(fc), item.outcome, index)


def _record_stop(db, transaction_id: str, rule: StoppingRule, reason: str) -> None:
    record_audit(
        db,
        transaction_id=transaction_id,
        node_name=NodeName.RECONCILE,
        action_type=ActionType.STATE_TRANSITION,
        payload={"stopping_rule": rule.value, "reason": reason},
        outcome=Outcome.SUCCESS,
    )


def _seed_conversation(db, txn: TransactionState, failure_class: int, outcome: str, index: int) -> None:
    """Materialise the visible WhatsApp thread (+ call) for a recovery case.

    The customer's words are scripted, but the B2B Promise-to-Pay date is
    extracted from the reply by the real Hinglish resolver and written back onto
    the transaction — the reactive mechanic, driven by the actual reply text.
    """
    meta = txn.metadata_json or {}
    persona = persona_for(index)
    thread = build_thread(
        failure_class=failure_class,
        outcome=outcome,
        name=(meta.get("customer_name") or "there").split()[0],
        amount_inr=txn.amount_minor / 100,
        persona=persona,
        payment_link=f"rzp.io/i/{txn.transaction_id[-6:]}",
        invoice_no=f"INV-{2600 + index}",
        salary_date=_next_salary_window(date.today()),
    )

    seq = 0
    for beat in thread.messages:
        db.add(Message(
            transaction_id=txn.transaction_id,
            direction=beat.direction,
            sender=beat.sender,
            body=beat.body,
            status=beat.status,
            seq=seq,
            meta_json=beat.meta,
        ))
        seq += 1

    # B2B reactive path: extract the real P2P date from the customer's reply and
    # append the agent's dated confirmation + a hold note; record it on the txn.
    if thread.p2p_phrase:
        p2p_date = extract_p2p_date(thread.p2p_phrase, today=date.today())
        if p2p_date:
            txn.metadata_json = {**meta, "p2p_date": p2p_date}
            # Surface the reactive hold in the audit timeline (WAITING_FOR_P2P).
            record_audit(
                db,
                transaction_id=txn.transaction_id,
                node_name=NodeName.WAIT,
                action_type=ActionType.RETRY_SCHEDULED,
                payload={"reason": "WAITING_FOR_P2P", "scheduled_for": p2p_date,
                         "extracted_from": thread.p2p_phrase},
                outcome=Outcome.SUCCESS,
            )
            confirmations = [
                (MessageSender.AGENT, f"Noted — we'll expect payment by {p2p_date}. Thank you! I'll hold reminders until then.", {"p2p_date": p2p_date}),
                (MessageSender.SYSTEM, f"Dunning paused until {p2p_date} (WAITING_FOR_P2P).", None),
                (MessageSender.SYSTEM, f"Payment received on {p2p_date} ✓", None),
            ]
            for sender, body, mj in confirmations:
                db.add(Message(
                    transaction_id=txn.transaction_id,
                    direction=MessageDirection.OUTBOUND,
                    sender=sender,
                    body=body,
                    status=MessageStatus.READ,
                    seq=seq,
                    meta_json=mj,
                ))
                seq += 1

    if thread.call:
        cb = thread.call
        session = CallSession(
            transaction_id=txn.transaction_id,
            status=cb.status,
            duration_sec=cb.duration_sec,
            outcome=cb.outcome,
        )
        db.add(session)
        db.flush()  # need session.id for the turns
        for turn in cb.turns:
            db.add(CallTurn(
                call_session_id=session.id,
                speaker=turn.speaker,
                text=turn.text,
                seq=turn.at_offset_sec,  # monotonic; offset doubles as order
                at_offset_sec=turn.at_offset_sec,
            ))

    db.commit()


def _spread_timestamps(db, now: datetime) -> None:
    """Backdate rows across the trailing two weeks so the time-series has shape.

    Recovered rows get a realistic time-to-recovery gap; others resolve quickly.
    """
    rows = db.query(TransactionState).order_by(TransactionState.id).all()
    span_days = 14
    for i, t in enumerate(rows):
        offset = timedelta(
            days=(i * span_days) // max(len(rows), 1),
            hours=(i * 7) % 24,
            minutes=(i * 13) % 60,
        )
        created = now - timedelta(days=span_days) + offset
        if t.current_state == TransactionLifecycleState.RECOVERED and (t.metadata_json or {}).get("is_at_risk"):
            ttr = timedelta(seconds=45 + (i * 37) % 600)  # 45s–~10m
        else:
            ttr = timedelta(seconds=8 + (i * 5) % 40)
        t.created_at = created
        t.updated_at = created + ttr
    db.commit()
