"""The REX assistant — a natural-language front door to the recovery engine.

The user talks to REX in plain English or Hindi; ``interpret`` turns that into a
grounded reply and, when the message asks for one, a structured action from a
fixed set: run a recovery, set a status, add a note, or navigate. Gemini does the
language understanding (classify the intent, pull out a transaction reference);
the action itself is assembled deterministically in code and every reference is
resolved against real rows. If the model is unavailable a keyword parser stands
in, so the assistant always answers — and every data answer is computed from the
live metrics, never invented.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Callable

from sqlalchemy.orm import Session

from app.enums import TransactionLifecycleState
from app.models import TransactionState
from app.services.reconciliation import compute_metrics

logger = logging.getLogger(__name__)

GenerateFn = Callable[[str], str]

# Intents the assistant can act on. "answer" carries no action.
_INTENTS = {"run_recovery", "set_status", "add_note", "navigate", "answer"}

# Only a status change is irreversible enough to confirm first.
_CONFIRM_INTENTS = {"set_status"}

_STATUSES = {s.value for s in TransactionLifecycleState}

# Words → canonical route token → real path.
_ROUTE_PATHS = {
    "overview": "/mission-control",
    "transactions": "/mission-control/transactions",
    "escalations": "/mission-control/escalations",
    "audit": "/mission-control/audit",
    "compliance": "/mission-control/compliance",
    "policy": "/mission-control/policy",
}
_CLASS_ROUTE = re.compile(r"^class:([1-4])$")

# Deterministic-fallback keyword tables.
_STATUS_WORDS = {
    "escalat": "ESCALATED",
    "cancel": "CANCELLED",
    "recovered": "RECOVERED",
    "resolve": "RECOVERED",
    "failed": "FAILED",
    "fail": "FAILED",
    "intervene": "INTERVENING",
    "intervening": "INTERVENING",
}
_RUN_WORDS = ("recover", "handle", "chase", "work on", "work this", "fix", "pursue")
_NAV_WORDS = {
    "overview": "overview", "dashboard": "overview",
    "transaction": "transactions",
    "escalation": "escalations",
    "audit": "audit",
    "compliance": "compliance", "stopping rule": "compliance",
    "policy": "policy",
}
_CLASS_KEYWORDS = {
    1: ("failed payment", "payment failure", "class 1"),
    2: ("abandoned checkout", "checkout", "class 2"),
    3: ("subscription", "mandate", "class 3"),
    4: ("overdue invoice", "invoice", "receivable", "class 4"),
}
_THIS_WORDS = {"this", "this one", "current", "it", "the current one", "here"}


# --- reference resolution ---------------------------------------------------

def resolve_transaction(db: Session, ref: str | None, context: dict) -> str | None:
    """Resolve a spoken reference ("Acme", "this one", a txn id) to a real id.

    Returns None when nothing matches or a name is ambiguous, so callers can ask
    the user to disambiguate rather than act on the wrong row.
    """
    focused = context.get("focused_transaction_id")
    if not ref:
        return None
    r = ref.strip().lower()
    if r in _THIS_WORDS:
        return focused

    txns = db.query(TransactionState).all()
    for t in txns:  # exact transaction id
        if t.transaction_id.lower() == r:
            return t.transaction_id

    def _name(t) -> str:
        return str((t.metadata_json or {}).get("customer_name", "")).lower()

    # An exact full-name match is the same customer (the seeder repeats names
    # across paired rows), so pick one — preferring a row REX can still work —
    # rather than refusing. A merely partial match that hits several *different*
    # customers stays ambiguous.
    exact = [t for t in txns if _name(t) == r]
    if exact:
        return _prefer_runnable(exact)

    partial = [t for t in txns if r in _name(t)]
    if len(partial) == 1:
        return partial[0].transaction_id
    return None  # no match, or an ambiguous partial across different customers


_RUNNABLE_STATES = {
    TransactionLifecycleState.PENDING,
    TransactionLifecycleState.DIAGNOSING,
    TransactionLifecycleState.INTERVENING,
    TransactionLifecycleState.WAITING,
}


def _prefer_runnable(rows: list[TransactionState]) -> str:
    for t in rows:
        if t.current_state in _RUNNABLE_STATES:
            return t.transaction_id
    return rows[0].transaction_id


# --- grounding --------------------------------------------------------------

def _catalog(db: Session) -> list[dict]:
    rows = db.query(TransactionState).all()
    out = []
    for t in rows:
        meta = t.metadata_json or {}
        out.append({
            "id": t.transaction_id,
            "name": meta.get("customer_name"),
            "class": int(t.failure_class),
            "status": t.current_state.value,
            "amount_inr": round(t.amount_minor / 100, 2),
        })
    return out


def _metrics_summary(db: Session) -> dict:
    m = compute_metrics(db)
    worst = None
    best_rate = 2.0
    for cid, c in m.get("by_class", {}).items():
        if c["count"] and c["recovery_rate"] < best_rate:
            best_rate, worst = c["recovery_rate"], cid
    return {
        "grrr": m["grrr"],
        "recovered_inr": m["recovered_inr"],
        "at_risk_inr": m["at_risk_inr"],
        "in_flight_inr": m["in_flight_inr"],
        "lost_inr": m["lost_inr"],
        "worst_class": worst,
    }


def _inr(n: float) -> str:
    return f"₹{int(round(n)):,}"


# --- the model path ---------------------------------------------------------

_SCHEMA_HINT = (
    'Return ONLY JSON: {"intent": one of '
    '["run_recovery","set_status","add_note","navigate","answer"], '
    '"transaction_ref": string|null (a customer name, "this", or a txn id), '
    '"status": one of ["RECOVERED","ESCALATED","CANCELLED","FAILED","INTERVENING"]|null, '
    '"note": string|null, '
    '"route": one of ["overview","transactions","escalations","audit","compliance","policy"] '
    'or "class:N" (N=1..4)|null, '
    '"reply": a short natural-language reply to the user}.'
)


def _prompt(message: str, db: Session, context: dict, locale: str) -> str:
    catalog = _catalog(db)
    metrics = _metrics_summary(db)
    lang = "Hindi (Devanagari script)" if locale == "hi" else "English"
    focused = context.get("focused_transaction_id")
    return (
        "You are REX, an AI revenue-recovery agent embedded in a payments "
        "operations dashboard. Interpret the operator's message and decide whether "
        "they are asking a question (intent 'answer') or asking you to act.\n"
        f"Reply in {lang}. Ground any numbers in the metrics below — never invent figures.\n\n"
        f"Live metrics: {json.dumps(metrics)}\n"
        f"Transactions: {json.dumps(catalog)}\n"
        f"Currently open transaction id: {focused!r} (this is what 'this'/'current' refer to).\n\n"
        f"Operator message: {message!r}\n\n"
        f"{_SCHEMA_HINT}"
    )


def _parse_with_model(message: str, db: Session, context: dict, locale: str,
                      generate: GenerateFn) -> dict | None:
    try:
        raw = generate(_prompt(message, db, context, locale))
        data = json.loads(raw)
        if isinstance(data, dict) and data.get("intent") in _INTENTS:
            return data
    except Exception as exc:  # SDK/network/JSON error → deterministic fallback
        logger.warning("Assistant model parse failed (%s); using fallback.", exc)
    return None


# --- the deterministic fallback ---------------------------------------------

_QUESTION_STARTS = {"how", "what", "which", "why", "where", "when", "who", "is", "are", "do", "does", "can"}


def _is_question(text: str) -> bool:
    first = text.split()[0] if text.split() else ""
    return text.endswith("?") or first in _QUESTION_STARTS


def _fallback_parse(message: str, db: Session, context: dict, locale: str) -> dict:
    text = message.lower().strip()
    question = _is_question(text)

    # A status change wins over "recover" so "mark this recovered" isn't a run.
    if any(w in text for w in ("mark", "set ", "escalat", "cancel", "resolve")) or text.startswith("set"):
        status = next((v for k, v in _STATUS_WORDS.items() if k in text), "RECOVERED")
        return {"intent": "set_status", "transaction_ref": _ref_from_text(text, context),
                "status": status, "reply": _reply_for("set_status", locale, status=status)}

    if "note" in text:
        note = message.split(":", 1)[1].strip() if ":" in message else message
        return {"intent": "add_note", "transaction_ref": _ref_from_text(text, context),
                "note": note, "reply": _reply_for("add_note", locale)}

    if not question and any(w in text for w in _RUN_WORDS):
        return {"intent": "run_recovery", "transaction_ref": _ref_from_text(text, context),
                "reply": _reply_for("run_recovery", locale)}

    if any(w in text for w in ("show", "open", "go to", "take me", "navigate")):
        route = _route_from_text(text)
        if route:
            return {"intent": "navigate", "route": route, "reply": _reply_for("navigate", locale)}

    # Otherwise it's a question — answer it from the live metrics.
    return {"intent": "answer", "reply": _answer_from_metrics(text, db, locale)}


def _ref_from_text(text: str, context: dict) -> str | None:
    for w in _THIS_WORDS:
        if re.search(rf"\b{re.escape(w)}\b", text):
            return "this"
    # crude name pick: a capitalized-ish token the resolver can match on
    m = re.search(r"\b(?:recover|handle|chase|fix|escalate|mark|for)\s+(?:the\s+)?([a-z][a-z0-9]+)", text)
    return m.group(1) if m else None


def _route_from_text(text: str) -> str | None:
    for cid, words in _CLASS_KEYWORDS.items():
        if any(w in text for w in words):
            return f"class:{cid}"
    for word, token in _NAV_WORDS.items():
        if word in text:
            return token
    return None


def _answer_from_metrics(text: str, db: Session, locale: str) -> str:
    m = _metrics_summary(db)
    hi = locale == "hi"
    if any(w in text for w in ("rate", "grrr", "how well", "performing")):
        pct = f"{m['grrr'] * 100:.0f}%"
        return (f"अभी तक की रिकवरी दर (GRRR) {pct} है।" if hi
                else f"Our recovery rate (GRRR) is {pct} of at-risk revenue.")
    if any(w in text for w in ("pending", "at risk", "at-risk", "outstanding", "in flight", "in-flight")):
        return (f"जोखिम में {m['at_risk_inr']}, इनमें से {m['in_flight_inr']} अभी प्रक्रिया में है।" if hi
                else f"{_inr(m['at_risk_inr'])} is at risk, of which {_inr(m['in_flight_inr'])} is in-flight.")
    if any(w in text for w in ("lost", "write-off", "writeoff")):
        return (f"{_inr(m['lost_inr'])} अब तक बट्टे खाते में।" if hi
                else f"{_inr(m['lost_inr'])} has been written off so far.")
    # default: recovered figure
    return (f"अब तक {_inr(m['recovered_inr'])} वसूल किए गए ({m['grrr'] * 100:.0f}% GRRR)।" if hi
            else f"We've recovered {_inr(m['recovered_inr'])} so far ({m['grrr'] * 100:.0f}% GRRR).")


def _reply_for(intent: str, locale: str, *, status: str | None = None) -> str:
    hi = locale == "hi"
    if intent == "run_recovery":
        return "ठीक है — REX अभी इस केस पर काम शुरू कर रहा है।" if hi else "On it — REX is working this case now."
    if intent == "set_status":
        return (f"इसे {status} पर सेट करूँ — पुष्टि करें?" if hi
                else f"I'll set this to {status} — confirm?")
    if intent == "add_note":
        return "नोट जोड़ दिया।" if hi else "Noted."
    if intent == "navigate":
        return "खोल रहा हूँ…" if hi else "Opening that view…"
    return "" if hi else ""


# --- assembly ---------------------------------------------------------------

def _route_path(token: str | None) -> str | None:
    if not token:
        return None
    if token in _ROUTE_PATHS:
        return _ROUTE_PATHS[token]
    m = _CLASS_ROUTE.match(token)
    if m:
        return f"/mission-control/class/{m.group(1)}"
    if token.startswith("/mission-control"):
        return token
    return None


def _build(db: Session, parsed: dict, context: dict, locale: str) -> dict:
    intent = parsed.get("intent", "answer")
    reply = (parsed.get("reply") or "").strip()

    if intent == "answer":
        return {"reply": reply or _answer_from_metrics("", db, locale), "action": None}

    if intent == "navigate":
        path = _route_path(parsed.get("route"))
        if not path:
            return {"reply": reply or _reply_for("navigate", locale), "action": None}
        return {"reply": reply or _reply_for("navigate", locale),
                "action": {"type": "navigate", "route": path, "requires_confirmation": False,
                           "transaction_id": None, "status": None, "note": None}}

    # The remaining intents act on a specific transaction.
    txn_id = resolve_transaction(db, parsed.get("transaction_ref"), context)
    if not txn_id:
        clarify = ("किस ट्रांज़ैक्शन के लिए? नाम या आईडी बताइए।" if locale == "hi"
                   else "Which transaction do you mean? Tell me a name or open one.")
        return {"reply": clarify, "action": None}

    if intent == "set_status":
        status = parsed.get("status")
        if status not in _STATUSES:
            return {"reply": reply or "Which status?", "action": None}
        return {"reply": reply or _reply_for("set_status", locale, status=status),
                "action": {"type": "set_status", "transaction_id": txn_id, "status": status,
                           "note": None, "route": None, "requires_confirmation": True}}

    if intent == "add_note":
        note = (parsed.get("note") or "").strip()
        return {"reply": reply or _reply_for("add_note", locale),
                "action": {"type": "add_note", "transaction_id": txn_id, "note": note,
                           "status": None, "route": None, "requires_confirmation": False}}

    # run_recovery
    return {"reply": reply or _reply_for("run_recovery", locale),
            "action": {"type": "run_recovery", "transaction_id": txn_id,
                       "status": None, "note": None, "route": None,
                       "requires_confirmation": False}}


_UNSET = object()  # "no generator supplied" — build the default; None means offline.


def interpret(db: Session, message: str, *, locale: str = "en",
              context: dict | None = None, generate=_UNSET) -> dict:
    """Interpret a chat message → {"reply": str, "action": dict|None}.

    ``generate`` unset builds the live model; pass ``None`` to force the offline
    keyword fallback (used by tests and when the SDK can't be wired).
    """
    ctx = context or {}
    loc = "hi" if locale == "hi" else "en"
    gen = _default_generate() if generate is _UNSET else generate

    parsed = _parse_with_model(message, db, ctx, loc, gen) if gen is not None else None
    if parsed is None:
        parsed = _fallback_parse(message, db, ctx, loc)
    return _build(db, parsed, ctx, loc)


def _default_generate() -> GenerateFn | None:
    try:
        from app.services.gemini_client import build_generate

        return build_generate()  # forces JSON output — ideal for intent parsing
    except Exception:  # pragma: no cover - import/SDK issues fall back to keywords
        return None
