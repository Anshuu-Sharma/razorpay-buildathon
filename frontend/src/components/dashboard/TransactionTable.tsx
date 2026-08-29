"use client";

import type { TransactionRow, LifecycleStatus } from "@/lib/dashboard/types";
import { humanize, inr } from "@/lib/dashboard/format";
import { useDash, relTime, durTime } from "@/lib/dashboard/i18n";
import { CLASS_COLOR, aiTagTone, statusTone } from "@/lib/dashboard/status";
import type { DashStrings } from "@/lib/dashboard/i18n";

function StatusBadge({ status, d }: { status: string; d: DashStrings }) {
  const tone = statusTone(status);
  const label = d.status[status as LifecycleStatus] ?? status;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: tone.soft, color: tone.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.fg }} />
      {label}
    </span>
  );
}

const TH = "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide";
const TD = "px-3 py-2.5 align-middle";

export default function TransactionTable({
  rows,
  onSelect,
  showClass = true,
}: {
  rows: TransactionRow[];
  onSelect: (id: string) => void;
  showClass?: boolean;
}) {
  const { d } = useDash();
  const col = d.txns.col;

  if (!rows.length) {
    return (
      <div className="px-4 py-16 text-center text-[13px]" style={{ color: "var(--d-faint)" }}>
        {d.txns.noMatch}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr style={{ color: "var(--d-muted)", borderBottom: "1px solid var(--d-border)" }}>
            <th className={TH}>{col.customer}</th>
            {showClass ? <th className={TH}>{col.class}</th> : null}
            <th className={TH}>{col.aiTag}</th>
            <th className={`${TH} text-right`}>{col.amount}</th>
            <th className={TH}>{col.status}</th>
            <th className={TH}>{col.playbook}</th>
            <th className={TH}>{col.channel}</th>
            <th className={`${TH} text-right`}>{col.ttr}</th>
            <th className={`${TH} text-right`}>{col.when}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ai = aiTagTone(r.ai_tag);
            const aiLabel = r.ai_tag && r.ai_tag in d.aitag
              ? d.aitag[r.ai_tag as keyof typeof d.aitag]
              : ai.label;
            return (
              <tr
                key={r.transaction_id}
                onClick={() => onSelect(r.transaction_id)}
                className="cursor-pointer transition-colors hover:bg-[var(--d-surface-2)]"
                style={{ borderBottom: "1px solid var(--d-border)" }}
              >
                <td className={TD}>
                  <div className="font-medium" style={{ color: "var(--d-ink)" }}>
                    {r.customer_name ?? "—"}
                  </div>
                  <div className="d-num text-[11px]" style={{ color: "var(--d-faint)" }}>
                    {r.customer_contact_masked}
                  </div>
                </td>
                {showClass ? (
                  <td className={TD}>
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: CLASS_COLOR[r.failure_class] }}
                      />
                      <span className="text-[12px]" style={{ color: "var(--d-muted)" }}>
                        {d.classShort[r.failure_class]}
                      </span>
                    </span>
                  </td>
                ) : null}
                <td className={TD}>
                  <span
                    className="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                    style={{ background: ai.soft, color: ai.fg }}
                  >
                    {aiLabel}
                  </span>
                </td>
                <td className={`${TD} d-num text-right font-medium`}>{inr(r.amount_inr)}</td>
                <td className={TD}>
                  <StatusBadge status={r.status} d={d} />
                </td>
                <td className={`${TD} text-[12px]`} style={{ color: "var(--d-muted)" }}>
                  {humanize(r.playbook)}
                </td>
                <td className={`${TD} text-[12px]`} style={{ color: "var(--d-muted)" }}>
                  {r.channel ? humanize(r.channel) : "—"}
                </td>
                <td className={`${TD} d-num text-right text-[12px]`} style={{ color: "var(--d-muted)" }}>
                  {durTime(r.time_to_recovery_seconds, d)}
                </td>
                <td className={`${TD} text-right text-[12px]`} style={{ color: "var(--d-faint)" }}>
                  {relTime(r.created_at, d)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
