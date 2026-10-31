/** Convert arbitrary text to a URL-safe slug: lowercase ASCII words joined with hyphens. */
export function slugify(input: string, maxLength = 80): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, maxLength).replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Slugs that would collide with application routes. */
const RESERVED = new Set([
  "admin", "api", "login", "logout", "search", "category", "tag", "author", "blog",
  "about", "contact", "privacy", "terms", "rss", "feed", "sitemap", "robots", "unsubscribe",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}

/**
 * Pick a slug that is not in `taken`, appending -2, -3 … when needed.
 */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = base || "post";
  if (!used.has(root) && !isReservedSlug(root)) return root;
  let i = 2;
  while (used.has(`${root}-${i}`)) i++;
  return `${root}-${i}`;
}
