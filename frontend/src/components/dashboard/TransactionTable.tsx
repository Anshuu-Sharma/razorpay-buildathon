"use client";

import type { TransactionRow } from "@/lib/dashboard/types";
import { duration, humanize, inr, relativeTime } from "@/lib/dashboard/format";
import {
  CLASS_COLOR,
  CLASS_SHORT,
  aiTagTone,
  statusTone,
} from "@/lib/dashboard/status";

function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: tone.soft, color: tone.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.fg }} />
      {tone.label}
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
  if (!rows.length) {
    return (
      <div className="px-4 py-16 text-center text-[13px]" style={{ color: "var(--d-faint)" }}>
        No transactions match these filters.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr style={{ color: "var(--d-muted)", borderBottom: "1px solid var(--d-border)" }}>
            <th className={TH}>Customer</th>
            {showClass ? <th className={TH}>Class</th> : null}
            <th className={TH}>AI Tag</th>
            <th className={`${TH} text-right`}>Amount</th>
            <th className={TH}>Status</th>
            <th className={TH}>Playbook</th>
            <th className={TH}>Channel</th>
            <th className={`${TH} text-right`}>TTR</th>
            <th className={`${TH} text-right`}>When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ai = aiTagTone(r.ai_tag);
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
                        {CLASS_SHORT[r.failure_class]}
                      </span>
                    </span>
                  </td>
                ) : null}
                <td className={TD}>
                  <span
                    className="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                    style={{ background: ai.soft, color: ai.fg }}
                  >
                    {ai.label}
                  </span>
                </td>
                <td className={`${TD} d-num text-right font-medium`}>{inr(r.amount_inr)}</td>
                <td className={TD}>
                  <StatusBadge status={r.status} />
                </td>
                <td className={`${TD} text-[12px]`} style={{ color: "var(--d-muted)" }}>
                  {humanize(r.playbook)}
                </td>
                <td className={`${TD} text-[12px]`} style={{ color: "var(--d-muted)" }}>
                  {r.channel ? humanize(r.channel) : "—"}
                </td>
                <td className={`${TD} d-num text-right text-[12px]`} style={{ color: "var(--d-muted)" }}>
                  {duration(r.time_to_recovery_seconds)}
                </td>
                <td className={`${TD} text-right text-[12px]`} style={{ color: "var(--d-faint)" }}>
                  {relativeTime(r.created_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
