"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "../auth";
import { slugify } from "../slug";
import type { ActionResult } from "../types";
import { categoryInputSchema, fieldErrors, firstError, tagInputSchema } from "../validation";
import { dbFail, fail, isUniqueViolation, NOT_ALLOWED, SESSION_EXPIRED, succeed } from "./helpers";

const refresh = () => revalidatePath("/", "layout");
const UUID = /^[0-9a-f-]{36}$/i;

export async function saveCategory(input: unknown): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error), fieldErrors(parsed.error));
  const { id, name, description } = parsed.data;
  const slug = parsed.data.slug || slugify(name, 60);
  if (!slug) return fail("Use letters or numbers in the name.", { name: "Needs letters or numbers." });
  const res = id
    ? await ctx.supabase.from("categories").update({ name, slug, description }).eq("id", id).select("id")
    : await ctx.supabase.from("categories").insert({ name, slug, description }).select("id");
  if (res.error) {
    if (isUniqueViolation(res.error)) return fail("A category with that URL already exists.", { slug: "Already in use." });
    return dbFail("saveCategory", res.error);
  }
  if (!res.data?.length) return fail(NOT_ALLOWED);
  refresh();
  return succeed(id ? "Category updated." : "Category created.");
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!UUID.test(id)) return fail("Invalid category.");
  const res = await ctx.supabase.from("categories").delete().eq("id", id).select("id");
  if (res.error) return dbFail("deleteCategory", res.error);
  refresh();
  return succeed("Category deleted. Posts that used it keep their other categories.");
}

export async function saveTag(input: unknown): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  const parsed = tagInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed.error), fieldErrors(parsed.error));
  const { id, name } = parsed.data;
  const slug = parsed.data.slug || slugify(name, 60);
  if (!slug) return fail("Use letters or numbers in the name.", { name: "Needs letters or numbers." });
  const res = id
    ? await ctx.supabase.from("tags").update({ name, slug }).eq("id", id).select("id")
    : await ctx.supabase.from("tags").insert({ name, slug }).select("id");
  if (res.error) {
    if (isUniqueViolation(res.error)) return fail("A tag with that URL already exists.", { slug: "Already in use." });
    return dbFail("saveTag", res.error);
  }
  if (!res.data?.length) return fail(NOT_ALLOWED);
  refresh();
  return succeed(id ? "Tag updated." : "Tag created.");
}

export async function deleteTag(id: string): Promise<ActionResult> {
  const ctx = await getAdmin();
  if (!ctx) return fail(SESSION_EXPIRED);
  if (!UUID.test(id)) return fail("Invalid tag.");
  const res = await ctx.supabase.from("tags").delete().eq("id", id).select("id");
  if (res.error) return dbFail("deleteTag", res.error);
  refresh();
  return succeed("Tag deleted.");
}
