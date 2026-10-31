import { z } from "zod";

/** Remove control characters (keeps \n and \t) so stored text can't smuggle in odd bytes. */
export function stripControl(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

const text = (max: number, min = 0) =>
  z.string().transform((v) => stripControl(v).trim()).pipe(z.string().min(min).max(max));

/** Optional text: empty string becomes null. */
const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => (v ? stripControl(v).trim() : ""))
    .pipe(z.string().max(max))
    .transform((v) => (v === "" ? null : v));

const optionalUrl = z
  .string()
  .nullish()
  .transform((v) => (v ? v.trim() : ""))
  .pipe(
    z
      .string()
      .max(2000)
      .refine((v) => v === "" || /^https?:\/\//i.test(v), "Must start with http:// or https://")
      .refine((v) => {
        if (v === "") return true;
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      }, "Enter a valid URL"),
  )
  .transform((v) => (v === "" ? null : v));

export const emailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().email("Enter a valid email address").max(254));

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const slugSchema = z.string().trim().min(1).max(80).regex(SLUG_RE, "Use lowercase letters, numbers and single hyphens");

export const contactSchema = z.object({
  name: text(100, 1),
  email: emailSchema,
  subject: text(150, 1),
  message: text(5000, 5),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm you agree to the privacy policy" }) }),
  website: z.string().optional(), // honeypot — real users never fill this in
});

export const commentSchema = z.object({
  postId: z.string().uuid(),
  name: text(80, 1),
  email: emailSchema,
  body: text(2000, 2),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm you agree to the privacy policy" }) }),
  website: z.string().optional(),
});

export const newsletterSchema = z.object({
  email: emailSchema,
  consent: z.literal(true, { errorMap: () => ({ message: "Please tick the consent box to subscribe" }) }),
  website: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(200),
});

export const postInputSchema = z.object({
  id: z.string().uuid().nullish(),
  title: text(160, 1),
  slug: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().toLowerCase() : ""))
    .pipe(z.string().max(80).refine((v) => v === "" || SLUG_RE.test(v), "Use lowercase letters, numbers and single hyphens")),
  excerpt: optionalText(320),
  body: z.string().max(200_000).transform(stripControl),
  coverImageUrl: optionalUrl,
  coverImageAlt: optionalText(200),
  status: z.enum(["draft", "scheduled", "published"]),
  scheduledAt: z.string().datetime({ offset: true }).nullish(),
  isFeatured: z.boolean().default(false),
  seoTitle: optionalText(70),
  metaDescription: optionalText(170),
  canonicalUrl: optionalUrl,
  categoryIds: z.array(z.string().uuid()).max(10).default([]),
  tagIds: z.array(z.string().uuid()).max(20).default([]),
  newTags: z.array(text(40, 1)).max(20).default([]),
  authorId: z.string().uuid().nullish(),
});
export type PostInput = z.input<typeof postInputSchema>;

export const categoryInputSchema = z.object({
  id: z.string().uuid().nullish(),
  name: text(60, 1),
  slug: z.string().nullish().transform((v) => (v ? v.trim().toLowerCase() : "")).pipe(z.string().max(80).refine((v) => v === "" || SLUG_RE.test(v), "Use lowercase letters, numbers and single hyphens")),
  description: optionalText(300),
});

export const tagInputSchema = z.object({
  id: z.string().uuid().nullish(),
  name: text(40, 1),
  slug: z.string().nullish().transform((v) => (v ? v.trim().toLowerCase() : "")).pipe(z.string().max(80).refine((v) => v === "" || SLUG_RE.test(v), "Use lowercase letters, numbers and single hyphens")),
});

export const profileInputSchema = z.object({
  displayName: text(80, 1),
  slug: slugSchema,
  bio: optionalText(1000),
  avatarUrl: optionalUrl,
  websiteUrl: optionalUrl,
});

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128)
  .refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), "Include upper-case, lower-case and a number");

export const newUserSchema = z.object({
  email: emailSchema,
  displayName: text(80, 1),
  password: passwordSchema,
  role: z.enum(["author", "admin"]),
});

/** First error message per field, for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
