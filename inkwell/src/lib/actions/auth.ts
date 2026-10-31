"use server";

import { redirect } from "next/navigation";
import { getStaff } from "../auth";
import { hasServiceRole, hasSupabase } from "../env";
import { getIpHash, hashValue, rateLimit } from "../security";
import { createSessionClient } from "../supabase/server";
import { loginSchema } from "../validation";

export type LoginState = { error?: string };

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  // Only allow same-site admin paths (blocks open redirects like //evil.com or https://evil.com).
  return /^\/admin(\/[A-Za-z0-9._~\-/?=&%]*)?$/.test(next) ? next : "/admin";
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!hasSupabase()) return { error: "Supabase isn't configured yet. See the README, section “Configure Supabase”." };
  if (!hasServiceRole()) return { error: "Server setup is incomplete (SUPABASE_SERVICE_ROLE_KEY is missing)." };

  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter your email and password." };

  const ipHash = await getIpHash();
  const allowed =
    (await rateLimit(`login:ip:${ipHash}`, 10, 900)) && (await rateLimit(`login:email:${hashValue(parsed.data.email)}`, 6, 900));
  if (!allowed) return { error: "Too many sign-in attempts. Please wait 15 minutes and try again." };

  const supabase = await createSessionClient();
  if (!supabase) return { error: "Supabase isn't configured yet." };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // One generic message for wrong email, wrong password or unconfirmed account: no account enumeration.
  if (error) return { error: "Incorrect email or password." };

  const staff = await getStaff();
  if (!staff) {
    await supabase.auth.signOut();
    return { error: "This account doesn't have dashboard access. Ask the site owner to grant it." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/login");
}
