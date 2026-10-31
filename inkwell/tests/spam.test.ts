import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeSpam } from "../src/lib/spam";

test("spam heuristics", () => {
  assert.equal(looksLikeSpam("Great article, thanks for sharing!"), false);
  assert.equal(looksLikeSpam("see http://a.com http://b.com http://c.com"), true);
  assert.equal(looksLikeSpam("Best CASINO bonus"), true);
  assert.equal(looksLikeSpam("one link https://example.com is fine"), false);
});
