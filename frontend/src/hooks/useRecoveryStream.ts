"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import type { LogLevel, LogLine, SimStatus } from "@/lib/telemetry";

/**
 * Subscribes to the backend SSE recovery stream for a failure class and
 * accumulates it into terminal lines + graph state. Consumers must be mounted
 * with `key={classId}` so a class change remounts this cleanly — that keeps the
 * reset out of the effect body (the project lints setState-in-effect).
 */

export type StreamPhase = "connecting" | "streaming" | "complete" | "error";

export interface RecoveryMetrics {
  grrr: number;
  recovered_inr: number;
  at_risk_inr: number;
  counts?: Record<string, number>;
}

export interface RecoveryStreamState {
  phase: StreamPhase;
  lines: LogLine[];
  reachedNodes: string[];
  activeNode: string | null;
  lifecycle: string | null;
  status: SimStatus;
  metrics: RecoveryMetrics | null;
  finalState: string | null;
}

interface AuditEventData {
  node_name: string;
  action_type: string;
  payload: Record<string, unknown>;
  outcome: string;
  timestamp: string;
  lifecycle: string;
}

const NODE_LEVEL: Record<string, LogLevel> = {
  INGEST: "cyan",
  DIAGNOSE: "violet",
  WAIT: "wait",
  EXECUTE_INTERVENTION: "blue",
  RECONCILE: "blue",
};

const LIFECYCLE_STATUS: Record<string, SimStatus> = {
  PENDING: "ingesting",
  DIAGNOSING: "diagnosing",
  WAITING: "waiting",
  INTERVENING: "intervening",
  RECOVERED: "recovered",
  ESCALATED: "intervening",
  CANCELLED: "intervening",
  FAILED: "intervening",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "--:--:--"
    : d.toLocaleTimeString("en-GB", { hour12: false });
}

function toLine(ev: AuditEventData): LogLine {
  let level: LogLevel = NODE_LEVEL[ev.node_name] ?? "faint";
  if (ev.outcome === "FAILURE") level = "fail";
  else if (ev.outcome === "ESCALATED") level = "wait";
  return {
    time: formatTime(ev.timestamp),
    key: ev.node_name,
    json: JSON.stringify(ev.payload),
    level,
  };
}

function initialState(): RecoveryStreamState {
  return {
    phase: "connecting",
    lines: [],
    reachedNodes: [],
    activeNode: null,
    lifecycle: null,
    status: "ingesting",
    metrics: null,
    finalState: null,
  };
}

export function useRecoveryStream(classId: number): RecoveryStreamState {
  const [state, setState] = useState<RecoveryStreamState>(initialState);

  useEffect(() => {
    const source = new EventSource(
      `${API_BASE}/api/v1/stream/demo/${classId}`
    );

    source.addEventListener("start", () => {
      setState((s) => ({ ...s, phase: "streaming" }));
    });

    source.addEventListener("audit", (event) => {
      const ev = JSON.parse((event as MessageEvent).data) as AuditEventData;
      setState((s) => ({
        ...s,
        phase: "streaming",
        lines: [...s.lines, toLine(ev)],
        reachedNodes: s.reachedNodes.includes(ev.node_name)
          ? s.reachedNodes
          : [...s.reachedNodes, ev.node_name],
        activeNode: ev.node_name,
        lifecycle: ev.lifecycle,
        status: LIFECYCLE_STATUS[ev.lifecycle] ?? s.status,
      }));
    });

    source.addEventListener("complete", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as {
        final_state: string;
        metrics: RecoveryMetrics;
      };
      setState((s) => ({
        ...s,
        phase: "complete",
        activeNode: null,
        metrics: data.metrics,
        finalState: data.final_state,
        status: LIFECYCLE_STATUS[data.final_state] ?? s.status,
      }));
      source.close();
    });

    source.onerror = () => {
      // The server closes the stream after `complete`; only treat a genuine
      // connection failure (before completion) as an error.
      setState((s) => (s.phase === "complete" ? s : { ...s, phase: "error" }));
      source.close();
    };

    return () => source.close();
  }, [classId]);

  return state;
}
