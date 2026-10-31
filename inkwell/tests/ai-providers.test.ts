import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { getAiConfig } from "../src/lib/ai/config";
import { AiError, callProvider } from "../src/lib/ai/providers";

type Seen = { url?: string; headers: http.IncomingHttpHeaders; body: any };
let server: http.Server;
let base = "";
let seen: Seen | null = null;
let mode: "ok" | "401" | "429" | "500" | "empty" | "truncated" = "ok";

before(async () => {
  server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      seen = { url: req.url, headers: req.headers, body: JSON.parse(raw || "{}") };
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(body));
      };
      if (mode === "401") return send(401, { error: "bad key sk-leak" });
      if (mode === "429") return send(429, {});
      if (mode === "500") return send(500, { error: "boom" });
      if (req.url?.endsWith("/v1/messages")) {
        return send(200, { content: [{ type: "text", text: mode === "empty" ? "" : "Hello from Claude" }], stop_reason: mode === "truncated" ? "max_tokens" : "end_turn" });
      }
      return send(200, { choices: [{ message: { content: mode === "empty" ? "" : "Hello from GPT" }, finish_reason: mode === "truncated" ? "length" : "stop" }] });
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

function cfg(provider: string) {
  const c = getAiConfig({ AI_PROVIDER: provider, AI_API_KEY: "test-key", AI_MODEL: "m1", AI_BASE_URL: base, AI_MAX_OUTPUT_TOKENS: "1000" } as unknown as NodeJS.ProcessEnv);
  assert.ok(c.configured);
  return c as Extract<typeof c, { configured: true }>;
}

test("anthropic: sends key header server-side and parses text", async () => {
  mode = "ok";
  const r = await callProvider(cfg("anthropic"), "SYS", "USER");
  assert.equal(r.text, "Hello from Claude");
  assert.equal(seen?.url, "/v1/messages");
  assert.equal(seen?.headers["x-api-key"], "test-key");
  assert.equal(seen?.body.system, "SYS");
  assert.equal(seen?.body.max_tokens, 1000);
  assert.equal(seen?.body.model, "m1");
});

test("openai: bearer auth, max_completion_tokens, parses choice", async () => {
  mode = "ok";
  const r = await callProvider(cfg("openai"), "SYS", "USER");
  assert.equal(r.text, "Hello from GPT");
  assert.equal(seen?.headers.authorization, "Bearer test-key");
  assert.equal(seen?.body.max_completion_tokens, 1000);
  assert.equal(seen?.body.messages[0].role, "system");
});

test("openai-compatible uses max_tokens", async () => {
  mode = "ok";
  await callProvider(cfg("openai-compatible"), "SYS", "USER");
  assert.equal(seen?.body.max_tokens, 1000);
});

test("truncated output is flagged", async () => {
  mode = "truncated";
  assert.equal((await callProvider(cfg("anthropic"), "s", "u")).truncated, true);
  assert.equal((await callProvider(cfg("openai"), "s", "u")).truncated, true);
});

test("provider failures become safe, typed errors that do not leak upstream bodies", async () => {
  mode = "401";
  await assert.rejects(callProvider(cfg("anthropic"), "s", "u"), (e: unknown) => e instanceof AiError && e.code === "auth" && !e.message.includes("sk-leak"));
  mode = "429";
  await assert.rejects(callProvider(cfg("openai"), "s", "u"), (e: unknown) => e instanceof AiError && e.code === "rate_limited" && e.status === 429);
  mode = "500";
  await assert.rejects(callProvider(cfg("openai"), "s", "u"), (e: unknown) => e instanceof AiError && e.code === "provider");
  mode = "empty";
  await assert.rejects(callProvider(cfg("anthropic"), "s", "u"), (e: unknown) => e instanceof AiError && e.code === "empty");
});
