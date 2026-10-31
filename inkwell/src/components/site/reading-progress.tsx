"use client";

import { useEffect, useState } from "react";

export function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5" aria-hidden>
      <div className="h-full bg-accent transition-[width] duration-100" style={{ width: `${pct}%` }} />
    </div>
  );
}
