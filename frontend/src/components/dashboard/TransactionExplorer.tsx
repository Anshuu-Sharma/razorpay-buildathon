"use client";

import { useCallback, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { fetchTransactions } from "@/lib/dashboard/api";
import { useDash } from "@/lib/dashboard/i18n";
import { useDashboardRefresh } from "@/lib/dashboard/refresh";
import { useExplorerFilter } from "@/lib/dashboard/explorerFilter";
import type { LifecycleStatus, TransactionRow } from "@/lib/dashboard/types";
import { CLASS_COLOR } from "@/lib/dashboard/status";
import { Card } from "./Card";
import { ErrorState, Loading } from "./PageState";
import TransactionTable, { type OpenConversation } from "./TransactionTable";
import TransactionDrawer from "./TransactionDrawer";
import { ConversationPanelHost } from "./ConversationPanel";

const STATUSES: LifecycleStatus[] = [
  "PENDING",
  "DIAGNOSING",
  "INTERVENING",
  "WAITING",
  "RECOVERED",
  "ESCALATED",
  "CANCELLED",
  "FAILED",
];

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none"
      style={{
        borderColor: "var(--d-border)",
        background: "var(--d-surface)",
        color: "var(--d-ink)",
      }}
    >
      {children}
    </select>
  );
}

export default function TransactionExplorer({ fixedClass }: { fixedClass?: number }) {
  const { bump } = useDashboardRefresh();
  const { d } = useDash();
  const TYPES: { value: string; label: string }[] = [
    { value: "", label: d.txns.allTypes },
    { value: "RECOVERY_CASE", label: d.txns.tRecovery },
    { value: "HEALTHY", label: d.txns.tHealthy },
    { value: "NON_RECOVERABLE", label: d.txns.tNonRec },
  ];
  const load = useCallback(
    (signal: AbortSignal) => fetchTransactions({ limit: 500 }, signal),
    []
  );
  const { data, error, loading } = useApi(load, [bump]);

  const [type, setType] = useState("");
  // Shared so REX can read the current view and set the status filter itself.
  const { status, setStatus, query: q, setQuery: setQ } = useExplorerFilter();
  const [selected, setSelected] = useState<string | null>(null);
  const [convo, setConvo] = useState<
    { txnId: string; name: string; channel: "whatsapp" | "call" } | null
  >(null);

  const openConversation: OpenConversation = (txnId, channel, name) =>
    setConvo({ txnId, name, channel });

  const rows: TransactionRow[] = useMemo(() => {
    let items = data?.items ?? [];
    if (fixedClass) items = items.filter((r) => r.failure_class === fixedClass);
    if (type) items = items.filter((r) => r.ai_tag === type);
    if (status) items = items.filter((r) => r.status === status);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      items = items.filter(
        (r) =>
          r.transaction_id.toLowerCase().includes(needle) ||
          (r.customer_name ?? "").toLowerCase().includes(needle)
      );
    }
    return items;
  }, [data, fixedClass, type, status, q]);

  if (loading) return <Loading label="Loading transactions…" />;
  if (error || !data) return <ErrorState message={error ?? "no data"} />;

  return (
    <>
      <Card>
        {/* Filter bar */}
        <div
          className="flex flex-wrap items-center gap-2.5 px-4 py-3"
          style={{ borderBottom: "1px solid var(--d-border)" }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={d.txns.searchPh}
            className="w-52 rounded-lg border px-3 py-1.5 text-[12.5px] outline-none"
            style={{
              borderColor: "var(--d-border)",
              background: "var(--d-surface)",
              color: "var(--d-ink)",
            }}
          />
          {!fixedClass ? (
            <Select value={type} onChange={setType}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          ) : null}
          <Select value={status} onChange={setStatus}>
            <option value="">{d.txns.allStatuses}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {d.status[s]}
              </option>
            ))}
          </Select>
          <span className="ml-auto d-num text-[12px]" style={{ color: "var(--d-faint)" }}>
            {rows.length} {d.txns.of} {fixedClass ? rows.length : data.total}
          </span>
        </div>

        <TransactionTable
          rows={rows}
          onSelect={setSelected}
          showClass={!fixedClass}
          onOpenConversation={fixedClass ? openConversation : undefined}
        />
      </Card>

      <TransactionDrawer id={selected} onClose={() => setSelected(null)} />

      <ConversationPanelHost
        open={convo !== null}
        txnId={convo?.txnId ?? ""}
        customerName={convo?.name ?? ""}
        channel={convo?.channel ?? "whatsapp"}
        accent={fixedClass ? CLASS_COLOR[fixedClass] : "var(--d-accent)"}
        onClose={() => setConvo(null)}
      />
    </>
  );
}
