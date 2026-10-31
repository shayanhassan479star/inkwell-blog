/** Public (non-secret) site configuration. Safe to import from client and server code. */
export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "Inkwell",
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || "Essays on writing, craft and curiosity",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  postsPerPage: 9,
};

export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
