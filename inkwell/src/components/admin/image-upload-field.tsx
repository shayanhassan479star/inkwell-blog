/* eslint-disable @next/next/no-img-element */
"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Spinner } from "@/components/ui/feedback";

/** Uploads through /api/admin/upload (server validates the real file type and size) and reports the public URL. */
export async function uploadImage(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (file.size > 4 * 1024 * 1024) return { ok: false, error: "Image is too large (max 4 MB)." };
  const body = new FormData();
  body.append("file", file);
  try {
    const res = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? "Upload failed." };
    return { ok: true, url: data.url as string };
  } catch {
    return { ok: false, error: "Network error while uploading." };
  }
}

export function ImageUploadField({
  value, onChange, label = "Image", rounded = false, error,
}: { value: string; onChange: (url: string) => void; label?: string; rounded?: boolean; error?: string }) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setProblem(null);
    const res = await uploadImage(file);
    setBusy(false);
    if (res.ok) onChange(res.url);
    else setProblem(res.error);
  };

  return (
    <div>
      <label htmlFor={`${id}-url`} className="label">{label}</label>
      {value && (
        <div className={`mb-2 overflow-hidden border border-border bg-muted ${rounded ? "h-20 w-20 rounded-full" : "aspect-[16/9] rounded-xl"}`}>
          <img src={value} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex gap-2">
        <input id={`${id}-url`} type="url" inputMode="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" className="input" aria-invalid={Boolean(error || problem)} />
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" onChange={onFile} tabIndex={-1} aria-label={`Upload ${label.toLowerCase()}`} />
        <button type="button" className="btn btn-outline shrink-0" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Spinner /> : <ImagePlus className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{busy ? "Uploading…" : "Upload"}</span>
        </button>
        {value && <button type="button" className="btn btn-ghost shrink-0 px-2" onClick={() => onChange("")} aria-label={`Remove ${label.toLowerCase()}`}><Trash2 className="h-4 w-4" aria-hidden /></button>}
      </div>
      {(error || problem) && <p className="field-error" role="alert">{error ?? problem}</p>}
      <p className="hint">JPEG, PNG, WebP, GIF or AVIF · up to 4 MB.</p>
    </div>
  );
}
