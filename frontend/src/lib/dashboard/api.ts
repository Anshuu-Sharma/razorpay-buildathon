import { API_BASE } from "@/lib/api";
import type {
  AuditList,
  EscalationTicket,
  Metrics,
  PolicyResponse,
  TransactionDetail,
  TransactionList,
} from "./types";

const V1 = `${API_BASE}/api/v1`;

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${V1}${path}`, { signal, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${path}`);
  }
  return (await res.json()) as T;
}

export const fetchMetrics = (signal?: AbortSignal) =>
  getJson<Metrics>("/metrics", signal);

export interface TxnQuery {
  failure_class?: number;
  status?: string;
  archetype?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export function fetchTransactions(query: TxnQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return getJson<TransactionList>(`/transactions${qs ? `?${qs}` : ""}`, signal);
}

export const fetchTransaction = (id: string, signal?: AbortSignal) =>
  getJson<TransactionDetail>(`/transactions/${encodeURIComponent(id)}`, signal);

export function fetchAudit(
  query: { transaction_id?: string; limit?: number; offset?: number } = {},
  signal?: AbortSignal
) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return getJson<AuditList>(`/audit${qs ? `?${qs}` : ""}`, signal);
}

export const fetchEscalations = (signal?: AbortSignal) =>
  getJson<EscalationTicket[]>("/escalations", signal);

export const fetchPolicy = (signal?: AbortSignal) =>
  getJson<PolicyResponse>("/policy", signal);

export async function reseedDemo(): Promise<{ seeded: number }> {
  const res = await fetch(`${V1}/admin/seed`, { method: "POST" });
  if (!res.ok) throw new Error(`Seed failed: ${res.status}`);
  return (await res.json()) as { seeded: number };
}
