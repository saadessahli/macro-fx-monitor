import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { isSupabaseAuthConfigured } from "@/lib/supabase-auth";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set Admin Password",
  robots: { index: false, follow: false },
};

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const isConfigured = isSupabaseAuthConfigured();
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="admin-mark"><KeyRound size={20} /></div>
        <span className="eyebrow">Admin activation</span>
        <h1>Set your password</h1>
        <p>Use at least 12 characters. This page accepts both invitation and password recovery links.</p>

        {isConfigured ? (
          <ResetPasswordForm
            initialError={error}
            supabaseUrl={supabaseUrl}
            supabaseAnonKey={supabaseAnonKey}
          />
        ) : (
          <p className="auth-error" role="alert">
            Supabase Auth is not configured yet.
          </p>
        )}
      </section>
    </main>
  );
}
