"use client";

import { AlertTriangle, Check, ClipboardCopy, FilePlus2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Alert, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { createDraftFromText } from "@/lib/actions/posts";
import { TOOL_ORDER, TOOL_UI, type FieldDef } from "@/lib/ai/ui-config";
import type { ToolId } from "@/lib/ai/tools";
import { cn } from "@/lib/utils";

export type AiStatus =
  | { configured: true; provider: string; model: string; remaining: number; dailyLimit: number }
  | { configured: false; reason: string };

export type SeoSuggestion = { seoTitle: string; metaDescription: string; excerpt: string; slug: string; alternatives: { seoTitle: string; metaDescription: string }[] };
export type InsertMode = "cursor" | "selection" | "append" | "replace";

/** Used inside the post editor: lets the writer push (edited) output into the article. */
export type EditorBridge = {
  title: string;
  body: string;
  selection: string;
  insert: (text: string, mode: InsertMode) => void;
  applySeo: (patch: Partial<{ seoTitle: string; metaDescription: string; excerpt: string; slug: string }>) => void;
};

type Result = { text: string; seo: SeoSuggestion | null; truncated: boolean; model: string };

export function AiWorkbench({ initialStatus, bridge, tools = TOOL_ORDER }: { initialStatus?: AiStatus; bridge?: EditorBridge; tools?: ToolId[] }) {
  const toast = useToast();
  const uid = useId();
  const [status, setStatus] = useState<AiStatus | null>(initialStatus ?? null);
  const [tool, setTool] = useState<ToolId>(tools[0]);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [output, setOutput] = useState("");
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Inside the editor we ask the server for the status (it knows the key and today's usage; the key is never sent).
  useEffect(() => {
    if (initialStatus) return;
    let cancelled = false;
    fetch("/api/admin/ai", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ok && d.configured) setStatus({ configured: true, provider: d.provider, model: d.model, remaining: d.remaining, dailyLimit: d.dailyLimit });
        else setStatus({ configured: false, reason: d.reason ?? d.error ?? "AI is not configured." });
      })
      .catch(() => !cancelled && setStatus({ configured: false, reason: "Couldn't reach the server." }));
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [initialStatus]);

  const def = TOOL_UI[tool];

  const valueOf = useCallback(
    (f: FieldDef): string => {
      const stored = values[tool]?.[f.name];
      if (stored !== undefined) return stored;
      if (bridge && f.prefill === "title") return bridge.title;
      if (bridge && f.prefill === "text") return bridge.selection.trim() ? bridge.selection : bridge.body;
      return f.default ?? "";
    },
    [values, tool, bridge],
  );

  const setValue = (name: string, v: string) => setValues((prev) => ({ ...prev, [tool]: { ...prev[tool], [name]: v } }));

  const selectTool = (id: ToolId) => {
    setTool(id);
    setResult(null);
    setOutput("");
    setError(null);
    setSavedDraftId(null);
  };

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (running) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setSavedDraftId(null);
    const input: Record<string, string> = {};
    for (const f of def.fields) input[f.name] = valueOf(f);

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 100_000);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, input }),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error ?? "The AI request failed. Please try again.");
        if (data.code === "not_configured") setStatus({ configured: false, reason: data.error });
      } else {
        setResult({ text: data.text, seo: data.seo, truncated: Boolean(data.truncated), model: data.model });
        setOutput(data.text);
        setStatus((s) => (s && s.configured ? { ...s, remaining: typeof data.remaining === "number" ? data.remaining : s.remaining } : s));
      }
    } catch (err) {
      setError((err as Error).name === "AbortError" ? "The request took too long and was cancelled. Try shorter input." : "Network error. Check your connection and try again.");
    } finally {
      window.clearTimeout(timer);
      setRunning(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Couldn't access the clipboard. Select the text and copy it manually.", "error");
    }
  };

  const saveDraft = async () => {
    const title = (values[tool]?.topic || values[tool]?.title || "AI draft").slice(0, 160);
    const res = await createDraftFromText({ title, body: output });
    if (res.ok && res.data) {
      setSavedDraftId(res.data.id);
      toast(res.message ?? "Draft created.", "success");
    } else if (!res.ok) toast(res.error, "error");
  };

  const disabled = !status || !status.configured;
  const seoApply = (patch: Parameters<EditorBridge["applySeo"]>[0], label: string) => {
    bridge?.applySeo(patch);
    toast(`${label} applied to the post. Review it, then save.`, "success");
  };

  const insertButtons = useMemo(
    () =>
      bridge
        ? ([
            ["cursor", "Insert at cursor"],
            ["selection", "Replace selection"],
            ["append", "Add to end"],
            ["replace", "Replace whole article"],
          ] as [InsertMode, string][])
        : [],
    [bridge],
  );

  return (
    <div>
      {status && !status.configured && (
        <Alert kind="info" title="AI tools aren't switched on yet" className="mb-5">
          {status.reason} Set <code>AI_PROVIDER</code>, <code>AI_API_KEY</code> and (optionally) <code>AI_MODEL</code> in the server environment and restart. Nothing below will run until then.
        </Alert>
      )}
      {status?.configured && (
        <p className="mb-4 text-xs text-muted-foreground">
          Using <strong className="font-semibold text-foreground">{status.model}</strong> via {status.provider} · {status.remaining} of {status.dailyLimit} requests left today
        </p>
      )}

      <div role="tablist" aria-label="AI tools" className="mb-5 flex flex-wrap gap-2">
        {tools.map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            id={`${uid}-tab-${id}`}
            aria-selected={tool === id}
            aria-controls={`${uid}-panel`}
            onClick={() => selectTool(id)}
            className={cn("chip", tool === id && "chip-active")}
          >
            {TOOL_UI[id].label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${tool}`}>
        <p className="mb-4 text-sm text-muted-foreground">{def.blurb}</p>
        <form onSubmit={run} className="space-y-4">
          {def.fields.map((f) => {
            const id = `${uid}-${tool}-${f.name}`;
            return (
              <div key={f.name}>
                <label htmlFor={id} className="label">{f.label}</label>
                {f.kind === "textarea" ? (
                  <textarea id={id} rows={f.rows ?? 5} value={valueOf(f)} onChange={(e) => setValue(f.name, e.target.value)} placeholder={f.placeholder} maxLength={24000} className="input font-mono text-[13px] leading-relaxed" />
                ) : f.kind === "select" ? (
                  <select id={id} value={valueOf(f)} onChange={(e) => setValue(f.name, e.target.value)} className="input">
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input id={id} type={f.kind === "number" ? "number" : "text"} min={f.kind === "number" ? 3 : undefined} max={f.kind === "number" ? 15 : undefined} value={valueOf(f)} onChange={(e) => setValue(f.name, e.target.value)} placeholder={f.placeholder} maxLength={f.kind === "text" ? 300 : undefined} className="input" />
                )}
                {f.hint && bridge && <p className="hint">{f.hint}</p>}
              </div>
            );
          })}
          <button type="submit" className="btn btn-primary" disabled={disabled || running}>
            {running ? <Spinner /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {running ? "Thinking… this can take up to a minute" : `Generate`}
          </button>
        </form>
      </div>

      <div aria-live="polite" className="mt-6">
        {error && <Alert kind="error">{error}</Alert>}
        {result && (
          <section className="space-y-4" aria-label="AI result">
            {result.truncated && (
              <Alert kind="info" title="The response was cut off">The model hit its length limit. Run it again with a shorter length or raise AI_MAX_OUTPUT_TOKENS.</Alert>
            )}

            {tool === "seo" && result.seo ? (
              <div className="space-y-4">
                <SeoCard label="SEO title" value={result.seo.seoTitle} max={60} onApply={bridge ? () => seoApply({ seoTitle: result.seo!.seoTitle }, "SEO title") : undefined} />
                <SeoCard label="Meta description" value={result.seo.metaDescription} max={155} onApply={bridge ? () => seoApply({ metaDescription: result.seo!.metaDescription }, "Meta description") : undefined} />
                <SeoCard label="Excerpt" value={result.seo.excerpt} max={280} onApply={bridge ? () => seoApply({ excerpt: result.seo!.excerpt }, "Excerpt") : undefined} />
                <SeoCard label="URL slug" value={result.seo.slug} onApply={bridge ? () => seoApply({ slug: result.seo!.slug }, "URL slug") : undefined} />
                {result.seo.alternatives.length > 0 && (
                  <div>
                    <p className="label">Alternatives</p>
                    <ul className="space-y-2">
                      {result.seo.alternatives.map((a, i) => (
                        <li key={i} className="rounded-xl border border-border p-3 text-sm">
                          <p className="font-semibold">{a.seoTitle}</p>
                          <p className="text-muted-foreground">{a.metaDescription}</p>
                          {bridge && <button type="button" className="btn btn-outline btn-sm mt-2" onClick={() => seoApply({ seoTitle: a.seoTitle, metaDescription: a.metaDescription }, "Title and description")}>Use this pair</button>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor={`${uid}-out`} className="label">Result — edit freely before you use it</label>
                <textarea id={`${uid}-out`} value={output} onChange={(e) => setOutput(e.target.value)} rows={Math.min(24, Math.max(8, output.split("\n").length + 1))} className="input font-mono text-[13px] leading-relaxed" />
                <p className="hint flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />AI can be wrong. Check facts and anything marked [verify: …] before publishing. Nothing is saved or published automatically.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn btn-outline btn-sm" onClick={copy}>{copied ? <Check className="h-4 w-4" aria-hidden /> : <ClipboardCopy className="h-4 w-4" aria-hidden />}{copied ? "Copied" : "Copy"}</button>
                  {insertButtons.map(([mode, label]) => (
                    <button key={mode} type="button" className="btn btn-primary btn-sm" disabled={mode === "selection" && !bridge?.selection} onClick={() => { bridge?.insert(output, mode); toast("Added to your article — review, then save.", "success"); }}>{label}</button>
                  ))}
                  {!bridge && (
                    savedDraftId ? (
                      <Link href={`/admin/posts/${savedDraftId}`} className="btn btn-primary btn-sm">Open the draft →</Link>
                    ) : (
                      <button type="button" className="btn btn-primary btn-sm" onClick={saveDraft}><FilePlus2 className="h-4 w-4" aria-hidden />Save as new draft</button>
                    )
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function SeoCard({ label, value, max, onApply }: { label: string; value: string; max?: number; onApply?: () => void }) {
  const over = max !== undefined && value.length > max;
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {max !== undefined && <p className={cn("text-xs tabular-nums", over ? "text-danger" : "text-muted-foreground")}>{value.length}/{max}</p>}
      </div>
      <p className="mt-1 break-words text-sm">{value || <span className="text-muted-foreground">—</span>}</p>
      {onApply && value && <button type="button" className="btn btn-outline btn-sm mt-2" onClick={onApply}>Use this</button>}
    </div>
  );
}
