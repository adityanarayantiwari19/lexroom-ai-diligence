"use client";

import { useEffect } from "react";

export function LenisProvider() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    let lenis: { raf: (time: number) => void; destroy: () => void } | undefined;
    let frame = 0;
    import("lenis").then(({ default: Lenis }) => {
      lenis = new Lenis({ duration: 1.05, smoothWheel: true, wheelMultiplier: 0.85 });
      const tick = (time: number) => {
        lenis?.raf(time);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
    };
  }, []);
  return null;
}
