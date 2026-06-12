import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { login } from "./actions";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getAuthenticatedUser();
  if (user && isAdminEmail(user.email)) redirect("/admin/marketing");

  const { error } = await searchParams;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="admin-mark">
          <LockKeyhole size={20} />
        </div>
        <span className="eyebrow">Private workspace</span>
        <h1>Macro FX Monitor Admin</h1>
        <p>Sign in with the approved administrator account.</p>

        <form action={login} className="auth-form">
          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <button type="submit">Sign in</button>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
        </form>

        <Link href="/" className="admin-back-link">
          Return to the public dashboard
        </Link>
      </section>
    </main>
  );
}
