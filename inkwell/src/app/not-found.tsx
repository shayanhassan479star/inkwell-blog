import Link from "next/link";
import { SiteShell } from "@/components/site/site-shell";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <SiteShell>
      <section className="container flex min-h-[60vh] flex-col items-start justify-center py-20">
        <p className="eyebrow mb-3">Error 404</p>
        <h1 className="max-w-2xl text-5xl font-semibold leading-tight md:text-7xl">This page seems to have wandered off.</h1>
        <p className="mt-5 max-w-lg text-lg text-muted-foreground">The link may be broken, or the article may have been moved or unpublished.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary px-6 py-3">Back to the homepage</Link>
          <Link href="/blog" className="btn btn-outline px-6 py-3">Browse articles</Link>
          <Link href="/search" className="btn btn-ghost px-6 py-3">Search</Link>
        </div>
      </section>
    </SiteShell>
  );
}
