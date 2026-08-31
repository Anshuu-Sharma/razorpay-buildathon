"""Real (test-mode) Razorpay payment-link creation, posted to the WhatsApp thread.

The Razorpay client is injected/monkeypatched so the tests never hit the network.
"""

import pytest

from app.models import Message, TransactionState
from app.services import payment_links


class _FakePaymentLink:
    def create(self, payload):
        assert payload["amount"] == 49900
        assert payload["currency"] == "INR"
        return {"id": "plink_TEST123", "short_url": "https://rzp.io/i/testABC"}


class _FakeClient:
    payment_link = _FakePaymentLink()


@pytest.fixture()
def txn(db_session):
    t = TransactionState(
        transaction_id="pl_1",
        razorpay_payment_id="pay_pl_1",
        failure_class=1,
        merchant_id="m",
        customer_contact="+919900000000",
        amount_minor=49900,
        metadata_json={"customer_name": "Anika Bose"},
    )
    db_session.add(t)
    db_session.commit()
    return t


def test_create_real_link_posts_clickable_whatsapp_message(db_session, txn):
    result = payment_links.create_payment_link(db_session, "pl_1", client=_FakeClient())

    assert result["simulated"] is False
    assert result["url"] == "https://rzp.io/i/testABC"
    assert result["razorpay_id"] == "plink_TEST123"

    # It lands in the thread as an outbound message carrying the link in meta,
    # which is what the WhatsApp UI turns into a clickable card.
    msg = db_session.query(Message).filter_by(transaction_id="pl_1").order_by(Message.seq.desc()).first()
    assert msg.direction.value == "OUTBOUND"
    assert msg.meta_json["payment_link"] == "https://rzp.io/i/testABC"
    assert "https://rzp.io/i/testABC" in msg.body


def test_falls_back_to_simulated_link_without_keys(db_session, txn, monkeypatch):
    monkeypatch.setattr(payment_links.settings, "razorpay_key_id", "", raising=False)
    monkeypatch.setattr(payment_links.settings, "razorpay_key_secret", "", raising=False)

    result = payment_links.create_payment_link(db_session, "pl_1")

    assert result["simulated"] is True
    assert result["url"].startswith("https://rzp.io/i/")


def test_endpoint_returns_link_and_thread_shows_it(client, db_session, txn, monkeypatch):
    monkeypatch.setattr(payment_links, "_build_client", lambda: _FakeClient())
    monkeypatch.setattr(payment_links.settings, "razorpay_key_id", "rzp_test_x", raising=False)
    monkeypatch.setattr(payment_links.settings, "razorpay_key_secret", "secret", raising=False)

    resp = client.post("/api/v1/transactions/pl_1/payment-link")
    assert resp.status_code == 201
    body = resp.json()
    assert body["url"] == "https://rzp.io/i/testABC"
    assert body["simulated"] is False
    assert body["message"]["meta"]["payment_link"] == "https://rzp.io/i/testABC"

    convo = client.get("/api/v1/transactions/pl_1/conversation").json()
    assert convo["messages"][-1]["meta"]["payment_link"] == "https://rzp.io/i/testABC"


def test_endpoint_404_for_unknown_txn(client):
    assert client.post("/api/v1/transactions/nope/payment-link").status_code == 404
