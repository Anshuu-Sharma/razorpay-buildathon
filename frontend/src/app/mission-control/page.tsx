"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getFailureClass } from "@/lib/failure-classes";
import type { SimStatus } from "@/lib/telemetry";
import AuditTerminal from "@/components/mission/AuditTerminal";
import StatusChip from "@/components/mission/StatusChip";

function MissionControlContent() {
  const { t, locale } = useLocale();
  const params = useSearchParams();
  const classId = Number(params.get("class") ?? "1");
  const fc = getFailureClass(classId);
  const copy = fc.copy[locale];
  const [status, setStatus] = useState<SimStatus>("ingesting");

  return (
    <main className="flex h-screen flex-col pt-16 md:flex-row">
      {/* Left 70% — Visualizer */}
      <section className="relative flex h-1/2 w-full flex-col border-b border-white/10 md:h-full md:w-[70%] md:border-b-0 md:border-r">
        {/* header overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-6">
          <div className="pointer-events-auto">
            <Link
              href="/demo"
              className="wire-label transition-colors hover:text-fg"
            >
              ← {t.mission.back}
            </Link>
            <p className="kicker mt-3 text-cyan">{t.mission.active}</p>
            <h1 className="display mt-1 text-2xl">
              {copy.title}
            </h1>
          </div>
          <div className="pointer-events-auto">
            <StatusChip status={status} />
          </div>
        </div>

        {/* visualizer canvas mount point (R3F / React Flow in Phase 4) */}
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
          <div
            id="visualizer-mount"
            className="relative z-10 flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/15 px-10 py-8"
          >
            <span className="h-3 w-3 rounded-full bg-blue shadow-[0_0_20px_6px_var(--rzp-blue-glow)]" />
            <p className="wire-label">{t.mission.visualizer}</p>
            <p className="font-mono text-[10px] text-faint">
              {t.mission.visualizerNote}
            </p>
          </div>
        </div>
      </section>

      {/* Right 30% — Audit Trail Terminal */}
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
            key={classId}
            classId={classId}
            awaitingLabel={t.mission.awaiting}
            onStatus={setStatus}
          />
        </div>
      </section>
    </main>
  );
}

export default function MissionControl() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center font-mono text-sm text-muted">
          Loading simulator…
        </div>
      }
    >
      <MissionControlContent />
    </Suspense>
  );
}
