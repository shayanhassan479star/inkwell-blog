import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSessionClient } from "./supabase/server";
import type { Profile } from "./types";

export type StaffContext = { supabase: SupabaseClient; user: User; profile: Profile };

const PROFILE_COLUMNS = "id, slug, display_name, bio, avatar_url, website_url, role, is_active";

/**
 * Returns the signed-in staff member (admin or author) or null.
 * The JWT is verified with Supabase Auth (getUser) and the role is read from the database,
 * so a tampered cookie or a revoked/deactivated account never gains access.
 */
export async function getStaff(): Promise<StaffContext | null> {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", auth.user.id).maybeSingle();
  if (!profile || !profile.is_active || (profile.role !== "admin" && profile.role !== "author")) return null;
  return { supabase, user: auth.user, profile: profile as Profile };
}

/** For pages & server actions: redirects to the login page when not authorised. */
export async function requireStaff(): Promise<StaffContext> {
  const ctx = await getStaff();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Admin-only variant. Authors are sent back to the dashboard. */
export async function requireAdmin(): Promise<StaffContext> {
  const ctx = await requireStaff();
  if (ctx.profile.role !== "admin") redirect("/admin?denied=1");
  return ctx;
}

/** Same checks without redirecting, for server actions that should return an error object instead. */
export async function getAdmin(): Promise<StaffContext | null> {
  const ctx = await getStaff();
  return ctx && ctx.profile.role === "admin" ? ctx : null;
}
