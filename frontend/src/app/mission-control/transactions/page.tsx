"use client";

import TransactionExplorer from "@/components/dashboard/TransactionExplorer";

export default function TransactionsPage() {
  return (
    <div className="mx-auto max-w-[1220px] space-y-4 p-5 md:p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Transactions</h1>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--d-muted)" }}>
          Every payment REX has seen — healthy volume, flagged failures, and their recovery outcome.
          Click a row for its full audit trail.
        </p>
      </div>
      <TransactionExplorer />
    </div>
  );
}
