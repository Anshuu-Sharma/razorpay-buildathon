"use client";

import { useCallback } from "react";
import { Card, CardHeader, Chip } from "@/components/dashboard/Card";
import KpiCard from "@/components/dashboard/KpiCard";
import { AreaChart, Donut, FunnelBars, Gauge, HBarList } from "@/components/dashboard/charts";
import { ErrorState, Loading } from "@/components/dashboard/PageState";
import { useApi } from "@/hooks/useApi";
import { fetchMetrics } from "@/lib/dashboard/api";
import { humanize, inr, pct, shortDate } from "@/lib/dashboard/format";
import { useDash, durTime } from "@/lib/dashboard/i18n";
import { CLASS_COLOR } from "@/lib/dashboard/status";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";

export default function OverviewPage() {
  const { bump } = useDashboardRefresh();
  const { d } = useDash();
  const o = d.overview;
  const load = useCallback((signal: AbortSignal) => fetchMetrics(signal), []);
  const { data: m, error, loading } = useApi(load, [bump]);

  if (loading) return <Loading label={d.state.metrics} />;
  if (error || !m) return <ErrorState message={error ?? "no data"} />;

  const series = m.time_series.map((p) => ({
    label: shortDate(p.date),
    value: p.cumulative_inr,
  }));
  const sparkValues = m.time_series.map((p) => p.cumulative_inr);

  const classSegments = [1, 2, 3, 4]
    .map((n) => ({
      label: d.classLabel[n],
      value: m.by_class[String(n)]?.recovered_inr ?? 0,
      color: CLASS_COLOR[n],
    }))
    .filter((s) => s.value > 0);

  const funnelStages = [
    { label: o.ft.atRisk, value: m.funnel.at_risk, color: "var(--d-slate)" },
    { label: o.ft.intervened, value: m.funnel.intervened, color: CLASS_COLOR[2] },
    { label: o.ft.recovered, value: m.funnel.recovered, color: "var(--d-ok)" },
    { label: o.ft.escalated, value: m.funnel.escalated, color: "var(--d-info)" },
    { label: o.ft.stopped, value: m.funnel.cancelled, color: "var(--d-muted)" },
    { label: o.ft.lost, value: m.funnel.failed, color: "var(--d-bad)" },
  ];

  const channelRows = Object.entries(m.channel_breakdown).map(([ch, s]) => ({
    label: humanize(ch),
    value: s.dispatched,
    display: `${s.recovered}/${s.dispatched}`,
    sub: `${pct(s.dispatched ? s.recovered / s.dispatched : 0)}`,
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
          label={o.kRecovered}
          value={inr(m.recovered_inr, { compact: true })}
          accent="var(--d-ok)"
          emphasis
          spark={sparkValues}
          sub={o.kRecoveredSub(inr(m.at_risk_inr, { compact: true }), m.counts.recovered)}
        />
        <KpiCard
          label={o.kAtRisk}
          value={inr(m.at_risk_inr, { compact: true })}
          sub={o.kAtRiskSub(m.funnel.at_risk)}
        />
        <KpiCard
          label={o.kInFlight}
          value={inr(m.in_flight_inr, { compact: true })}
          accent="var(--d-warn)"
          sub={o.kInFlightSub}
        />
        <KpiCard
          label={o.kLost}
          value={inr(m.lost_inr, { compact: true })}
          accent="var(--d-bad)"
          sub={o.kLostSub(m.counts.failed)}
        />
      </div>

      {/* Gauge + Funnel */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center py-5">
          <CardHeader title={o.gaugeTitle} subtitle={o.gaugeSub} />
          <Gauge value={m.grrr} color="var(--d-ok)" />
          <p className="mt-1 text-[12px]" style={{ color: "var(--d-muted)" }}>
            {o.avgTtr}{" "}
            <span className="d-num" style={{ color: "var(--d-ink)" }}>
              {durTime(m.avg_time_to_recovery_seconds, d)}
            </span>
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title={o.funnelTitle}
            subtitle={o.funnelSub}
            right={
              <Chip tone={{ fg: "var(--d-ok)", soft: "var(--d-ok-soft)" }}>
                {o.recoveredChip(pct(m.funnel.at_risk ? m.funnel.recovered / m.funnel.at_risk : 0))}
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
          title={o.timeTitle}
          subtitle={o.timeSub}
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
          <CardHeader title={o.byClassTitle} subtitle={o.byClassSub} />
          <div className="flex items-center gap-5 px-5 pb-5">
            <Donut
              segments={classSegments}
              centerValue={inr(m.recovered_inr, { compact: true })}
              centerLabel={o.won}
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
                      <span style={{ color: "var(--d-muted)" }}>{d.classShort[n]}</span>
                    </span>
                    <span className="d-num">{pct(c.recovery_rate)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title={o.channelsTitle} subtitle={o.channelsSub} />
          <div className="px-5 pb-5">
            {channelRows.length ? (
              <HBarList rows={channelRows} />
            ) : (
              <p className="text-[12px]" style={{ color: "var(--d-faint)" }}>
                {o.noDispatch}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title={o.complianceTitle}
            subtitle={o.complianceSub}
            right={
              <Chip tone={{ fg: "var(--d-slate)", soft: "var(--d-slate-soft)" }}>
                {o.escalatedChip(m.counts.escalations)}
              </Chip>
            }
          />
          <div className="px-5 pb-5">
            {ruleRows.length ? (
              <HBarList rows={ruleRows} />
            ) : (
              <p className="text-[12px]" style={{ color: "var(--d-faint)" }}>
                {o.noRules}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
