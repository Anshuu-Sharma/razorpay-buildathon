"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/dashboard/Card";
import MiniStat from "@/components/dashboard/MiniStat";
import TransactionExplorer from "@/components/dashboard/TransactionExplorer";
import { ErrorState, Loading } from "@/components/dashboard/PageState";
import { useApi } from "@/hooks/useApi";
import { useIsClient } from "@/hooks/useIsClient";
import { fetchMetrics } from "@/lib/dashboard/api";
import { humanize, inr, pct } from "@/lib/dashboard/format";
import { useDash, durTime } from "@/lib/dashboard/i18n";
import { CLASS_COLOR } from "@/lib/dashboard/status";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";

export default function ClassPage() {
  const params = useParams();
  const isClient = useIsClient();
  const { d } = useDash();
  const raw = Number(Array.isArray(params.id) ? params.id[0] : params.id);
  const id = raw >= 1 && raw <= 4 ? raw : 1;

  const { bump } = useDashboardRefresh();
  const load = useCallback((signal: AbortSignal) => fetchMetrics(signal), []);
  const { data: m, error, loading } = useApi(load, [bump]);

  const color = CLASS_COLOR[id];
  const solve = d.solve[id];
  const cp = d.classpg;

  // The id comes from useParams (empty during SSR) — render nothing class-
  // specific until hydration so the header/metrics never hydrate-mismatch.
  if (!isClient) return <Loading label={d.state.classpg} />;

  return (
    <div className="mx-auto max-w-[1220px] space-y-5 p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="h-8 w-1.5 rounded-full" style={{ background: color }} />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {d.classWord} {id} · {d.classLabel[id]}
          </h1>
          <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--d-muted)" }}>
            {solve.trigger}
          </p>
        </div>
      </div>

      {loading ? (
        <Loading label={d.state.classMetrics} />
      ) : error || !m ? (
        <ErrorState message={error ?? "no data"} />
      ) : (
        <>
          {/* Mini metrics */}
          {(() => {
            const c = m.by_class[String(id)];
            if (!c) return null;
            return (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                <MiniStat label={cp.mRecovered} value={inr(c.recovered_inr, { compact: true })} accent="var(--d-ok)" />
                <MiniStat label={cp.mAtRisk} value={inr(c.at_risk_inr, { compact: true })} />
                <MiniStat label={cp.mRate} value={pct(c.recovery_rate)} accent={color} />
                <MiniStat label={cp.mCases} value={`${c.recovered_count}/${c.count}`} />
                <MiniStat label={cp.mAvgTtr} value={durTime(c.avg_time_to_recovery_seconds, d)} />
                <MiniStat label={cp.mTopPlaybook} value={humanize(c.top_playbook)} />
              </div>
            );
          })()}

          {/* How REX solves this class */}
          <Card className="p-5" style={{ borderLeft: `3px solid ${color}` }}>
            <p className="d-label" style={{ color }}>
              {cp.how}
            </p>
            <div className="mt-2 grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--d-faint)" }}>
                  {cp.playbook}
                </p>
                <p className="mt-1 text-[13px] font-medium">{solve.playbook}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--d-faint)" }}>
                  {cp.mechanism}
                </p>
                <p className="mt-1 text-[13px]" style={{ color: "var(--d-muted)" }}>
                  {solve.mechanism}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-lg px-3 py-2 text-[12px]" style={{ background: "var(--d-surface-2)" }}>
              <span className="font-semibold" style={{ color: "var(--d-ink)" }}>
                {cp.stop}{" "}
              </span>
              <span style={{ color: "var(--d-muted)" }}>{solve.stop}</span>
            </div>
          </Card>

          {/* Class-filtered ledger */}
          <TransactionExplorer fixedClass={id} />
        </>
      )}
    </div>
  );
}
