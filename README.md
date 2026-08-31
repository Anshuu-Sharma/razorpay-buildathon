# REX, the Revenue Execution Engine

An autonomous revenue-recovery agent for Indian businesses. When a payment fails, REX
figures out *why*, decides what to do about it, and works the customer back to a
successful payment over WhatsApp and voice, within the guardrails a payments company
actually has to respect. Every decision is written to an immutable audit trail, and the
whole thing is driven from a live operations dashboard where a human can watch REX work,
talk to it, and take over at any point.

Not every failed payment is lost revenue. REX exists to recover the ones that are not,
and to *prove*, case by case, that it did so compliantly.

---

## The problem

Indian merchants lose enormous amounts of revenue to failed payments. Not to fraud, but
to friction: a bank that timed out, a card that expired, an auto-debit that bounced the
day before salary, an invoice that quietly went overdue. Today, recovering that money
means a human chasing customers one at a time, in a language and on a channel that may
not suit them, with no memory of what is or is not allowed under RBI and TRAI rules.

Most of that revenue already *wanted* to happen. It just needs someone (or something) to
close the loop, quickly and correctly.

## The solution

REX treats recovery as an autonomous loop with a human in oversight, not in the driver's
seat. For every failed transaction it runs four steps:

1. **Ingest** the failure from a Razorpay webhook (HMAC-verified).
2. **Diagnose** why it failed, using an LLM with a deterministic fallback.
3. **Execute** the right recovery play, but only after a policy gate approves it.
4. **Reconcile** the outcome, closing the case to `RECOVERED` only when money actually moves.

The headline metric is **GRRR** (Genuine Revenue Recovery Rate): recovered divided by
at-risk, earned only on genuinely at-risk transactions, and never on a case where no
real payment happened.

---

## The problem, in four shapes

Failed payments are not one problem; they are four, and each needs a different solve.
REX classifies every failure and routes it to a dedicated playbook:

| Class | What broke | REX's recovery play |
|------|------------|------------|
| **1. Failed Payments** (Network Degradation) | A UPI switch timeout or gateway drop mid-transaction, not the customer's fault | Re-route to a healthy fallback rail in-flight (`REROUTE_RAIL`), then send a secure 1-tap payment link (`PREAUTH_LINK`) |
| **2. Abandoned Checkouts** (Friction Rescue) | High-intent drop-off at the OTP or 3DS step | Send a 1-tap UPI Autopay link over WhatsApp that skips the card and OTP entirely (`UPI_AUTOPAY_NUDGE`); negotiate on high-ticket carts |
| **3. Failed Subscriptions** (Smart Sequencer) | An e-mandate auto-debit fails on a month-end low balance, before salary lands | Defer the retry to align with the salary-credit window (`SALARY_CYCLE_SEQUENCER`) and refresh a broken mandate token (`MANDATE_REFRESH`), all within the RBI 3-retry cap |
| **4. Overdue Invoices** (P2P Tracker) | A B2B Net-30 receivable sails past its due date | Chase the AP team on a reminder cadence, extract a hard Promise-to-Pay date from the Hinglish reply, and hold dunning until that date (`P2P_TRACKER`) |

Each failure is classified deterministically from the webhook (not by the LLM), so
the routing is auditable, and each class runs its own playbook rather than a single
generic "send a reminder."

## A dedicated console for every class

The dashboard is not one list; it is a command center per problem, so an operator
sees each kind of leak the way it actually behaves:

- **Failed Payments and Abandoned Checkouts** get a transactions explorer with plain
  language classification tags, a "why" chip on every case linking back to the exact
  audit entry that caused it, and a per-case recovery timeline.
- **Failed Subscriptions** get a **Mandate and Renewal Calendar**: a month grid of
  upcoming auto-debits as event pills (customer and amount, coloured by status), where
  REX defers predicted failures to the salary window and sequences retries within the
  RBI cap. New subscriptions can be added and become real, workable cases.
- **Overdue Invoices** get a **Receivables Aging board**: invoices bucketed by age,
  with REX's reminder cadence and the tracked Promise-to-Pay dates. New invoices can be
  added and are backed by real transactions.

---

## Recovery you can trust

Recovering revenue is easy if you are allowed to spam customers and double-charge cards.
REX is not. A deterministic policy layer, the **Bouncer**, sits between the agent's intent
and any real-world action, and it cannot be talked out of its rules by the model:

- **RBI:** at most 3 auto-debit retries per cycle.
- **TRAI:** no outbound contact during quiet hours (20:00 to 09:00 IST).
- **No double charge:** a late settlement voids the fallback.
- **Cross-device completion:** if the customer pays elsewhere, REX goes silent.
- **Dispute freeze:** an open dispute routes straight to a human.
- **Opt-out and explicit cancel:** honoured instantly, even mid-conversation, and even
  when the request is buried inside a prompt-injection attempt.
- **Voice-attempt cap:** at most 2 voice calls in 72 hours.

The policy is **operator-editable** from the dashboard, and REX itself has no write path
to it. REX does the thinking; the Bouncer holds the line. Every action that clears the
Bouncer, or is stopped by it, is appended to an immutable audit log.

---

## Talk to REX, and let REX call the customer

REX ships with a conversational agent in the corner of the dashboard. Ask it questions
grounded in live data, or give it commands in plain English or Hindi:

> *"What is our recovery rate?"* becomes "42% of at-risk revenue, recovered."
> *"Recover the Acme invoice."* starts the recovery and narrates it live.
> *"Escalate this one."* proposes the change and waits for your confirmation.

The language model handles understanding; the *actions* are assembled in code and
resolved against real rows, so REX never moves money or state on its own, and
irreversible changes always ask first.

REX also makes a **real, live voice call** to the customer, in human-like Hinglish, right
inside the WhatsApp mockup. You speak, REX speaks back, and when the customer agrees, REX
sends them a payment link on the spot.

---

## The money moment: a real Razorpay payment link, recovered end to end

This is the part that makes the recovery real rather than a story:

1. REX (on the call, or from the dashboard) creates a **genuine Razorpay payment link**
   through the Razorpay API in test mode.
2. The link is delivered into the customer's WhatsApp thread as a clickable "Pay now"
   card.
3. The customer pays on the real Razorpay checkout page.
4. REX detects the payment, closes the transaction to `RECOVERED`, writes the audit
   entry, and updates GRRR live, with a "Payment received" confirmation in the thread.

Because inbound webhooks cannot reach a local machine, the paid state is reconciled by
polling the Razorpay link status, so the loop closes reliably in a local demo without any
tunneling.

---

## What is real, and what is staged

Honesty matters more than a flashy demo, so this is explicit.

**Real:**

- The failure classification, the diagnosis, and every stopping rule.
- The Hinglish promise-to-pay date extraction, the reconciliation, and the GRRR maths.
- The entire append-only audit trail.
- REX's outreach messages, drafted live by the model at run time.
- The **live Hinglish voice call** (ElevenLabs Conversational AI).
- The **Razorpay payment-link creation** (a real test-mode API call) and the
  **webhook signature verification** (real HMAC-SHA256).

**Staged for the demo:**

- The *customer's* text replies in a scripted run, so a demo tells a coherent story
  without a second live person.
- Mandate re-charge and subscription cancellation, because test keys carry no live
  recurring token.

Everything a judge sees REX *decide* is real code. What is scripted is only the other side
of the conversation.

---

## Architecture

```
Webhook -> Ingest -> Diagnose -> (Wait) -> Execute -> Reconcile
                        |                      |
                   Gemini (LLM)         Bouncer (policy sandbox)
                        |                      |
                        +------ Audit trail (append-only) ------+
```

- **Backend:** FastAPI, SQLAlchemy, and SQLite. A LangGraph orchestrator runs the
  recovery DAG; a plain-Python `PolicySandbox` enforces the compliance rules; Gemini
  powers diagnosis, message drafting, and the assistant's intent understanding, each with
  a deterministic fallback so nothing hard-fails offline.
- **Frontend:** Next.js 16 and React 19. A "Mission Control" operations dashboard:
  overview with a recovery funnel and GRRR, a transactions explorer with AI
  classification tags, per-class pages, an escalations queue, a compliance view of the
  stopping rules, an editable policy inspector, and subscription and invoice calendar
  trackers. Fully bilingual (English and हिंदी), including the diagnoses, playbooks, and
  REX's own outreach.
- **Voice:** ElevenLabs Conversational AI for the live call, streamed over WebRTC inside
  the phone frame, with the browser's speech synthesis as a fallback.

---

## Running it locally

**Backend** (Python 3.12):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # add your keys (see below); it also runs offline without them
python -m uvicorn app.main:app --port 8000
curl -X POST http://localhost:8000/api/v1/admin/seed   # populate the demo dataset
```

Optional keys in `backend/.env`:

- `gemini_api_key` for live diagnosis and drafting (falls back to templates offline).
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (test keys) for real payment links.
- `elevenlabs_api_key` for the assistant's spoken replies.

**Frontend** (Node 20+):

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your_agent_id" > .env.local   # for the live call
npm run dev            # http://localhost:3000/mission-control
```

The frontend talks to `http://localhost:8000` by default; override with
`NEXT_PUBLIC_API_BASE`.

**Tests:**

```bash
cd backend && .venv/bin/python -m pytest -q     # full suite, 213 tests
cd frontend && npm run build                    # type-check and production build
```

To see the full recovery arc, send a payment link from a transaction, pay the test link
with card `4111 1111 1111 1111` (any future expiry and any CVV), and watch the case flip
to `RECOVERED`.

---

## Selected API surface

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/webhooks/razorpay` | HMAC-verified failure webhook; kicks off the recovery graph |
| `GET`  | `/api/v1/metrics` | GRRR, funnel, per-class breakdown, stopping-rule counts |
| `GET`  | `/api/v1/transactions` | Explorer feed with AI tags and derived playbook and channel |
| `POST` | `/api/v1/transactions/{id}/payment-link` | Create a real test-mode Razorpay link and post it to WhatsApp |
| `GET`  | `/api/v1/transactions/{id}/payment-link/status` | Poll Razorpay; close the case to RECOVERED when paid |
| `GET`  | `/api/v1/transactions/{id}/run` | SSE stream of REX working a case live |
| `POST` | `/api/v1/transactions/{id}/status` | Operator override (audited) |
| `POST` | `/api/v1/assistant/chat` | Natural-language layer: a reply plus a structured action |
| `GET`  | `/api/v1/policy` | The Bouncer's rules and the stopping-rule catalogue |

---

## Why this wins

REX is built on Razorpay's own primitives (webhooks, payment links, mandates), with real
signature verification and a real payment API. It speaks Hindi and English, it takes voice
and chat commands, it recovers revenue while a human sleeps, and it can prove, on an
append-only trail, that every rupee was recovered within the rules. Failed payments are
not lost payments. They are just waiting for REX.
