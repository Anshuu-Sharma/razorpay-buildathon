"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { STORY } from "@/lib/story";
import Nayantara from "./Nayantara";
import SpeechCloud from "./SpeechCloud";
import StoryClassCard from "./StoryClassCard";

const AMP = 15; // horizontal weave amplitude (vw)

/**
 * Scroll-linked narrative. Nayantara's horizontal position is a continuous
 * function of scroll progress (a sine weave), so she *glides* along an S-curve
 * as you scroll rather than snapping between a left and a right slot. A centre
 * curve draws itself in sync, and the beats' text rides the opposite side.
 */
export default function StoryScene() {
  const sceneRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const beat = STORY[active];

  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start start", "end end"],
  });

  // Drive the active beat (and thus the pose) straight off scroll progress, so
  // the doodle swaps reliably as you scroll in either direction. Runs in a
  // MotionValue event callback, not an effect body.
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const idx = Math.max(
      0,
      Math.min(STORY.length - 1, Math.floor(p * STORY.length))
    );
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActive(idx);
    }
  });

  // Continuous, scroll-linked weave that lands on the side OPPOSITE each beat's
  // text at every beat centre (text alternates even=right / odd=left), so the
  // doodle and its words never crowd the same side.
  const n = STORY.length;
  const doodleX = useTransform(scrollYProgress, (p) => {
    const phase = p * n; // 0 → n across the story
    return `${-AMP * Math.cos(Math.PI * (phase - 0.5))}vw`;
  });
  const doodleY = useTransform(
    scrollYProgress,
    (p) => `${Math.cos(p * Math.PI * n) * -1.2}vh`
  );
  const doodleRot = useTransform(scrollYProgress, (p) =>
    Math.cos(Math.PI * (p * n - 0.5)) * 3
  );
  const blobScale = useTransform(
    scrollYProgress,
    (p) => 1 + Math.abs(Math.sin(p * Math.PI * n)) * 0.05
  );

  // The centre curve the doodle traces; drawn in as you scroll via pathLength.
  const curveD = useMemo(() => {
    let d = "M 50 0";
    const steps = STORY.length;
    for (let t = 0; t <= 1200; t += 15) {
      const phase = (t / 1200) * steps;
      const x = 50 - 30 * Math.cos(Math.PI * (phase - 0.5));
      d += ` L ${x.toFixed(1)} ${t}`;
    }
    return d;
  }, []);

  return (
    <section ref={sceneRef} className="relative">
      {/* The journey curve, drawn in sync with scroll */}
      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
        viewBox="0 0 100 1200"
        preserveAspectRatio="none"
        aria-hidden
      >
        <motion.path
          d={curveD}
          fill="none"
          stroke="rgba(204,120,92,0.35)"
          strokeWidth={0.4}
          strokeDasharray="1.5 1.5"
          style={{ pathLength: scrollYProgress }}
        />
      </svg>

      {/* Sticky doodle — pinned centre, weaves with scroll. Bottom padding
          lifts it above dead-centre so the figure's feet stay in view. */}
      <div className="pointer-events-none sticky top-0 z-10 flex h-screen items-center justify-center pb-[12vh]">
        <motion.div
          style={{ x: doodleX, y: doodleY, rotate: doodleRot }}
          className="relative h-[52vh] w-[40vw] max-w-[380px] md:h-[60vh]"
        >
          <motion.div
            style={{ scale: blobScale }}
            className="doodle-blob absolute inset-0 rounded-[45%]"
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={beat.pose}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
          const textOnRight = i % 2 === 0;
          return (
            <div key={b.id} className="flex min-h-screen items-center pb-[12vh]">
              <div
                className={
                  textOnRight
                    ? "w-full max-w-md px-6 md:ml-[58%] md:max-w-sm md:px-0 md:pr-[3vw]"
                    : "w-full max-w-md px-6 md:mr-[58%] md:max-w-sm md:px-0 md:pl-[3vw]"
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
