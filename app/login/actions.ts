"use server";

import { redirect } from "next/navigation";
import { createSupabaseAuthClient, isSupabaseAuthConfigured } from "@/lib/supabase-auth";

function loginUrl(message: string) {
  return `/login?error=${encodeURIComponent(message)}`;
}

export async function login(formData: FormData) {
  if (!isSupabaseAuthConfigured()) {
    redirect(loginUrl("Login is not configured yet."));
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(loginUrl("Enter your email and password."));
  }

  const supabase = await createSupabaseAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(loginUrl("Invalid email or password."));
  }

  redirect("/admin/marketing");
}

export async function logout() {
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseAuthClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
