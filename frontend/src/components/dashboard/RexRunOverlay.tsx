"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDash, tVocab } from "@/lib/dashboard/i18n";
import { inr } from "@/lib/dashboard/format";
import type { FeedItem, RunPhase } from "@/hooks/useRecoveryRun";

const ICON: Record<FeedItem["kind"], string> = {
  flagged: "⚑",
  diagnosis: "🔍",
  sent: "💬",
  reply: "📥",
  system: "•",
  waiting: "⏳",
  stopped: "🛑",
  escalated: "⚠️",
  called: "📞",
  complete: "✓",
};

interface Run {
  activeId: string | null;
  name: string;
  running: boolean;
  phase: RunPhase;
  finalStatus: string | null;
  feed: FeedItem[];
  reset: () => void;
}

export default function RexRunOverlay({ run }: { run: Run }) {
  const { d } = useDash();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [run.feed.length]);

  // Auto-dismiss 4s after the run finishes, so the user needn't close it by hand.
  useEffect(() => {
    if (run.phase !== "done") return;
    const t = setTimeout(() => run.reset(), 4000);
    return () => clearTimeout(t);
  }, [run.phase, run.reset]);

  const open = run.phase !== "idle";

  const line = (it: FeedItem): { label: string; text?: string } => {
    switch (it.kind) {
      case "flagged":
        return {
          label:
            it.fc != null
              ? `${d.run.ph.flagged}: ${d.classLabel[it.fc]} · ${inr(it.amount ?? 0)}`
              : it.text ?? d.run.ph.flagged,
        };
      case "diagnosis":
        return {
          label: d.run.fDiagnosed,
          text: `${tVocab("rootCause", it.text, d)} · ${tVocab("playbook", it.extra, d)}`,
        };
      case "sent":
        return { label: d.run.fSent, text: it.text };
      case "reply":
        return { label: d.run.fReply, text: it.text };
      case "system":
        return { label: it.text ?? "" };
      case "waiting":
        return { label: `${d.run.fWaiting} ${it.extra}` };
      case "stopped":
        return { label: d.run.fStopped };
      case "escalated":
        return { label: d.run.fEscalated };
      case "called":
        return { label: d.run.fCalled };
      case "complete":
        return {
          label:
            it.extra === "RECOVERED"
              ? d.run.fRecovered
              : d.status[(it.extra as keyof typeof d.status) ?? "RECOVERED"] ?? it.extra ?? "",
        };
    }
  };

  const done = run.phase === "done";
  const accent = done
    ? run.finalStatus === "RECOVERED"
      ? "var(--d-ok)"
      : run.finalStatus === "ESCALATED"
        ? "var(--d-info)"
        : "var(--d-muted)"
    : "var(--d-accent)";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.98 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="fixed bottom-4 right-4 z-[400] w-[340px] overflow-hidden rounded-2xl"
          style={{
            background: "var(--d-surface)",
            border: "1px solid var(--d-border)",
            boxShadow: "0 20px 48px rgba(28,25,23,0.22)",
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: "1px solid var(--d-border)" }}>
            <span
              className="grid h-7 w-7 place-items-center rounded-lg text-[13px] font-bold text-white"
              style={{ background: accent }}
            >
              R
            </span>
            <div className="min-w-0 leading-tight">
              <div className="text-[13px] font-semibold tracking-tight">{d.run.overlayTitle}</div>
              <div className="truncate text-[11px]" style={{ color: "var(--d-muted)" }}>
                {run.name}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {run.running ? (
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                  style={{ color: accent }}
                />
              ) : (
                <span
                  className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                  style={{ background: `color-mix(in srgb, ${accent} 15%, transparent)`, color: accent }}
                >
                  {d.run.ph.done}
                </span>
              )}
              {done ? (
                <button
                  onClick={run.reset}
                  className="grid h-6 w-6 place-items-center rounded-md text-[13px] transition-colors hover:bg-[var(--d-surface-2)]"
                  style={{ color: "var(--d-muted)" }}
                  aria-label={d.run.dismiss}
                >
                  ✕
                </button>
              ) : null}
            </div>
          </div>

          {/* Live action feed */}
          <div ref={scrollRef} className="max-h-[280px] space-y-2 overflow-y-auto px-4 py-3">
            {run.feed.map((it) => {
              const { label, text } = line(it);
              const isFinal = it.kind === "complete";
              return (
                <motion.div
                  key={it.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2.5"
                >
                  <span className="mt-[1px] w-4 shrink-0 text-center text-[12px]">{ICON[it.kind]}</span>
                  <div className="min-w-0">
                    <div
                      className="text-[12px] font-medium"
                      style={{ color: isFinal ? accent : "var(--d-ink)" }}
                    >
                      {label}
                    </div>
                    {text ? (
                      <div className="mt-0.5 truncate text-[11px]" style={{ color: "var(--d-muted)" }}>
                        {text}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
