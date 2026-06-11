import { Conviction } from "@/types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

export function safeNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function formatNumber(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  return `${formatNumber(value, digits)}%`;
}

export function formatSignedNumber(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return "N/A";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, digits)}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: isDateOnly ? "UTC" : undefined,
  }).format(date);
}

export function formatChartDate(value: string) {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "2-digit",
    month: "short",
    timeZone: isDateOnly ? "UTC" : undefined,
  }).format(date);
}

export function convictionFromDistance(score: number | null): Conviction {
  if (score === null) return "Low";
  const distance = Math.abs(score);
  if (distance >= 5) return "High";
  if (distance >= 2.5) return "Medium";
  return "Low";
}

export function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
