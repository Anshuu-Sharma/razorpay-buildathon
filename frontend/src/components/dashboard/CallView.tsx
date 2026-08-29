"use client";

import type { CallData } from "@/lib/dashboard/types";

/**
 * Minimal in-phone call screen for F2 — shows the seeded transcript, if any.
 * F3 upgrades this into a live, animated AI-voice-agent call interface.
 */
export default function CallView({
  call,
  customerName,
}: {
  call: CallData | null;
  customerName: string;
}) {
  const initial = (customerName || "?").charAt(0).toUpperCase();
  return (
    <div className="flex h-full flex-col items-center" style={{ background: "#0b141a", color: "#e9edef" }}>
      <div className="flex flex-col items-center" style={{ paddingTop: "16%" }}>
        <span
          className="grid place-items-center rounded-full"
          style={{ width: 56, height: 56, background: "#25d366", fontSize: 22, fontWeight: 700, color: "#0b141a" }}
        >
          {initial}
        </span>
        <div className="mt-2 text-center">
          <div style={{ fontSize: 14, fontWeight: 600 }}>{customerName}</div>
          <div style={{ fontSize: 10, opacity: 0.7 }}>
            {call ? `${call.status.toLowerCase()} · ${call.duration_sec}s` : "no calls yet"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto px-3 pb-3" style={{ width: "100%" }}>
        {call ? (
          call.turns.map((t, i) => (
            <div
              key={i}
              className={`flex ${t.speaker === "AGENT" ? "justify-start" : "justify-end"}`}
            >
              <div
                className="rounded-lg px-2 py-1"
                style={{
                  maxWidth: "82%",
                  fontSize: 10.5,
                  background: t.speaker === "AGENT" ? "rgba(37,211,102,0.15)" : "rgba(255,255,255,0.08)",
                }}
              >
                <span style={{ opacity: 0.6, fontSize: 8.5 }}>
                  {t.speaker === "AGENT" ? "REX" : customerName.split(" ")[0]}
                </span>
                <div>{t.text}</div>
              </div>
            </div>
          ))
        ) : (
          <p className="mt-8 text-center" style={{ fontSize: 11, opacity: 0.6 }}>
            No call history. Start an AI voice call from the panel.
          </p>
        )}
      </div>
    </div>
  );
}
