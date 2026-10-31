import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, pluralize, toDateTimeLocal, truncate } from "../src/lib/format";

test("formatDate handles ISO strings, nulls and garbage", () => {
  assert.equal(formatDate("2026-03-05T10:00:00Z"), "5 March 2026");
  assert.equal(formatDate("2026-03-05T10:00:00Z", "short"), "5 Mar 2026");
  assert.equal(formatDate(null), "");
  assert.equal(formatDate("not a date"), "");
});

test("truncate / pluralize / toDateTimeLocal", () => {
  assert.equal(truncate("abcdef", 4), "abc…");
  assert.equal(truncate("abc", 4), "abc");
  assert.equal(pluralize(1, "post"), "1 post");
  assert.equal(pluralize(2, "post"), "2 posts");
  assert.match(toDateTimeLocal("2026-03-05T10:00:00Z"), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assert.equal(toDateTimeLocal(null), "");
});
