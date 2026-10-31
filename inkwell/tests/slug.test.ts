import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify, uniqueSlug, isReservedSlug, SLUG_PATTERN } from "../src/lib/slug";

test("slugify produces url-safe lowercase slugs", () => {
  assert.equal(slugify("Hello, World!"), "hello-world");
  assert.equal(slugify("  Café  Society & Co.  "), "cafe-society-and-co");
  assert.equal(slugify("It's a trap"), "its-a-trap");
  assert.equal(slugify("***"), "");
  assert.ok(SLUG_PATTERN.test(slugify("10 Tips for Writers (2026 edition)")));
});

test("slugify respects the maximum length without trailing hyphens", () => {
  const s = slugify("a ".repeat(100), 20);
  assert.ok(s.length <= 20);
  assert.ok(!s.endsWith("-"));
});

test("uniqueSlug appends a counter when taken or reserved", () => {
  assert.equal(uniqueSlug("post", []), "post");
  assert.equal(uniqueSlug("post", ["post"]), "post-2");
  assert.equal(uniqueSlug("post", ["post", "post-2"]), "post-3");
  assert.equal(uniqueSlug("admin", []), "admin-2");
  assert.ok(isReservedSlug("api"));
});
