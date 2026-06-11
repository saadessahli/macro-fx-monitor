import type { Metadata } from "next";
import Link from "next/link";
import { drivers } from "@/lib/drivers";
import { SurfaceCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "Data Sources",
  description: "Source attribution, refresh cadence, and limitations for the Macro FX Monitor.",
};

export default function DataSourcesPage() {
  return (
    <div className="page-grid legal-page">
      <SurfaceCard>
        <span className="eyebrow">Transparency</span>
        <h1>Data Sources</h1>
        <p>Every dashboard driver includes its source, observation date, source update time, and fallback status.</p>
      </SurfaceCard>
      <SurfaceCard>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Driver</th><th>Provider</th><th>Frequency</th><th>Series</th></tr></thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.slug}>
                  <td><Link className="inline-link" href={`/drivers/${driver.slug}`}>{driver.title}</Link></td>
                  <td>{driver.primarySeries.sourceLabel}</td>
                  <td>{driver.frequency}</td>
                  <td>{driver.primarySeries.seriesId ?? driver.primarySeries.kind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
      <SurfaceCard>
        <h3>Required FRED notice</h3>
        <p>This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.</p>
        <p>Some series accessible through FRED are owned by third parties and may carry separate usage restrictions. Source links are provided on each driver page.</p>
      </SurfaceCard>
    </div>
  );
}
