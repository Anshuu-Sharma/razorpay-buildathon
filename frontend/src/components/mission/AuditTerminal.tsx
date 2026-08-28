"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getScenario, type LogLevel, type SimStatus } from "@/lib/telemetry";

const LEVEL_COLOR: Record<LogLevel, string> = {
  faint: "text-faint",
  cyan: "text-cyan",
  blue: "text-blue",
  fail: "text-fail",
  wait: "text-wait",
  violet: "text-violet",
};

/**
 * Streams the sample telemetry for the active class, one line at a time, and
 * lifts the derived simulation status up to the parent via `onStatus`.
 */
export default function AuditTerminal({
  classId,
  awaitingLabel,
  onStatus,
}: {
  classId: number;
  awaitingLabel: string;
  onStatus?: (status: SimStatus) => void;
}) {
  const scenario = getScenario(classId);
  const [count, setCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Replay the stream on mount. The parent remounts this via `key={classId}`,
  // so state starts fresh per class without a setState-in-effect reset.
  useEffect(() => {
    const total = scenario.lines.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i <= total; i++) {
      timers.push(setTimeout(() => setCount(i), 700 + i * 900));
    }
    return () => timers.forEach(clearTimeout);
  }, [scenario.lines.length]);

  // Report status as lines reveal (status timeline is coarser than lines).
  useEffect(() => {
    if (!onStatus) return;
    const steps = scenario.status;
    const idx = Math.min(
      steps.length - 1,
      Math.floor((count / scenario.lines.length) * steps.length)
    );
    if (count > 0) onStatus(steps[idx]);
  }, [count, onStatus, scenario.lines.length, scenario.status]);

  // Keep the newest line in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [count]);

  const visible = scenario.lines.slice(0, count);
  const done = count >= scenario.lines.length;

  return (
    <div className="flex h-full flex-col bg-ink">
      {/* terminal chrome */}
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
          {visible.map((line, i) => (
            <motion.div
              key={`${classId}-${i}`}
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

        {!done ? (
          <div className="text-faint">
            {awaitingLabel} <span className="blink text-blue">▍</span>
          </div>
        ) : (
          <div className="text-blue">
            {"› session complete "}
            <span className="blink">▍</span>
          </div>
        )}
      </div>
    </div>
  );
}
