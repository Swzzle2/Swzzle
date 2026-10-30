import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Session-aware client for admin pages and server actions. RLS applies as the signed-in user. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes sessions.
        }
      },
    },
  });
}

/**
 * Anonymous client for public pages. Never carries a session, so it can only read the public_* views.
 * Awaits connection() so the read happens at request time, not during prerender.
 */
export async function createPublicClient() {
  await connection();
  return createPlainClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
