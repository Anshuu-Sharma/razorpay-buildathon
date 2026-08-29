"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApi } from "@/hooks/useApi";
import { fetchTransaction } from "@/lib/dashboard/api";
import { duration, humanize, inr, pct } from "@/lib/dashboard/format";
import { CLASS_COLOR, CLASS_LABEL, aiTagTone, statusTone } from "@/lib/dashboard/status";
import type { AuditEntry } from "@/lib/dashboard/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="d-label">{label}</p>
      <p className="mt-0.5 text-[13px] font-medium" style={{ color: "var(--d-ink)" }}>
        {value}
      </p>
    </div>
  );
}

function PayloadLine({ entry }: { entry: AuditEntry }) {
  const p = entry.payload ?? {};
  const keys = Object.keys(p);
  if (!keys.length) return null;
  return (
    <div className="mt-1.5 rounded-md p-2 text-[11.5px]" style={{ background: "var(--d-surface-2)" }}>
      {keys.map((k) => (
        <div key={k} className="flex gap-2">
          <span className="d-num shrink-0" style={{ color: "var(--d-faint)" }}>
            {k}
          </span>
          <span className="break-all" style={{ color: "var(--d-muted)" }}>
            {String((p as Record<string, unknown>)[k])}
          </span>
        </div>
      ))}
    </div>
  );
}

function Body({ id }: { id: string }) {
  const load = useCallback((signal: AbortSignal) => fetchTransaction(id, signal), [id]);
  const { data: t, error, loading } = useApi(load, [id]);

  if (loading)
    return (
      <div className="flex h-40 items-center justify-center text-[13px]" style={{ color: "var(--d-muted)" }}>
        Loading…
      </div>
    );
  if (error || !t)
    return (
      <div className="p-6 text-[13px]" style={{ color: "var(--d-bad)" }}>
        {error ?? "Not found"}
      </div>
    );

  const status = statusTone(t.status);
  const ai = aiTagTone(t.ai_tag);

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{ background: CLASS_COLOR[t.failure_class] }}
          />
          <span className="text-[12px] font-medium" style={{ color: "var(--d-muted)" }}>
            {CLASS_LABEL[t.failure_class]}
          </span>
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ background: status.soft, color: status.fg }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.fg }} />
            {status.label}
          </span>
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">{t.customer_name}</h2>
        <p className="d-num text-[11.5px]" style={{ color: "var(--d-faint)" }}>
          {t.transaction_id} · {t.customer_contact_masked}
        </p>
      </div>

      {/* Facts grid */}
      <div className="grid grid-cols-2 gap-4 rounded-xl p-4" style={{ background: "var(--d-surface-2)" }}>
        <Field label="Amount" value={<span className="d-num">{inr(t.amount_inr)}</span>} />
        <Field
          label="AI Tag"
          value={
            <span
              className="inline-flex rounded px-1.5 py-0.5 text-[11px]"
              style={{ background: ai.soft, color: ai.fg }}
            >
              {ai.label}
            </span>
          }
        />
        <Field label="Playbook" value={humanize(t.playbook)} />
        <Field label="Channel" value={t.channel ? humanize(t.channel) : "—"} />
        <Field
          label="Confidence"
          value={<span className="d-num">{t.confidence != null ? pct(t.confidence) : "—"}</span>}
        />
        <Field label="Time to recovery" value={<span className="d-num">{duration(t.time_to_recovery_seconds)}</span>} />
        {t.stopping_rule ? <Field label="Stopping rule" value={humanize(t.stopping_rule)} /> : null}
        {t.error_code ? <Field label="Error code" value={<span className="d-num">{t.error_code}</span>} /> : null}
      </div>

      {/* Diagnosis */}
      {t.diagnosis?.root_cause ? (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--d-border)" }}>
          <p className="d-label" style={{ color: "var(--d-accent)" }}>
            Gemini diagnosis
          </p>
          <p className="mt-1.5 text-[13px]">
            <span style={{ color: "var(--d-muted)" }}>Root cause:</span>{" "}
            <span className="d-num font-medium">{t.diagnosis.root_cause}</span>
          </p>
          <p className="mt-1 text-[13px]">
            <span style={{ color: "var(--d-muted)" }}>Recommended:</span>{" "}
            <span className="font-medium">{humanize(t.diagnosis.recommended_playbook)}</span>
            {t.diagnosis.confidence != null ? (
              <span className="d-num" style={{ color: "var(--d-faint)" }}>
                {" "}
                · {pct(t.diagnosis.confidence)}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      {/* Audit timeline */}
      <div>
        <p className="d-label mb-2">Audit timeline · {t.audit_trail.length} entries</p>
        <ol className="space-y-3">
          {t.audit_trail.map((e, i) => (
            <li key={e.id} className="relative pl-5">
              <span
                className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full"
                style={{
                  background: e.outcome === "SUCCESS" ? "var(--d-ok)" : "var(--d-slate)",
                }}
              />
              {i < t.audit_trail.length - 1 ? (
                <span
                  className="absolute left-[4.5px] top-3.5 h-[calc(100%+4px)] w-px"
                  style={{ background: "var(--d-border)" }}
                />
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold">{humanize(e.node_name)}</span>
                <span className="d-num text-[10.5px]" style={{ color: "var(--d-faint)" }}>
                  {new Date(e.timestamp).toLocaleTimeString("en-IN")}
                </span>
              </div>
              <span className="text-[11.5px]" style={{ color: "var(--d-muted)" }}>
                {humanize(e.action_type)} · {e.outcome.toLowerCase()}
              </span>
              <PayloadLine entry={e} />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function TransactionDrawer({
  id,
  onClose,
}: {
  id: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      {id ? (
        <motion.div
          className="fixed inset-0 z-[300] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(28,25,23,0.35)" }}
            onClick={onClose}
          />
          <motion.aside
            key={id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative h-full w-full max-w-md overflow-y-auto"
            style={{ background: "var(--d-surface)", borderLeft: "1px solid var(--d-border)" }}
          >
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid var(--d-border)", background: "var(--d-surface)" }}
            >
              <span className="d-label">Transaction detail</span>
              <button
                onClick={onClose}
                className="grid h-7 w-7 place-items-center rounded-md text-[15px] transition-colors hover:bg-[var(--d-surface-2)]"
                style={{ color: "var(--d-muted)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <Body id={id} />
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
