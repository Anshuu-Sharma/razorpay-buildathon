"""Create a real (test-mode) Razorpay payment link and post it to the WhatsApp
thread as a clickable outbound message.

This is the one place the app makes a genuine outbound Razorpay API call. It runs
against the merchant's *test* keys, so a real ``rzp.io`` short link is minted
without moving any money. If keys are absent or the API errors, we fall back to a
synthetic link so the demo never breaks — flagged ``simulated`` so callers can be
honest about it.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import settings
from app.enums import MessageDirection, MessageSender, MessageStatus
from app.models import Message, TransactionState


def _build_client():
    """Construct a real Razorpay client from the configured (test) keys.

    Isolated so tests can monkeypatch it and never touch the network.
    """
    import razorpay

    return razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))


def _create_link(txn: TransactionState, client) -> tuple[str | None, str | None]:
    link = client.payment_link.create(
        {
            "amount": int(txn.amount_minor),
            "currency": txn.currency or "INR",
            "description": f"Payment recovery for {txn.transaction_id}",
            "customer": {"contact": txn.customer_contact},
            "notify": {"sms": False, "email": False},
            "reminder_enable": False,
        }
    )
    return link.get("short_url"), link.get("id")


def create_payment_link(db: Session, transaction_id: str, *, client=None) -> dict:
    txn = db.query(TransactionState).filter_by(transaction_id=transaction_id).first()
    if txn is None:
        raise ValueError("transaction not found")

    url: str | None = None
    ref: str | None = None
    have_keys = bool(settings.razorpay_key_id and settings.razorpay_key_secret)
    if client is None and have_keys:
        try:
            client = _build_client()
        except Exception:
            client = None
    if client is not None:
        try:
            url, ref = _create_link(txn, client)
        except Exception:
            url, ref = None, None

    simulated = not url
    if simulated:
        url = f"https://rzp.io/i/{transaction_id[-6:]}"
        ref = f"sim_{transaction_id[-6:]}"

    last = (
        db.query(Message)
        .filter_by(transaction_id=transaction_id)
        .order_by(Message.seq.desc())
        .first()
    )
    next_seq = (last.seq + 1) if last else 0
    rupees = f"₹{txn.amount_minor / 100:,.0f}"
    body = (
        f"Yeh raha aapka secure payment link — {rupees}, sirf 1 tap, "
        f"koi OTP nahi chahiye: {url}"
    )
    msg = Message(
        transaction_id=transaction_id,
        direction=MessageDirection.OUTBOUND,
        sender=MessageSender.AGENT,
        body=body,
        status=MessageStatus.SENT,
        seq=next_seq,
        meta_json={"payment_link": url, "razorpay_id": ref, "simulated": simulated, "manual": True},
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"url": url, "razorpay_id": ref, "simulated": simulated, "message": msg}
