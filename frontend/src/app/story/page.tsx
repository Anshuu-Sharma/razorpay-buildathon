"use client";

import { useEffect } from "react";
import Link from "next/link";
import StoryScene from "@/components/story/StoryScene";

/**
 * Nayantara's story — the warm, light "problem" half of the pitch. The class
 * cards bridge into the dark REX console (the "solution" half). The light theme
 * is scoped to this route: we tag <html> on mount (to hide the dark grain /
 * vignette + recolour body) and carry the tokens on the wrapper for SSR.
 */
export default function StoryPage() {
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("theme-light");

    // Start the story at the top, instantly. Prevent the browser from restoring
    // the landing page's scroll offset onto this (very tall) route, and disable
    // smooth scrolling so the reset doesn't animate as an auto-scroll.
    const prevBehavior = el.style.scrollBehavior;
    const prevRestore =
      "scrollRestoration" in history ? history.scrollRestoration : undefined;
    el.style.scrollBehavior = "auto";
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    return () => {
      el.classList.remove("theme-light");
      el.style.scrollBehavior = prevBehavior;
      if (prevRestore !== undefined) history.scrollRestoration = prevRestore;
    };
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
