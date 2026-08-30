"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface ExplorerFilterCtx {
  status: string; // "" = all, else a LifecycleStatus
  setStatus: (s: string) => void;
}

const Ctx = createContext<ExplorerFilterCtx | null>(null);

/**
 * The transactions table's status filter, lifted to a small shared context so
 * REX can set it (e.g. "show only recovered failed payments") as well as the
 * operator's own dropdown. One Explorer is mounted at a time, so a single value
 * is enough.
 */
export function ExplorerFilterProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState("");
  const value = useMemo<ExplorerFilterCtx>(() => ({ status, setStatus }), [status]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExplorerFilter(): ExplorerFilterCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useExplorerFilter must be used within ExplorerFilterProvider");
  return ctx;
}
