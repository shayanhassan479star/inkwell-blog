"use server";

import { revalidatePath } from "next/cache";
import { getStaff } from "../auth";
import { readingTimeMinutes, renderMarkdown, type TocItem } from "../markdown";
import { slugify } from "../slug";
import type { ActionResult, PostStatus } from "../types";
import { fieldErrors, firstError, postInputSchema, stripControl, type PostInput } from "../validation";
import { dbFail, fail, isUniqueViolation, NOT_ALLOWED, SESSION_EXPIRED, succeed } from "./helpers";

type Saved = { id: string; slug: string; status: PostStatus };

const refresh = () => revalidatePath("/", "layout");

export async function savePost(input: PostInput): Promise<ActionResult<Saved>> {
  const ctx = await getStaff();
  if (!ctx) return fail(SESSION_EXPIRED);
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error), fieldErrors(parsed.error));
  const d = parsed.data;
  const { supabase, user, profile } = ctx;
  const isAdmin = profile.role === "admin";
  const now = new Date();

  // Load the existing post through the user's session: RLS hides posts they may not edit.
  let existing: { id: string; author_id: string; status: PostStatus; published_at: string | null; scheduled_at: string | null; is_featured: boolean } | null = null;
  if (d.id) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, author_id, status, published_at, scheduled_at, is_featured")
      .eq("id", d.id)
      .maybeSingle();
    if (error) return dbFail("savePost:load", error);
    if (!data) return fail("That post doesn't exist, or you don't have permission to edit it.");
    existing = data;
  }

  // ── publication state ──
  let status: PostStatus = d.status;
  let publishedAt: string | null = null;
  let scheduledAt: string | null = null;
  const wasLiveAt = existing?.published_at && new Date(existing.published_at) <= now ? existing.published_at : null;

  if (status !== "draft" && d.body.trim().length === 0) {
    return fail("Write some content before publishing or scheduling.", { body: "The article body is empty." });
  }
  if (status === "scheduled") {
    if (!d.scheduledAt) return fail("Choose a date and time to schedule.", { scheduledAt: "Choose a date and time." });
    const when = new Date(d.scheduledAt);
    if (when <= now) {
      const unchanged = existing?.status === "scheduled" && existing.scheduled_at && new Date(existing.scheduled_at).getTime() === when.getTime();
      if (!unchanged) return fail("Pick a time in the future, or choose “Publish now”.", { scheduledAt: "Must be in the future." });
      status = "published"; // an already-elapsed schedule is simply a live post
      publishedAt = when.toISOString();
    } else {
      scheduledAt = when.toISOString();
      publishedAt = scheduledAt;
    }
  } else if (status === "published") {
    publishedAt = wasLiveAt ?? now.toISOString();
  } else {
    publishedAt = wasLiveAt; // keep the original date so re-publishing restores it; hidden while status is draft
  }

  // ── ownership & privileges ──
  const authorId = isAdmin ? (d.authorId ?? existing?.author_id ?? user.id) : (existing?.author_id ?? user.id);
  const isFeatured = isAdmin ? d.isFeatured : (existing?.is_featured ?? false);

  const base = {
    title: d.title,
    excerpt: d.excerpt,
    body: d.body,
    cover_image_url: d.coverImageUrl,
    cover_image_alt: d.coverImageAlt,
    status,
    is_featured: isFeatured,
    published_at: publishedAt,
    scheduled_at: scheduledAt,
    seo_title: d.seoTitle,
    meta_description: d.metaDescription,
    canonical_url: d.canonicalUrl,
    reading_time_minutes: readingTimeMinutes(d.body),
    author_id: authorId,
  };

  // ── write, retrying with a numeric suffix if an auto-generated slug is taken ──
  const userChoseSlug = d.slug !== "";
  const baseSlug = d.slug || slugify(d.title) || "post";
  let saved: { id: string; slug: string } | null = null;
  for (let attempt = 1; attempt <= 8 && !saved; attempt++) {
    const slug = attempt === 1 ? baseSlug : `${baseSlug.slice(0, 74)}-${attempt}`;
    const res = existing
      ? await supabase.from("posts").update({ ...base, slug }).eq("id", existing.id).select("id, slug")
      : await supabase.from("posts").insert({ ...base, slug }).select("id, slug");
    if (res.error) {
      if (isUniqueViolation(res.error)) {
        if (userChoseSlug) return fail("That URL is already used by another post.", { slug: "Already in use — choose another." });
        continue;
      }
      return dbFail("savePost:write", res.error);
    }
    if (!res.data || res.data.length !== 1) return fail(NOT_ALLOWED);
    saved = res.data[0];
  }
  if (!saved) return fail("Couldn't generate a unique URL. Please set one manually.", { slug: "Please choose a URL." });

  // ── tags & relations ──
  const tagIds = new Set(d.tagIds);
  const newTagRows = [...new Map(d.newTags.map((name) => [slugify(name, 60), name] as const)).entries()]
    .filter(([slug]) => slug)
    .map(([slug, name]) => ({ slug, name }));
  if (newTagRows.length) {
    const up = await supabase.from("tags").upsert(newTagRows, { onConflict: "slug", ignoreDuplicates: true });
    if (up.error) return dbFail("savePost:tags", up.error);
    const found = await supabase.from("tags").select("id").in("slug", newTagRows.map((t) => t.slug));
    if (found.error) return dbFail("savePost:tags", found.error);
    (found.data ?? []).forEach((t: { id: string }) => tagIds.add(t.id));
  }
  const rel = await supabase.rpc("set_post_relations", {
    p_post_id: saved.id,
    p_category_ids: d.categoryIds,
    p_tag_ids: [...tagIds],
  });
  if (rel.error) return dbFail("savePost:relations", rel.error);

  refresh();
  const verb = status === "published" ? "published" : status === "scheduled" ? "scheduled" : "saved as draft";
  return succeed(`Post ${verb}.`, { id: saved.id, slug: saved.slug, status });
}

/** Publish ↔ unpublish from the posts list without opening the editor. */
export async function setPostStatus(id: string, target: "draft" | "published"): Promise<ActionResult> {
  const ctx = await getStaff();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid post.");
  const { supabase } = ctx;
  const { data: post, error } = await supabase.from("posts").select("id, body, published_at").eq("id", id).maybeSingle();
  if (error) return dbFail("setPostStatus:load", error);
  if (!post) return fail(NOT_ALLOWED);

  const now = new Date();
  const wasLive = post.published_at && new Date(post.published_at) <= now ? post.published_at : null;
  if (target === "published" && !String(post.body).trim()) return fail("This post has no content yet.");
  const update =
    target === "published"
      ? { status: "published", published_at: wasLive ?? now.toISOString(), scheduled_at: null }
      : { status: "draft", published_at: wasLive, scheduled_at: null };
  const res = await supabase.from("posts").update(update).eq("id", id).select("id");
  if (res.error) return dbFail("setPostStatus:update", res.error);
  if (!res.data?.length) return fail(NOT_ALLOWED);
  refresh();
  return succeed(target === "published" ? "Post published." : "Post unpublished — it is now a private draft.");
}

export async function deletePost(id: string): Promise<ActionResult> {
  const ctx = await getStaff();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("Invalid post.");
  const res = await ctx.supabase.from("posts").delete().eq("id", id).select("id");
  if (res.error) return dbFail("deletePost", res.error);
  if (!res.data?.length) return fail(NOT_ALLOWED);
  refresh();
  return succeed("Post deleted.");
}

/** Markdown → sanitised HTML for the editor's Preview tab (same renderer as the public site). */
export async function renderPreview(markdown: string): Promise<ActionResult<{ html: string; toc: TocItem[] }>> {
  const ctx = await getStaff();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (typeof markdown !== "string" || markdown.length > 200_000) return fail("Content is too large to preview.");
  return succeed(undefined, renderMarkdown(stripControl(markdown)));
}

/**
 * Saves AI-generated text as a DRAFT only. Status is hard-coded: nothing generated by AI
 * can be published without the owner opening the draft and explicitly publishing it.
 */
export async function createDraftFromText(input: { title: string; body: string }): Promise<ActionResult<{ id: string }>> {
  const ctx = await getStaff();
  if (!ctx) return fail(SESSION_EXPIRED);
  const title = stripControl(String(input.title ?? "")).trim().slice(0, 160) || "Untitled draft";
  const body = stripControl(String(input.body ?? "")).slice(0, 200_000);
  for (let attempt = 1; attempt <= 6; attempt++) {
    const slug = attempt === 1 ? slugify(title) || "draft" : `${(slugify(title) || "draft").slice(0, 70)}-${Math.random().toString(36).slice(2, 6)}`;
    const res = await ctx.supabase
      .from("posts")
      .insert({ title, slug, body, status: "draft", author_id: ctx.user.id, reading_time_minutes: readingTimeMinutes(body) })
      .select("id");
    if (res.error) {
      if (isUniqueViolation(res.error)) continue;
      return dbFail("createDraftFromText", res.error);
    }
    return succeed("Draft created. Review and edit it before publishing.", { id: res.data![0].id });
  }
  return fail("Couldn't create the draft. Please try again.");
}
