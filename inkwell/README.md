# Inkwell — an AI-assisted editorial blogging platform

A complete blogging platform for a professional writer: a magazine-style public site, a protected admin dashboard with a Markdown editor, and a server-side AI writing assistant.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL + Auth + Storage) · Zod · Vercel-ready.

> **Status, honestly.** The code, SQL schema, RLS policies and tests are written and the database layer was verified on real PostgreSQL 16 (see [Verification status](#verification-status)). The application itself has **not been compiled or browsed end-to-end by the author of this handover**, because the build sandbox could not reach the npm registry. Run the [first-run checklist](#first-run-checklist) once after `npm install`; it takes about ten minutes and will surface anything environment-specific.

---

## Contents

1. [Features](#features) · 2. [Architecture](#architecture) · 3. [Folder structure](#folder-structure) · 4. [Setup](#setup) · 5. [Configure AI](#configure-the-ai-assistant) · 6. [Local development](#local-development) · 7. [Deployment](#deployment-vercel) · 8. [Security](#security-model) · 9. [Verification status](#verification-status) · 10. [Troubleshooting](#troubleshooting) · 11. [Known limits](#known-limits)

---

## Features

**Public site** — home (hero, featured, latest, popular, categories, author intro), blog listing with pagination and category filter, article pages (cover, author, date, reading time, table of contents, related posts, share buttons, copy link, comments), category / tag / author pages, full-text search, About, Contact (working form), Privacy, Terms, custom 404, light/dark mode, reading-progress bar, skeleton loading states and error boundaries.

**Admin (`/admin`)** — dashboard stats (total / published / drafts / scheduled / views, 14-day chart), post list with search and filters, create / edit / preview / publish / unpublish / delete, draft saving, scheduled publishing, featured flag, categories, tags, SEO fields (title, description, canonical), cover-image upload, Markdown editor (headings, bold/italic, links, images, lists, quotes, code, live preview), confirmation dialogs for destructive actions, toasts, inline validation, comment moderation, contact inbox, newsletter subscribers (CSV export), author management with roles.

**AI Studio (`/admin/ai`)** — topic & title ideas · outline · full draft (topic, keywords, audience, tone, length) · rewrite (clarity / tone / grammar / readability) · summary, intro, conclusion · SEO title + meta description · keyword & heading suggestions · FAQ generator · proofreading & readability review. Output always lands in an editable box; **"Save as draft" creates a draft only — nothing AI-generated is ever published without you opening it and pressing Publish.**

**SEO** — server-rendered/ISR pages, unique metadata and canonical URLs per post, Open Graph + Twitter cards (with generated OG images), `sitemap.xml`, `robots.txt`, RSS (`/feed.xml`), Article + Breadcrumb JSON-LD, lazy-loaded `next/image`, database indexes and full-text search (GIN). No ranking promises are made; this is the technical foundation only.

## Architecture

```
Browser ──► Next.js (RSC pages, server actions, route handlers)
                │  anon key + user session cookie  ─► Supabase (Postgres + RLS, Auth, Storage)
                │  service-role key (server only)  ─► rate limits, contact/comment/newsletter inserts, view counts, AI usage log
                └─ AI_API_KEY (server only)        ─► LLM provider (Anthropic / OpenAI / any OpenAI-compatible)
```

* **Authorisation lives in the database.** Row Level Security is enabled on every table. Anonymous visitors can only read *live* posts; drafts and future-scheduled posts are invisible to them at the database level. Authors see/edit only their own posts; admins see everything. The app also re-checks the role on every page, server action and API route — middleware is only a convenience redirect.
* **Roles:** `admin` (everything), `author` (write and publish *their own* posts, upload images, use AI), `reader` (the default for any new auth user — **no dashboard access**). Readers never need an account.
* **Scheduling needs no cron.** A post is public when `status in (published, scheduled)` and `published_at <= now()`. Public pages revalidate every 60 s, so a scheduled post appears within about a minute of its time.
* **Rate limiting** is a Postgres function (`check_rate_limit`), so it works across serverless instances. It fails *closed*: if the limiter is unreachable the request is refused. Limits: login (per IP and per e-mail), contact, comments, newsletter, uploads, AI (per minute and per day).
* **Privacy:** IPs are salted-hashed before use (never stored raw); view counting uses no cookies and no third-party analytics; the newsletter and contact forms require explicit consent.

## Folder structure

```
supabase/
  migrations/0001_init.sql      schema, enums, indexes, RLS policies, triggers, storage bucket
  migrations/0002_queries.sql   search, related posts, counts, dashboard stats (SQL functions)
  seed.sql                      optional starter categories, tags and a welcome post (idempotent)
  promote-admin.sql             SQL alternative for creating the first admin
  tests/                        Supabase stubs + RLS/function tests for plain PostgreSQL
scripts/create-admin.ts         first-admin bootstrap (no hard-coded credentials)
scripts/test-db.sh              applies migrations to a scratch DB and runs the RLS tests
src/app/(site)/                 public pages        src/app/admin/   dashboard pages
src/app/api/                    contact, comments, newsletter, view, health, admin/{ai,upload,…}
src/components/{site,admin,ui}/ UI components       src/lib/         data access, validation, AI, security
src/lib/ai/                     providers, tool prompts, usage limits  (server-only)
tests/                          unit tests (validation, slugs, markdown, spam, AI providers/tools/config)
middleware.ts                   session refresh + redirect for /admin and /login
```

## Setup

You need **Node.js ≥ 20.9**, a free **Supabase** project, and (for AI) an API key from your chosen provider.

### 1. Install

```bash
npm install
cp .env.example .env.local     # then fill in the values below
```

### 2. Create the Supabase project

1. <https://supabase.com> → **New project**. Save the database password somewhere safe.
2. **Project Settings → API**: copy the *Project URL*, the *anon* key and the *service_role* key into `.env.local`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
   The service-role key bypasses RLS — it stays server-side and must never be committed or prefixed `NEXT_PUBLIC_`.
3. **Authentication → Providers → Email**: keep *Email* enabled; **turn off "Allow new users to sign up"** (readers don't register; staff are created by you). Even if left on, new users get the `reader` role and cannot enter the dashboard.
4. Generate a salt for hashing IPs: `openssl rand -hex 32` → `IP_HASH_SALT`.

### 3. Create the database schema

Choose one:

* **SQL editor (simplest):** open *SQL Editor* in Supabase, paste and run `supabase/migrations/0001_init.sql`, then `0002_queries.sql`.
* **Supabase CLI:** `supabase link --project-ref <ref>` then `supabase db push`.

This creates all tables, indexes, RLS policies, helper functions and the public `covers` Storage bucket (5 MB limit, image MIME types only).

### 4. Create the first admin (no hard-coded credentials)

```bash
npm run create-admin -- --email you@example.com --name "Your Name"
```

It reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`, asks for a password at a hidden prompt (or reads `ADMIN_PASSWORD`; min 12 characters with upper-case, lower-case and a digit), creates the account and promotes it to `admin`.
*No terminal?* Create the user in **Authentication → Users → Add user** (tick *Auto Confirm*), then run `supabase/promote-admin.sql` in the SQL editor after replacing the e-mail.

Further authors are added from **Dashboard → Authors & access**.

### 5. (Optional) Starter content

Run `supabase/seed.sql` in the SQL editor after the admin exists. It adds four categories, four tags and a welcome article, and is safe to re-run.

### 6. Site identity

Set `NEXT_PUBLIC_SITE_URL` (your real domain in production), `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_TAGLINE`, `NEXT_PUBLIC_CONTACT_EMAIL`. The author intro, About page and author profile read from the admin's profile (**Dashboard → My profile**: name, bio, avatar, website).

## Configure the AI assistant

All AI calls happen in `src/app/api/admin/ai/route.ts` on the server. The browser never sees the key.

| Variable | Meaning |
|---|---|
| `AI_PROVIDER` | `anthropic`, `openai`, or `openai-compatible` (OpenRouter, Together, Ollama, vLLM, Azure…) |
| `AI_API_KEY` | Secret key for that provider (server-only) |
| `AI_MODEL` | Model identifier. Defaults: Anthropic `claude-sonnet-5-5`, OpenAI `gpt-4o-mini` — check your provider for current names |
| `AI_BASE_URL` | Required for `openai-compatible`; optional proxy for the others |
| `AI_DAILY_LIMIT_PER_USER` / `AI_REQUESTS_PER_MINUTE` / `AI_MAX_OUTPUT_TOKENS` | Usage limits |

With no key configured, `/admin/ai` shows a clear "not configured" notice and the API returns HTTP 503 — it never fakes output. Provider errors (bad key, quota, timeout, content refusal) are translated into plain-language messages; raw provider errors are only logged on the server. AI usage (tool, model, character counts — **not** the content) is recorded per user for the daily limit.

## Local development

```bash
npm run dev           # http://localhost:3000   (admin: /login → /admin)
npm run typecheck     # tsc --noEmit
npm run lint
npm test              # unit tests (no network needed)
npm run build && npm start     # production build
# Database tests need any reachable PostgreSQL (not Supabase):
PGHOST=localhost PGUSER=postgres npm run test:db
curl localhost:3000/api/health   # which features are configured (never prints values)
```

Until Supabase is configured the public site shows a friendly setup notice instead of crashing, and the login form tells you what's missing.

For a *local* Supabase (`supabase start`, `http://127.0.0.1:54321`) set `NEXT_IMAGE_UNOPTIMIZED=true`.

## Deployment (Vercel)

1. Push the repository to GitHub/GitLab and **Import** it in Vercel (framework: Next.js; no build overrides).
2. **Settings → Environment Variables**: add every variable from `.env.example` with real values (Production *and* Preview). `NEXT_PUBLIC_SITE_URL` must be your final `https://` domain.
3. Deploy. Then in Supabase **Authentication → URL Configuration** set *Site URL* to your domain.
4. Run the migrations and `create-admin` against the **production** Supabase project (steps 3–4 above) if you haven't already.
5. Visit `https://your-domain/api/health` → expect `{"ok":true,"supabase":true,"serviceRole":true,"ai":true}`.
6. Submit `https://your-domain/sitemap.xml` to Google Search Console / Bing Webmaster Tools.

Any Node host works (`npm run build && npm start`); only Vercel is documented here. Serverless request bodies are limited to ~4.5 MB, which is why image uploads are capped at 4 MB.

## Security model

* Secrets only in server-side env vars; only `NEXT_PUBLIC_SUPABASE_URL`, the anon key and site-identity values reach the browser. `.env*` is git-ignored; `.env.example` has placeholders only.
* Auth = Supabase Auth; every server entry point calls `getUser()` (JWT re-validated) and loads the role from `profiles`; deactivated accounts lose access immediately.
* RLS on all tables; staff cannot self-promote (trigger `guard_profile_update`); authors cannot spoof `author_id`; readers and anonymous users cannot read drafts, comments queue, messages, subscribers or analytics.
* Input validated with Zod on the server; Markdown is rendered server-side and **sanitised with an allow-list** (no scripts, event handlers, `javascript:` URLs; external links get `rel="noopener noreferrer nofollow ugc"` where relevant); control characters stripped; URLs restricted to `http(s)`.
* Uploads: auth required, magic-byte sniffing (client MIME ignored), JPEG/PNG/GIF/WebP/AVIF only (SVG refused), ≤ 4 MB, random server-chosen filenames, per-user rate limit.
* Comments: held for moderation, honeypot field + heuristics (link count, repeated text), rate limited, rendered as plain text. Contact/newsletter: honeypot, rate limit, consent checkbox, one-click unsubscribe tokens.
* Same-origin check on mutating API routes; open-redirect-safe `next` parameter on login; generic login errors (no account enumeration); internal errors are logged server-side and never shown to users.
* Headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS, and a CSP limited to `frame-ancestors/base-uri/form-action/object-src`. A nonce-based `script-src` CSP is a recommended hardening step I did not add, because it requires dynamic rendering of every page.
* Dashboard pages send `Cache-Control: private, no-store`.

## Verification status

What was **actually run** while preparing this handover, versus what was not:

| Check | Result |
|---|---|
| Migrations `0001` + `0002` applied to a fresh **PostgreSQL 16** (with Supabase `auth`/`storage` stubs) | ✅ applied cleanly |
| `supabase/tests/rls_test.sql` — anon/reader/author/admin visibility, no self-promotion, no author spoofing, drafts hidden, comments/messages private, rate-limit, search, related posts, dashboard stats | ✅ all passed |
| `promote-admin.sql` + `seed.sql` (run twice) on real PostgreSQL; anon sees only the published post, not drafts or messages | ✅ |
| Unit tests (`npm test`): validation, slugs, spam heuristics, formatting, AI config/providers/tools | ✅ 25/25 pass |
| Unit test for Markdown rendering/sanitising | ⚠️ not run — needs the `sanitize-html` package (couldn't install) |
| Type-check of every source file with third-party packages stubbed as `any` | ✅ no errors in cross-file imports/exports/types of the project's own code |
| `npm install`, `next build`, ESLint | ❌ **not run** — the sandbox's network policy blocked `registry.npmjs.org` |
| Browser walk-through (responsive layout, dark mode, editor, uploads) | ❌ not run |
| Real Supabase Auth / Storage / a live AI provider call | ❌ not run — needs your credentials |

So items 1, 4 (database side), 6, 11 of the acceptance list are backed by evidence; the remainder depend on the first-run checklist below.

### First-run checklist

Do these in order after `npm install` and the setup steps; each maps to an acceptance criterion.

- [ ] `npm run typecheck && npm run lint && npm test && npm run build` pass — fix any environment-specific output before continuing. **(12)**
- [ ] `/` and `/blog/welcome-to-your-new-blog` load (after running `seed.sql`). **(1, 4)**
- [ ] `/login` with the admin account → `/admin` shows stats. A wrong password gives a generic error. Visiting `/admin` signed-out redirects to `/login`. **(2, 11)**
- [ ] Create a post, save as draft → it is listed in `/admin/posts` but `/blog/<slug>` is a 404 in a private window and it is absent from `/search`, `/feed.xml`, `/sitemap.xml`. **(3)**
- [ ] Publish it → it appears on `/`, `/blog`, its category page, search (allow up to 60 s for cache). Refresh the dashboard: it persists. Unpublish → disappears. **(4, 5, 6)**
- [ ] Schedule a post for 2 minutes ahead → invisible, then public without any action. **(3, 4)**
- [ ] Upload a cover image (and try a `.txt` renamed to `.png` — it must be refused). Delete a post → confirmation dialog first.
- [ ] `/admin/ai` **without** `AI_API_KEY`: clear "not configured" notice. With a valid key: generate a draft, edit it, "Save as draft" → status is *draft*. **(7, 8)**
- [ ] Contact form submission appears in **Messages**; a comment appears in **Comments** as pending and is public only after approval.
- [ ] Open the site at 375 px and 1280 px widths, toggle dark mode. **(9)**
- [ ] `/robots.txt`, `/sitemap.xml`, `/feed.xml` respond; view-source on an article shows title, description, canonical, Open Graph and two JSON-LD blocks; validate with Google's Rich Results Test. **(10)**
- [ ] Sign in as a second user created with role *author*: cannot see others' posts or admin-only pages; a *reader* account cannot enter `/admin`. **(11)**

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Home page shows "Finish setup" | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` missing or still placeholders. Restart `npm run dev` after editing `.env.local`. |
| Login says "Server setup is incomplete" | `SUPABASE_SERVICE_ROLE_KEY` missing (it's needed for rate limiting). |
| "Incorrect email or password" for the right password | The user isn't *confirmed* (use `create-admin`, or tick Auto Confirm), or you're pointing at a different Supabase project. |
| "This account doesn't have dashboard access" | The profile role is `reader` — run `create-admin` / `promote-admin.sql`; also check `is_active`. |
| `create-admin`: "could not be promoted" | Migrations not applied (no `profiles` table / signup trigger). Run step 3. |
| `relation "public.posts" does not exist` | Migrations not applied to *this* project. |
| Everything is rate-limited / "Too many attempts" immediately | `check_rate_limit` missing or erroring (limiter fails closed). Check the server log; re-run `0001_init.sql`. |
| Image upload: "could not be stored" | Bucket `covers` missing (migration creates it) or `SUPABASE_STORAGE_BUCKET` differs from the bucket name. |
| Images don't render (400 from `/_next/image`) | The Supabase hostname isn't in `next.config.mjs` patterns — check `NEXT_PUBLIC_SUPABASE_URL`; for local Supabase set `NEXT_IMAGE_UNOPTIMIZED=true`. |
| AI page says "not configured" | `AI_API_KEY` empty/placeholder, or `AI_BASE_URL` missing for `openai-compatible`. `/api/health` shows `"ai": false`. |
| AI error "model not found" | Set `AI_MODEL` to a model your key can use. |
| New post doesn't appear immediately on the public site | Pages are cached ≤ 60 s (saving also triggers revalidation). Scheduled posts rely on the 60 s window. |
| Sitemap/RSS/OG links point to `localhost` | `NEXT_PUBLIC_SITE_URL` not set in the production environment (it's read at build time — redeploy after changing). |
| `npm run test:db` fails to connect | It needs a plain PostgreSQL server and `PGHOST/PGUSER/PGPASSWORD`, not Supabase. |

## Known limits

* **Outgoing e-mail is not integrated.** Contact messages and newsletter sign-ups are stored and viewable (subscribers export as CSV with consent timestamps; unsubscribe links work), but nothing is *sent*: connect Resend/Postmark/etc. and a cron or webhook if you want notifications or newsletters. There is no double opt-in e-mail for the same reason.
* Authors can publish their own posts. If you want an editorial-approval workflow, change the `posts_staff_*` policies and `savePost` so only admins may set `published`/`scheduled`.
* Comments are single-level (no threading) and always moderated.
* Search uses PostgreSQL full-text search (English configuration); it is not typo-tolerant.
* Image uploads are not resized server-side; `next/image` optimises delivery. Orphaned uploads are not garbage-collected.
* No automated browser (Playwright) test-suite is included.
* Password reset / MFA use Supabase's built-in features if you enable them in the dashboard; there is no custom UI for them.
