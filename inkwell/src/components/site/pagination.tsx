import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Server-rendered, crawlable pagination. `hrefFor(page)` builds the URL for a page number. */
export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;
  const pages = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const list = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} rel="prev" className="btn btn-outline btn-sm"><ChevronLeft className="h-4 w-4" aria-hidden />Previous</Link>
      ) : null}
      {list.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - list[i - 1] > 1 && <span aria-hidden className="px-1 text-muted-foreground">…</span>}
          <Link href={hrefFor(p)} aria-current={p === page ? "page" : undefined} aria-label={`Page ${p}`} className={cn("btn btn-sm min-w-9", p === page ? "btn-primary" : "btn-ghost")}>
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} rel="next" className="btn btn-outline btn-sm">Next<ChevronRight className="h-4 w-4" aria-hidden /></Link>
      ) : null}
    </nav>
  );
}
