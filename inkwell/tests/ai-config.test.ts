import { test } from "node:test";
import assert from "node:assert/strict";
import { getAiConfig, publicAiStatus } from "../src/lib/ai/config";

const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

test("AI is reported as NOT configured without a real key", () => {
  assert.equal(getAiConfig(env({})).configured, false);
  assert.equal(getAiConfig(env({ AI_API_KEY: "YOUR_AI_PROVIDER_API_KEY" })).configured, false);
  assert.equal(getAiConfig(env({ AI_API_KEY: "" })).configured, false);
});

test("configured providers and defaults", () => {
  const a = getAiConfig(env({ AI_PROVIDER: "anthropic", AI_API_KEY: "sk-real" }));
  assert.ok(a.configured && a.model === "claude-sonnet-5-5");
  const o = getAiConfig(env({ AI_PROVIDER: "openai", AI_API_KEY: "sk-real" }));
  assert.ok(o.configured && o.model === "gpt-4o-mini");
});

test("openai-compatible needs a base URL and model; local servers need no key", () => {
  assert.equal(getAiConfig(env({ AI_PROVIDER: "openai-compatible", AI_API_KEY: "k" })).configured, false);
  assert.equal(getAiConfig(env({ AI_PROVIDER: "openai-compatible", AI_API_KEY: "k", AI_BASE_URL: "https://x.test/v1" })).configured, false);
  assert.ok(getAiConfig(env({ AI_PROVIDER: "openai-compatible", AI_MODEL: "llama3", AI_BASE_URL: "http://localhost:11434/v1" })).configured);
});

test("unknown provider is rejected and the public status never contains the key", () => {
  assert.equal(getAiConfig(env({ AI_PROVIDER: "mystery", AI_API_KEY: "k" })).configured, false);
  const status = publicAiStatus(getAiConfig(env({ AI_API_KEY: "sk-secret-value" })));
  assert.ok(!JSON.stringify(status).includes("sk-secret-value"));
});
