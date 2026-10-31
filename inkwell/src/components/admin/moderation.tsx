"use client";

import { Archive, Check, Mail, MailOpen, ShieldAlert, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useConfirm } from "@/components/ui/confirm";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { deleteComment, deleteMessage, deleteSubscriber, setCommentStatus, setMessageStatus } from "@/lib/actions/moderation";
import type { CommentStatus, MessageStatus } from "@/lib/types";

function useRunner() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) { toast(res.message ?? "Done.", "success"); router.refresh(); }
      else toast(res.error ?? "Something went wrong.", "error");
    });
  return { run, pending };
}

export function CommentActions({ id, status, author }: { id: string; status: CommentStatus; author: string }) {
  const { run, pending } = useRunner();
  const confirm = useConfirm();
  const del = async () => {
    if (await confirm({ title: "Delete this comment?", description: `The comment from ${author} will be removed permanently.`, confirmLabel: "Delete", destructive: true })) run(() => deleteComment(id));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending && <Spinner className="text-muted-foreground" />}
      {status !== "approved" && <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run(() => setCommentStatus(id, "approved"))}><Check className="h-4 w-4" aria-hidden />Approve</button>}
      {status !== "rejected" && status !== "spam" && <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => setCommentStatus(id, "rejected"))}><X className="h-4 w-4" aria-hidden />Reject</button>}
      {status !== "spam" && <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => setCommentStatus(id, "spam"))}><ShieldAlert className="h-4 w-4" aria-hidden />Spam</button>}
      {status === "approved" && <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => setCommentStatus(id, "pending"))}>Unapprove</button>}
      <button type="button" className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" disabled={pending} onClick={del}><Trash2 className="h-4 w-4" aria-hidden />Delete</button>
    </div>
  );
}

export function MessageActions({ id, status, email, subject }: { id: string; status: MessageStatus; email: string; subject: string }) {
  const { run, pending } = useRunner();
  const confirm = useConfirm();
  const del = async () => {
    if (await confirm({ title: "Delete this message?", description: "It will be removed permanently.", confirmLabel: "Delete", destructive: true })) run(() => deleteMessage(id));
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pending && <Spinner className="text-muted-foreground" />}
      <a className="btn btn-primary btn-sm" href={`mailto:${encodeURIComponent(email).replace("%40", "@")}?subject=${encodeURIComponent(`Re: ${subject}`)}`}><Mail className="h-4 w-4" aria-hidden />Reply by email</a>
      {status === "new" ? (
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => setMessageStatus(id, "read"))}><MailOpen className="h-4 w-4" aria-hidden />Mark read</button>
      ) : status === "read" ? (
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => setMessageStatus(id, "new"))}>Mark unread</button>
      ) : null}
      {status !== "archived" ? (
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => setMessageStatus(id, "archived"))}><Archive className="h-4 w-4" aria-hidden />Archive</button>
      ) : (
        <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => run(() => setMessageStatus(id, "read"))}>Restore</button>
      )}
      <button type="button" className="btn btn-ghost btn-sm text-danger hover:bg-danger/10" disabled={pending} onClick={del}><Trash2 className="h-4 w-4" aria-hidden />Delete</button>
    </div>
  );
}

export function SubscriberDelete({ id, email }: { id: string; email: string }) {
  const { run, pending } = useRunner();
  const confirm = useConfirm();
  const del = async () => {
    if (await confirm({ title: "Remove this subscriber?", description: `${email} will be deleted from your list (for example to honour an erasure request).`, confirmLabel: "Remove", destructive: true })) run(() => deleteSubscriber(id));
  };
  return (
    <button type="button" className="btn btn-ghost h-8 w-8 p-0 text-danger hover:bg-danger/10" disabled={pending} onClick={del} aria-label={`Remove ${email}`}>
      {pending ? <Spinner /> : <Trash2 className="h-4 w-4" aria-hidden />}
    </button>
  );
}
