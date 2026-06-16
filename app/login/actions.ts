"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAuthClient, isSupabaseAuthConfigured } from "@/lib/supabase-auth";
import { siteConfig } from "@/lib/site";

function loginUrl(message: string) {
  return `/login?error=${encodeURIComponent(message)}`;
}

function loginMessageUrl(message: string) {
  return `/login?message=${encodeURIComponent(message)}`;
}

async function getAuthRedirectOrigin() {
  const configuredUrl = siteConfig.url?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/$/, "");

  const headerStore = await headers();
  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");

  if (host) {
    const protocol = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
    return `${protocol}://${host}`;
  }

  return "http://localhost:3000";
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

export async function requestPasswordReset(formData: FormData) {
  if (!isSupabaseAuthConfigured()) {
    redirect(loginUrl("Login is not configured yet."));
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    redirect(loginUrl("Enter the administrator email first."));
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const genericMessage = "If the approved administrator account exists, a recovery link has been sent.";

  if (adminEmail && email !== adminEmail) {
    redirect(loginMessageUrl(genericMessage));
  }

  const supabase = await createSupabaseAuthClient();
  const redirectOrigin = await getAuthRedirectOrigin();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${redirectOrigin}/set-password`,
  });

  redirect(loginMessageUrl(genericMessage));
}

export async function logout() {
  if (isSupabaseAuthConfigured()) {
    const supabase = await createSupabaseAuthClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}
