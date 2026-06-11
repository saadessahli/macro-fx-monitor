"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatChartDate, formatNumber } from "@/lib/format";
import { ObservationPoint } from "@/types";

function sampleSeries(data: ObservationPoint[]) {
  if (data.length <= 180) return data;
  const step = Math.ceil(data.length / 180);
  return data.filter((_, index) => index % step === 0 || index === data.length - 1);
}

export function ChartShell({
  title,
  subtitle,
  data,
  units,
  accent = "#8fb4ff",
}: {
  title: string;
  subtitle?: string;
  data: ObservationPoint[];
  units: string;
  accent?: string;
}) {
  if (!data.length) {
    return (
      <div className="surface-card">
        <div className="section-head">
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="notice-card">No time-series data is currently available for this panel.</div>
      </div>
    );
  }

  const sampled = sampleSeries(data);

  return (
    <div className="surface-card">
      <div className="section-head">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="chart-frame">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sampled} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.10)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatChartDate}
              tick={{ fill: "#7f8da3", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              tick={{ fill: "#7f8da3", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatNumber(value, 0)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#111827",
                border: "1px solid #263247",
                borderRadius: 8,
                boxShadow: "0 12px 28px rgba(0,0,0,0.32)",
              }}
              labelFormatter={(label) => formatChartDate(String(label))}
              formatter={(value: number) => [formatNumber(value, 2), units]}
            />
            <Line type="monotone" dataKey="value" stroke={accent} strokeWidth={2.2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
