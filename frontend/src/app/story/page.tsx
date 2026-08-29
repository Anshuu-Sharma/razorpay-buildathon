"use client";

import { useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import StoryScene from "@/components/story/StoryScene";

// Runs before paint on the client (falls back to useEffect on the server so SSR
// doesn't warn), so we can pin scroll to the top before the page is ever shown.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Nayantara's story — the warm, light "problem" half of the pitch. The class
 * cards bridge into the dark REX console (the "solution" half). The light theme
 * is scoped to this route: we tag <html> on mount (to hide the dark grain /
 * vignette + recolour body) and carry the tokens on the wrapper for SSR.
 */
export default function StoryPage() {
  // Pin to the top BEFORE the first paint, so the story never shows a late beat
  // even for a frame when navigating in from a scrolled-down landing page.
  useIsomorphicLayoutEffect(() => {
    const prevRestore =
      "scrollRestoration" in history ? history.scrollRestoration : undefined;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
      if (prevRestore !== undefined) history.scrollRestoration = prevRestore;
    };
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("theme-light");
    return () => el.classList.remove("theme-light");
  }, []);

  return (
    <div
      className="theme-light min-h-screen"
      style={{ background: "#f5f4ef", color: "#23201c" }}
    >
      <header className="px-6 pt-28 pb-6 text-center">
        <p className="story-kicker">A REX Story</p>
        <h1 className="story-display mx-auto mt-4 max-w-2xl text-[clamp(2.4rem,5.5vw,3.8rem)]">
          Meet Nayantara.
        </h1>
        <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.28em] text-muted">
          scroll to hear her out ↓
        </p>
      </header>

      <StoryScene />

      <footer className="py-16 text-center">
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted transition-colors hover:text-fg"
        >
          ← back to REX
        </Link>
      </footer>
    </div>
  );
}
