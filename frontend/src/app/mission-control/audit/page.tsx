"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/dashboard/Card";
import { ErrorState, Loading } from "@/components/dashboard/PageState";
import { useApi } from "@/hooks/useApi";
import { fetchAudit } from "@/lib/dashboard/api";
import { humanize } from "@/lib/dashboard/format";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";
import type { AuditEntry } from "@/lib/dashboard/types";

function outcomeColor(outcome: string): string {
  if (outcome === "SUCCESS") return "var(--d-ok)";
  if (outcome === "ESCALATED") return "var(--d-slate)";
  return "var(--d-bad)";
}

function Row({ e }: { e: AuditEntry }) {
  const keys = Object.keys(e.payload ?? {});
  return (
    <div
      className="flex gap-3 px-4 py-2.5"
      style={{ borderBottom: "1px solid var(--d-border)" }}
    >
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
        style={{ background: outcomeColor(e.outcome) }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[12.5px] font-semibold">{humanize(e.node_name)}</span>
          <span className="text-[11.5px]" style={{ color: "var(--d-muted)" }}>
            {humanize(e.action_type)}
          </span>
          <span className="d-num text-[11px]" style={{ color: "var(--d-faint)" }}>
            {e.transaction_id}
          </span>
          <span className="d-num ml-auto text-[11px]" style={{ color: "var(--d-faint)" }}>
            {new Date(e.timestamp).toLocaleString("en-IN")}
          </span>
        </div>
        {keys.length ? (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
            {keys.map((k) => (
              <span key={k}>
                <span className="d-num" style={{ color: "var(--d-faint)" }}>
                  {k}=
                </span>
                <span className="d-num" style={{ color: "var(--d-muted)" }}>
                  {String((e.payload as Record<string, unknown>)[k])}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AuditLogPage() {
  const { bump } = useDashboardRefresh();
  const load = useCallback((signal: AbortSignal) => fetchAudit({ limit: 500 }, signal), []);
  const { data, error, loading } = useApi(load, [bump]);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    if (!q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter(
      (e) =>
        e.transaction_id.toLowerCase().includes(needle) ||
        e.node_name.toLowerCase().includes(needle) ||
        e.action_type.toLowerCase().includes(needle)
    );
  }, [data, q]);

  if (loading) return <Loading label="Loading audit log…" />;
  if (error || !data) return <ErrorState message={error ?? "no data"} />;

  return (
    <div className="mx-auto max-w-[1220px] space-y-4 p-5 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Audit Log</h1>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--d-muted)" }}>
          The append-only, tamper-evident ledger — every action REX took, in order. Rows can never
          be edited or deleted.
        </p>
      </div>

      <Card>
        <div
          className="flex items-center gap-2.5 px-4 py-3"
          style={{ borderBottom: "1px solid var(--d-border)" }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by transaction, node, action…"
            className="w-64 rounded-lg border px-3 py-1.5 text-[12.5px] outline-none"
            style={{
              borderColor: "var(--d-border)",
              background: "var(--d-surface)",
              color: "var(--d-ink)",
            }}
          />
          <span className="ml-auto d-num text-[12px]" style={{ color: "var(--d-faint)" }}>
            {rows.length} of {data.total} entries
          </span>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {rows.map((e) => (
            <Row key={e.id} e={e} />
          ))}
        </div>
      </Card>
    </div>
  );
}
