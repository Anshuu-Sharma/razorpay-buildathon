"use client";

import TransactionExplorer from "@/components/dashboard/TransactionExplorer";
import SimulateButton from "@/components/dashboard/SimulateButton";
import { useDash } from "@/lib/dashboard/i18n";

export default function TransactionsPage() {
  const { d } = useDash();
  return (
    <div className="mx-auto max-w-[1220px] space-y-4 p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{d.txns.title}</h1>
          <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--d-muted)" }}>
            {d.txns.desc}
          </p>
        </div>
        <div className="ml-auto">
          <SimulateButton />
        </div>
      </div>
      <TransactionExplorer />
    </div>
  );
}
