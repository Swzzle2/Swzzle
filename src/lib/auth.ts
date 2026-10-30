import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns a session client for an admin, or throws/redirects.
 * Every admin server action calls this first; RLS would refuse the writes anyway,
 * but this gives a clear error instead of a silent empty result.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!profile?.is_admin) redirect("/login?error=not-admin");

  return { supabase, user };
}
