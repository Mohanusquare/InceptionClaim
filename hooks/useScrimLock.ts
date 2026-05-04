"use client";

import { useEffect } from "react";

let scrimDepth = 0;

function syncBodyOverflow() {
  document.body.style.overflow = scrimDepth > 0 ? "hidden" : "";
}

/**
 * Match static portal: hide page scroll while a scrim is open; Escape closes.
 * Supports nested scrims (e.g. matched → KYC) via a depth counter.
 */
export function useScrimLock(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    scrimDepth += 1;
    syncBodyOverflow();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      scrimDepth = Math.max(0, scrimDepth - 1);
      syncBodyOverflow();
    };
  }, [open, onClose]);
}
