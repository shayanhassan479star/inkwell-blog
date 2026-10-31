import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicClient } from "./supabase/public";
import { site } from "./site";
import type { AuthorLite, Category, PostFull, PostSummary, Profile, Tag } from "./types";

/* ──────────────────────────── shared mapping ──────────────────────────── */

const SUMMARY_COLUMNS = `id, slug, title, excerpt, cover_image_url, cover_image_alt, is_featured, published_at,
  reading_time_minutes, view_count,
  author:profiles(id, slug, display_name, avatar_url),
  post_categories(position, category:categories(id, slug, name, description)),
  post_tags(tag:tags(id, slug, name))`;

export const POST_SUMMARY_SELECT = SUMMARY_COLUMNS;
export const POST_FULL_SELECT = `${SUMMARY_COLUMNS}, body, status, scheduled_at, seo_title, meta_description, canonical_url, created_at, updated_at`;

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** Convert a raw PostgREST row (with embedded relations) to our flat types. */
export function normalizePost(row: Row): PostFull {
  const categories: Category[] = [...((row.post_categories ?? []) as Row[])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((pc) => one<Category>(pc.category))
    .filter((c): c is Category => Boolean(c));
  const tags: Tag[] = ((row.post_tags ?? []) as Row[])
    .map((pt) => one<Tag>(pt.tag))
    .filter((t): t is Tag => Boolean(t));
  const { post_categories: _pc, post_tags: _pt, author, ...rest } = row; // eslint-disable-line @typescript-eslint/no-unused-vars
  return {
    ...(rest as Omit<PostFull, "author" | "categories" | "tags">),
    author: one<AuthorLite>(author),
    categories,
    tags,
  } as PostFull;
}

export function normalizePosts(rows: Row[] | null | undefined): PostSummary[] {
  return (rows ?? []).map(normalizePost);
}

/** Throw on a Supabase error so ISR keeps serving the last good page instead of caching an empty one. */
function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Database query failed (${what}): ${res.error.message}`);
  return res.data;
}

const liveFilter = () => new Date().toISOString();

/* ──────────────────────────── public queries ──────────────────────────── */

async function postsByIds(db: SupabaseClient, ids: string[]): Promise<PostSummary[]> {
  if (ids.length === 0) return [];
  const res = await db
    .from("posts")
    .select(POST_SUMMARY_SELECT)
    .in("id", ids)
    .in("status", ["published", "scheduled"])
    .lte("published_at", liveFilter());
  const byId = new Map(normalizePosts(check(res, "postsByIds")).map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id)).filter((p): p is PostSummary => Boolean(p));
}

export type PostsPage = { posts: PostSummary[]; total: number; page: number; perPage: number; pageCount: number };

export async function getPostsPage(opts: {
  page?: number;
  perPage?: number;
  categoryId?: string;
  tagId?: string;
  authorId?: string;
}): Promise<PostsPage> {
  const perPage = opts.perPage ?? site.postsPerPage;
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const empty = { posts: [], total: 0, page, perPage, pageCount: 0 };
  const db = getPublicClient();
  if (!db) return empty;
  const res = await db.rpc("list_post_ids", {
    p_category: opts.categoryId ?? null,
    p_tag: opts.tagId ?? null,
    p_author: opts.authorId ?? null,
    p_limit: perPage,
    p_offset: (page - 1) * perPage,
  });
  const rows = check(res, "list_post_ids") as { id: string; total: number | string }[];
  const total = rows.length ? Number(rows[0].total) : 0;
  return { posts: await postsByIds(db, rows.map((r) => r.id)), total, page, perPage, pageCount: Math.ceil(total / perPage) };
}

export async function searchPosts(query: string, page = 1, perPage = site.postsPerPage): Promise<PostsPage> {
  const q = query.trim().slice(0, 100);
  const safePage = Math.max(1, Math.floor(page));
  const empty = { posts: [], total: 0, page: safePage, perPage, pageCount: 0 };
  const db = getPublicClient();
  if (!db || q.length < 2) return empty;
  const res = await db.rpc("search_posts", { q, page_limit: perPage, page_offset: (safePage - 1) * perPage });
  const rows = check(res, "search_posts") as { id: string; total: number | string }[];
  const total = rows.length ? Number(rows[0].total) : 0;
  return { posts: await postsByIds(db, rows.map((r) => r.id)), total, page: safePage, perPage, pageCount: Math.ceil(total / perPage) };
}

export async function getFeaturedPosts(limit = 3): Promise<PostSummary[]> {
  const db = getPublicClient();
  if (!db) return [];
  const res = await db
    .from("posts")
    .select(POST_SUMMARY_SELECT)
    .eq("is_featured", true)
    .in("status", ["published", "scheduled"])
    .lte("published_at", liveFilter())
    .order("published_at", { ascending: false })
    .limit(limit);
  return normalizePosts(check(res, "featured"));
}

export async function getLatestPosts(limit = 6, excludeIds: string[] = []): Promise<PostSummary[]> {
  const db = getPublicClient();
  if (!db) return [];
  let query = db
    .from("posts")
    .select(POST_SUMMARY_SELECT)
    .in("status", ["published", "scheduled"])
    .lte("published_at", liveFilter())
    .order("published_at", { ascending: false })
    .limit(limit);
  if (excludeIds.length) query = query.not("id", "in", `(${excludeIds.join(",")})`);
  return normalizePosts(check(await query, "latest"));
}

export async function getPopularPosts(limit = 5): Promise<PostSummary[]> {
  const db = getPublicClient();
  if (!db) return [];
  const res = await db
    .from("posts")
    .select(POST_SUMMARY_SELECT)
    .in("status", ["published", "scheduled"])
    .lte("published_at", liveFilter())
    .order("view_count", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);
  return normalizePosts(check(res, "popular"));
}

export async function getPostBySlug(slug: string): Promise<PostFull | null> {
  const db = getPublicClient();
  if (!db || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  const res = await db
    .from("posts")
    .select(POST_FULL_SELECT)
    .eq("slug", slug)
    .in("status", ["published", "scheduled"])
    .lte("published_at", liveFilter())
    .maybeSingle();
  const row = check(res, "postBySlug");
  return row ? normalizePost(row) : null;
}

export async function getRelatedPosts(postId: string, limit = 3): Promise<PostSummary[]> {
  const db = getPublicClient();
  if (!db) return [];
  const res = await db.rpc("related_post_ids", { p_post: postId, p_limit: limit });
  const rows = check(res, "related") as { id: string }[];
  return postsByIds(db, rows.map((r) => r.id));
}

export type CategoryWithCount = Category & { post_count: number };
export type TagWithCount = Tag & { post_count: number };

export async function getCategories(): Promise<CategoryWithCount[]> {
  const db = getPublicClient();
  if (!db) return [];
  const [cats, counts] = await Promise.all([
    db.from("categories").select("id, slug, name, description").order("name"),
    db.rpc("category_counts"),
  ]);
  const countMap = new Map((check(counts, "category_counts") as { category_id: string; post_count: number | string }[]).map((c) => [c.category_id, Number(c.post_count)]));
  return (check(cats, "categories") as Category[]).map((c) => ({ ...c, post_count: countMap.get(c.id) ?? 0 }));
}

export async function getTags(): Promise<TagWithCount[]> {
  const db = getPublicClient();
  if (!db) return [];
  const [tags, counts] = await Promise.all([db.from("tags").select("id, slug, name").order("name"), db.rpc("tag_counts")]);
  const countMap = new Map((check(counts, "tag_counts") as { tag_id: string; post_count: number | string }[]).map((c) => [c.tag_id, Number(c.post_count)]));
  return (check(tags, "tags") as Tag[]).map((t) => ({ ...t, post_count: countMap.get(t.id) ?? 0 }));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const db = getPublicClient();
  if (!db) return null;
  const res = await db.from("categories").select("id, slug, name, description").eq("slug", slug).maybeSingle();
  return check(res, "category") as Category | null;
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const db = getPublicClient();
  if (!db) return null;
  const res = await db.from("tags").select("id, slug, name").eq("slug", slug).maybeSingle();
  return check(res, "tag") as Tag | null;
}

export async function getAuthorBySlug(slug: string): Promise<Profile | null> {
  const db = getPublicClient();
  if (!db) return null;
  const res = await db
    .from("profiles")
    .select("id, slug, display_name, bio, avatar_url, website_url, role, is_active")
    .eq("slug", slug)
    .eq("is_active", true)
    .in("role", ["admin", "author"])
    .maybeSingle();
  return check(res, "author") as Profile | null;
}

/** The site owner: the oldest active admin. Used for the home page introduction. */
export async function getSiteOwner(): Promise<Profile | null> {
  const db = getPublicClient();
  if (!db) return null;
  const res = await db
    .from("profiles")
    .select("id, slug, display_name, bio, avatar_url, website_url, role, is_active")
    .eq("is_active", true)
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1);
  return (check(res, "owner") as Profile[])[0] ?? null;
}

export async function getAuthors(): Promise<Profile[]> {
  const db = getPublicClient();
  if (!db) return [];
  const res = await db
    .from("profiles")
    .select("id, slug, display_name, bio, avatar_url, website_url, role, is_active")
    .eq("is_active", true)
    .in("role", ["admin", "author"]);
  return check(res, "authors") as Profile[];
}

/** Lightweight rows for sitemap and RSS. */
export async function getSitemapPosts(limit = 5000): Promise<{ slug: string; updated_at: string; published_at: string }[]> {
  const db = getPublicClient();
  if (!db) return [];
  const res = await db
    .from("posts")
    .select("slug, updated_at, published_at")
    .in("status", ["published", "scheduled"])
    .lte("published_at", liveFilter())
    .order("published_at", { ascending: false })
    .limit(limit);
  return check(res, "sitemap") as { slug: string; updated_at: string; published_at: string }[];
}

export async function getFeedPosts(limit = 30): Promise<PostFull[]> {
  const db = getPublicClient();
  if (!db) return [];
  const res = await db
    .from("posts")
    .select(POST_FULL_SELECT)
    .in("status", ["published", "scheduled"])
    .lte("published_at", liveFilter())
    .order("published_at", { ascending: false })
    .limit(limit);
  return ((check(res, "feed") ?? []) as Row[]).map(normalizePost);
}
