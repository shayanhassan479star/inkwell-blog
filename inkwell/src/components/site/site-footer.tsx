import Link from "next/link";
import { newsletterEnabled } from "@/lib/env";
import { site } from "@/lib/site";
import { NewsletterForm } from "./newsletter-form";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-muted/40">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-semibold">
            {site.name}
            <span className="text-accent">.</span>
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{site.tagline}</p>
          {newsletterEnabled() && (
            <div className="mt-6 max-w-sm">
              <p className="mb-2 text-sm font-semibold">Get new articles by email</p>
              <NewsletterForm compact />
            </div>
          )}
        </div>
        <nav aria-label="Explore">
          <p className="eyebrow mb-3">Explore</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-accent" href="/blog">All articles</Link></li>
            <li><Link className="hover:text-accent" href="/about">About</Link></li>
            <li><Link className="hover:text-accent" href="/contact">Contact</Link></li>
            <li><a className="hover:text-accent" href="/feed.xml">RSS feed</a></li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="eyebrow mb-3">Legal</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-accent" href="/privacy">Privacy policy</Link></li>
            <li><Link className="hover:text-accent" href="/terms">Terms of use</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}
