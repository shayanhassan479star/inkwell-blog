export type Role = "admin" | "author" | "reader";
export type PostStatus = "draft" | "scheduled" | "published";
export type CommentStatus = "pending" | "approved" | "spam" | "rejected";
export type MessageStatus = "new" | "read" | "archived";

export type Profile = {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
  role: Role;
  is_active: boolean;
};

export type AuthorLite = Pick<Profile, "id" | "slug" | "display_name" | "avatar_url">;
export type Category = { id: string; slug: string; name: string; description: string | null };
export type Tag = { id: string; slug: string; name: string };

export type PostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  is_featured: boolean;
  published_at: string | null;
  reading_time_minutes: number;
  view_count: number;
  author: AuthorLite | null;
  categories: Category[];
  tags: Tag[];
};

export type PostFull = PostSummary & {
  body: string;
  status: PostStatus;
  scheduled_at: string | null;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
