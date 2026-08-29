"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { STORY } from "@/lib/story";
import Nayantara from "./Nayantara";
import SpeechCloud from "./SpeechCloud";
import StoryClassCard from "./StoryClassCard";

/**
 * Scroll-driven narrative that weaves. One sticky doodle stays vertically
 * centred but swings left↔right per beat, while each beat's text sits on the
 * opposite side — so Nayantara traces an S-curve down a dashed centre thread
 * instead of the layout sitting in two static columns.
 *
 * `onViewportEnter` sets the active beat from an event callback, keeping state
 * changes out of an effect body (the project lints setState-in-effect).
 */
export default function StoryScene() {
  const [active, setActive] = useState(0);
  const beat = STORY[active];
  const doodleOnLeft = active % 2 === 0;

  return (
    <section className="relative">
      {/* Dashed centre thread the doodle weaves across */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 border-l border-dashed md:block"
        style={{ borderColor: "rgba(204,120,92,0.28)" }}
        aria-hidden
      />

      {/* Sticky doodle layer — pinned centre, swings side to side */}
      <div className="pointer-events-none sticky top-0 z-10 flex h-screen items-center justify-center">
        <motion.div
          animate={{
            x: doodleOnLeft ? "-23vw" : "23vw",
            rotate: doodleOnLeft ? -2.5 : 2.5,
          }}
          transition={{ type: "spring", stiffness: 55, damping: 16 }}
          className="relative h-[46vh] w-[42vw] max-w-md md:h-[52vh]"
        >
          <div className="doodle-blob absolute inset-0 rounded-[45%]" />
          <AnimatePresence mode="wait">
            <motion.div
              key={beat.pose}
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-end justify-center"
            >
              <Nayantara pose={beat.pose} />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Beats scroll over the same vertical space as the sticky doodle */}
      <div className="relative z-20 -mt-[100vh]">
        {STORY.map((b, i) => {
          const textOnRight = i % 2 === 0; // opposite the doodle
          return (
            <motion.div
              key={b.id}
              onViewportEnter={() => setActive(i)}
              viewport={{ margin: "-45% 0px -45% 0px", amount: 0.35 }}
              className="flex min-h-screen items-center"
            >
              <div
                className={
                  textOnRight
                    ? "ml-auto w-full max-w-md pr-6 md:pr-[5vw]"
                    : "mr-auto w-full max-w-md pl-6 md:pl-[5vw]"
                }
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
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
