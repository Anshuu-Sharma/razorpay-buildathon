"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getFailureClass } from "@/lib/failure-classes";
import { useRecoveryStream } from "@/hooks/useRecoveryStream";
import AuditTerminal from "@/components/mission/AuditTerminal";
import StatusChip from "@/components/mission/StatusChip";

// WebGL only exists in the browser — never server-render the canvas.
const RecoveryGraph = dynamic(
  () => import("@/components/mission/RecoveryGraph"),
  { ssr: false }
);

const ACCENT_HEX: Record<string, string> = {
  cyan: "#00e5ff",
  blue: "#025ee8",
  wait: "#f5a623",
  violet: "#8e2de2",
};

function LiveSession({ classId }: { classId: number }) {
  const { t, locale } = useLocale();
  const fc = getFailureClass(classId);
  const copy = fc.copy[locale];
  const accent = ACCENT_HEX[fc.accent] ?? "#025ee8";
  const stream = useRecoveryStream(classId);

  return (
    // The Live Run tab is the one dark "theater" inside the light shell — it
    // fills the content area (the sidebar/topbar provide the chrome).
    <main className="flex h-full flex-col bg-black md:flex-row">
      {/* Left — Visualizer */}
      <section className="relative flex h-1/2 w-full flex-col border-b border-white/10 md:h-full md:w-[70%] md:border-b-0 md:border-r">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-6">
          <div className="pointer-events-auto">
            <Link href="/mission-control" className="wire-label transition-colors hover:text-fg">
              ← Overview
            </Link>
            <p className="kicker mt-3 text-cyan">{t.mission.active}</p>
            <h1 className="display mt-1 text-2xl">{copy.title}</h1>
            {/* In-shell class switcher — re-runs the stream for the chosen class */}
            <div className="mt-3 flex gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <Link
                  key={n}
                  href={`/mission-control/live?class=${n}`}
                  className="rounded-md border px-2.5 py-1 font-mono text-[11px] transition-colors"
                  style={
                    n === classId
                      ? { borderColor: accent, color: accent, background: `${accent}1a` }
                      : { borderColor: "rgba(255,255,255,0.15)", color: "var(--color-muted)" }
                  }
                >
                  C{n}
                </Link>
              ))}
            </div>
          </div>
          <div className="pointer-events-auto">
            <StatusChip status={stream.status} />
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(2,94,232,0.1) 0%, #000 70%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-1/2">
            <div className="revenue-surface absolute inset-0" />
          </div>

          {stream.phase === "error" ? (
            <div className="relative z-10 max-w-sm rounded-xl border border-fail/30 bg-fail/5 px-8 py-7 text-center">
              <p className="kicker text-fail">{t.mission.streamError}</p>
              <p className="mt-3 font-mono text-xs leading-relaxed text-muted">
                {t.mission.streamErrorNote}
              </p>
            </div>
          ) : stream.phase === "connecting" ? (
            <p className="relative z-10 font-mono text-xs text-muted">
              {t.mission.connecting}{" "}
              <span className="blink text-blue">▍</span>
            </p>
          ) : (
            <div className="absolute inset-0 z-10">
              <RecoveryGraph
                reachedNodes={stream.reachedNodes}
                activeNode={stream.activeNode}
                accent={accent}
              />
            </div>
          )}

          {/* Recovered-money overlay — the headline metric */}
          {stream.metrics ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-6 left-6 z-20 flex gap-6 rounded-xl border border-white/10 bg-black/50 px-6 py-4 backdrop-blur"
            >
              <div>
                <p className="wire-label">{t.mission.recovered}</p>
                <p className="display mt-1 text-2xl text-fg">
                  ₹{Math.round(stream.metrics.recovered_inr).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="border-l border-white/10 pl-6">
                <p className="wire-label">{t.mission.recoveryRate}</p>
                <p className="display mt-1 text-2xl" style={{ color: accent }}>
                  {Math.round(stream.metrics.grrr * 100)}%
                </p>
              </div>
            </motion.div>
          ) : null}
        </div>
      </section>

      {/* Right — Audit Trail Terminal */}
      <section className="flex h-1/2 w-full flex-col md:h-full md:w-[30%]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3">
          <h2 className="wire-label">{t.mission.terminal}</h2>
          <span className="flex items-center gap-1.5 rounded bg-blue/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan" />
            {t.mission.live}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <AuditTerminal
            lines={stream.lines}
            phase={stream.phase}
            awaitingLabel={t.mission.awaiting}
          />
        </div>
      </section>
    </main>
  );
}

function LiveContent() {
  const params = useSearchParams();
  const classId = Number(params.get("class") ?? "1");
  // Remount per class so the stream resets cleanly (no setState-in-effect).
  return <LiveSession key={classId} classId={classId} />;
}

export default function LiveRunPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-black font-mono text-sm text-muted">
          Loading simulator…
        </div>
      }
    >
      <LiveContent />
    </Suspense>
  );
}
