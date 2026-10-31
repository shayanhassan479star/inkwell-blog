"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/** Table of contents with scroll-spy. On small screens it collapses into a disclosure. */
export function TableOfContents({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!items.length) return;
    const headings = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  const list = (
    <ol className="space-y-2 text-sm">
      {items.map((item) => (
        <li key={item.id} className={cn(item.level === 3 && "ml-4")}>
          <a href={`#${item.id}`} aria-current={active === item.id ? "location" : undefined} className={cn("block border-l-2 py-0.5 pl-3 transition-colors hover:text-accent", active === item.id ? "border-accent font-medium text-accent" : "border-transparent text-muted-foreground")}>
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <nav aria-label="Table of contents">
      <details className="card p-4 lg:hidden">
        <summary className="cursor-pointer text-sm font-semibold">On this page</summary>
        <div className="mt-3">{list}</div>
      </details>
      <div className="hidden lg:block">
        <p className="eyebrow mb-3">On this page</p>
        {list}
      </div>
    </nav>
  );
}
