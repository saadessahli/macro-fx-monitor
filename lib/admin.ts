import "server-only";

import { createSupabaseAuthClient, isSupabaseAuthConfigured } from "@/lib/supabase-auth";

export function isAdminEmail(email: string | null | undefined) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(adminEmail && email?.trim().toLowerCase() === adminEmail);
}

export async function getAuthenticatedUser() {
  if (!isSupabaseAuthConfigured()) return null;

  const supabase = await createSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}
