"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useRecoveryRun } from "@/hooks/useRecoveryRun";
import { useDashboardRefresh } from "./refresh";
import RexRunOverlay from "@/components/dashboard/RexRunOverlay";

interface RexRunCtx {
  start: (txnId: string, name: string) => void;
  activeId: string | null;
  running: boolean;
}

const Ctx = createContext<RexRunCtx | null>(null);

/**
 * Holds the single active "REX works this case" run and renders its live
 * bottom-right overlay. Any surface (the transaction drawer) triggers a run via
 * useRexRun().start(); the overlay narrates REX's actions while the dashboard in
 * the background updates on completion.
 */
export function RexRunProvider({ children }: { children: ReactNode }) {
  const { refresh } = useDashboardRefresh();
  const run = useRecoveryRun(() => refresh());

  const value = useMemo<RexRunCtx>(
    () => ({ start: run.start, activeId: run.activeId, running: run.running }),
    [run.start, run.activeId, run.running]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <RexRunOverlay run={run} />
    </Ctx.Provider>
  );
}

export function useRexRun(): RexRunCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRexRun must be used within RexRunProvider");
  return ctx;
}
