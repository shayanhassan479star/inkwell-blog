/** Cheap heuristics: many links or well-known spam phrases land in the spam queue, never the public page. */
export function looksLikeSpam(body: string): boolean {
  const links = (body.match(/https?:\/\/|www\./gi) ?? []).length;
  if (links > 2) return true;
  return /(viagra|casino|crypto giveaway|loan offer|click here to win|seo services|buy followers)/i.test(body);
}
