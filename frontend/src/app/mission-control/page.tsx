"use client";

import { useCallback } from "react";
import { Card, CardHeader, Chip } from "@/components/dashboard/Card";
import KpiCard from "@/components/dashboard/KpiCard";
import { AreaChart, Donut, FunnelBars, Gauge, HBarList } from "@/components/dashboard/charts";
import { ErrorState, Loading } from "@/components/dashboard/PageState";
import { useApi } from "@/hooks/useApi";
import { fetchMetrics } from "@/lib/dashboard/api";
import { duration, humanize, inr, pct, shortDate } from "@/lib/dashboard/format";
import { CLASS_COLOR, CLASS_LABEL } from "@/lib/dashboard/status";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";

export default function OverviewPage() {
  const { bump } = useDashboardRefresh();
  const load = useCallback((signal: AbortSignal) => fetchMetrics(signal), []);
  const { data: m, error, loading } = useApi(load, [bump]);

  if (loading) return <Loading label="Loading metrics…" />;
  if (error || !m) return <ErrorState message={error ?? "no data"} />;

  const series = m.time_series.map((p) => ({
    label: shortDate(p.date),
    value: p.cumulative_inr,
  }));
  const sparkValues = m.time_series.map((p) => p.cumulative_inr);

  const classSegments = [1, 2, 3, 4]
    .map((n) => ({
      label: CLASS_LABEL[n],
      value: m.by_class[String(n)]?.recovered_inr ?? 0,
      color: CLASS_COLOR[n],
    }))
    .filter((s) => s.value > 0);

  const funnelStages = [
    { label: "At-risk", value: m.funnel.at_risk, color: "var(--d-slate)" },
    { label: "Intervened", value: m.funnel.intervened, color: CLASS_COLOR[2] },
    { label: "Recovered", value: m.funnel.recovered, color: "var(--d-ok)" },
    { label: "Escalated", value: m.funnel.escalated, color: "var(--d-info)" },
    { label: "Stopped", value: m.funnel.cancelled, color: "var(--d-muted)" },
    { label: "Lost", value: m.funnel.failed, color: "var(--d-bad)" },
  ];

  const channelRows = Object.entries(m.channel_breakdown).map(([ch, s]) => ({
    label: humanize(ch),
    value: s.dispatched,
    display: `${s.recovered}/${s.dispatched}`,
    sub: `${pct(s.dispatched ? s.recovered / s.dispatched : 0)} won`,
    color: "var(--d-accent)",
  }));

  const ruleRows = Object.entries(m.stopping_rules_by_name)
    .sort((a, b) => b[1] - a[1])
    .map(([rule, count]) => ({
      label: humanize(rule),
      value: count,
      color: "var(--d-slate)",
    }));

  return (
    <div className="mx-auto max-w-[1220px] space-y-5 p-5 md:p-6">
      {/* Hero KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Revenue Recovered"
          value={inr(m.recovered_inr, { compact: true })}
          accent="var(--d-ok)"
          emphasis
          spark={sparkValues}
          sub={
            <span>
              of {inr(m.at_risk_inr, { compact: true })} at-risk ·{" "}
              <span className="d-num">{m.counts.recovered}</span> txns
            </span>
          }
        />
        <KpiCard
          label="At-Risk Revenue"
          value={inr(m.at_risk_inr, { compact: true })}
          sub={<span className="d-num">{m.funnel.at_risk} cases flagged</span>}
        />
        <KpiCard
          label="In-Flight"
          value={inr(m.in_flight_inr, { compact: true })}
          accent="var(--d-warn)"
          sub="interventions awaiting outcome"
        />
        <KpiCard
          label="Lost / Write-off"
          value={inr(m.lost_inr, { compact: true })}
          accent="var(--d-bad)"
          sub={<span className="d-num">{m.counts.failed} non-recoverable</span>}
        />
      </div>

      {/* Gauge + Funnel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center py-5">
          <CardHeader title="Gross Recovery Rate" subtitle="GRRR across the batch" />
          <Gauge value={m.grrr} color="var(--d-ok)" />
          <p className="mt-1 text-[12px]" style={{ color: "var(--d-muted)" }}>
            avg time-to-recovery{" "}
            <span className="d-num" style={{ color: "var(--d-ink)" }}>
              {duration(m.avg_time_to_recovery_seconds)}
            </span>
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recovery Funnel"
            subtitle="From flagged at-risk to a settled outcome"
            right={
              <Chip tone={{ fg: "var(--d-ok)", soft: "var(--d-ok-soft)" }}>
                {pct(m.funnel.at_risk ? m.funnel.recovered / m.funnel.at_risk : 0)} recovered
              </Chip>
            }
          />
          <div className="px-5 pb-5">
            <FunnelBars stages={funnelStages} />
          </div>
        </Card>
      </div>

      {/* Recovery over time */}
      <Card>
        <CardHeader
          title="Recovered Revenue Over Time"
          subtitle="Cumulative, settled across the last two weeks"
          right={
            <span className="d-num text-[13px] font-semibold" style={{ color: "var(--d-ok)" }}>
              {inr(m.recovered_inr)}
            </span>
          }
        />
        <div className="px-3 pb-2">
          <AreaChart data={series} color="var(--d-ok)" />
        </div>
      </Card>

      {/* By class · Channels · Compliance */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Recovered by Class" subtitle="Share of won revenue" />
          <div className="flex items-center gap-5 px-5 pb-5">
            <Donut
              segments={classSegments}
              centerValue={inr(m.recovered_inr, { compact: true })}
              centerLabel="won"
            />
            <ul className="flex-1 space-y-1.5">
              {[1, 2, 3, 4].map((n) => {
                const c = m.by_class[String(n)];
                if (!c) return null;
                return (
                  <li key={n} className="flex items-center justify-between text-[12px]">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: CLASS_COLOR[n] }}
                      />
                      <span style={{ color: "var(--d-muted)" }}>Class {n}</span>
                    </span>
                    <span className="d-num">{pct(c.recovery_rate)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title="Channel Effectiveness" subtitle="Dispatched vs recovered" />
          <div className="px-5 pb-5">
            {channelRows.length ? (
              <HBarList rows={channelRows} />
            ) : (
              <p className="text-[12px]" style={{ color: "var(--d-faint)" }}>
                No dispatches yet.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Compliance Stops"
            subtitle="Deterministic stopping rules fired"
            right={
              <Chip tone={{ fg: "var(--d-slate)", soft: "var(--d-slate-soft)" }}>
                {m.counts.escalations} escalated
              </Chip>
            }
          />
          <div className="px-5 pb-5">
            {ruleRows.length ? (
              <HBarList rows={ruleRows} />
            ) : (
              <p className="text-[12px]" style={{ color: "var(--d-faint)" }}>
                No stopping rules fired.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
