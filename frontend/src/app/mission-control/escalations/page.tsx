"use client";

import { useCallback } from "react";
import { Card } from "@/components/dashboard/Card";
import MiniStat from "@/components/dashboard/MiniStat";
import { ErrorState, Loading } from "@/components/dashboard/PageState";
import { useApi } from "@/hooks/useApi";
import { fetchEscalations } from "@/lib/dashboard/api";
import { humanize, relativeTime } from "@/lib/dashboard/format";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";

const TH = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide";
const TD = "px-3 py-2.5 align-middle";

export default function EscalationsPage() {
  const { bump } = useDashboardRefresh();
  const load = useCallback((signal: AbortSignal) => fetchEscalations(signal), []);
  const { data, error, loading } = useApi(load, [bump]);

  if (loading) return <Loading label="Loading escalations…" />;
  if (error || !data) return <ErrorState message={error ?? "no data"} />;

  const open = data.filter((t) => t.status === "OPEN").length;
  const resolved = data.length - open;

  return (
    <div className="mx-auto max-w-[1220px] space-y-4 p-5 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Escalations</h1>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--d-muted)" }}>
          The human-handoff queue — cases REX compliantly routed to a person (disputes, policy
          blocks) instead of acting autonomously.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Total" value={String(data.length)} />
        <MiniStat label="Open" value={String(open)} accent="var(--d-slate)" />
        <MiniStat label="Resolved" value={String(resolved)} accent="var(--d-ok)" />
      </div>

      <Card>
        {data.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr style={{ color: "var(--d-muted)", borderBottom: "1px solid var(--d-border)" }}>
                  <th className={TH}>Transaction</th>
                  <th className={TH}>Reason</th>
                  <th className={TH}>Rule</th>
                  <th className={TH}>Status</th>
                  <th className={`${TH} text-right`}>When</th>
                </tr>
              </thead>
              <tbody>
                {data.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--d-border)" }}>
                    <td className={`${TD} d-num text-[12px]`}>{t.transaction_id}</td>
                    <td className={`${TD}`} style={{ color: "var(--d-ink)" }}>
                      {t.reason}
                    </td>
                    <td className={`${TD} text-[12px]`} style={{ color: "var(--d-muted)" }}>
                      {t.rule ? humanize(t.rule) : "—"}
                    </td>
                    <td className={TD}>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          background: t.status === "OPEN" ? "var(--d-slate-soft)" : "var(--d-ok-soft)",
                          color: t.status === "OPEN" ? "var(--d-slate)" : "var(--d-ok)",
                        }}
                      >
                        {humanize(t.status)}
                      </span>
                    </td>
                    <td className={`${TD} text-right text-[12px]`} style={{ color: "var(--d-faint)" }}>
                      {relativeTime(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-4 py-16 text-center text-[13px]" style={{ color: "var(--d-faint)" }}>
            No escalations — every case was handled autonomously within policy.
          </div>
        )}
      </Card>
    </div>
  );
}
