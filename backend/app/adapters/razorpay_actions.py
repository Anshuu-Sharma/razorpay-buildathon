"""Razorpay financial actions - payment links, retries, cancellations.

These are the actions that actually touch money, so they only ever run after the
PolicySandbox has approved the proposed action upstream. Simulation mode returns
a synthetic reference; live mode uses the Razorpay test client.
"""

import uuid

from app.adapters.base import DispatchResult
from app.config import settings

_CHANNEL = "PAYMENT_LINK"


class RazorpayActionsAdapter:
    def __init__(self, live_mode: bool, client=None):
        self._live = live_mode
        self._client = client

    def _razorpay(self):
        if self._client is None:
            import razorpay

            self._client = razorpay.Client(
                auth=(settings.razorpay_key_id, settings.razorpay_key_secret)
            )
        return self._client

    def _sim(self, channel: str, detail: str) -> DispatchResult:
        return DispatchResult(
            channel, delivered=True, simulated=True,
            reference=f"sim_{uuid.uuid4().hex[:12]}", detail=detail,
        )

    def create_payment_link(self, amount_minor: int, contact: str) -> DispatchResult:
        if not self._live:
            return self._sim(_CHANNEL, "payment_link")
        link = self._razorpay().payment_link.create(
            {
                "amount": amount_minor,
                "currency": "INR",
                "customer": {"contact": contact},
                "notify": {"sms": False, "email": False},
            }
        )
        return DispatchResult(_CHANNEL, delivered=True, simulated=False, reference=link.get("id"))

    def retry_charge(self, transaction_id: str) -> DispatchResult:
        # A real re-attempt would re-trigger the mandate debit; simulated here as
        # the test keys do not carry a live recurring token.
        return self._sim("RAZORPAY", "retry_charge")

    def cancel_subscription(self, transaction_id: str) -> DispatchResult:
        return self._sim("RAZORPAY", "cancel_subscription")
