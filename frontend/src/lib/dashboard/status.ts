/** Maps domain values to the dashboard's status palette (CSS var tokens). */

import type { LifecycleStatus } from "./types";

export interface Tone {
  fg: string; // text/graphic colour var
  soft: string; // soft fill var
  label: string;
}

export const STATUS_TONE: Record<LifecycleStatus, Tone> = {
  RECOVERED: { fg: "var(--d-ok)", soft: "var(--d-ok-soft)", label: "Recovered" },
  INTERVENING: { fg: "var(--d-warn)", soft: "var(--d-warn-soft)", label: "In-flight" },
  WAITING: { fg: "var(--d-warn)", soft: "var(--d-warn-soft)", label: "Waiting" },
  DIAGNOSING: { fg: "var(--d-info)", soft: "var(--d-info-soft)", label: "Diagnosing" },
  PENDING: { fg: "var(--d-info)", soft: "var(--d-info-soft)", label: "Pending" },
  ESCALATED: { fg: "var(--d-slate)", soft: "var(--d-slate-soft)", label: "Escalated" },
  CANCELLED: { fg: "var(--d-muted)", soft: "var(--d-surface-2)", label: "Stopped" },
  FAILED: { fg: "var(--d-bad)", soft: "var(--d-bad-soft)", label: "Lost" },
};

export function statusTone(status: string): Tone {
  return (
    STATUS_TONE[status as LifecycleStatus] ?? {
      fg: "var(--d-muted)",
      soft: "var(--d-surface-2)",
      label: status,
    }
  );
}

/** The four failure classes' accent colours, distinct from status tones. */
export const CLASS_COLOR: Record<number, string> = {
  1: "#0ea5e9", // sky — real-time degradation
  2: "#6366f1", // indigo — checkout abandonment
  3: "#f59e0b", // amber — subscription/mandate
  4: "#8b5cf6", // violet — B2B receivables
};

export const CLASS_LABEL: Record<number, string> = {
  1: "Real-Time Degradation",
  2: "Checkout Abandonment",
  3: "Subscription & Mandate",
  4: "B2B Receivables",
};

export const CLASS_SHORT: Record<number, string> = {
  1: "Degradation",
  2: "Abandonment",
  3: "Mandate",
  4: "Receivables",
};

export interface ClassSolve {
  trigger: string;
  playbook: string;
  mechanism: string;
  stop: string;
}

/** How REX actually works each class — surfaced on the class tabs. */
export const CLASS_SOLVE: Record<number, ClassSolve> = {
  1: {
    trigger: "Acquirer switch timeout / issuer down",
    playbook: "Reroute rail → pre-auth link",
    mechanism:
      "Detects the degraded rail in-flight and re-routes to a healthy fallback, then sends a secure 1-tap link for abandoned sessions.",
    stop: "Late settlement kills the fallback (no double charge).",
  },
  2: {
    trigger: "OTP / 3DS drop-off at the modal",
    playbook: "UPI Autopay nudge",
    mechanism:
      "Dispatches a 1-tap UPI Autopay link over WhatsApp, bypassing card friction — a policy-gated fee waiver only if warranted.",
    stop: "Cross-device completion → go silent.",
  },
  3: {
    trigger: "Auto-debit fails on pre-salary low balance",
    playbook: "Salary-cycle sequencer",
    mechanism:
      "Defers the retry to align with the customer's salary-credit window instead of burning attempts on an empty account.",
    stop: "RBI cap: at most 3 auto-debit retries; explicit cancel stops instantly.",
  },
  4: {
    trigger: "Overdue Net-30 B2B invoice",
    playbook: "Promise-to-Pay tracker",
    mechanism:
      "WhatsApps the AP team, extracts a hard Promise-to-Pay date from the reply, and holds dunning until that date.",
    stop: "A dispute freezes automation and escalates to a human.",
  },
};

/** AI classification chip tone. */
export function aiTagTone(tag: string | null): Tone {
  switch (tag) {
    case "RECOVERY_CASE":
      return { fg: "var(--d-accent)", soft: "var(--d-accent-soft)", label: "Recovery case" };
    case "HEALTHY":
      return { fg: "var(--d-ok)", soft: "var(--d-ok-soft)", label: "Healthy" };
    case "NON_RECOVERABLE":
      return { fg: "var(--d-bad)", soft: "var(--d-bad-soft)", label: "Non-recoverable" };
    default:
      return { fg: "var(--d-muted)", soft: "var(--d-surface-2)", label: tag ?? "—" };
  }
}
