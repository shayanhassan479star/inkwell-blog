"use client";

import {
  FileText, FolderTree, Inbox, LayoutDashboard, LogOut, Mail, Menu, MessageSquare, PenSquare, Sparkles, Tag, UserCircle, Users, X, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOut } from "@/lib/actions/auth";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof FileText; adminOnly?: boolean; badge?: "comments" | "messages"; exact?: boolean };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Write",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/posts", label: "Posts", icon: FileText },
      { href: "/admin/posts/new", label: "New post", icon: PenSquare, exact: true },
      { href: "/admin/ai", label: "AI Studio", icon: Sparkles },
    ],
  },
  {
    title: "Organise",
    items: [
      { href: "/admin/categories", label: "Categories", icon: FolderTree, adminOnly: true },
      { href: "/admin/tags", label: "Tags", icon: Tag, adminOnly: true },
    ],
  },
  {
    title: "Readers",
    items: [
      { href: "/admin/comments", label: "Comments", icon: MessageSquare, adminOnly: true, badge: "comments" },
      { href: "/admin/messages", label: "Messages", icon: Inbox, adminOnly: true, badge: "messages" },
      { href: "/admin/subscribers", label: "Subscribers", icon: Mail, adminOnly: true },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/admin/users", label: "Authors & access", icon: Users, adminOnly: true },
      { href: "/admin/profile", label: "My profile", icon: UserCircle },
    ],
  },
];

export function AdminShell({
  children, name, role, badges,
}: { children: React.ReactNode; name: string; role: "admin" | "author"; badges: { comments: number; messages: number } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (item: Item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)) &&
    // "Posts" must not light up while on "New post"
    !(item.href === "/admin/posts" && pathname === "/admin/posts/new");

  const nav = (
    <nav aria-label="Dashboard" className="space-y-6">
      {GROUPS.map((group) => {
        const items = group.items.filter((i) => !i.adminOnly || role === "admin");
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.title}</p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActive(item);
                const count = item.badge ? badges[item.badge] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", active ? "bg-accent/10 font-semibold text-accent" : "text-foreground/80 hover:bg-muted")}
                    >
                      <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground" aria-label={`${count} waiting`}>{count}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <a href="#admin-main" className="sr-only z-[200] rounded-full bg-accent px-4 py-2 text-accent-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
        <button type="button" className="btn btn-ghost h-9 w-9 p-0" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="admin-sidebar" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
        <Link href="/admin" className="font-display text-lg font-semibold">{site.name}<span className="text-accent">.</span> <span className="text-sm font-normal text-muted-foreground">Dashboard</span></Link>
        <div className="ml-auto"><ThemeToggle /></div>
      </header>

      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside
          id="admin-sidebar"
          className={cn(
            "fixed inset-y-0 left-0 z-30 flex w-64 flex-col overflow-y-auto border-r border-border bg-background px-3 pb-4 pt-20 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:pt-6",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Link href="/admin" className="mb-8 hidden px-3 font-display text-2xl font-semibold tracking-tight lg:block">
            {site.name}<span className="text-accent">.</span>
          </Link>
          {nav}
          <div className="mt-auto space-y-3 border-t border-border pt-4">
            <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground/80 hover:bg-muted">
              <ExternalLink className="h-4 w-4" aria-hidden /> View site
            </Link>
            <div className="flex items-center gap-2 px-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{name}</p>
                <p className="text-xs capitalize text-muted-foreground">{role}</p>
              </div>
              <span className="hidden lg:block"><ThemeToggle /></span>
              <form action={signOut}>
                <button type="submit" className="btn btn-ghost h-9 w-9 p-0" aria-label="Sign out" title="Sign out"><LogOut className="h-4 w-4" aria-hidden /></button>
              </form>
            </div>
          </div>
        </aside>
        {open && <button type="button" aria-label="Close menu" className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

        <main id="admin-main" className="min-w-0 px-4 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

