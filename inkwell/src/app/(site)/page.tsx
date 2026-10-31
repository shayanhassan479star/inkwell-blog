import Link from "next/link";
import { Avatar } from "@/components/site/avatar";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { PostCard } from "@/components/site/post-card";
import { SectionHeading } from "@/components/site/section-heading";
import { SetupNotice } from "@/components/site/setup-notice";
import { EmptyState } from "@/components/ui/feedback";
import { hasSupabase, newsletterEnabled } from "@/lib/env";
import { getCategories, getFeaturedPosts, getLatestPosts, getPopularPosts, getSiteOwner } from "@/lib/posts";
import { site } from "@/lib/site";
import { truncate } from "@/lib/format";

export const revalidate = 60;

export default async function HomePage() {
  if (!hasSupabase()) return <SetupNotice />;

  const [featured, owner, categories, popular] = await Promise.all([getFeaturedPosts(3), getSiteOwner(), getCategories(), getPopularPosts(5)]);
  const latest = await getLatestPosts(6, featured.slice(0, 1).map((p) => p.id));
  const lead = featured[0] ?? latest[0];
  const secondary = featured.slice(1);
  const grid = lead && !featured[0] ? latest.slice(1) : latest;

  if (!lead) {
    return (
      <div className="container py-24">
        <EmptyState title="No articles published yet" action={<Link href="/admin" className="btn btn-primary">Open the dashboard</Link>}>
          Once you publish your first post it will appear here. Sign in to the dashboard to write one.
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <section className="container pt-10 md:pt-16" aria-labelledby="hero-heading">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <div className="animate-in lg:col-span-5">
            <p className="eyebrow mb-4">Independent writing</p>
            <h1 id="hero-heading" className="text-5xl font-semibold leading-[1.02] md:text-7xl">{site.tagline}</h1>
            {owner?.bio && <p className="mt-6 max-w-md text-lg text-muted-foreground">{truncate(owner.bio, 200)}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/blog" className="btn btn-primary px-6 py-3 text-base">Read the articles</Link>
              <Link href="/about" className="btn btn-outline px-6 py-3 text-base">About the author</Link>
            </div>
          </div>
          <div className="lg:col-span-7"><PostCard post={lead} variant="lead" priority /></div>
        </div>
      </section>

      {secondary.length > 0 && (
        <section className="container mt-20" aria-label="More featured articles">
          <SectionHeading eyebrow="Editor's picks" title="Featured" />
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
            {secondary.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}

      <section className="container mt-20" aria-label="Latest articles">
        <SectionHeading eyebrow="Fresh off the press" title="Latest" href="/blog" hrefLabel="All articles" />
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {grid.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </section>

      <section className="container mt-24 grid gap-14 lg:grid-cols-12" aria-label="Popular posts, topics and author">
        <div className="lg:col-span-5">
          <SectionHeading eyebrow="Reader favourites" title="Popular" />
          {popular.length ? (
            <ol className="space-y-1">
              {popular.map((p, i) => (
                <li key={p.id} className="flex items-start gap-4">
                  <span className="pt-4 font-display text-3xl font-semibold text-accent/70" aria-hidden>{i + 1}</span>
                  <div className="flex-1"><PostCard post={p} variant="compact" /></div>
                </li>
              ))}
            </ol>
          ) : <p className="text-sm text-muted-foreground">Popular posts appear once readers start visiting.</p>}
        </div>

        <div className="lg:col-span-4">
          <SectionHeading eyebrow="Browse" title="Topics" />
          {categories.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/category/${c.slug}`} className="group flex items-center justify-between py-3 hover:text-accent">
                    <span className="font-display text-lg">{c.name}</span>
                    <span className="text-xs text-muted-foreground group-hover:text-accent">{c.post_count} {c.post_count === 1 ? "post" : "posts"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No categories yet.</p>}
        </div>

        <div className="lg:col-span-3">
          <SectionHeading eyebrow="Meet" title="The author" />
          {owner ? (
            <div className="card p-6 text-center">
              <Avatar name={owner.display_name} src={owner.avatar_url} size={80} className="mx-auto" />
              <p className="mt-4 font-display text-xl font-semibold">{owner.display_name}</p>
              {owner.bio && <p className="mt-2 text-sm text-muted-foreground">{truncate(owner.bio, 160)}</p>}
              <Link href={`/author/${owner.slug}`} className="btn btn-outline btn-sm mt-4">View profile</Link>
            </div>
          ) : null}
        </div>
      </section>

      {newsletterEnabled() && (
        <section className="container mt-24" aria-labelledby="nl-heading">
          <div className="rounded-3xl bg-foreground px-6 py-12 text-background md:px-14">
            <div className="mx-auto grid max-w-4xl items-center gap-8 md:grid-cols-2">
              <div>
                <h2 id="nl-heading" className="text-3xl font-semibold text-background md:text-4xl">New writing, straight to your inbox.</h2>
                <p className="mt-3 text-background/70">Occasional emails. No spam. Unsubscribe whenever you like.</p>
              </div>
              <div className="rounded-2xl bg-background p-5 text-foreground"><NewsletterForm /></div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
