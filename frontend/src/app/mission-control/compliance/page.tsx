"use client";

import { useCallback } from "react";
import { Card, CardHeader } from "@/components/dashboard/Card";
import { HBarList } from "@/components/dashboard/charts";
import MiniStat from "@/components/dashboard/MiniStat";
import { ErrorState, Loading } from "@/components/dashboard/PageState";
import { useApi } from "@/hooks/useApi";
import { fetchMetrics, fetchPolicy } from "@/lib/dashboard/api";
import { humanize } from "@/lib/dashboard/format";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";

export default function CompliancePage() {
  const { bump } = useDashboardRefresh();
  const loadM = useCallback((signal: AbortSignal) => fetchMetrics(signal), []);
  const loadP = useCallback((signal: AbortSignal) => fetchPolicy(signal), []);
  const metrics = useApi(loadM, [bump]);
  const policy = useApi(loadP, [bump]);

  if (metrics.loading || policy.loading) return <Loading label="Loading compliance…" />;
  if (metrics.error || !metrics.data) return <ErrorState message={metrics.error ?? "no data"} />;
  if (policy.error || !policy.data) return <ErrorState message={policy.error ?? "no data"} />;

  const fired = metrics.data.stopping_rules_by_name;
  const totalFired = Object.values(fired).reduce((a, b) => a + b, 0);

  const barRows = Object.entries(fired)
    .sort((a, b) => b[1] - a[1])
    .map(([rule, count]) => ({ label: humanize(rule), value: count, color: "var(--d-slate)" }));

  return (
    <div className="mx-auto max-w-[1220px] space-y-5 p-5 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Stopping Rules</h1>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--d-muted)" }}>
          Deterministic compliance guards enforced <em>outside</em> the LLM — the engine&apos;s
          adherence to opt-outs, disputes and RBI/TRAI limits never depends on a model behaving.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Rules fired" value={String(totalFired)} accent="var(--d-slate)" />
        <MiniStat label="Escalated to human" value={String(metrics.data.counts.escalations)} accent="var(--d-info)" />
        <MiniStat label="Compliantly stopped" value={String(metrics.data.counts.cancelled)} accent="var(--d-muted)" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Rules Fired" subtitle="Across the current batch" />
          <div className="px-5 pb-5">
            {barRows.length ? (
              <HBarList rows={barRows} />
            ) : (
              <p className="text-[12px]" style={{ color: "var(--d-faint)" }}>
                No stopping rules fired yet.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Rule Catalog" subtitle="Every guard the engine can invoke" />
          <ul className="px-5 pb-5">
            {policy.data.stopping_rules.map((r) => {
              const count = fired[r.name] ?? 0;
              return (
                <li
                  key={r.name}
                  className="flex gap-3 py-2.5"
                  style={{ borderTop: "1px solid var(--d-border)" }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold">{humanize(r.name)}</p>
                    <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "var(--d-muted)" }}>
                      {r.description}
                    </p>
                  </div>
                  <span
                    className="d-num h-fit shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: count ? "var(--d-slate-soft)" : "var(--d-surface-2)",
                      color: count ? "var(--d-slate)" : "var(--d-faint)",
                    }}
                  >
                    {count}×
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
