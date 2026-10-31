"use client";

import { Eye, ExternalLink, Sparkles, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/ui/confirm";
import { Alert, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { deletePost, savePost } from "@/lib/actions/posts";
import { toDateTimeLocal } from "@/lib/format";
import { effectiveStatus, type EffectiveStatus } from "@/lib/post-status";
import { site } from "@/lib/site";
import { slugify } from "@/lib/slug";
import type { Category, PostFull, PostStatus, Tag } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AiWorkbench, type EditorBridge, type InsertMode } from "./ai-workbench";
import { ImageUploadField } from "./image-upload-field";
import { MarkdownEditor } from "./markdown-editor";
import { StatusBadge } from "./ui";

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  coverImageAlt: string;
  categoryIds: string[];
  tagIds: string[];
  newTags: string[];
  isFeatured: boolean;
  seoTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  authorId: string;
  scheduledLocal: string;
};

type Props = {
  post: PostFull | null;
  categories: Category[];
  tags: Tag[];
  authors: { id: string; display_name: string }[];
  isAdmin: boolean;
  currentUserId: string;
};

const initialState = (post: PostFull | null, currentUserId: string): FormState => ({
  title: post?.title ?? "",
  slug: post?.slug ?? "",
  excerpt: post?.excerpt ?? "",
  body: post?.body ?? "",
  coverImageUrl: post?.cover_image_url ?? "",
  coverImageAlt: post?.cover_image_alt ?? "",
  categoryIds: post?.categories.map((c) => c.id) ?? [],
  tagIds: post?.tags.map((t) => t.id) ?? [],
  newTags: [],
  isFeatured: post?.is_featured ?? false,
  seoTitle: post?.seo_title ?? "",
  metaDescription: post?.meta_description ?? "",
  canonicalUrl: post?.canonical_url ?? "",
  authorId: post?.author?.id ?? currentUserId,
  scheduledLocal: toDateTimeLocal(post?.status === "scheduled" ? post.scheduled_at : null),
});

function Field({ id, label, error, hint, count, max, children }: { id: string; label: string; error?: string; hint?: string; count?: number; max?: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        {max !== undefined && count !== undefined && <span className={cn("text-xs tabular-nums", count > max ? "text-danger" : "text-muted-foreground")}>{count}/{max}</span>}
      </div>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="hint">{hint}</p>}
      {error && <p id={`${id}-err`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function PostEditor({ post, categories, tags, authors, isAdmin, currentUserId }: Props) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [f, setF] = useState<FormState>(() => initialState(post, currentUserId));
  const [saved, setSaved] = useState<{ id: string | null; status: PostStatus; publishedAt: string | null; scheduledAt: string | null }>({
    id: post?.id ?? null,
    status: post?.status ?? "draft",
    publishedAt: post?.published_at ?? null,
    scheduledAt: post?.scheduled_at ?? null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "draft" | "published" | "scheduled" | "delete">(null);
  const [tagText, setTagText] = useState("");
  const [selection, setSelection] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMounted, setAiMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const aiDialogRef = useRef<HTMLDialogElement>(null);
  const baseline = useRef(JSON.stringify(initialState(post, currentUserId)));

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key as string] ? { ...prev, [key]: "" } : prev));
  }, []);

  const dirty = JSON.stringify(f) !== baseline.current;
  const state: EffectiveStatus = saved.id ? effectiveStatus({ status: saved.status, published_at: saved.publishedAt, scheduled_at: saved.scheduledAt }) : "draft";
  const isNew = !saved.id;

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* ─────────── save / publish / schedule ─────────── */
  const submit = useCallback(
    async (target: PostStatus) => {
      if (busy) return;
      setFormError(null);
      const nextErrors: Record<string, string> = {};
      if (!f.title.trim()) nextErrors.title = "Give the post a title.";
      let scheduledAt: string | null = null;
      if (target === "scheduled") {
        const when = f.scheduledLocal ? new Date(f.scheduledLocal) : null;
        if (!when || Number.isNaN(when.getTime())) nextErrors.scheduledAt = "Choose a date and time.";
        else if (when.getTime() <= Date.now() && state !== "scheduled") nextErrors.scheduledAt = "Pick a time in the future.";
        else scheduledAt = when.toISOString();
      }
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        toast(Object.values(nextErrors)[0], "error");
        return;
      }

      setBusy(target);
      const res = await savePost({
        id: saved.id,
        title: f.title,
        // New posts: leave the slug empty unless the writer typed one, so the server can add -2, -3 if it's taken.
        slug: f.slug,
        excerpt: f.excerpt,
        body: f.body,
        coverImageUrl: f.coverImageUrl,
        coverImageAlt: f.coverImageAlt,
        status: target,
        scheduledAt,
        isFeatured: f.isFeatured,
        seoTitle: f.seoTitle,
        metaDescription: f.metaDescription,
        canonicalUrl: f.canonicalUrl,
        categoryIds: f.categoryIds,
        tagIds: f.tagIds,
        newTags: f.newTags,
        authorId: isAdmin ? f.authorId : null,
      });
      setBusy(null);

      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        toast(res.error, "error");
        return;
      }
      toast(res.message ?? "Saved.", "success");
      const d = res.data!;
      const nextForm = { ...f, slug: d.slug, newTags: [] as string[] };
      setF(nextForm);
      setErrors({});
      setSaved({ id: d.id, status: d.status, publishedAt: d.status === "published" ? (saved.publishedAt ?? new Date().toISOString()) : saved.publishedAt, scheduledAt });
      baseline.current = JSON.stringify(nextForm);
      if (isNew) router.replace(`/admin/posts/${d.id}`);
      else router.refresh();
    },
    [busy, f, saved, state, isAdmin, isNew, router, toast],
  );

  const onPublish = async () => {
    const ok = await confirm({
      title: state === "scheduled" ? "Publish now instead of waiting?" : "Publish this post?",
      description: "It becomes visible to everyone on the site immediately.",
      confirmLabel: "Publish",
    });
    if (ok) void submit("published");
  };
  const onUnpublish = async () => {
    const ok = await confirm({
      title: state === "scheduled" ? "Cancel the schedule?" : "Unpublish this post?",
      description: "It goes back to draft and is hidden from readers. Your content is kept.",
      confirmLabel: state === "scheduled" ? "Return to draft" : "Unpublish",
    });
    if (ok) void submit("draft");
  };
  const onDelete = async () => {
    if (!saved.id) return;
    const ok = await confirm({ title: "Delete this post permanently?", description: "The post and its comments will be removed. This cannot be undone.", confirmLabel: "Delete post", destructive: true });
    if (!ok) return;
    setBusy("delete");
    const res = await deletePost(saved.id);
    if (res.ok) {
      baseline.current = JSON.stringify(f); // nothing left to lose
      toast(res.message ?? "Post deleted.", "success");
      router.push("/admin/posts");
      router.refresh();
    } else {
      setBusy(null);
      toast(res.error, "error");
    }
  };

  // Ctrl/Cmd+S keeps the post in its current state (draft stays draft, live stays live).
  const primarySave = useCallback(() => {
    void submit(state === "published" ? "published" : state === "scheduled" && f.scheduledLocal ? "scheduled" : "draft");
  }, [submit, state, f.scheduledLocal]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        primarySave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primarySave]);

  /* ─────────── tags ─────────── */
  const addTag = (raw: string) => {
    const name = raw.trim().replace(/^#+/, "").slice(0, 40);
    if (!name) return;
    const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase() || t.slug === slugify(name, 60));
    if (existing) {
      if (!f.tagIds.includes(existing.id)) set("tagIds", [...f.tagIds, existing.id]);
    } else if (!f.newTags.some((n) => n.toLowerCase() === name.toLowerCase())) {
      set("newTags", [...f.newTags, name]);
    }
    setTagText("");
  };
  const selectedTags = useMemo(
    () => [
      ...f.tagIds.map((id) => ({ key: id, label: tags.find((t) => t.id === id)?.name ?? "tag", remove: () => set("tagIds", f.tagIds.filter((x) => x !== id)) })),
      ...f.newTags.map((n) => ({ key: `new:${n}`, label: n, remove: () => set("newTags", f.newTags.filter((x) => x !== n)) })),
    ],
    [f.tagIds, f.newTags, tags, set],
  );

  /* ─────────── AI bridge ─────────── */
  const bridge: EditorBridge = {
    title: f.title,
    body: f.body,
    selection,
    insert: (text, mode: InsertMode) => {
      const el = textareaRef.current;
      setF((prev) => {
        const body = prev.body;
        let next: string;
        if (mode === "replace") next = text;
        else if (mode === "append" || !el) next = `${body.trimEnd()}${body.trim() ? "\n\n" : ""}${text}`;
        else if (mode === "selection") next = body.slice(0, el.selectionStart) + text + body.slice(el.selectionEnd);
        else next = body.slice(0, el.selectionStart) + text + body.slice(el.selectionStart);
        return { ...prev, body: next };
      });
    },
    applySeo: (patch) => {
      setF((prev) => ({
        ...prev,
        seoTitle: patch.seoTitle ?? prev.seoTitle,
        metaDescription: patch.metaDescription ?? prev.metaDescription,
        excerpt: patch.excerpt ?? prev.excerpt,
        slug: patch.slug && (isNew || state === "draft") ? patch.slug : prev.slug,
      }));
    },
  };

  const openAi = () => {
    setAiMounted(true);
    setAiOpen(true);
  };
  useEffect(() => {
    const dlg = aiDialogRef.current;
    if (!dlg) return;
    if (aiOpen && !dlg.open) dlg.showModal();
    if (!aiOpen && dlg.open) dlg.close();
  }, [aiOpen, aiMounted]);

  const seoTitleShown = f.seoTitle || f.title || "Post title";
  const slugShown = f.slug || slugify(f.title) || "post-url";
  const descShown = f.metaDescription || f.excerpt || "Add a meta description to control how this post appears in search results.";

  const liveHref = saved.id && state === "published" ? `/blog/${f.slug}` : null;

  return (
    <div>
      {/* ───── top bar ───── */}
      <div className="sticky top-14 z-20 -mx-4 mb-6 flex flex-wrap items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:top-0 lg:-mx-10 lg:px-10">
        <div className="mr-auto flex items-center gap-3">
          <StatusBadge status={state} />
          {dirty ? <span className="text-xs font-medium text-accent">Unsaved changes</span> : !isNew && <span className="text-xs text-muted-foreground">All changes saved</span>}
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={openAi}><Sparkles className="h-4 w-4" aria-hidden />AI assistant</button>
        {saved.id && (liveHref ? (
          <Link href={liveHref} target="_blank" className="btn btn-outline btn-sm"><ExternalLink className="h-4 w-4" aria-hidden />View live</Link>
        ) : (
          <Link href={`/admin/posts/${saved.id}/preview`} target="_blank" className="btn btn-outline btn-sm" title="Shows the last saved version"><Eye className="h-4 w-4" aria-hidden />Preview</Link>
        ))}
        {state === "draft" && (
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => void submit("draft")} disabled={Boolean(busy)}>{busy === "draft" && <Spinner />}Save draft</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={onPublish} disabled={Boolean(busy)}>{busy === "published" && <Spinner />}Publish</button>
          </>
        )}
        {state === "published" && (
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={onUnpublish} disabled={Boolean(busy)}>Unpublish</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void submit("published")} disabled={Boolean(busy)}>{busy === "published" && <Spinner />}Save changes</button>
          </>
        )}
        {state === "scheduled" && (
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={onUnpublish} disabled={Boolean(busy)}>Return to draft</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={onPublish} disabled={Boolean(busy)}>Publish now</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => void submit("scheduled")} disabled={Boolean(busy)}>{busy === "scheduled" && <Spinner />}Save schedule</button>
          </>
        )}
      </div>

      {formError && <Alert kind="error" className="mb-6">{formError}</Alert>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* ───── main column ───── */}
        <div className="min-w-0 space-y-6">
          <div>
            <label htmlFor="title" className="sr-only">Title</label>
            <input
              id="title"
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Post title"
              maxLength={160}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-err" : undefined}
              className="block w-full border-0 border-b border-border bg-transparent px-0 pb-3 font-display text-4xl font-semibold leading-tight tracking-tight outline-none placeholder:text-muted-foreground/50 focus:border-accent md:text-5xl"
            />
            {errors.title && <p id="title-err" className="field-error" role="alert">{errors.title}</p>}
          </div>

          <MarkdownEditor value={f.body} onChange={(v) => set("body", v)} textareaRef={textareaRef} error={errors.body} onSelectionChange={setSelection} />

          <Field id="excerpt" label="Excerpt" error={errors.excerpt} count={f.excerpt.length} max={320} hint="Shown on cards and used as the fallback description. Two sentences is plenty.">
            <textarea id="excerpt" rows={3} value={f.excerpt} onChange={(e) => set("excerpt", e.target.value)} maxLength={400} className="input" aria-invalid={Boolean(errors.excerpt)} />
          </Field>
        </div>

        {/* ───── sidebar ───── */}
        <div className="space-y-5">
          {(state === "draft" || state === "scheduled") && (
            <section className="card p-5" aria-labelledby="sched-h">
              <h2 id="sched-h" className="text-base font-semibold">Schedule</h2>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">Go live automatically at a set time (your local time zone). Until then the post stays private.</p>
              <Field id="scheduledAt" label="Publish on" error={errors.scheduledAt}>
                <input id="scheduledAt" type="datetime-local" value={f.scheduledLocal} onChange={(e) => set("scheduledLocal", e.target.value)} className="input" aria-invalid={Boolean(errors.scheduledAt)} />
              </Field>
              {state === "draft" && (
                <button type="button" className="btn btn-outline btn-sm mt-3 w-full" onClick={() => void submit("scheduled")} disabled={Boolean(busy)}>
                  {busy === "scheduled" && <Spinner />}Schedule post
                </button>
              )}
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 text-base font-semibold">Cover image</h2>
            <ImageUploadField label="Image" value={f.coverImageUrl} onChange={(v) => set("coverImageUrl", v)} error={errors.coverImageUrl} />
            <div className="mt-3">
              <Field id="coverAlt" label="Alt text" error={errors.coverImageAlt} hint="Describe the image for people using screen readers.">
                <input id="coverAlt" value={f.coverImageAlt} onChange={(e) => set("coverImageAlt", e.target.value)} maxLength={200} className="input" />
              </Field>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-1 text-base font-semibold">Categories</h2>
            <p className="mb-3 text-xs text-muted-foreground">The first one you tick is the primary category.</p>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">{isAdmin ? <>No categories yet. <Link href="/admin/categories" className="text-accent underline">Create one</Link>.</> : "No categories have been created yet."}</p>
            ) : (
              <fieldset>
                <legend className="sr-only">Categories</legend>
                <ul className="space-y-2">
                  {categories.map((c) => {
                    const checked = f.categoryIds.includes(c.id);
                    return (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                          <input type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" checked={checked} onChange={() => set("categoryIds", checked ? f.categoryIds.filter((x) => x !== c.id) : [...f.categoryIds, c.id])} />
                          {c.name}
                          {checked && f.categoryIds[0] === c.id && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">Primary</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-base font-semibold">Tags</h2>
            {selectedTags.length > 0 && (
              <ul className="mb-3 flex flex-wrap gap-1.5" aria-label="Selected tags">
                {selectedTags.map((t) => (
                  <li key={t.key} className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pl-3 pr-1.5 text-xs font-medium">
                    #{t.label}
                    <button type="button" onClick={t.remove} className="rounded-full p-0.5 hover:bg-border" aria-label={`Remove tag ${t.label}`}><X className="h-3 w-3" aria-hidden /></button>
                  </li>
                ))}
              </ul>
            )}
            <label htmlFor="tag-input" className="sr-only">Add a tag</label>
            <input
              id="tag-input"
              list="tag-suggestions"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagText);
                }
              }}
              onBlur={() => addTag(tagText)}
              placeholder="Type a tag, press Enter"
              maxLength={40}
              className="input"
              disabled={f.tagIds.length + f.newTags.length >= 20}
            />
            <datalist id="tag-suggestions">{tags.filter((t) => !f.tagIds.includes(t.id)).map((t) => <option key={t.id} value={t.name} />)}</datalist>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="text-base font-semibold">Search & sharing (SEO)</h2>
            <div className="rounded-xl border border-border bg-muted/40 p-3" aria-label="Search result preview">
              <p className="truncate text-xs text-muted-foreground">{site.url.replace(/^https?:\/\//, "")} › blog › {slugShown}</p>
              <p className="mt-0.5 line-clamp-1 text-base font-medium text-[#1a0dab] dark:text-[#8ab4f8]">{seoTitleShown}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{descShown}</p>
            </div>
            <Field id="seoTitle" label="SEO title" error={errors.seoTitle} count={f.seoTitle.length} max={70} hint="Leave empty to use the post title. Around 50–60 characters works well.">
              <input id="seoTitle" value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className="input" aria-invalid={Boolean(errors.seoTitle)} />
            </Field>
            <Field id="metaDescription" label="Meta description" error={errors.metaDescription} count={f.metaDescription.length} max={170} hint="Around 120–155 characters.">
              <textarea id="metaDescription" rows={3} value={f.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} className="input" aria-invalid={Boolean(errors.metaDescription)} />
            </Field>
            <Field id="canonicalUrl" label="Canonical URL" error={errors.canonicalUrl} hint="Only if this article was first published elsewhere. Leave empty otherwise.">
              <input id="canonicalUrl" type="url" inputMode="url" value={f.canonicalUrl} onChange={(e) => set("canonicalUrl", e.target.value)} placeholder="https://" className="input" aria-invalid={Boolean(errors.canonicalUrl)} />
            </Field>
          </section>

          <section className="card space-y-4 p-5">
            <h2 className="text-base font-semibold">Advanced</h2>
            <Field id="slug" label="URL slug" error={errors.slug} hint={state !== "draft" && !isNew ? "Changing the URL of a live post breaks links people already have." : `${site.url}/blog/${slugShown}`}>
              <input id="slug" value={f.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} placeholder={slugify(f.title) || "generated from the title"} maxLength={80} className="input font-mono text-[13px]" aria-invalid={Boolean(errors.slug)} />
            </Field>
            {isAdmin && (
              <>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent))]" checked={f.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} />
                  <span><span className="inline-flex items-center gap-1 font-medium"><Star className="h-3.5 w-3.5" aria-hidden />Featured post</span><br /><span className="text-xs text-muted-foreground">Shown in the homepage hero.</span></span>
                </label>
                {authors.length > 1 && (
                  <Field id="authorId" label="Author" error={errors.authorId}>
                    <select id="authorId" value={f.authorId} onChange={(e) => set("authorId", e.target.value)} className="input">
                      {authors.map((a) => <option key={a.id} value={a.id}>{a.display_name}</option>)}
                    </select>
                  </Field>
                )}
              </>
            )}
          </section>

          {saved.id && (
            <button type="button" className="btn btn-outline w-full border-danger/40 text-danger hover:bg-danger/10" onClick={onDelete} disabled={Boolean(busy)}>
              {busy === "delete" ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden />}Delete post
            </button>
          )}
        </div>
      </div>

      {/* ───── AI drawer ───── */}
      <dialog
        ref={aiDialogRef}
        onClose={() => setAiOpen(false)}
        onClick={(e) => { if (e.target === aiDialogRef.current) setAiOpen(false); }}
        aria-label="AI writing assistant"
        className="m-0 ml-auto h-full max-h-none w-full max-w-xl border-l border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/40"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-accent" aria-hidden />AI assistant</h2>
            <button type="button" className="btn btn-ghost h-9 w-9 p-0" onClick={() => setAiOpen(false)} aria-label="Close AI assistant"><X className="h-4 w-4" aria-hidden /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {aiMounted && <AiWorkbench bridge={bridge} tools={["rewrite", "summarize", "seo", "faq", "proofread", "outline", "keywords", "draft", "topics"]} />}
          </div>
        </div>
      </dialog>
    </div>
  );
}
