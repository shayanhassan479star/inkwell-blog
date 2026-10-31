import { test } from "node:test";
import assert from "node:assert/strict";
import { commentSchema, contactSchema, newUserSchema, newsletterSchema, postInputSchema } from "../src/lib/validation";

const uuid = "11111111-1111-4111-8111-111111111111";

test("contact form validation", () => {
  const ok = contactSchema.safeParse({ name: " Ann ", email: "ANN@Example.com", subject: "Hi", message: "Hello there", consent: true });
  assert.ok(ok.success && ok.data.email === "ann@example.com" && ok.data.name === "Ann");
  assert.equal(contactSchema.safeParse({ name: "A", email: "nope", subject: "s", message: "hello", consent: true }).success, false);
  assert.equal(contactSchema.safeParse({ name: "A", email: "a@b.co", subject: "s", message: "hello", consent: false }).success, false);
});

test("comment and newsletter validation", () => {
  assert.equal(commentSchema.safeParse({ postId: "x", name: "A", email: "a@b.co", body: "hi", consent: true }).success, false);
  assert.ok(commentSchema.safeParse({ postId: uuid, name: "A", email: "a@b.co", body: "nice", consent: true }).success);
  assert.equal(newsletterSchema.safeParse({ email: "a@b.co", consent: false }).success, false);
});

test("post input: slug rules, URL schemes and empty strings become null", () => {
  const base = { title: "Hello", body: "x", status: "draft" as const };
  const ok = postInputSchema.parse({ ...base, slug: "", excerpt: "", coverImageUrl: "", seoTitle: "" });
  assert.equal(ok.excerpt, null);
  assert.equal(ok.coverImageUrl, null);
  assert.equal(postInputSchema.safeParse({ ...base, slug: "Not A Slug" }).success, false);
  assert.equal(postInputSchema.safeParse({ ...base, coverImageUrl: "javascript:alert(1)" }).success, false);
  assert.equal(postInputSchema.safeParse({ ...base, canonicalUrl: "ftp://x.test" }).success, false);
  assert.equal(postInputSchema.safeParse({ ...base, seoTitle: "x".repeat(71) }).success, false);
  assert.equal(postInputSchema.safeParse({ ...base, status: "archived" }).success, false);
});

test("new user password policy", () => {
  const u = { email: "a@b.co", displayName: "A", role: "author" as const };
  assert.equal(newUserSchema.safeParse({ ...u, password: "short" }).success, false);
  assert.equal(newUserSchema.safeParse({ ...u, password: "alllowercaseletters1" }).success, false);
  assert.ok(newUserSchema.safeParse({ ...u, password: "CorrectHorse9Battery" }).success);
});
