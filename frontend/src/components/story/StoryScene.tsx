"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { STORY } from "@/lib/story";
import Nayantara from "./Nayantara";
import SpeechCloud from "./SpeechCloud";
import StoryClassCard from "./StoryClassCard";

/**
 * Scroll-driven narrative. A sticky doodle stays in view while the beats scroll
 * past; whichever beat is centred drives Nayantara's pose (cross-faded) and a
 * gentle side-to-side drift. `onViewportEnter` sets the active beat from an
 * event callback, keeping state changes out of an effect body.
 */
export default function StoryScene() {
  const [active, setActive] = useState(0);
  const beat = STORY[active];
  const drift = active % 2 === 0 ? -1 : 1; // subtle alternating sway

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-10 px-6 md:grid-cols-2">
      {/* Sticky doodle */}
      <div className="pointer-events-none sticky top-16 z-10 flex h-[34vh] items-center justify-center self-start md:top-0 md:h-screen">
        <div className="relative h-[30vh] w-full max-w-sm md:h-[52vh]">
          <div className="doodle-blob absolute inset-0 rounded-[45%]" />
          <AnimatePresence mode="wait">
            <motion.div
              key={beat.pose}
              initial={{ opacity: 0, y: 18, x: 10 * drift }}
              animate={{ opacity: 1, y: 0, x: 12 * drift, rotate: 1.5 * drift }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-end justify-center"
            >
              <Nayantara pose={beat.pose} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Scrolling beats */}
      <div className="py-[14vh]">
        {STORY.map((b, i) => (
          <motion.section
            key={b.id}
            onViewportEnter={() => setActive(i)}
            viewport={{ margin: "-45% 0px -45% 0px", amount: 0.4 }}
            className="flex min-h-[72vh] flex-col justify-center"
          >
            <SpeechCloud lines={b.lines} />
            {b.classId ? <StoryClassCard classId={b.classId} /> : null}

            {b.id === "rex" ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <Link
                  href="/mission-control?class=1"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
                  style={{ background: "var(--color-fg)" }}
                >
                  Enter Mission Control
                  <span aria-hidden>→</span>
                </Link>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                  Watch REX recover it — live
                </span>
              </motion.div>
            ) : null}
          </motion.section>
        ))}
      </div>
    </div>
  );
}
