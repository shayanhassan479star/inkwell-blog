import { isConfigured } from "../env";

export type AiProvider = "anthropic" | "openai" | "openai-compatible";

export type AiConfig =
  | { configured: false; reason: string; provider: string; model: string }
  | {
      configured: true;
      provider: AiProvider;
      model: string;
      apiKey: string;
      baseUrl: string | null;
      maxOutputTokens: number;
      timeoutMs: number;
    };

const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-5-5",
  openai: "gpt-4o-mini",
  "openai-compatible": "",
};

function isLocalUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Reads the AI provider settings from SERVER-side environment variables only.
 * The key is never returned to the browser: callers expose `configured`, `provider` and `model` at most.
 */
export function getAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const provider = (env.AI_PROVIDER || "anthropic").trim().toLowerCase();
  const model = (env.AI_MODEL || "").trim();

  if (provider !== "anthropic" && provider !== "openai" && provider !== "openai-compatible") {
    return { configured: false, reason: `Unknown AI_PROVIDER "${provider}". Use anthropic, openai or openai-compatible.`, provider, model };
  }
  const baseUrl = (env.AI_BASE_URL || "").trim().replace(/\/+$/, "") || null;
  const resolvedModel = model || DEFAULT_MODELS[provider];
  if (!resolvedModel) {
    return { configured: false, reason: "AI_MODEL is required for openai-compatible providers.", provider, model: "" };
  }
  if (provider === "openai-compatible" && !baseUrl) {
    return { configured: false, reason: "AI_BASE_URL is required for openai-compatible providers.", provider, model: resolvedModel };
  }
  const key = env.AI_API_KEY;
  const keyOk = isConfigured(key);
  if (!keyOk && !(provider === "openai-compatible" && isLocalUrl(baseUrl))) {
    return { configured: false, reason: "AI_API_KEY is not set on the server.", provider, model: resolvedModel };
  }
  const tokens = Number.parseInt(env.AI_MAX_OUTPUT_TOKENS ?? "", 10);
  return {
    configured: true,
    provider,
    model: resolvedModel,
    apiKey: keyOk ? (key as string) : "",
    baseUrl,
    maxOutputTokens: Number.isFinite(tokens) ? Math.min(Math.max(tokens, 256), 16000) : 4096,
    timeoutMs: 240_000,
  };
}

/** Safe-to-expose summary for the dashboard. */
export function publicAiStatus(config: AiConfig) {
  return config.configured
    ? { configured: true as const, provider: config.provider, model: config.model }
    : { configured: false as const, reason: config.reason, provider: config.provider, model: config.model };
}
