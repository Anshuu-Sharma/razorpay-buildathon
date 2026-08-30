# REX — Revenue Execution Engine

An autonomous revenue-recovery agent for Razorpay. When a payment fails, REX
figures out *why*, decides what to do about it, and works the customer back to a
successful payment — over WhatsApp and voice, within the guardrails a payments
company actually has to respect. Every decision is written to an immutable audit
trail, and the whole thing is driven from a live operations dashboard where a
human can watch REX work, talk to it, and take over at any point.

Not every failed payment is lost revenue. REX exists to recover the ones that
aren't — and to *prove*, case by case, that it did so compliantly.

---

## The problem, in four shapes

Failed payments aren't one problem; they're four, and each needs a different
solve. REX classifies every failure and routes it to a dedicated playbook:

| Class | What broke | REX's move |
|------|------------|------------|
| **Failed Payments** | A gateway/rail glitch mid-transaction — not the customer's fault | Re-route the rail in-flight, then send a secure 1-tap link |
| **Abandoned Checkouts** | High-intent drop-off at the OTP / 3DS step | 1-tap UPI Autopay nudge over WhatsApp, bypassing card friction |
| **Failed Subscriptions** | E-mandate auto-debit fails on a low balance before salary | Defer to the salary window, then refresh the mandate |
| **Overdue Invoices** | B2B receivable past due | Promise-to-pay tracking, with Hinglish date extraction from replies |

## The bar: recovery you can trust

Recovering revenue is easy if you're allowed to spam customers and double-charge
cards. REX isn't. A deterministic policy layer — the **Bouncer** — sits between
the agent's intent and any real-world action, and it cannot be talked out of its
rules by the model:

- **RBI** — at most 3 auto-debit retries per cycle
- **TRAI** — no outbound contact during quiet hours (20:00–09:00 IST)
- **No double charge** — a late settlement voids the fallback
- **Cross-device completion** — if the customer pays elsewhere, REX goes silent
- **Dispute freeze** — an open dispute routes straight to a human
- **Opt-out** — honoured instantly, even mid-conversation (and inside prompt-injection attempts)

Every action that clears — or is stopped by — the Bouncer is appended to an
immutable audit log. The headline metric is **GRRR** (Gross Revenue Recovery
Rate): recovered ÷ at-risk, earned only on genuinely at-risk transactions.

## Talk to REX

REX ships with a conversational agent in the corner of the dashboard. Ask it
questions grounded in live data, or give it commands in plain English or Hindi:

> *"What's our recovery rate?"* → "42% of at-risk revenue — ₹3.5L recovered."
> *"Recover the Acme invoice."* → REX starts the recovery and narrates it live.
> *"Escalate this one."* → REX proposes the change and waits for your confirmation.

The language model handles understanding; the *actions* are assembled in code and
resolved against real rows, so REX never moves money or state on its own — and
irreversible changes always ask first.

---

## What's real, and what's staged

Honesty matters more than a flashy demo, so this is explicit:

- **Real:** the failure classification, the diagnosis, every stopping rule, the
  Hinglish promise-to-pay date extraction, the reconciliation, the GRRR maths,
  and the entire audit trail. REX's outreach messages are **drafted live** by the
  model at run time.
- **Staged for the demo:** the *customer's* replies are scripted, so a run tells a
  coherent story on stage without a second live person on the other end.

Everything a judge sees REX *decide* is real code. What's scripted is only the
other side of the conversation.

---

## Architecture

```
Webhook ─▶ Ingest ─▶ Diagnose ─▶ (Wait) ─▶ Execute ─▶ Reconcile
                         │                     │
                    Gemini (LLM)          Bouncer (policy sandbox)
                         │                     │
                         └──────── Audit trail (append-only) ───────┘
```

- **Backend** — FastAPI + SQLAlchemy + SQLite. A LangGraph orchestrator runs the
  recovery DAG; a plain-Python `PolicySandbox` enforces the compliance rules;
  Gemini powers diagnosis, message drafting, and the assistant's intent
  understanding, each with a deterministic fallback so nothing hard-fails offline.
- **Frontend** — Next.js 16 + React 19. A "Mission Control" operations dashboard:
  overview with a recovery funnel and GRRR, a transactions explorer with AI
  classification tags, per-class pages, an escalations queue, a compliance view of
  the stopping rules, and a policy inspector. Fully bilingual **English / हिंदी** —
  including the diagnoses, playbooks, and REX's own outreach. A live SSE stream
  lets you watch REX work a case step by step, right inside the chat.

---

## Running it locally

**Backend** (Python 3.12):

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
echo "gemini_api_key=YOUR_KEY" > .env      # optional — falls back to templates offline
python -m uvicorn app.main:app --port 8000
curl -X POST http://localhost:8000/api/v1/admin/seed   # populate the demo dataset
```

**Frontend** (Node 20+):

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000/mission-control
```

The frontend talks to `http://localhost:8000` by default; override with
`NEXT_PUBLIC_API_BASE`.

**Tests:**

```bash
cd backend && .venv/bin/python -m pytest -q     # full suite
cd frontend && npm run build                    # type-check + production build
```

---

## Selected API surface

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/webhooks/razorpay` | HMAC-verified failure webhook; kicks off the recovery graph |
| `GET`  | `/api/v1/metrics` | GRRR, funnel, per-class breakdown, stopping-rule counts |
| `GET`  | `/api/v1/transactions` | Explorer feed with AI tags and derived playbook/channel |
| `GET`  | `/api/v1/transactions/{id}/run` | SSE stream of REX working a case live |
| `POST` | `/api/v1/transactions/{id}/status` | Operator override (audited) |
| `POST` | `/api/v1/assistant/chat` | Natural-language layer: reply + a structured action |
| `GET`  | `/api/v1/policy` | The Bouncer's rules and stopping-rule catalogue |

---

Built for the Razorpay buildathon.
