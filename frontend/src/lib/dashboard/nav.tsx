import type { ReactNode } from "react";
import { CLASS_COLOR, CLASS_SHORT } from "./status";

/** A stroked 18px icon. `d` may be one or more path segments. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const icons = {
  overview: (
    <Icon>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Icon>
  ),
  transactions: (
    <Icon>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </Icon>
  ),
  live: (
    <Icon>
      <path d="M3 12h4l2 6 4-14 2 8h6" />
    </Icon>
  ),
  escalations: (
    <Icon>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4M12 17.5v.5" />
    </Icon>
  ),
  audit: (
    <Icon>
      <path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M14 2v6h6M8 13h8M8 17h5" />
    </Icon>
  ),
  compliance: (
    <Icon>
      <path d="M12 3 5 6v5c0 4.4 3 8.4 7 9.7 4-1.3 7-5.3 7-9.7V6l-7-3Z" />
      <path d="m9.5 11.5 2 2 3.5-4" />
    </Icon>
  ),
  policy: (
    <Icon>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="var(--d-surface)" />
      <circle cx="15" cy="12" r="2" fill="var(--d-surface)" />
      <circle cx="8" cy="18" r="2" fill="var(--d-surface)" />
    </Icon>
  ),
};

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  ready: boolean;
  dot?: string; // optional colour dot (class tabs)
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [
      { label: "Overview", href: "/mission-control", icon: icons.overview, ready: true },
      {
        label: "Transactions",
        href: "/mission-control/transactions",
        icon: icons.transactions,
        ready: true,
      },
      { label: "Live Run", href: "/mission-control/live", icon: icons.live, ready: true },
    ],
  },
  {
    title: "Failure classes",
    items: [1, 2, 3, 4].map((n) => ({
      label: `Class ${n} · ${CLASS_SHORT[n]}`,
      href: `/mission-control/class/${n}`,
      icon: (
        <span
          className="inline-block h-2.5 w-2.5 rounded-[3px]"
          style={{ background: CLASS_COLOR[n] }}
        />
      ),
      ready: true,
      dot: CLASS_COLOR[n],
    })),
  },
  {
    title: "Compliance",
    items: [
      {
        label: "Escalations",
        href: "/mission-control/escalations",
        icon: icons.escalations,
        ready: true,
      },
      { label: "Audit Log", href: "/mission-control/audit", icon: icons.audit, ready: true },
      {
        label: "Stopping Rules",
        href: "/mission-control/compliance",
        icon: icons.compliance,
        ready: true,
      },
      {
        label: "Policy Inspector",
        href: "/mission-control/policy",
        icon: icons.policy,
        ready: true,
      },
    ],
  },
];

/** Flat lookup of the active section's label for the topbar. */
export function activeLabel(pathname: string): string {
  const all = NAV.flatMap((g) => g.items);
  // Longest matching href wins (so /class/1 beats /mission-control).
  const match = all
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? "Overview";
}
