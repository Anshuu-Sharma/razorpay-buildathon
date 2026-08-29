"use client";

import { useCallback } from "react";
import { Card, CardHeader } from "@/components/dashboard/Card";
import { ErrorState, Loading } from "@/components/dashboard/PageState";
import { useApi } from "@/hooks/useApi";
import { fetchPolicy } from "@/lib/dashboard/api";
import { humanize, inr } from "@/lib/dashboard/format";
import { useDash } from "@/lib/dashboard/i18n";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";

function Pill({ children, money }: { children: React.ReactNode; money?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-medium"
      style={{
        background: money ? "var(--d-warn-soft)" : "var(--d-surface-2)",
        color: money ? "var(--d-warn)" : "var(--d-ink)",
      }}
    >
      {children}
    </span>
  );
}

export default function PolicyPage() {
  const { bump } = useDashboardRefresh();
  const { d } = useDash();
  const pp = d.policy;
  const load = useCallback((signal: AbortSignal) => fetchPolicy(signal), []);
  const { data, error, loading } = useApi(load, [bump]);

  if (loading) return <Loading label={d.state.policy} />;
  if (error || !data) return <ErrorState message={error ?? "no data"} />;

  const { policy, money_moving_actions } = data;

  return (
    <div className="mx-auto max-w-[1000px] space-y-5 p-5 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{pp.title}</h1>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--d-muted)" }}>
          {pp.desc}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="d-label">{pp.ceiling}</p>
          <p className="d-num mt-1 text-2xl font-semibold">
            {inr(policy.max_intervention_amount_minor / 100)}
          </p>
          <p className="mt-1.5 text-[12px]" style={{ color: "var(--d-muted)" }}>
            {pp.ceilingSub}
          </p>
        </Card>
        <Card className="p-5">
          <p className="d-label">{pp.discount}</p>
          <p className="d-num mt-1 text-2xl font-semibold">{policy.max_discount_pct}%</p>
          <p className="mt-1.5 text-[12px]" style={{ color: "var(--d-muted)" }}>
            {pp.discountSub}
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader title={pp.actionsTitle} subtitle={pp.actionsSub} />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {policy.allowed_actions.map((a) => (
            <Pill key={a} money={money_moving_actions.includes(a)}>
              {money_moving_actions.includes(a) ? "₹ " : ""}
              {humanize(a)}
            </Pill>
          ))}
        </div>
        <p className="px-5 pb-4 text-[11.5px]" style={{ color: "var(--d-faint)" }}>
          {pp.actionsNote}
        </p>
      </Card>

      <Card>
        <CardHeader title={pp.channelsTitle} subtitle={pp.channelsSub} />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {policy.allowed_channels.map((c) => (
            <Pill key={c}>{humanize(c)}</Pill>
          ))}
        </div>
      </Card>
    </div>
  );
}
