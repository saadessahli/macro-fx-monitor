import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, LogOut, Megaphone } from "lucide-react";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { logout } from "@/app/login/actions";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s | Macro FX Monitor Admin",
  },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");

  if (!isAdminEmail(user.email)) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <span className="eyebrow">Private workspace</span>
          <h1>Access denied.</h1>
          <p>This account is authenticated but is not approved for admin access.</p>
          <form action={logout}>
            <button className="admin-secondary-button" type="submit">Sign out</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin/marketing" className="admin-brand">
          <span className="admin-brand-icon"><BarChart3 size={19} /></span>
          <span>
            <small>Macro FX Monitor</small>
            <strong>Admin Workspace</strong>
          </span>
        </Link>
        <nav aria-label="Admin navigation">
          <Link href="/admin/marketing">
            <Megaphone size={17} />
            X Marketing Agent
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <span>{user.email}</span>
          <form action={logout}>
            <button type="submit"><LogOut size={16} /> Sign out</button>
          </form>
          <Link href="/">View public dashboard</Link>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
