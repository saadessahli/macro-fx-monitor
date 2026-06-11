"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CandlestickChart,
  CircleDollarSign,
  Home,
  Landmark,
  Mail,
  Newspaper,
  Info,
  Menu,
  ScrollText,
  Database,
  TrendingUp,
  X,
} from "lucide-react";
import { navGroups } from "@/lib/drivers";

const iconMap: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  Home,
  "Global DXY Dashboard": BarChart3,
  CPI: TrendingUp,
  "Core CPI": TrendingUp,
  PPI: TrendingUp,
  "Core PPI": TrendingUp,
  NFP: Landmark,
  Unemployment: Landmark,
  "ISM Mfg": CandlestickChart,
  "ISM Services": CandlestickChart,
  UMCSI: CandlestickChart,
  Permits: Landmark,
  M2: CircleDollarSign,
  Fed: CircleDollarSign,
  Yields: BarChart3,
  Dollar: CircleDollarSign,
  "Latest Snapshot": Newspaper,
  Newsletter: Mail,
  About: Info,
  Methodology: ScrollText,
  "Data Sources": Database,
};

export function SidebarNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-copy">
          <div className="brand-mark">MX</div>
          <div>
            <span className="eyebrow">Macro Intelligence</span>
            <h2>US Macro / DXY</h2>
          </div>
        </div>
        <button
          className="mobile-menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      <nav
        id="primary-navigation"
        className={`sidebar-navigation${menuOpen ? " open" : ""}`}
        aria-label="Primary navigation"
      >
        {navGroups.map((group) => (
          <div key={group.label} className="sidebar-group">
            <span className="sidebar-group-label">{group.label}</span>
            <div className="sidebar-links">
              {group.items.map((item) => {
                const Icon = iconMap[item.label] ?? TrendingUp;
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`sidebar-link${active ? " active" : ""}`}>
                    <span className="sidebar-link-main">
                      <Icon size={15} strokeWidth={1.8} />
                      {item.label}
                    </span>
                    <span className="nav-indicator" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <Activity size={15} />
        <div>
          <strong>14 data series</strong>
          <span>Automatic source monitoring</span>
        </div>
      </div>
    </div>
  );
}
