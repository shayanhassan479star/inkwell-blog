import { test } from "node:test";
import assert from "node:assert/strict";
import { readingTimeMinutes, renderMarkdown } from "../src/lib/markdown";

test("headings get ids, h1 is demoted and a table of contents is built", () => {
  const { html, toc } = renderMarkdown("# Title\n\n## First part\n\ntext\n\n### Detail\n\n## First part\n");
  assert.match(html, /<h2 id="title">/);
  assert.deepEqual(toc.map((t) => t.id), ["title", "first-part", "detail", "first-part-2"]);
});

test("scripts, inline handlers, javascript: links and raw HTML cannot execute", () => {
  const evil = [
    "<script>alert(1)</script>",
    "[click](javascript:alert(1))",
    '![x](javascript:alert(1))',
    '<img src=x onerror="alert(1)">',
    "<iframe src='https://evil.test'></iframe>",
    "[data](data:text/html;base64,PHNjcmlwdD4=)",
  ].join("\n\n");
  const { html } = renderMarkdown(evil);
  assert.doesNotMatch(html, /<script|<iframe|onerror|javascript:|data:text/i);
});

test("external links are hardened and images are lazy", () => {
  const { html } = renderMarkdown("[a](https://example.com) ![alt](https://example.com/a.png)");
  assert.match(html, /rel="noopener noreferrer nofollow ugc"/);
  assert.match(html, /loading="lazy"/);
});

test("code blocks keep their language class", () => {
  const { html } = renderMarkdown("```ts\nconst a = 1;\n```");
  assert.match(html, /language-ts/);
});

test("reading time is at least one minute and scales with length", () => {
  assert.equal(readingTimeMinutes("few words"), 1);
  assert.equal(readingTimeMinutes("word ".repeat(2200)), 10);
});
