"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "../auth";
import type { ActionResult, CommentStatus, MessageStatus } from "../types";
import { dbFail, fail, SESSION_EXPIRED, succeed } from "./helpers";

const UUID = /^[0-9a-f-]{36}$/i;

export async function setCommentStatus(id: string, status: CommentStatus): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!UUID.test(id) || !["pending", "approved", "spam", "rejected"].includes(status)) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("comments").update({ status }).eq("id", id);
  if (error) return dbFail("setCommentStatus", error);
  revalidatePath("/", "layout");
  return succeed(status === "approved" ? "Comment approved and now visible." : `Comment marked ${status}.`);
}

export async function deleteComment(id: string): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!UUID.test(id)) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("comments").delete().eq("id", id);
  if (error) return dbFail("deleteComment", error);
  revalidatePath("/", "layout");
  return succeed("Comment deleted.");
}

export async function setMessageStatus(id: string, status: MessageStatus): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!UUID.test(id) || !["new", "read", "archived"].includes(status)) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("contact_messages").update({ status }).eq("id", id);
  if (error) return dbFail("setMessageStatus", error);
  revalidatePath("/admin/messages");
  return succeed(status === "archived" ? "Message archived." : "Message updated.");
}

export async function deleteMessage(id: string): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!UUID.test(id)) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("contact_messages").delete().eq("id", id);
  if (error) return dbFail("deleteMessage", error);
  revalidatePath("/admin/messages");
  return succeed("Message deleted.");
}

export async function deleteSubscriber(id: string): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!UUID.test(id)) return fail("Invalid request.");
  const { error } = await ctx.supabase.from("subscribers").delete().eq("id", id);
  if (error) return dbFail("deleteSubscriber", error);
  revalidatePath("/admin/subscribers");
  return succeed("Subscriber removed.");
}
