"use client";

import type { SimStatus } from "@/lib/telemetry";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const COLOR: Record<SimStatus, string> = {
  ingesting: "var(--color-cyan)",
  diagnosing: "var(--color-violet)",
  intervening: "var(--color-blue)",
  waiting: "var(--color-wait)",
  recovered: "var(--color-blue)",
};

export default function StatusChip({ status }: { status: SimStatus }) {
  const { t } = useLocale();
  const color = COLOR[status];

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 backdrop-blur-md">
      <span
        className="h-2 w-2 animate-pulse rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      <span
        className="font-mono text-[11px] uppercase tracking-[0.18em]"
        style={{ color }}
      >
        {t.states[status]}
      </span>
    </div>
  );
}
