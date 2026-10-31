import type { ToolId } from "./tools"; // type-only import: nothing from tools.ts (prompts, zod) reaches the browser bundle

export type FieldDef = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "select" | "number";
  options?: { value: string; label: string }[];
  placeholder?: string;
  rows?: number;
  hint?: string;
  default?: string;
  /** In the post editor, prefill from the current post. "text" = selected text, or the whole body when nothing is selected. */
  prefill?: "title" | "text";
};

const LENGTHS = [
  { value: "short", label: "Short (~600 words)" },
  { value: "medium", label: "Medium (~1,200 words)" },
  { value: "long", label: "Long (~2,000 words)" },
];

const audience: FieldDef = { name: "audience", label: "Target audience", kind: "text", placeholder: "e.g. first-time freelance writers" };
const tone: FieldDef = { name: "tone", label: "Tone", kind: "text", placeholder: "e.g. warm, practical, a little witty" };
const keywords: FieldDef = { name: "keywords", label: "Keywords", kind: "text", placeholder: "comma-separated, optional" };
const text = (label = "Text", hint?: string): FieldDef => ({ name: "text", label, kind: "textarea", rows: 8, prefill: "text", hint: hint ?? "Selected text in the editor is used when there is a selection, otherwise the whole article." });

export const TOOL_UI: Record<ToolId, { label: string; blurb: string; fields: FieldDef[] }> = {
  topics: {
    label: "Topics & titles",
    blurb: "Brainstorm article ideas with working titles and angles.",
    fields: [
      { name: "niche", label: "Niche or subject", kind: "text", placeholder: "e.g. sustainable travel in Southeast Asia" },
      audience, tone,
      { name: "count", label: "How many ideas", kind: "number", default: "8" },
    ],
  },
  outline: {
    label: "Outline",
    blurb: "A structured outline with title options and headings.",
    fields: [
      { name: "topic", label: "Topic or working title", kind: "text", prefill: "title" },
      keywords, audience, tone,
      { name: "length", label: "Target length", kind: "select", options: LENGTHS, default: "medium" },
    ],
  },
  draft: {
    label: "Draft article",
    blurb: "A complete first draft for you to edit. Never published automatically.",
    fields: [
      { name: "topic", label: "Topic or working title", kind: "text", prefill: "title" },
      keywords, audience, tone,
      { name: "length", label: "Target length", kind: "select", options: LENGTHS, default: "medium" },
      { name: "outline", label: "Outline to follow (optional)", kind: "textarea", rows: 5, placeholder: "Paste an outline from the Outline tool" },
    ],
  },
  rewrite: {
    label: "Rewrite",
    blurb: "Improve clarity, tone, grammar or readability.",
    fields: [
      text("Text to rewrite"),
      {
        name: "goal", label: "Goal", kind: "select", default: "clarity",
        options: [
          { value: "clarity", label: "Clearer and smoother" },
          { value: "tone", label: "Change the tone" },
          { value: "grammar", label: "Fix grammar & spelling only" },
          { value: "readability", label: "Easier to read" },
          { value: "concise", label: "More concise (~30% shorter)" },
          { value: "expand", label: "Expand with detail (~40% longer)" },
        ],
      },
      tone,
    ],
  },
  summarize: {
    label: "Summary, intro & conclusion",
    blurb: "Summarise an article, or write an introduction, conclusion or excerpt.",
    fields: [
      text("Article text"),
      {
        name: "kind", label: "Write a…", kind: "select", default: "summary",
        options: [
          { value: "summary", label: "Summary" },
          { value: "intro", label: "Introduction" },
          { value: "conclusion", label: "Conclusion" },
          { value: "excerpt", label: "Excerpt (≤ 280 characters)" },
        ],
      },
    ],
  },
  seo: {
    label: "SEO title & description",
    blurb: "Search-friendly title, meta description, excerpt and URL slug.",
    fields: [
      { name: "title", label: "Working title", kind: "text", prefill: "title" },
      text("Article text"),
      keywords,
    ],
  },
  keywords: {
    label: "Keywords & headings",
    blurb: "Keyword ideas, reader questions and heading suggestions. No search-volume data.",
    fields: [
      { name: "topic", label: "Topic", kind: "text", prefill: "title" },
      audience,
      { name: "text", label: "Existing text (optional)", kind: "textarea", rows: 5, prefill: "text" },
    ],
  },
  faq: {
    label: "FAQ",
    blurb: "Questions readers will ask, with concise answers.",
    fields: [
      text("Article text"),
      { name: "count", label: "How many questions", kind: "number", default: "5" },
    ],
  },
  proofread: {
    label: "Proofread & readability",
    blurb: "Spot errors and get readability feedback plus a corrected version.",
    fields: [text("Text to check")],
  },
};

export const TOOL_ORDER: ToolId[] = ["topics", "outline", "draft", "rewrite", "summarize", "seo", "keywords", "faq", "proofread"];
