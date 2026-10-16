"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while `active` (phones otherwise dim and lock mid-speech).
 * Browsers drop the lock when the tab is hidden, so it's re-acquired when the tab returns.
 * No-op where the Screen Wake Lock API isn't supported.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    const acquire = async () => {
      if (released || document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (released) void lock.release();
      } catch {
        /* denied (e.g. battery saver): the screen may still dim */
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", acquire);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
