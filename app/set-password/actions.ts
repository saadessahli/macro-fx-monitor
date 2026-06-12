"use server";

import { redirect } from "next/navigation";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

function passwordUrl(message: string) {
  return `/set-password?error=${encodeURIComponent(message)}`;
}

export async function setPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (password.length < 12) {
    redirect(passwordUrl("Use at least 12 characters."));
  }

  if (password !== confirmation) {
    redirect(passwordUrl("Passwords do not match."));
  }

  const supabase = await createSupabaseAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?error=Your password setup session has expired.");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(passwordUrl("Password could not be updated. Request a new invitation."));

  redirect("/admin/marketing");
}
