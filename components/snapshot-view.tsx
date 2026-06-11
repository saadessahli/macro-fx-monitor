import Link from "next/link";
import { CalendarDays, Crosshair, Gauge, Newspaper } from "lucide-react";
import { formatNumber, formatSignedNumber } from "@/lib/format";
import { MacroSnapshot } from "@/types";
import { ConclusionPill, HeroCard, StatCard, SurfaceCard } from "@/components/ui";

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function SnapshotView({ snapshot }: { snapshot: MacroSnapshot }) {
  return (
    <div className="page-grid">
      <HeroCard>
        <div className="hero-topline">
          <span className="eyebrow">{snapshot.frequency} research note</span>
          <ConclusionPill conclusion={snapshot.dxyConclusion} />
        </div>
        <div className="hero-copy">
          <div>
            <h1>{snapshot.title}</h1>
            <p>{snapshot.summary}</p>
          </div>
          <div className="hero-side-note">
            <strong>Coverage period</strong>
            <p>{displayDate(snapshot.periodStart)} to {displayDate(snapshot.periodEnd)}</p>
          </div>
        </div>
      </HeroCard>

      <div className="three-column">
        <StatCard label="DXY score" value={`${formatSignedNumber(snapshot.dxyScore, 1)} / 10`} />
        <StatCard label="Current bias" value={snapshot.dxyPlay.bias} />
        <StatCard label="Upcoming events" value={`${snapshot.upcomingCalendar.length}`} />
      </div>

      <SurfaceCard className="playbook-card">
        <div className="section-head">
          <h3><Crosshair size={16} /> DXY Playbook</h3>
          <p>A conditional macro scenario, not an instruction to trade.</p>
        </div>
        <div className="playbook-grid">
          <div><span>Expression</span><strong>{snapshot.dxyPlay.expression}</strong></div>
          <div><span>Confirmation</span><strong>{snapshot.dxyPlay.confirmation}</strong></div>
          <div><span>Invalidation</span><strong>{snapshot.dxyPlay.invalidation}</strong></div>
          <div><span>Risk note</span><strong>{snapshot.dxyPlay.riskNote}</strong></div>
        </div>
      </SurfaceCard>

      <div className="two-column">
        <SurfaceCard>
          <div className="section-head">
            <h3><Newspaper size={16} /> What Changed</h3>
          </div>
          <ul className="clean-list">
            {snapshot.recentReleases.length ? snapshot.recentReleases.map((driver) => (
              <li key={driver.slug}>
                <Link className="inline-link" href={`/drivers/${driver.slug}`}>{driver.title}</Link>
                <span className="muted"> {formatNumber(driver.latest, 2)} · {displayDate(driver.latestDate ?? snapshot.periodEnd)}</span>
              </li>
            )) : <li>No tracked release changed during this period.</li>}
          </ul>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-head">
            <h3><Gauge size={16} /> Strongest Drivers</h3>
          </div>
          <ul className="clean-list">
            {snapshot.strongestDrivers.map((driver) => (
              <li key={driver.slug}>
                <Link className="inline-link" href={`/drivers/${driver.slug}`}>{driver.title}</Link>
                <span className="muted"> {formatSignedNumber(driver.score, 1)} · {driver.conclusion}</span>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <div className="section-head">
          <h3><CalendarDays size={16} /> Upcoming Economic Calendar</h3>
          <p>Tracked releases related to the dashboard’s macro drivers.</p>
        </div>
        <div className="calendar-list">
          {snapshot.upcomingCalendar.map((event) => (
            <div className="calendar-event" key={`${event.releaseId}-${event.date}`}>
              <time>{displayDate(event.date)}</time>
              <div>
                <strong>{event.releaseName}</strong>
                <span>{event.relatedDrivers.join(", ")}</span>
              </div>
              <span className={`importance ${event.importance}`}>{event.importance}</span>
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
