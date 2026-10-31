import "server-only";
import type { StaffContext } from "./auth";
import { normalizePost, POST_FULL_SELECT } from "./posts";
import { createServiceClient } from "./supabase/admin";
import type { Category, CommentStatus, MessageStatus, PostFull, PostStatus, Profile, Role, Tag } from "./types";

/**
 * Dashboard data access. Every query runs through the signed-in user's own Supabase session,
 * so Row Level Security — not application code alone — keeps authors away from other people's
 * drafts and keeps comments, messages and subscribers admin-only.
 */

export const ADMIN_PAGE_SIZE = 15;

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Dashboard query failed (${what}): ${res.error.message}`);
  return res.data;
}

/* ───────────────────────────── dashboard ───────────────────────────── */

export type DashboardStats = {
  total_posts: number;
  published_posts: number;
  draft_posts: number;
  scheduled_posts: number;
  total_views: number;
  pending_comments: number;
  new_messages: number;
  subscribers: number;
};

export type PostRowLite = {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  published_at: string | null;
  scheduled_at: string | null;
  updated_at: string;
  view_count: number;
};

const LITE = "id, title, slug, status, published_at, scheduled_at, updated_at, view_count";

export async function getDashboardData(ctx: StaffContext) {
  const [stats, views, recent, top] = await Promise.all([
    ctx.supabase.rpc("dashboard_stats"),
    ctx.supabase.rpc("views_by_day", { p_days: 14 }),
    ctx.supabase.from("posts").select(LITE).order("updated_at", { ascending: false }).limit(6),
    ctx.supabase.from("posts").select(LITE).eq("status", "published").order("view_count", { ascending: false }).limit(5),
  ]);
  const row = (check(stats, "dashboard_stats") as Record<string, number | string>[])[0] ?? {};
  const n = (k: string) => Number(row[k] ?? 0);
  return {
    stats: {
      total_posts: n("total_posts"),
      published_posts: n("published_posts"),
      draft_posts: n("draft_posts"),
      scheduled_posts: n("scheduled_posts"),
      total_views: n("total_views"),
      pending_comments: n("pending_comments"),
      new_messages: n("new_messages"),
      subscribers: n("subscribers"),
    } satisfies DashboardStats,
    viewsByDay: (check(views, "views_by_day") as { day: string; views: number | string }[]).map((d) => ({ day: d.day, views: Number(d.views) })),
    recent: check(recent, "recent posts") as PostRowLite[],
    top: check(top, "top posts") as PostRowLite[],
  };
}

/** Small counts for the sidebar badges (admins only; authors cannot see comments/messages). */
export async function getBadgeCounts(ctx: StaffContext): Promise<{ comments: number; messages: number }> {
  if (ctx.profile.role !== "admin") return { comments: 0, messages: 0 };
  const res = await ctx.supabase.rpc("dashboard_stats");
  if (res.error) return { comments: 0, messages: 0 };
  const row = (res.data as Record<string, number | string>[])[0] ?? {};
  return { comments: Number(row.pending_comments ?? 0), messages: Number(row.new_messages ?? 0) };
}

/* ───────────────────────────── posts ───────────────────────────── */

export type AdminPostRow = PostRowLite & {
  is_featured: boolean;
  author: { id: string; display_name: string } | null;
  categories: string[];
};

export type PostFilter = "all" | "draft" | "scheduled" | "published";
export const POST_FILTERS: PostFilter[] = ["all", "published", "scheduled", "draft"];

export async function listAdminPosts(
  ctx: StaffContext,
  opts: { status?: PostFilter; q?: string; page?: number },
): Promise<{ rows: AdminPostRow[]; total: number; page: number; pageCount: number }> {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  let query = ctx.supabase
    .from("posts")
    .select(`${LITE}, is_featured, author:profiles(id, display_name), post_categories(category:categories(name))`, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);

  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);
  const q = (opts.q ?? "").trim().slice(0, 100).replace(/[%_\\]/g, (c) => `\\${c}`);
  if (q) query = query.ilike("title", `%${q}%`);

  const res = await query;
  if (res.error) throw new Error(`Dashboard query failed (posts): ${res.error.message}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (res.data as any[]).map((r): AdminPostRow => {
    const author = Array.isArray(r.author) ? r.author[0] : r.author;
    const cats = (r.post_categories ?? []).map((pc: { category: { name: string } | { name: string }[] | null }) => (Array.isArray(pc.category) ? pc.category[0]?.name : pc.category?.name)).filter(Boolean);
    const { author: _a, post_categories: _pc, ...rest } = r; // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...rest, author: author ?? null, categories: cats, view_count: Number(rest.view_count) } as AdminPostRow;
  });
  const total = res.count ?? 0;
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}

/** Loads one post for editing. RLS returns nothing for posts the user may not edit. */
export async function getPostForEdit(ctx: StaffContext, id: string): Promise<PostFull | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const res = await ctx.supabase.from("posts").select(POST_FULL_SELECT).eq("id", id).maybeSingle();
  const row = check(res, "post");
  return row ? normalizePost(row) : null;
}

export async function getEditorOptions(ctx: StaffContext): Promise<{ categories: Category[]; tags: Tag[]; authors: Pick<Profile, "id" | "display_name">[] }> {
  const [cats, tags, authors] = await Promise.all([
    ctx.supabase.from("categories").select("id, slug, name, description").order("name"),
    ctx.supabase.from("tags").select("id, slug, name").order("name"),
    ctx.profile.role === "admin"
      ? ctx.supabase.from("profiles").select("id, display_name").in("role", ["admin", "author"]).eq("is_active", true).order("display_name")
      : Promise.resolve({ data: [], error: null }),
  ]);
  return {
    categories: check(cats, "categories") as Category[],
    tags: check(tags, "tags") as Tag[],
    authors: check(authors as { data: Pick<Profile, "id" | "display_name">[]; error: null }, "authors"),
  };
}

/* ───────────────────────────── users ───────────────────────────── */

export type UserRow = { id: string; display_name: string; slug: string; role: Role; is_active: boolean; email: string | null; created_at: string };

export async function listUsers(ctx: StaffContext): Promise<UserRow[]> {
  const res = await ctx.supabase.from("profiles").select("id, display_name, slug, role, is_active, created_at").order("created_at");
  const profiles = check(res, "profiles") as Omit<UserRow, "email">[];
  // Email addresses live in auth.users, which only the service role can read.
  const emails = new Map<string, string>();
  const db = createServiceClient();
  if (db) {
    const list = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of list.data?.users ?? []) if (u.email) emails.set(u.id, u.email);
  }
  return profiles.map((p) => ({ ...p, email: emails.get(p.id) ?? null }));
}

/* ───────────────────────────── moderation ───────────────────────────── */

export type CommentRow = {
  id: string;
  author_name: string;
  author_email: string;
  body: string;
  status: CommentStatus;
  created_at: string;
  post: { title: string; slug: string } | null;
};

export const COMMENT_FILTERS: CommentStatus[] = ["pending", "approved", "spam", "rejected"];

export async function listComments(ctx: StaffContext, status: CommentStatus): Promise<CommentRow[]> {
  const res = await ctx.supabase
    .from("comments")
    .select("id, author_name, author_email, body, status, created_at, post:posts(title, slug)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (check(res, "comments") as any[]).map((c) => ({ ...c, post: Array.isArray(c.post) ? (c.post[0] ?? null) : c.post }));
}

export type MessageRow = { id: string; name: string; email: string; subject: string; message: string; status: MessageStatus; created_at: string };

export async function listMessages(ctx: StaffContext, status: MessageStatus | "all"): Promise<MessageRow[]> {
  let query = ctx.supabase.from("contact_messages").select("id, name, email, subject, message, status, created_at").order("created_at", { ascending: false }).limit(100);
  if (status === "all") query = query.neq("status", "archived");
  else query = query.eq("status", status);
  return check(await query, "messages") as MessageRow[];
}

export type SubscriberRow = { id: string; email: string; consent_at: string; unsubscribed_at: string | null; created_at: string };

export async function listSubscribers(ctx: StaffContext): Promise<SubscriberRow[]> {
  const res = await ctx.supabase.from("subscribers").select("id, email, consent_at, unsubscribed_at, created_at").order("created_at", { ascending: false }).limit(1000);
  return check(res, "subscribers") as SubscriberRow[];
}
