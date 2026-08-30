"use client";

import { useState } from "react";
import { simulateCase } from "@/lib/dashboard/api";
import { useDash } from "@/lib/dashboard/i18n";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";

/** Injects a fresh, unworked failed transaction for the operator to run REX on. */
export default function SimulateButton({
  failureClass,
}: {
  failureClass?: number;
  /** Deprecated — the button is now a neutral grey regardless of class colour. */
  accent?: string;
}) {
  const { d } = useDash();
  const { refresh } = useDashboardRefresh();
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await simulateCase(failureClass);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={go}
      disabled={busy}
      className="rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-[var(--d-surface-2)] disabled:opacity-60"
      style={{ borderColor: "var(--d-border)", color: "var(--d-muted)", background: "var(--d-surface)" }}
    >
      {busy ? d.run.simulating : `+ ${d.run.simulate}`}
    </button>
  );
}
