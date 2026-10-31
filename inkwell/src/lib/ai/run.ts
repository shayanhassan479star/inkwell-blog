import type { z } from "zod";
import type { AiConfig } from "./config";
import { AiError, callProvider } from "./providers";
import { buildPrompt, parseSeoJson, toolSchemas, type SeoResult, type ToolId } from "./tools";

export type AiRunResult = {
  text: string;
  seo?: SeoResult;
  truncated: boolean;
  provider: string;
  model: string;
  inputChars: number;
};

/** Validate input, build the prompt, call the configured provider. Never publishes or saves anything. */
export async function runAiTool(
  tool: ToolId,
  rawInput: unknown,
  config: AiConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<AiRunResult> {
  if (!config.configured) throw new AiError("not_configured", config.reason, 503);
  const schema = toolSchemas[tool] as z.ZodTypeAny;
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) throw new AiError("invalid", parsed.error.issues[0]?.message ?? "Invalid input.", 400);

  const prompt = buildPrompt(tool, parsed.data);
  const { text, truncated } = await callProvider(config, prompt.system, prompt.user, fetchImpl);
  const inputChars = prompt.user.length;

  if (prompt.json) {
    const seo = parseSeoJson(text);
    if (!seo) throw new AiError("provider", "The AI did not return valid SEO data. Please run it again.", 502);
    return { text: JSON.stringify(seo, null, 2), seo, truncated, provider: config.provider, model: config.model, inputChars };
  }
  return { text, truncated, provider: config.provider, model: config.model, inputChars };
}
