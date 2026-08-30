"use client";

import { useCallback, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { addSubscription, fetchSubscriptions } from "@/lib/dashboard/api";
import type { SubscriptionItem } from "@/lib/dashboard/api";
import { inr } from "@/lib/dashboard/format";
import { useDash } from "@/lib/dashboard/i18n";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";
import { useRexRun } from "@/lib/dashboard/rexrun";
import { Card, CardHeader } from "./Card";

const STATUS_COLOR: Record<string, string> = {
  at_risk: "var(--d-warn)",
  deferred: "var(--d-info)",
  retrying: "var(--d-accent)",
  recovered: "var(--d-ok)",
  active: "var(--d-muted)",
  failed: "var(--d-bad)",
  cancelled: "var(--d-muted)",
  escalated: "var(--d-info)",
};

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function MandateCalendar() {
  const { d } = useDash();
  const t = d.sub;
  const { bump, refresh } = useDashboardRefresh();
  const rex = useRexRun();
  const load = useCallback((s: AbortSignal) => fetchSubscriptions(s), []);
  const { data, loading } = useApi(load, [bump]);

  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ customer: "", plan: "", amount: "", next: "", salary: "1" });

  const rows: SubscriptionItem[] = data ?? [];

  const save = async () => {
    if (!form.customer.trim() || !form.plan.trim() || !form.amount || !form.next) return;
    setBusy(true);
    try {
      await addSubscription({
        customer_name: form.customer.trim(),
        plan: form.plan.trim(),
        amount_inr: Number(form.amount),
        next_debit_date: form.next,
        salary_day: Number(form.salary) || 1,
      });
      setForm({ customer: "", plan: "", amount: "", next: "", salary: "1" });
      setAdding(false);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const input = { borderColor: "var(--d-border)", background: "var(--d-bg)", color: "var(--d-ink)" };

  // Group by debit date for a light calendar feel.
  let lastDate = "";

  return (
    <Card>
      <div className="flex items-start gap-3 px-5 pt-5">
        <CardHeader title={t.title} subtitle={t.desc} />
        <button
          onClick={() => setAdding((v) => !v)}
          className="ml-auto shrink-0 rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
          style={{ borderColor: "var(--d-border)", color: "var(--d-ink)" }}
        >
          {t.add}
        </button>
      </div>

      {adding ? (
        <div className="mx-5 mt-3 grid gap-2 rounded-xl border p-3 sm:grid-cols-6" style={{ borderColor: "var(--d-border)" }}>
          <input placeholder={t.customer} value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })}
            className="rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none sm:col-span-2" style={input} />
          <input placeholder={t.plan} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
            className="rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none" style={input} />
          <input type="number" placeholder={t.amount} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="d-num rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none" style={input} />
          <input type="date" aria-label={t.nextDebit} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })}
            className="d-num rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={input} />
          <input type="number" min={1} max={31} aria-label={t.salaryDay} value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })}
            className="d-num rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none" style={input} />
          <div className="flex gap-2 sm:col-span-6">
            <button onClick={save} disabled={busy}
              className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "var(--d-ink)" }}>
              {busy ? t.saving : t.save}
            </button>
            <button onClick={() => setAdding(false)}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium" style={{ border: "1px solid var(--d-border)", color: "var(--d-muted)" }}>
              {t.cancel}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-1 px-5 pb-5">
        {loading ? (
          <p className="py-6 text-center text-[12px]" style={{ color: "var(--d-faint)" }}>…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-[12px]" style={{ color: "var(--d-faint)" }}>{t.none}</p>
        ) : (
          rows.map((s) => {
            const showDate = s.next_debit_date !== lastDate;
            lastDate = s.next_debit_date;
            return (
              <div key={s.transaction_id}>
                {showDate ? (
                  <div className="mt-3 mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--d-faint)" }}>
                    {dayLabel(s.next_debit_date)}
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2" style={{ background: "var(--d-surface-2)" }}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_COLOR[s.mandate_status] ?? "var(--d-muted)" }} />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{s.customer_name}</span>
                  <span className="text-[11px]" style={{ color: "var(--d-muted)" }}>{s.plan}</span>
                  <span className="d-num text-[12.5px] font-semibold">{inr(s.amount_inr)}</span>
                  <span className="rounded-full px-2 py-0.5 text-[10.5px] font-medium"
                    style={{ background: `color-mix(in srgb, ${STATUS_COLOR[s.mandate_status] ?? "var(--d-muted)"} 15%, transparent)`, color: STATUS_COLOR[s.mandate_status] ?? "var(--d-muted)" }}>
                    {t.status[s.mandate_status] ?? s.mandate_status}
                  </span>
                  {s.retry_count > 0 ? (
                    <span className="d-num text-[10.5px]" style={{ color: "var(--d-faint)" }}>{t.retry} {s.retry_count}/{s.retry_cap}</span>
                  ) : null}
                  <span className="d-num text-[10.5px]" style={{ color: "var(--d-faint)" }}>{t.salary} {s.salary_day}</span>
                  {s.predicted_fail ? (
                    <button
                      onClick={() => rex.start(s.transaction_id, s.customer_name)}
                      className="ml-auto shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white"
                      style={{ background: "var(--d-accent)" }}
                    >
                      {t.handle}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
