import type { ReactNode } from "react";
import { Database, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SidebarNav } from "@/components/sidebar-nav";
import { LiveDataRefresh } from "@/components/live-data-refresh";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-shell">
      <aside className="sidebar-wrap">
        <SidebarNav />
      </aside>
      <main className="main-shell">
        <div className="topbar">
          <div className="topbar-copy">
            <span className="eyebrow">Research Workspace</span>
            <h1 className="topbar-title">US Macro Regime Monitor</h1>
            <p>Inflation and growth through policy, rates, and the dollar.</p>
          </div>
          <div className="topbar-actions">
            <LiveDataRefresh />
            <div className="topbar-meta">
              <span><Database size={14} /> Source-backed</span>
              <span><ShieldCheck size={14} /> Fallback protected</span>
            </div>
          </div>
        </div>
        <div className="content-shell">{children}</div>
        <footer className="site-footer">
          <p>
            This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.
            Educational research only, not financial advice.
          </p>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
