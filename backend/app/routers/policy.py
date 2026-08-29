"""Read-only policy surface — the deterministic 'Bouncer' made inspectable.

Exposes the hardcoded merchant policy the PolicySandbox enforces plus the named
compliance stopping rules, so the dashboard can show exactly what the engine is
allowed to do (and where it must stop) without any of it depending on the LLM.
"""

import json
from pathlib import Path

from fastapi import APIRouter

from app.enums import StoppingRule
from app.services.policy_sandbox import _MONEY_MOVING_ACTIONS

router = APIRouter(tags=["policy"])

_POLICY_PATH = Path(__file__).resolve().parent.parent / "config" / "merchant_policy.json"

# Human descriptions for each compliance stopping rule (the "why we halt").
_RULE_DESCRIPTIONS: dict[StoppingRule, str] = {
    StoppingRule.NO_DOUBLE_CHARGE: "A late settlement kills any in-flight fallback so the customer is never charged twice.",
    StoppingRule.CROSS_DEVICE_COMPLETION: "If the customer completes payment on another device, outreach goes silent.",
    StoppingRule.RBI_MAX_RETRIES: "RBI permits at most 3 auto-debit retries per cycle; the engine never exceeds it.",
    StoppingRule.EXPLICIT_CANCEL: "An explicit cancel request stops the workflow immediately.",
    StoppingRule.OPT_OUT: "Any opt-out (incl. Hinglish) halts all further contact, honoured even inside a prompt injection.",
    StoppingRule.DISPUTE_FREEZE: "A dispute freezes automation and routes the case to a human.",
    StoppingRule.TRAI_QUIET_HOURS: "No outbound voice/messaging between 20:00–09:00 IST (TRAI); contact is deferred.",
    StoppingRule.VOICE_ATTEMPT_CAP: "At most 2 voice attempts per rolling 72-hour window.",
}


@router.get("/policy")
def get_policy() -> dict:
    with _POLICY_PATH.open() as fh:
        policy = json.load(fh)
    policy.pop("_comment", None)
    return {
        "policy": policy,
        "money_moving_actions": sorted(_MONEY_MOVING_ACTIONS),
        "stopping_rules": [
            {"name": rule.value, "description": desc}
            for rule, desc in _RULE_DESCRIPTIONS.items()
        ],
    }
