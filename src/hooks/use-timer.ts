"use client";

import { useEffect, useState } from "react";

/** Returns ms elapsed since `start` (a performance.now() timestamp), updated every frame. */
export function useElapsed(start: number | null) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (start == null) return;
    let raf = 0;
    const tick = () => {
      setMs(performance.now() - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start]);
  return start == null ? 0 : ms;
}

export function formatTime(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
