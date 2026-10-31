import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/site/avatar";
import { JsonLd } from "@/components/site/json-ld";
import { PageHeader } from "@/components/site/section-heading";
import { getSiteOwner } from "@/lib/posts";
import { absoluteUrl, site } from "@/lib/site";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "About",
  description: `About ${site.name} and the writer behind it.`,
  alternates: { canonical: "/about" },
};

/**
 * The author's name, photo and bio come from their profile (Dashboard → Profile).
 * Edit the sections below to describe your own work.
 */
export default async function AboutPage() {
  const owner = await getSiteOwner().catch(() => null);
  return (
    <>
      {owner && (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "AboutPage", mainEntity: { "@type": "Person", name: owner.display_name, description: owner.bio ?? undefined, url: absoluteUrl(`/author/${owner.slug}`) } }} />
      )}
      <PageHeader eyebrow="About" title={owner ? `Hello, I'm ${owner.display_name}.` : `About ${site.name}`} description={site.tagline} />
      <div className="container grid gap-12 pb-8 lg:grid-cols-[1fr_2fr]">
        {owner && (
          <aside className="flex items-start gap-4 lg:flex-col">
            <Avatar name={owner.display_name} src={owner.avatar_url} size={128} />
            <div>
              <p className="font-display text-2xl font-semibold">{owner.display_name}</p>
              <Link href={`/author/${owner.slug}`} className="text-sm text-accent hover:underline">Read all articles →</Link>
            </div>
          </aside>
        )}
        <div className="prose prose-lg max-w-none font-serif dark:prose-invert prose-headings:font-display prose-a:text-accent">
          {owner?.bio ? <p className="whitespace-pre-line">{owner.bio}</p> : <p>Add your bio under <strong>Dashboard → Profile</strong> and it will appear here.</p>}
          <h2>What you&apos;ll find here</h2>
          <p>Long-form articles, researched carefully and edited ruthlessly. New pieces are published regularly; you can follow along by RSS or email.</p>
          <h2>How this site is made</h2>
          <p>
            Articles are written by hand. Some drafting aids — such as outline suggestions, proofreading and search-metadata ideas — may be produced with an AI assistant, but every
            piece is reviewed, edited and approved by the author before publication.
          </p>
          <h2>Get in touch</h2>
          <p>Questions, corrections or collaboration ideas? Use the <Link href="/contact">contact form</Link>.</p>
        </div>
      </div>
    </>
  );
}
