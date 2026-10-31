"use server";

import { redirect } from "next/navigation";
import { createServiceClient } from "../supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One-click unsubscribe (POST only, so e-mail link scanners that merely GET the page can't unsubscribe anyone). */
export async function unsubscribe(token: string): Promise<void> {
  if (!UUID.test(token)) redirect("/");
  const db = createServiceClient();
  if (!db) redirect(`/unsubscribe/${token}?error=1`);
  const { error } = await db
    .from("subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .is("unsubscribed_at", null);
  if (error) {
    console.error("[unsubscribe]", error.message);
    redirect(`/unsubscribe/${token}?error=1`);
  }
  redirect(`/unsubscribe/${token}?done=1`);
}
