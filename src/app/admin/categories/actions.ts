"use server";

import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { SLUG_RE, slugify } from "@/lib/format";

export type CategoryState = { error?: string; ok?: boolean };

function read(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);
  const sort_order = Number(form.get("sort_order") ?? 0) || 0;
  return { name, slug, sort_order };
}

function friendly(message: string) {
  return message.includes("categories_slug_key") ? "That slug is already used by another category." : message;
}

export async function createCategory(_prev: CategoryState, form: FormData): Promise<CategoryState> {
  const { supabase } = await requireAdmin();
  const values = read(form);
  if (!values.name) return { error: "Name is required." };
  if (!SLUG_RE.test(values.slug)) return { error: "Invalid slug." };
  const { error } = await supabase.from("categories").insert(values);
  if (error) return { error: friendly(error.message) };
  refresh();
  return { ok: true };
}

export async function updateCategory(_prev: CategoryState, form: FormData): Promise<CategoryState> {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const values = read(form);
  if (!values.name) return { error: "Name is required." };
  if (!SLUG_RE.test(values.slug)) return { error: "Invalid slug." };
  const { error } = await supabase.from("categories").update(values).eq("id", id);
  if (error) return { error: friendly(error.message) };
  refresh();
  return { ok: true };
}

export async function deleteCategory(_prev: CategoryState, form: FormData): Promise<CategoryState> {
  const { supabase } = await requireAdmin();
  const id = String(form.get("id") ?? "");
  // Products in this category keep existing with no category (FK is on delete set null).
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return { error: error.message };
  refresh();
  return { ok: true };
}
