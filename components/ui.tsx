import type { ReactNode } from "react";
import Link from "next/link";
import { BiasConclusion, Conviction } from "@/types";

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`surface-card ${className}`.trim()}>{children}</section>;
}

export function HeroCard({ children }: { children: ReactNode }) {
  return <section className="hero-card">{children}</section>;
}

export function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <SurfaceCard className="stat-card">
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        <span className="stat-marker" />
      </div>
      <strong className="stat-value">{value}</strong>
      {sublabel ? <span className="stat-sub">{sublabel}</span> : null}
    </SurfaceCard>
  );
}

export function Pill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "bullish" | "bearish";
}) {
  return <span className={`pill ${tone}`}>{label}</span>;
}

export function ScoreBar({ score }: { score: number | null }) {
  const normalized = score === null ? 0 : ((score + 10) / 20) * 100;
  const center = 50;
  const left = `${Math.min(normalized, center)}%`;
  const width = `${Math.abs(normalized - center)}%`;
  return (
    <div className="scorebar-wrap">
      <div className="scorebar">
        <div className="scorebar-neutral" />
        <div className="scorebar-fill" style={{ left, width }} />
      </div>
      <div className="scorebar-labels">
        <span>Bearish</span>
        <span>Neutral</span>
        <span>Bullish</span>
      </div>
    </div>
  );
}

export function ConclusionPill({
  conclusion,
}: {
  conclusion: BiasConclusion;
}) {
  const tone =
    conclusion === "Bullish for DXY"
      ? "bullish"
      : conclusion === "Bearish for DXY"
        ? "bearish"
        : "neutral";

  return <Pill label={conclusion} tone={tone} />;
}

export function ConvictionPill({ conviction }: { conviction: Conviction }) {
  return <Pill label={`${conviction} conviction`} tone="neutral" />;
}

export function InlineSource({
  label,
  href,
}: {
  label: string;
  href?: string;
}) {
  if (!href) return <span>{label}</span>;
  return (
    <Link href={href} target="_blank" rel="noreferrer" className="inline-link">
      {label}
    </Link>
  );
}
