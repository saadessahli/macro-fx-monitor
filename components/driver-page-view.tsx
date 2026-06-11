import { ChartShell } from "@/components/chart-shell";
import {
  ConclusionPill,
  ConvictionPill,
  HeroCard,
  InlineSource,
  ScoreBar,
  StatCard,
  SurfaceCard,
} from "@/components/ui";
import { formatDate, formatNumber, formatPercent, formatSignedNumber } from "@/lib/format";
import { DriverAnalysis } from "@/types";

export function DriverPageView({ analysis }: { analysis: DriverAnalysis }) {
  const { driver, primarySeries, secondarySeries, metrics } = analysis;

  return (
    <div className="page-grid">
      <HeroCard>
        <div className="hero-topline">
          <span className="eyebrow">{driver.category}</span>
          <ConclusionPill conclusion={metrics.conclusion} />
        </div>
        <div className="hero-copy">
          <div>
            <h1>{driver.title}</h1>
            <p>{driver.description}</p>
          </div>
          <div className="hero-source">
            <span>Primary source</span>
            <strong>{primarySeries.meta.sourceLabel}</strong>
            <span>Latest observation: {formatDate(primarySeries.meta.latestSourceDate)}</span>
            <span>Source last updated: {formatDate(primarySeries.meta.lastUpdated)}</span>
            <span>Dashboard checked: {formatDate(primarySeries.meta.fetchedAt)}</span>
          </div>
        </div>
        <div className="macro-chain">
          <span>Driver</span>
          <span>Inflation / Growth</span>
          <span>Fed</span>
          <span>Yields</span>
          <span>DXY</span>
        </div>
      </HeroCard>

      <div className="metrics-grid">
        <StatCard label="Current reading" value={formatNumber(metrics.latest, 2)} sublabel={primarySeries.meta.units} />
        <StatCard label="Previous reading" value={formatNumber(metrics.previous, 2)} sublabel={primarySeries.meta.units} />
        <StatCard label="Absolute change" value={formatNumber(metrics.absoluteChange, 2)} sublabel={`vs ${formatDate(metrics.previousDate)}`} />
        <StatCard label="Percent change" value={formatPercent(metrics.percentChange, 2)} />
        <StatCard label="YoY" value={formatPercent(metrics.yoy, 2)} />
        <StatCard label="3M annualized" value={formatPercent(metrics.annualized3m, 2)} />
        <StatCard label="6M annualized" value={formatPercent(metrics.annualized6m, 2)} />
        <StatCard label="1Y average" value={formatNumber(metrics.avg1y, 2)} />
        <StatCard label="3Y average" value={formatNumber(metrics.avg3y, 2)} />
        <StatCard label="History high" value={formatNumber(metrics.allTimeHigh, 2)} sublabel="Available history since 1990" />
        <StatCard label="History low" value={formatNumber(metrics.allTimeLow, 2)} sublabel="Available history since 1990" />
        <StatCard label="Latest date" value={formatDate(metrics.latestDate)} />
      </div>

      <div className="two-column">
        <SurfaceCard>
          <div className="section-head">
            <h3>DXY Score</h3>
            <div className="badge-row">
              <ConvictionPill conviction={metrics.conviction} />
              <ConclusionPill conclusion={metrics.conclusion} />
            </div>
          </div>
          <div className="score-stack">
            <div className="score-number">{metrics.score === null ? "N/A" : `${formatSignedNumber(metrics.score, 1)} / 10`}</div>
            <ScoreBar score={metrics.score} />
            <p>{driver.narrative.scoringLogic}</p>
            <ul className="clean-list">
              {metrics.reasoning.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-head">
            <h3>Current Reading</h3>
            <p>{driver.narrative.currentReadingLogic}</p>
          </div>
          <div className="source-stack">
            <div>
              <span>Source</span>
              <InlineSource label={primarySeries.meta.sourceLabel} href={primarySeries.meta.sourceUrl} />
            </div>
            <div>
              <span>Source status</span>
              <strong className="caps">{primarySeries.meta.status}</strong>
            </div>
            <div>
              <span>Observation date</span>
              <strong>{formatDate(primarySeries.meta.latestSourceDate)}</strong>
            </div>
            <div>
              <span>Automatic refresh</span>
              <strong>
                {primarySeries.meta.refreshIntervalSeconds
                  ? `Every ${primarySeries.meta.refreshIntervalSeconds} seconds`
                  : "On page load"}
              </strong>
            </div>
            <div>
              <span>Display logic</span>
              <strong>{driver.narrative.currentReadingLogic}</strong>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <div className="section-head">
          <h3>Forward DXY Outlook</h3>
          <p>This turns the driver into a time-horizon view instead of a static label.</p>
        </div>
        <div className="three-column">
          {metrics.horizonOutlooks.map((outlook) => (
            <SurfaceCard key={outlook.horizon} className="nested-card">
              <div className="section-head">
                <h3>{outlook.horizon}</h3>
                <ConvictionPill conviction={outlook.conviction} />
              </div>
              <div className="bucket-score">
                {outlook.score === null ? "N/A" : `${formatSignedNumber(outlook.score, 1)} / 10`}
              </div>
              <p>{outlook.summary}</p>
              <ConclusionPill conclusion={outlook.conclusion} />
            </SurfaceCard>
          ))}
        </div>
      </SurfaceCard>

      <ChartShell
        title={primarySeries.meta.label}
        subtitle={`Historical chart from ${primarySeries.meta.sourceLabel}`}
        data={metrics.chartData}
        units={primarySeries.meta.units}
      />

      {secondarySeries ? (
        <ChartShell
          title={secondarySeries.meta.label}
          subtitle="Delayed market DXY quote, shown separately from the broad-dollar scoring proxy"
          data={secondarySeries.data}
          units={secondarySeries.meta.units}
          accent="#4ed7b7"
        />
      ) : null}

      <div className="analysis-grid">
        <SurfaceCard>
          <div className="section-head">
            <h3>12-Month Context</h3>
          </div>
          <ul className="clean-list">
            {metrics.twelveMonthContext.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </SurfaceCard>
        <SurfaceCard>
          <div className="section-head">
            <h3>Definition</h3>
          </div>
          <p>{driver.narrative.definition}</p>
        </SurfaceCard>
        <SurfaceCard>
          <div className="section-head">
            <h3>Why It Matters</h3>
          </div>
          <p>{driver.narrative.whyItMatters}</p>
        </SurfaceCard>
        <SurfaceCard>
          <div className="section-head">
            <h3>Impact on Future Inflation</h3>
          </div>
          <p>{driver.narrative.inflationImpact}</p>
        </SurfaceCard>
        <SurfaceCard>
          <div className="section-head">
            <h3>Impact on Future GDP / Growth</h3>
          </div>
          <p>{driver.narrative.growthImpact}</p>
        </SurfaceCard>
        <SurfaceCard>
          <div className="section-head">
            <h3>Transmission to the Fed</h3>
          </div>
          <p>{driver.narrative.fedTransmission}</p>
        </SurfaceCard>
        <SurfaceCard>
          <div className="section-head">
            <h3>Chain Reaction to Yields and DXY</h3>
          </div>
          <p>{driver.narrative.yieldDxyChain}</p>
        </SurfaceCard>
      </div>

      {primarySeries.meta.notes?.length || driver.notes?.length ? (
        <SurfaceCard>
          <div className="section-head">
            <h3>Implementation Notes</h3>
          </div>
          <ul className="clean-list">
            {[...(primarySeries.meta.notes ?? []), ...(driver.notes ?? [])].map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </SurfaceCard>
      ) : null}
    </div>
  );
}
