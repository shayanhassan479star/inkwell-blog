"use client";

import { Bold, Code, Code2, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { renderPreview } from "@/lib/actions/posts";
import { Spinner } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import { uploadImage } from "./image-upload-field";

type Props = {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  error?: string;
  onSelectionChange?: (selected: string) => void;
};

/** Applies a text edit to the textarea through React state, then restores the selection. */
function useEditorOps({ value, onChange, textareaRef }: Pick<Props, "value" | "onChange" | "textareaRef">) {
  const apply = (next: string, selStart: number, selEnd: number) => {
    onChange(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };
  const sel = () => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    return { start, end, text: value.slice(start, end) };
  };
  return {
    wrap(before: string, after: string, placeholder: string) {
      const { start, end, text } = sel();
      const inner = text || placeholder;
      apply(value.slice(0, start) + before + inner + after + value.slice(end), start + before.length, start + before.length + inner.length);
    },
    prefixLines(prefix: string | ((i: number) => string), placeholder: string) {
      const { start, end } = sel();
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end) || placeholder;
      const out = block.split("\n").map((l, i) => (typeof prefix === "function" ? prefix(i) : prefix) + l).join("\n");
      apply(value.slice(0, lineStart) + out + value.slice(end), lineStart, lineStart + out.length);
    },
    insertBlock(text: string) {
      const { start, end } = sel();
      const needsLead = start > 0 && !value.slice(0, start).endsWith("\n\n");
      const lead = needsLead ? (value.slice(0, start).endsWith("\n") ? "\n" : "\n\n") : "";
      const insert = `${lead}${text}\n\n`;
      apply(value.slice(0, start) + insert + value.slice(end), start + insert.length, start + insert.length);
    },
    link() {
      const { start, end, text } = sel();
      const label = text || "link text";
      const out = `[${label}](https://)`;
      const urlStart = start + label.length + 3;
      apply(value.slice(0, start) + out + value.slice(end), urlStart, urlStart + "https://".length);
    },
  };
}

export function MarkdownEditor(props: Props) {
  const { value, onChange, textareaRef, error, onSelectionChange } = props;
  const id = useId();
  const ops = useEditorOps(props);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState("");
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "error">("idle");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Server-side render for the preview, so it matches the public page exactly (same sanitiser).
  useEffect(() => {
    if (tab !== "preview") return;
    let cancelled = false;
    setPreviewState("loading");
    renderPreview(value).then((res) => {
      if (cancelled) return;
      if (res.ok && res.data) {
        setHtml(res.data.html);
        setPreviewState("idle");
      } else setPreviewState("error");
    });
    return () => {
      cancelled = true;
    };
  }, [tab, value]);

  const insertImageFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const res = await uploadImage(file);
    setUploading(false);
    if (res.ok) ops.insertBlock(`![Describe the image](${res.url})`);
    else setUploadError(res.error);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "b") { e.preventDefault(); ops.wrap("**", "**", "bold text"); }
    else if (k === "i") { e.preventDefault(); ops.wrap("*", "*", "italic text"); }
    else if (k === "k") { e.preventDefault(); ops.link(); }
  };

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const btn = "btn btn-ghost h-8 w-8 p-0 shrink-0";
  const tools: { label: string; icon: typeof Bold; run: () => void }[] = [
    { label: "Heading 2", icon: Heading2, run: () => ops.prefixLines("## ", "Heading") },
    { label: "Heading 3", icon: Heading3, run: () => ops.prefixLines("### ", "Heading") },
    { label: "Bold (Ctrl+B)", icon: Bold, run: () => ops.wrap("**", "**", "bold text") },
    { label: "Italic (Ctrl+I)", icon: Italic, run: () => ops.wrap("*", "*", "italic text") },
    { label: "Link (Ctrl+K)", icon: Link2, run: () => ops.link() },
    { label: "Quote", icon: Quote, run: () => ops.prefixLines("> ", "Quote") },
    { label: "Bulleted list", icon: List, run: () => ops.prefixLines("- ", "List item") },
    { label: "Numbered list", icon: ListOrdered, run: () => ops.prefixLines((i) => `${i + 1}. `, "List item") },
    { label: "Inline code", icon: Code, run: () => ops.wrap("`", "`", "code") },
    { label: "Code block", icon: Code2, run: () => ops.insertBlock("```\ncode\n```") },
    { label: "Divider", icon: Minus, run: () => ops.insertBlock("---") },
  ];

  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", error ? "border-danger" : "border-border")}>
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-2 py-1.5">
        <div role="tablist" aria-label="Editor mode" className="mr-2 flex rounded-lg bg-muted p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded-md px-3 py-1 text-xs font-medium capitalize", tab === t ? "bg-card shadow-sm" : "text-muted-foreground")}>
              {t}
            </button>
          ))}
        </div>
        {tab === "write" && (
          <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5">
            {tools.map((t) => (
              <button key={t.label} type="button" className={btn} onClick={t.run} title={t.label} aria-label={t.label}><t.icon className="h-4 w-4" aria-hidden /></button>
            ))}
            <button type="button" className={btn} onClick={() => fileRef.current?.click()} disabled={uploading} title="Insert image" aria-label="Insert image">
              {uploading ? <Spinner /> : <ImagePlus className="h-4 w-4" aria-hidden />}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void insertImageFile(f); }} />
          </div>
        )}
      </div>

      {tab === "write" ? (
        <>
          <label htmlFor={id} className="sr-only">Article body (Markdown)</label>
          <textarea
            id={id}
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={(e) => onSelectionChange?.(e.currentTarget.value.slice(e.currentTarget.selectionStart, e.currentTarget.selectionEnd))}
            onBlur={(e) => onSelectionChange?.(e.currentTarget.value.slice(e.currentTarget.selectionStart, e.currentTarget.selectionEnd))}
            placeholder="Start writing… Use Markdown: ## headings, **bold**, [links](https://…), > quotes, ``` code ```"
            spellCheck
            aria-invalid={Boolean(error)}
            className="block min-h-[26rem] w-full resize-y bg-transparent p-4 font-mono text-[14px] leading-relaxed outline-none"
          />
        </>
      ) : (
        <div className="min-h-[26rem] p-5 sm:p-8" aria-live="polite">
          {previewState === "loading" && !html ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner />Rendering preview…</p>
          ) : previewState === "error" ? (
            <p className="text-sm text-danger">The preview couldn&apos;t be rendered. Your text is safe — try again.</p>
          ) : html ? (
            // The HTML comes from the same server-side sanitiser the public site uses.
            <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
        <span>{words.toLocaleString("en-GB")} words · {Math.max(1, Math.ceil(words / 220))} min read</span>
        {uploadError && <span className="text-danger" role="alert">{uploadError}</span>}
      </div>
      {error && <p className="field-error px-3 pb-2" role="alert">{error}</p>}
    </div>
  );
}
