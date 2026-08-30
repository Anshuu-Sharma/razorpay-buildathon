"use client";

import { useCallback, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { addInvoice, fetchInvoices } from "@/lib/dashboard/api";
import type { InvoiceItem } from "@/lib/dashboard/api";
import { inr } from "@/lib/dashboard/format";
import { useDash } from "@/lib/dashboard/i18n";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";
import { useRexRun } from "@/lib/dashboard/rexrun";
import { Card, CardHeader } from "./Card";

const BUCKETS = ["current", "0-30", "30-60", "60-90", "90+"] as const;
const BUCKET_COLOR: Record<string, string> = {
  current: "var(--d-ok)",
  "0-30": "var(--d-warn)",
  "30-60": "#d98324",
  "60-90": "#c05a2b",
  "90+": "var(--d-bad)",
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function ReceivablesBoard() {
  const { d } = useDash();
  const t = d.inv;
  const { bump, refresh } = useDashboardRefresh();
  const rex = useRexRun();
  const load = useCallback((s: AbortSignal) => fetchInvoices(s), []);
  const { data, loading } = useApi(load, [bump]);

  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ buyer: "", amount: "", issue: "", due: "" });

  const byBucket = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const b of BUCKETS) map[b] = { total: 0, count: 0 };
    for (const i of data ?? []) {
      const b = map[i.aging_bucket];
      if (b) {
        b.total += i.amount_inr;
        b.count += 1;
      }
    }
    return map;
  }, [data]);

  const rows: InvoiceItem[] = data ?? [];

  const save = async () => {
    if (!form.buyer.trim() || !form.amount || !form.issue || !form.due) return;
    setBusy(true);
    try {
      await addInvoice({
        buyer_name: form.buyer.trim(),
        amount_inr: Number(form.amount),
        issue_date: form.issue,
        due_date: form.due,
      });
      setForm({ buyer: "", amount: "", issue: "", due: "" });
      setAdding(false);
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const input = {
    borderColor: "var(--d-border)",
    background: "var(--d-bg)",
    color: "var(--d-ink)",
  };

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

      {/* Add form */}
      {adding ? (
        <div className="mx-5 mt-3 grid gap-2 rounded-xl border p-3 sm:grid-cols-5" style={{ borderColor: "var(--d-border)" }}>
          <input placeholder={t.buyer} value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })}
            className="rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none sm:col-span-2" style={input} />
          <input type="number" placeholder={t.amount} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="d-num rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none" style={input} />
          <input type="date" aria-label={t.issue} value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })}
            className="d-num rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={input} />
          <input type="date" aria-label={t.due} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })}
            className="d-num rounded-lg border px-2 py-1.5 text-[12px] outline-none" style={input} />
          <div className="flex gap-2 sm:col-span-5">
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

      {/* Aging buckets */}
      <div className="grid grid-cols-2 gap-2 px-5 pt-4 sm:grid-cols-5">
        {BUCKETS.map((b) => (
          <div key={b} className="rounded-xl border p-3" style={{ borderColor: "var(--d-border)" }}>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: BUCKET_COLOR[b] }} />
              <span className="text-[11px] font-medium" style={{ color: "var(--d-muted)" }}>{t.buckets[b]}</span>
            </div>
            <div className="d-num mt-1 text-[15px] font-semibold">{inr(byBucket[b].total, { compact: true })}</div>
            <div className="text-[10.5px]" style={{ color: "var(--d-faint)" }}>{byBucket[b].count} · {t.atRisk}</div>
          </div>
        ))}
      </div>

      {/* Invoice list */}
      <div className="mt-4 space-y-1.5 px-5 pb-5">
        {loading ? (
          <p className="py-6 text-center text-[12px]" style={{ color: "var(--d-faint)" }}>…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-[12px]" style={{ color: "var(--d-faint)" }}>{t.none}</p>
        ) : (
          rows.map((i) => (
            <div key={i.transaction_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2"
              style={{ background: "var(--d-surface-2)" }}>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: BUCKET_COLOR[i.aging_bucket] }} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{i.buyer_name}</span>
              <span className="d-num text-[11px]" style={{ color: "var(--d-faint)" }}>{i.invoice_no}</span>
              <span className="d-num text-[12.5px] font-semibold">{inr(i.amount_inr)}</span>
              <span className="d-num text-[11px]" style={{ color: "var(--d-muted)" }}>
                {t.due}: {shortDate(i.due_date)} ·{" "}
                <span style={{ color: i.days_overdue > 0 ? "var(--d-bad)" : "var(--d-ok)" }}>
                  {i.days_overdue > 0 ? t.overdueDays(i.days_overdue) : t.dueIn(-i.days_overdue)}
                </span>
              </span>
              {i.p2p_date ? (
                <span className="rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ background: "var(--d-info-soft)", color: "var(--d-info)" }}>
                  {t.promised} {shortDate(i.p2p_date)}
                </span>
              ) : (
                <span className="d-num text-[10.5px]" style={{ color: "var(--d-faint)" }}>
                  {t.nextReminder} {shortDate(i.next_reminder_date)}
                </span>
              )}
              {i.open ? (
                <button
                  onClick={() => rex.start(i.transaction_id, i.buyer_name)}
                  className="ml-auto shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white"
                  style={{ background: "var(--d-accent)" }}
                >
                  {t.handle}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
