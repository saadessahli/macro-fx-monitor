import Link from "next/link";
import { ConclusionPill, HeroCard, ScoreBar, StatCard, SurfaceCard } from "@/components/ui";
import { buildDashboardAggregate } from "@/lib/dashboard";
import { formatNumber, formatSignedNumber } from "@/lib/format";
import { loadAllDriverAnalyses } from "@/lib/series";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const analyses = await loadAllDriverAnalyses();
  const aggregate = buildDashboardAggregate(analyses);

  return (
    <div className="page-grid">
      <HeroCard>
        <div className="hero-topline">
          <span className="eyebrow">Global Dashboard</span>
          <span className="pill neutral">{aggregate.conclusion}</span>
        </div>
        <div className="hero-copy">
          <div>
            <h1>Global DXY View</h1>
            <p>
              A weighted aggregate across inflation, growth, policy, and market drivers designed to turn the macro regime into a repeatable USD framework.
            </p>
          </div>
          <div className="hero-side-note">
            <strong>Base-case horizon</strong>
            <p>
              {aggregate.baseCaseHorizon
                ? `DXY is ${aggregate.baseCaseHorizon.conclusion.replace(" for DXY", "").toLowerCase()} for the next ${aggregate.baseCaseHorizon.horizon.toLowerCase()} on the current macro mix.`
                : aggregate.summary}
            </p>
          </div>
        </div>
      </HeroCard>

      <div className="three-column">
        <StatCard label="Global DXY score" value={aggregate.score === null ? "N/A" : `${formatSignedNumber(aggregate.score, 1)} / 10`} sublabel="-10 bearish, 0 neutral, +10 bullish" />
        <StatCard label="Conviction" value={aggregate.conviction} sublabel="Distance from a neutral score of 0" />
        <StatCard label="Loaded drivers" value={`${analyses.length}`} sublabel="Available series in the dashboard" />
      </div>

      <SurfaceCard>
        <div className="section-head">
          <h3>Macro Reasoning</h3>
          <p>{aggregate.summary}</p>
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="section-head">
          <h3>DXY Time Horizon Outlook</h3>
          <p>The dashboard now tells you when the macro signal matters most, not just direction.</p>
        </div>
        <div className="three-column">
          {aggregate.horizonOutlooks.map((outlook) => (
            <SurfaceCard key={outlook.horizon} className="nested-card">
              <div className="section-head">
                <h3>{outlook.horizon}</h3>
                <p>{outlook.conviction} conviction</p>
              </div>
              <div className="bucket-score">
                {outlook.score === null ? "N/A" : `${formatSignedNumber(outlook.score, 1)} / 10`}
              </div>
              <p>{outlook.summary}</p>
              <ul className="clean-list">
                {outlook.supportingDrivers.map((item) => (
                  <li key={`${outlook.horizon}-${item.driver.slug}`}>
                    <Link href={`/drivers/${item.driver.slug}`} className="inline-link">
                      {item.driver.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="section-head">
          <h3>Aggregate Score Bar</h3>
        </div>
        <ScoreBar score={aggregate.score} />
      </SurfaceCard>

      <div className="four-column">
        {aggregate.buckets.map((bucket) => (
          <SurfaceCard key={bucket.category}>
            <div className="section-head">
              <h3>{bucket.category}</h3>
              <p>{bucket.conviction} conviction</p>
            </div>
            <div className="bucket-score">{bucket.score === null ? "N/A" : `${formatSignedNumber(bucket.score, 1)} / 10`}</div>
            <ul className="clean-list">
              {bucket.drivers.map((item) => (
                <li key={item.driver.slug}>
                  <Link href={`/drivers/${item.driver.slug}`} className="inline-link">
                    {item.driver.title}
                  </Link>{" "}
                  <span className="muted">({item.metrics.score === null ? "N/A" : formatSignedNumber(item.metrics.score, 1)})</span>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ))}
      </div>

      <div className="two-column">
        <SurfaceCard>
          <div className="section-head">
            <h3>Strongest Positives</h3>
          </div>
          <ul className="clean-list">
            {aggregate.strongestPositives.map((item) => (
              <li key={item.driver.slug}>
                <Link href={`/drivers/${item.driver.slug}`} className="inline-link">
                  {item.driver.title}
                </Link>{" "}
                <span className="muted">score {formatSignedNumber(item.metrics.score, 1)}</span>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-head">
            <h3>Strongest Negatives</h3>
          </div>
          <ul className="clean-list">
            {aggregate.strongestNegatives.map((item) => (
              <li key={item.driver.slug}>
                <Link href={`/drivers/${item.driver.slug}`} className="inline-link">
                  {item.driver.title}
                </Link>{" "}
                <span className="muted">score {formatSignedNumber(item.metrics.score, 1)}</span>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </div>

      <div className="two-column">
        <SurfaceCard>
          <div className="section-head">
            <h3>Bullish Drivers</h3>
          </div>
          <ul className="clean-list">
            {aggregate.bullishDrivers.map((item) => (
              <li key={item.driver.slug}>
                <Link href={`/drivers/${item.driver.slug}`} className="inline-link">
                  {item.driver.title}
                </Link>{" "}
                <span className="muted">({item.metrics.conclusion})</span>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-head">
            <h3>Bearish Drivers</h3>
          </div>
          <ul className="clean-list">
            {aggregate.bearishDrivers.map((item) => (
              <li key={item.driver.slug}>
                <Link href={`/drivers/${item.driver.slug}`} className="inline-link">
                  {item.driver.title}
                </Link>{" "}
                <span className="muted">({item.metrics.conclusion})</span>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <div className="section-head">
          <h3>Driver Table</h3>
          <p>Weighted, macro-oriented ranking of the full driver set.</p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Category</th>
                <th>Weight</th>
                <th>Latest</th>
                <th>YoY</th>
                <th>Score</th>
                <th>Conclusion</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map((item) => (
                <tr key={item.driver.slug}>
                  <td>
                    <Link href={`/drivers/${item.driver.slug}`} className="inline-link">
                      {item.driver.title}
                    </Link>
                  </td>
                  <td>{item.driver.category}</td>
                  <td>{Math.round(item.driver.weight * 100)}%</td>
                  <td>{formatNumber(item.metrics.latest, 2)}</td>
                  <td>{item.metrics.yoy === null ? "N/A" : `${formatNumber(item.metrics.yoy, 2)}%`}</td>
                  <td>{formatSignedNumber(item.metrics.score, 1)}</td>
                  <td><ConclusionPill conclusion={item.metrics.conclusion} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
