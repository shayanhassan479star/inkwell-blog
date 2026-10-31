"use client";

import { useEffect } from "react";

/** Counts one view per visit. Cookie-free; respects Do Not Track / Global Privacy Control. */
export function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;
    const timer = window.setTimeout(() => {
      fetch("/api/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ postId }),
        keepalive: true,
      }).catch(() => {});
    }, 3000); // only count readers who stay a few seconds
    return () => window.clearTimeout(timer);
  }, [postId]);
  return null;
}
