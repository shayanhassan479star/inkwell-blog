"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useConfirm } from "@/components/ui/confirm";
import { Spinner, EmptyState } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { deleteCategory, deleteTag, saveCategory, saveTag } from "@/lib/actions/taxonomy";
import type { ActionResult } from "@/lib/types";

type Item = { id: string; name: string; slug: string; description?: string | null; post_count: number };
type Kind = "category" | "tag";

const COPY = {
  category: { one: "category", many: "Categories", save: saveCategory, remove: deleteCategory, hasDescription: true },
  tag: { one: "tag", many: "Tags", save: saveTag, remove: deleteTag, hasDescription: false },
} as const;

function ItemForm({ kind, item, onDone, onCancel }: { kind: Kind; item?: Item; onDone: () => void; onCancel?: () => void }) {
  const copy = COPY[kind];
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(item?.name ?? "");
  const [slug, setSlug] = useState(item?.slug ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res: ActionResult = await copy.save({ id: item?.id ?? null, name, slug, description });
      if (res.ok) {
        toast(res.message ?? "Saved.", "success");
        if (!item) { setName(""); setSlug(""); setDescription(""); }
        setErrors({});
        router.refresh();
        onDone();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast(res.error, "error");
      }
    });
  };

  const idp = item?.id ?? "new";
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start" noValidate>
      <div>
        <label htmlFor={`n-${idp}`} className="label">Name</label>
        <input id={`n-${idp}`} value={name} onChange={(e) => setName(e.target.value)} required maxLength={copy.one === "tag" ? 40 : 60} className="input" aria-invalid={Boolean(errors.name)} />
        {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor={`s-${idp}`} className="label">URL slug</label>
        <input id={`s-${idp}`} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="auto from name" maxLength={80} className="input font-mono text-[13px]" aria-invalid={Boolean(errors.slug)} />
        {errors.slug && <p className="field-error" role="alert">{errors.slug}</p>}
      </div>
      <div className="flex gap-2 sm:mt-7">
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? <Spinner /> : !item && <Plus className="h-4 w-4" aria-hidden />}{item ? "Save" : `Add ${copy.one}`}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
      {copy.hasDescription && (
        <div className="sm:col-span-3">
          <label htmlFor={`d-${idp}`} className="label">Description <span className="font-normal text-muted-foreground">(optional, shown on the category page)</span></label>
          <textarea id={`d-${idp}`} rows={2} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} maxLength={300} className="input" />
          {errors.description && <p className="field-error" role="alert">{errors.description}</p>}
        </div>
      )}
    </form>
  );
}

export function TaxonomyManager({ kind, items }: { kind: Kind; items: Item[] }) {
  const copy = COPY[kind];
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const remove = async (item: Item) => {
    const ok = await confirm({
      title: `Delete “${item.name}”?`,
      description: item.post_count > 0 ? `${item.post_count} live ${item.post_count === 1 ? "post uses" : "posts use"} this ${copy.one}. The posts stay; they just lose it.` : `This ${copy.one} isn't used by any live post.`,
      confirmLabel: `Delete ${copy.one}`,
      destructive: true,
    });
    if (!ok) return;
    start(async () => {
      const res = await copy.remove(item.id);
      if (res.ok) { toast(res.message ?? "Deleted.", "success"); router.refresh(); }
      else toast(res.error, "error");
    });
  };

  return (
    <div className="space-y-6">
      <section className="card p-5" aria-label={`Add a ${copy.one}`}>
        <ItemForm kind={kind} onDone={() => {}} />
      </section>

      {items.length === 0 ? (
        <EmptyState title={`No ${copy.one === "tag" ? "tags" : "categories"} yet`}>{kind === "category" ? "Categories group your articles into the sections readers can browse." : "Tags are added from the post editor, or create them here."}</EmptyState>
      ) : (
        <ul className="card divide-y divide-border overflow-hidden" aria-label={copy.many}>
          {items.map((item) => (
            <li key={item.id} className="px-5 py-4">
              {editing === item.id ? (
                <ItemForm kind={kind} item={item} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">/{kind}/{item.slug} · {item.post_count} live {item.post_count === 1 ? "post" : "posts"}</p>
                    {item.description && <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button type="button" className="btn btn-ghost h-9 w-9 p-0" onClick={() => setEditing(item.id)} aria-label={`Edit ${item.name}`}><Pencil className="h-4 w-4" aria-hidden /></button>
                    <button type="button" className="btn btn-ghost h-9 w-9 p-0 text-danger hover:bg-danger/10" onClick={() => remove(item)} disabled={pending} aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" aria-hidden /></button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
