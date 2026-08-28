"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LogLevel, LogLine } from "@/lib/telemetry";
import type { StreamPhase } from "@/hooks/useRecoveryStream";

const LEVEL_COLOR: Record<LogLevel, string> = {
  faint: "text-faint",
  cyan: "text-cyan",
  blue: "text-blue",
  fail: "text-fail",
  wait: "text-wait",
  violet: "text-violet",
};

/**
 * Renders the live audit-trail lines streamed from the backend. Purely
 * presentational: lines grow as SSE events arrive, so the reveal cadence is the
 * engine's real pace rather than a scripted timer.
 */
export default function AuditTerminal({
  lines,
  phase,
  awaitingLabel,
}: {
  lines: LogLine[];
  phase: StreamPhase;
  awaitingLabel: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest line in view as they stream in.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [lines.length]);

  return (
    <div className="flex h-full flex-col bg-ink">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-fail/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-wait/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-blue/70" />
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto p-5 font-mono text-xs leading-relaxed"
      >
        <div className="text-faint">
          {"// audit-trail — streaming intervention telemetry"}
        </div>

        <AnimatePresence initial={false}>
          {lines.map((line, i) => (
            <motion.div
              key={`${i}-${line.time}-${line.key}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="break-words"
            >
              <span className="text-faint">[{line.time}]</span>{" "}
              <span className={LEVEL_COLOR[line.level]}>{line.key}</span>{" "}
              <span className="text-fg/70">{line.json}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {phase === "complete" ? (
          <div className="text-blue">
            {"› session complete "}
            <span className="blink">▍</span>
          </div>
        ) : phase === "error" ? (
          <div className="text-fail">{"› stream disconnected"}</div>
        ) : (
          <div className="text-faint">
            {awaitingLabel} <span className="blink text-blue">▍</span>
          </div>
        )}
      </div>
    </div>
  );
}
