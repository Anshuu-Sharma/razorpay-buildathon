/**
 * Nayantara's story — the narrative spine of the demo.
 *
 * She runs "Rooh", a fast-growing skincare label: one-off online sales, a
 * monthly subscription box, and B2B supply to salons & hotels — so her revenue
 * leaks in all four failure classes at once. Each class beat ends with that
 * class's card, which links to the live REX console.
 *
 * English only for now; the HI copy is a follow-up (the rest of the app is
 * bilingual via the dictionary).
 */

export type Pose =
  | "wave"
  | "worried"
  | "confused"
  | "facepalm"
  | "hips"
  | "tired"
  | "hopeful";

export interface StoryBeat {
  id: string;
  pose: Pose;
  /** Speech-cloud lines, revealed together for this beat. */
  lines: string[];
  /** When set, the class solution card slides in after the lines. */
  classId?: 1 | 2 | 3 | 4;
}

export const STORY: StoryBeat[] = [
  {
    id: "intro",
    pose: "wave",
    lines: [
      "Hi, I'm Nayantara.",
      "I built Rooh from my kitchen table — one candle, one order at a time.",
    ],
  },
  {
    id: "ache",
    pose: "worried",
    lines: [
      "But every month, money just… disappears.",
      "Payments fail. Carts vanish. Invoices go quiet. And I never know why.",
    ],
  },
  {
    id: "class-1",
    pose: "confused",
    lines: [
      "During my Diwali sale, Meera tried to pay — the bank's UPI switch timed out.",
      "She did everything right… and now she thinks I double-charged her.",
    ],
    classId: 1,
  },
  {
    id: "class-2",
    pose: "facepalm",
    lines: [
      "Another customer filled her cart, reached the OTP screen…",
      "…switched apps to read the code, and the checkout was gone. High intent. Zero sale.",
    ],
    classId: 2,
  },
  {
    id: "class-3",
    pose: "hips",
    lines: [
      "My subscribers' auto-debits fail at month-end — salary's not in yet.",
      "I retry the next morning. Fails again. They cancel. Every. Single. Month.",
    ],
    classId: 3,
  },
  {
    id: "class-4",
    pose: "tired",
    lines: [
      "My biggest client — a hotel chain — is 45 days late on a ₹84,000 invoice.",
      "“Next week,” they keep saying. My manager's spent hours chasing a promise.",
    ],
    classId: 4,
  },
  {
    id: "turn",
    pose: "hopeful",
    lines: [
      "Revenue doesn't break in one clean snap. It drains through a hundred tiny cracks I can't see or chase.",
      "I don't need more people. I need something that thinks — and recovers — on its own.",
    ],
  },
  {
    id: "rex",
    pose: "hopeful",
    lines: ["Meet REX — my Revenue Execution Engine."],
  },
];
