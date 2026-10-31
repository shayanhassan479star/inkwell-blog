"use client";

import { Eye, Pencil, Trash2, Undo2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui/feedback";
import { useConfirm } from "@/components/ui/confirm";
import { useToast } from "@/components/ui/toast";
import { deletePost, setPostStatus } from "@/lib/actions/posts";
import type { EffectiveStatus } from "@/lib/post-status";

export function PostRowActions({ id, title, slug, status }: { id: string; title: string; slug: string; status: EffectiveStatus }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  const run = (label: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      setBusy(label);
      const res = await fn();
      setBusy(null);
      if (res.ok) {
        toast(res.message ?? "Done.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Something went wrong.", "error");
      }
    });

  const onPublish = async () => {
    const ok = await confirm({ title: "Publish this post?", description: `“${title}” will become visible to everyone.`, confirmLabel: "Publish" });
    if (ok) run("publish", () => setPostStatus(id, "published"));
  };
  const onUnpublish = async () => {
    const ok = await confirm({ title: "Unpublish this post?", description: "It will return to draft and disappear from the site immediately. You can publish it again later.", confirmLabel: "Unpublish" });
    if (ok) run("unpublish", () => setPostStatus(id, "draft"));
  };
  const onDelete = async () => {
    const ok = await confirm({ title: "Delete this post permanently?", description: `“${title}” and its comments will be deleted. This cannot be undone.`, confirmLabel: "Delete post", destructive: true });
    if (ok) run("delete", () => deletePost(id));
  };

  const iconBtn = "btn btn-ghost h-9 w-9 p-0";
  return (
    <div className="flex items-center justify-end gap-0.5">
      {pending && <Spinner className="mr-1 text-muted-foreground" />}
      <Link href={`/admin/posts/${id}`} className={iconBtn} aria-label={`Edit ${title}`} title="Edit"><Pencil className="h-4 w-4" aria-hidden /></Link>
      {status === "published" ? (
        <Link href={`/blog/${slug}`} target="_blank" className={iconBtn} aria-label={`View ${title} on the site`} title="View on site"><Eye className="h-4 w-4" aria-hidden /></Link>
      ) : (
        <Link href={`/admin/posts/${id}/preview`} className={iconBtn} aria-label={`Preview ${title}`} title="Preview"><Eye className="h-4 w-4" aria-hidden /></Link>
      )}
      {status === "draft" ? (
        <button type="button" className={iconBtn} onClick={onPublish} disabled={pending} aria-label={`Publish ${title}`} title="Publish"><UploadCloud className="h-4 w-4" aria-hidden /></button>
      ) : (
        <button type="button" className={iconBtn} onClick={onUnpublish} disabled={pending} aria-label={`Unpublish ${title}`} title="Unpublish"><Undo2 className="h-4 w-4" aria-hidden /></button>
      )}
      <button type="button" className={`${iconBtn} text-danger hover:bg-danger/10`} onClick={onDelete} disabled={pending} aria-label={`Delete ${title}`} title={busy === "delete" ? "Deleting…" : "Delete"}><Trash2 className="h-4 w-4" aria-hidden /></button>
    </div>
  );
}
