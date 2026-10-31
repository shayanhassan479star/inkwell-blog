import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/site/pagination";
import { PostCard } from "@/components/site/post-card";
import { PageHeader } from "@/components/site/section-heading";
import { EmptyState } from "@/components/ui/feedback";
import { parsePage } from "@/lib/pagination";
import { getCategories, searchPosts } from "@/lib/posts";

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  return { title: q ? `Search: ${q}` : "Search", robots: { index: false, follow: true } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = parsePage(sp.page);
  const [result, categories] = await Promise.all([q.length >= 2 ? searchPosts(q, page) : null, q.length >= 2 ? Promise.resolve([]) : getCategories()]);

  return (
    <>
      <PageHeader eyebrow="Search" title={q ? `Results for “${q}”` : "Search the archive"} />
      <div className="container">
        <form action="/search" role="search" className="mb-10 flex max-w-xl gap-2">
          <label htmlFor="search-q" className="sr-only">Search articles</label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input id="search-q" name="q" type="search" defaultValue={q} minLength={2} maxLength={100} placeholder="Search by title, topic or keyword" className="input rounded-full py-2.5 pl-9" />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        {!result ? (
          <div>
            {q.length === 1 && <p className="mb-6 text-sm text-muted-foreground">Please enter at least two characters.</p>}
            <p className="mb-3 text-sm font-medium">Or browse by topic</p>
            <div className="flex flex-wrap gap-2">{categories.map((c) => <Link key={c.id} href={`/category/${c.slug}`} className="chip">{c.name}</Link>)}</div>
          </div>
        ) : result.posts.length ? (
          <>
            <p className="mb-8 text-sm text-muted-foreground" role="status">{result.total} {result.total === 1 ? "result" : "results"}</p>
            <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{result.posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
            <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(n) => `/search?q=${encodeURIComponent(q)}${n > 1 ? `&page=${n}` : ""}`} />
          </>
        ) : (
          <EmptyState title="No matching articles" action={<Link href="/blog" className="btn btn-outline">Browse all articles</Link>}>
            Nothing matched “{q}”. Try fewer or different words.
          </EmptyState>
        )}
      </div>
    </>
  );
}
