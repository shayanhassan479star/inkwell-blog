"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getStaff } from "../auth";
import { createServiceClient } from "../supabase/admin";
import type { ActionResult, Role } from "../types";
import { fieldErrors, firstError, newUserSchema, passwordSchema, profileInputSchema } from "../validation";
import { dbFail, fail, isUniqueViolation, SESSION_EXPIRED, succeed } from "./helpers";
import { z } from "zod";

const UUID = /^[0-9a-f-]{36}$/i;

/** Admin creates an author/admin account with an initial password they hand over securely. */
export async function createUser(input: unknown): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  const parsed = newUserSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error), fieldErrors(parsed.error));
  const db = createServiceClient();
  if (!db) return fail("SUPABASE_SERVICE_ROLE_KEY is required to create users.");

  const { email, password, displayName, role } = parsed.data;
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: displayName } });
  if (created.error || !created.data.user) {
    const msg = created.error?.message ?? "";
    if (/already|registered|exists/i.test(msg)) return fail("An account with that email already exists.", { email: "Already registered." });
    console.error("[createUser]", msg);
    return fail("The account could not be created.");
  }
  // The signup trigger created a 'reader' profile; upgrade it. (Service role is exempt from the role-change guard.)
  const { error } = await db.from("profiles").update({ role, display_name: displayName }).eq("id", created.data.user.id);
  if (error) return dbFail("createUser:role", error);
  revalidatePath("/admin/users");
  return succeed(`Account created for ${email}. Share the password through a secure channel; they can change it under Profile.`);
}

export async function updateUserAccess(id: string, change: { role?: Role; isActive?: boolean }): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!UUID.test(id)) return fail("Invalid user.");
  if (id === ctx.user.id) return fail("You can't change your own role or deactivate yourself. Ask another admin.");
  const patch: Record<string, unknown> = {};
  if (change.role) {
    if (!["admin", "author", "reader"].includes(change.role)) return fail("Invalid role.");
    patch.role = change.role;
  }
  if (typeof change.isActive === "boolean") patch.is_active = change.isActive;
  if (!Object.keys(patch).length) return fail("Nothing to change.");
  const { error } = await ctx.supabase.from("profiles").update(patch).eq("id", id);
  if (error) return dbFail("updateUserAccess", error);
  revalidatePath("/admin/users");
  revalidatePath("/", "layout");
  return succeed("Access updated.");
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  const ctx = await getStaff();
  if (!ctx) return fail(SESSION_EXPIRED);
  const parsed = profileInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error), fieldErrors(parsed.error));
  const d = parsed.data;
  const { error } = await ctx.supabase
    .from("profiles")
    .update({ display_name: d.displayName, slug: d.slug, bio: d.bio, avatar_url: d.avatarUrl, website_url: d.websiteUrl })
    .eq("id", ctx.user.id);
  if (error) {
    if (isUniqueViolation(error)) return fail("That profile URL is taken.", { slug: "Already in use." });
    return dbFail("updateProfile", error);
  }
  revalidatePath("/", "layout");
  return succeed("Profile saved.");
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  const ctx = await getStaff();
  if (!ctx) return fail(SESSION_EXPIRED);
  const parsed = z.object({ current: z.string().min(1).max(200), next: passwordSchema }).safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error), fieldErrors(parsed.error));
  const email = ctx.user.email;
  if (!email) return fail("This account has no email address.");
  // Re-authenticate so a hijacked, unattended session can't silently take over the account.
  const check = await ctx.supabase.auth.signInWithPassword({ email, password: parsed.data.current });
  if (check.error) return fail("Your current password is incorrect.", { current: "Incorrect password." });
  const { error } = await ctx.supabase.auth.updateUser({ password: parsed.data.next });
  if (error) {
    console.error("[changePassword]", error.message);
    return fail("The password could not be changed. It may be too weak or recently used.");
  }
  return succeed("Password changed.");
}
