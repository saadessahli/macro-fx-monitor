import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { setPassword } from "./actions";

export const metadata: Metadata = {
  title: "Set Admin Password",
  robots: { index: false, follow: false },
};

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?error=Open the invitation link before setting a password.");
  if (!isAdminEmail(user.email)) redirect("/admin");

  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="admin-mark"><KeyRound size={20} /></div>
        <span className="eyebrow">Admin activation</span>
        <h1>Set your password</h1>
        <p>Use at least 12 characters. This password protects the private workspace.</p>

        <form action={setPassword} className="auth-form">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          <label htmlFor="confirm-password">Confirm password</label>
          <input
            id="confirm-password"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
          />
          <button type="submit">Set password</button>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
