import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function authConfig() {
  return {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
  };
}

export function isSupabaseAuthConfigured() {
  const { url, anonKey } = authConfig();
  return Boolean(url && anonKey);
}

export async function createSupabaseAuthClient() {
  const { url, anonKey } = authConfig();
  if (!url || !anonKey) {
    throw new Error("Supabase Auth is not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Middleware refreshes sessions.
        }
      },
    },
  });
}
