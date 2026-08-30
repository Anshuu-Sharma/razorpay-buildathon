"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchCalls, startCall } from "@/lib/dashboard/api";
import { useDash, relTime } from "@/lib/dashboard/i18n";
import { useApi } from "@/hooks/useApi";
import type { CallData } from "@/lib/dashboard/types";

type Phase = "idle" | "ringing" | "connected" | "ended";
type Tab = "call" | "log";

const SPEED = 0.8; // playback compression for a snappier demo

function mmss(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 18 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          style={{ width: 3, background: color, borderRadius: 2 }}
          animate={active ? { height: [4, 16, 6, 14, 5][i] } : { height: 4 }}
          transition={active ? { duration: 0.5, repeat: Infinity, repeatType: "reverse", delay: i * 0.08 } : {}}
        />
      ))}
    </div>
  );
}

export default function CallView({
  txnId,
  customerName,
}: {
  txnId: string;
  customerName: string;
}) {
  const { d } = useDash();
  const c = d.convo;
  const [tab, setTab] = useState<Tab>("call");
  const [phase, setPhase] = useState<Phase>("idle");
  const [call, setCall] = useState<CallData | null>(null);
  const [visible, setVisible] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [nonce, setNonce] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadCalls = useCallback((s: AbortSignal) => fetchCalls(txnId, s), [txnId]);
  const { data: log } = useApi(loadCalls, [txnId, nonce]);

  const initial = (customerName || "?").charAt(0).toUpperCase();
  const first = (customerName || "").split(" ")[0];

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const begin = async () => {
    clearTimers();
    setVisible(0);
    setElapsed(0);
    setPhase("ringing");
    setTab("call");
    let data: CallData | null = null;
    try {
      data = await startCall(txnId);
    } catch {
      /* ignore — nothing to play */
    }
    if (!data) {
      setPhase("idle");
      return;
    }
    setCall(data);
    setNonce((n) => n + 1); // refresh the log
    timers.current.push(setTimeout(() => setPhase("connected"), 1600));
  };

  // Show a past call's transcript statically (from the log).
  const openLogged = (cd: CallData) => {
    clearTimers();
    setCall(cd);
    setVisible(cd.turns.length);
    setElapsed(cd.duration_sec);
    setPhase("ended");
    setTab("call");
  };

  useEffect(() => {
    if (phase !== "connected" || !call) return;
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    call.turns.forEach((t, i) => {
      timers.current.push(setTimeout(() => setVisible(i + 1), t.at_offset_sec * 1000 * SPEED));
    });
    const total = (call.turns[call.turns.length - 1]?.at_offset_sec ?? 0) * 1000 * SPEED + 2200;
    timers.current.push(setTimeout(() => setPhase("ended"), total));
    return () => {
      clearInterval(tick);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, call]);

  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible]);

  const shown = call ? call.turns.slice(0, visible) : [];
  const ringing = phase === "ringing";
  const connected = phase === "connected";
  const calls = log?.calls ?? [];

  return (
    <div className="flex h-full flex-col" style={{ background: "#0b141a", color: "#e9edef" }}>
      {/* Tabs */}
      <div className="flex gap-1 p-1.5" style={{ paddingTop: "20%", background: "rgba(255,255,255,0.03)" }}>
        {(["call", "log"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-md py-1 text-[10.5px] font-semibold transition-colors"
            style={
              tab === t
                ? { background: "#25d366", color: "#0b141a" }
                : { background: "transparent", color: "rgba(233,237,239,0.6)" }
            }
          >
            {t === "call" ? c.tabTranscript : `${c.tabLog}${calls.length ? ` (${calls.length})` : ""}`}
          </button>
        ))}
      </div>

      {tab === "log" ? (
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2.5">
          {calls.length ? (
            calls.map((cd) => (
              <button
                key={cd.id}
                onClick={() => openLogged(cd)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <span className="grid h-7 w-7 place-items-center rounded-full" style={{ background: "rgba(37,211,102,0.2)", fontSize: 12 }}>📞</span>
                <div className="min-w-0 flex-1">
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{c.logItem}</div>
                  <div style={{ fontSize: 9, opacity: 0.6 }}>
                    {cd.started_at ? relTime(cd.started_at, d) : cd.status.toLowerCase()} · {mmss(cd.duration_sec)}
                  </div>
                </div>
                <span style={{ fontSize: 9, opacity: 0.5 }}>›</span>
              </button>
            ))
          ) : (
            <p className="mt-8 text-center" style={{ fontSize: 11, opacity: 0.6 }}>{c.logEmpty}</p>
          )}
        </div>
      ) : (
        <>
          {/* Caller identity */}
          <div className="flex flex-col items-center" style={{ paddingTop: "6%" }}>
            <div className="relative">
              {(ringing || connected) && (
                <motion.span
                  className="absolute inset-0 rounded-full"
                  style={{ border: "2px solid #25d366" }}
                  animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                />
              )}
              <span className="grid place-items-center rounded-full" style={{ width: 58, height: 58, background: "#25d366", fontSize: 23, fontWeight: 700, color: "#0b141a" }}>
                {initial}
              </span>
            </div>
            <div className="mt-2 text-center">
              <div style={{ fontSize: 14, fontWeight: 600 }}>{customerName}</div>
              <div style={{ fontSize: 10, opacity: 0.75 }}>
                {phase === "idle" && c.aiAgent}
                {ringing && c.ringing}
                {connected && `${c.connected} · ${mmss(elapsed)}`}
                {phase === "ended" && `${c.callEnded} · ${mmss(call?.duration_sec ?? elapsed)}`}
              </div>
              {(connected || ringing) && (
                <div className="mt-1.5 flex justify-center">
                  <Waveform active={connected} color="#25d366" />
                </div>
              )}
            </div>
          </div>

          {/* Transcript */}
          <div ref={scrollRef} className="mt-2 flex-1 space-y-1.5 overflow-y-auto px-3" style={{ width: "100%" }}>
            <AnimatePresence initial={false}>
              {shown.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${t.speaker === "AGENT" ? "justify-start" : "justify-end"}`}
                >
                  <div className="rounded-lg px-2 py-1" style={{ maxWidth: "82%", fontSize: 10.5, background: t.speaker === "AGENT" ? "rgba(37,211,102,0.16)" : "rgba(255,255,255,0.08)" }}>
                    <span style={{ opacity: 0.55, fontSize: 8.5 }}>{t.speaker === "AGENT" ? "REX" : first}</span>
                    <div>{t.text}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="w-full px-4 pb-5 pt-2">
            {phase === "idle" || phase === "ended" ? (
              <button
                onClick={begin}
                className="mx-auto flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-semibold"
                style={{ background: "#25d366", color: "#0b141a" }}
              >
                📞 {phase === "ended" ? c.callReplay : c.callStart}
              </button>
            ) : (
              <button
                onClick={() => {
                  clearTimers();
                  setPhase("ended");
                }}
                className="mx-auto grid place-items-center rounded-full"
                style={{ width: 46, height: 46, background: "#e11d48", color: "#fff", fontSize: 18 }}
                aria-label={c.callEnd}
              >
                ✕
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
