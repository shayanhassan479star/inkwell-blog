import { Marked, Renderer, type Tokens } from "marked";
import sanitizeHtml from "sanitize-html";
import { slugify } from "./slug";

export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Strip Markdown/HTML syntax to plain text (used for reading time, excerpts and search snippets). */
export function markdownToPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Estimated reading time in whole minutes (≥ 1) at ~220 words per minute. */
export function readingTimeMinutes(md: string): number {
  const words = markdownToPlainText(md).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

/** Allow-list for rendered article HTML. Anything else (scripts, iframes, inline handlers…) is dropped. */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "a", "strong", "em", "del", "code", "pre", "blockquote",
    "ul", "ol", "li", "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td",
    "sup", "sub", "span", "div",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target", "id"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    h2: ["id"], h3: ["id"], h4: ["id"],
    code: ["class"], pre: ["class"], span: ["class"],
    th: ["align"], td: ["align"],
    li: ["class"], div: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowedClasses: { code: [/^language-[\w-]+$/], pre: [/^language-[\w-]+$/] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href);
      return {
        tagName,
        attribs: {
          ...attribs,
          ...(external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {}),
        },
      };
    },
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: "lazy", decoding: "async" },
    }),
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/**
 * Render Markdown to sanitised HTML with stable heading ids, and extract a table of contents
 * from the h2/h3 headings. Raw HTML written inside the Markdown is escaped, never executed.
 */
export function renderMarkdown(md: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();

  const renderer = new Renderer();

  renderer.heading = function (this: Renderer, token: Tokens.Heading) {
    // Promote h1 → h2: the page title is already the document's single <h1>.
    const level = Math.min(Math.max(token.depth, 2), 4);
    const inner = this.parser.parseInline(token.tokens);
    const text = token.text.replace(/[*_`~]/g, "");
    let id = slugify(text, 60) || "section";
    const count = seen.get(id) ?? 0;
    seen.set(id, count + 1);
    if (count > 0) id = `${id}-${count + 1}`;
    if (level === 2 || level === 3) toc.push({ id, text, level });
    return `<h${level} id="${id}">${inner}</h${level}>\n`;
  };

  // Treat raw HTML in the source as text: authors write Markdown, not HTML.
  renderer.html = (token: Tokens.HTML | Tokens.Tag) =>
    token.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const marked = new Marked({ gfm: true, breaks: false, renderer });
  const raw = marked.parse(md ?? "", { async: false }) as string;
  return { html: sanitizeArticleHtml(raw), toc };
}
