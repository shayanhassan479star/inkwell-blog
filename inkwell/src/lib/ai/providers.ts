import type { AiConfig, AiProvider } from "./config";

export type AiErrorCode = "not_configured" | "invalid" | "auth" | "rate_limited" | "timeout" | "provider" | "empty";

export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string, public status = 502) {
    super(message);
    this.name = "AiError";
  }
}

export type ProviderResult = { text: string; truncated: boolean };
type Configured = Extract<AiConfig, { configured: true }>;
type FetchLike = typeof fetch;

async function post(url: string, init: RequestInit, timeoutMs: number, fetchImpl: FetchLike): Promise<Response> {
  try {
    return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === "TimeoutError" || name === "AbortError") {
      throw new AiError("timeout", "The AI provider took too long to respond. Try again or shorten the input.", 504);
    }
    console.error("[ai] network error:", (err as Error)?.message);
    throw new AiError("provider", "Could not reach the AI provider.", 502);
  }
}

async function failFrom(res: Response): Promise<never> {
  // Log the provider's message server-side; show the user a generic one (it can contain request details).
  let detail = "";
  try {
    detail = (await res.text()).slice(0, 500);
  } catch {
    /* ignore */
  }
  console.error(`[ai] provider returned ${res.status}: ${detail}`);
  if (res.status === 401 || res.status === 403) throw new AiError("auth", "The AI provider rejected the configured API key.", 502);
  if (res.status === 429) throw new AiError("rate_limited", "The AI provider is rate-limiting requests. Please wait a moment and retry.", 429);
  if (res.status === 404) throw new AiError("provider", "The AI provider does not recognise the configured model or endpoint.", 502);
  throw new AiError("provider", "The AI provider returned an error. Please try again.", 502);
}

async function callAnthropic(c: Configured, system: string, user: string, fetchImpl: FetchLike): Promise<ProviderResult> {
  const res = await post(
    `${c.baseUrl ?? "https://api.anthropic.com"}/v1/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": c.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: c.model, max_tokens: c.maxOutputTokens, system, messages: [{ role: "user", content: user }] }),
    },
    c.timeoutMs,
    fetchImpl,
  );
  if (!res.ok) return failFrom(res);
  const data = (await res.json()) as { content?: { type: string; text?: string }[]; stop_reason?: string };
  const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
  return { text, truncated: data.stop_reason === "max_tokens" };
}

async function callOpenAiStyle(c: Configured, system: string, user: string, fetchImpl: FetchLike): Promise<ProviderResult> {
  const base = c.baseUrl ?? "https://api.openai.com/v1";
  // Newer OpenAI models require max_completion_tokens; other OpenAI-compatible servers still expect max_tokens.
  const limitField = c.provider === "openai" ? "max_completion_tokens" : "max_tokens";
  const res = await post(
    `${base}/chat/completions`,
    {
      method: "POST",
      headers: { "content-type": "application/json", ...(c.apiKey ? { authorization: `Bearer ${c.apiKey}` } : {}) },
      body: JSON.stringify({
        model: c.model,
        [limitField]: c.maxOutputTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
    c.timeoutMs,
    fetchImpl,
  );
  if (!res.ok) return failFrom(res);
  const data = (await res.json()) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
  const choice = data.choices?.[0];
  return { text: (choice?.message?.content ?? "").trim(), truncated: choice?.finish_reason === "length" };
}

export async function callProvider(
  config: Configured,
  system: string,
  user: string,
  fetchImpl: FetchLike = fetch,
): Promise<ProviderResult> {
  const handlers: Record<AiProvider, typeof callAnthropic> = {
    anthropic: callAnthropic,
    openai: callOpenAiStyle,
    "openai-compatible": callOpenAiStyle,
  };
  const result = await handlers[config.provider](config, system, user, fetchImpl);
  if (!result.text) throw new AiError("empty", "The AI returned an empty response. Try again.", 502);
  return result;
}
