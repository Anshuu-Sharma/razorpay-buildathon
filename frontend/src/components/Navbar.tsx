"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useIntroPhase } from "@/lib/intro";
import LocaleToggle from "./LocaleToggle";

export default function Navbar() {
  const { t } = useLocale();
  const pathname = usePathname();
  const phase = useIntroPhase();

  // Mission Control carries its own chrome (sidebar + topbar) — the marketing
  // header would clash, so it never renders there.
  if (pathname?.startsWith("/mission-control")) return null;

  // The header only appears after the user enters the experience.
  if (phase !== "entered") return null;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-transparent px-6 py-4 md:px-10">
      {/* Left: wordmark */}
      <Link href="/" className="group flex items-center gap-2.5" aria-label="Home">
        <span className="grid h-6 w-6 place-items-center rounded-[5px] bg-blue text-[13px] font-bold text-fg shadow-[0_0_14px_var(--rzp-blue-glow)]">
          R
        </span>
        <span className="font-mono text-sm uppercase tracking-[0.28em] text-fg/90 transition-colors group-hover:text-fg">
          REX
        </span>
      </Link>

      {/* Right: locale + CTA */}
      <div className="flex items-center gap-5">
        <LocaleToggle />
        <Link href="/demo" className="btn-primary text-sm">
          {t.nav.getStarted}
        </Link>
      </div>
    </nav>
  );
}
