"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Articles" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="hidden border-b border-border/60 bg-muted/50 py-1.5 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:block">
        {site.tagline}
      </div>
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="font-display text-2xl font-semibold tracking-tight" aria-label={`${site.name} — home`}>
          {site.name}
          <span className="text-accent">.</span>
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn("rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-muted", isActive(item.href) ? "font-semibold text-accent" : "text-foreground/80")}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <form role="search" onSubmit={submit} className="hidden md:block">
            <label htmlFor="header-search" className="sr-only">Search articles</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input id="header-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" maxLength={100} className="input w-44 rounded-full pl-9 focus:w-60" />
            </div>
          </form>
          <button type="button" className="btn btn-ghost h-9 w-9 p-0 md:hidden" aria-label="Search" aria-expanded={searchOpen} onClick={() => setSearchOpen((v) => !v)}>
            <Search className="h-4 w-4" aria-hidden />
          </button>
          <ThemeToggle />
          <button type="button" className="btn btn-ghost h-9 w-9 p-0 md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form role="search" onSubmit={submit} className="container pb-3 md:hidden">
          <label htmlFor="mobile-search" className="sr-only">Search articles</label>
          <input id="mobile-search" autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles…" maxLength={100} className="input" />
        </form>
      )}

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="container animate-in border-t border-border py-3 md:hidden">
          <ul className="flex flex-col">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={cn("block rounded-lg px-3 py-3 text-base", isActive(item.href) ? "font-semibold text-accent" : "")}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
