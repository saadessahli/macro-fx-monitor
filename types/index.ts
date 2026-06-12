export type DriverCategory = "Inflation" | "Growth" | "Policy" | "Market";
export type DataSourceKind = "fred" | "ism-hybrid" | "composite";
export type SeriesFrequency = "daily" | "monthly";
export type ScoreDirection = "higher-is-bullish" | "lower-is-bullish";
export type Conviction = "Low" | "Medium" | "High";
export type BiasConclusion = "Bullish for DXY" | "Bearish for DXY" | "Neutral for DXY";
export type TimeHorizon = "1-3M" | "3-6M" | "6-12M";

export type ObservationPoint = {
  date: string;
  value: number;
};

export type SourceStatus = "live" | "fallback" | "placeholder" | "error";

export type SeriesMeta = {
  label: string;
  sourceLabel: string;
  sourceUrl?: string;
  units: string;
  latestSourceDate?: string | null;
  lastUpdated?: string | null;
  fetchedAt?: string | null;
  refreshIntervalSeconds?: number | null;
  status: SourceStatus;
  notes?: string[];
};

export type SeriesBundle = {
  key: string;
  data: ObservationPoint[];
  meta: SeriesMeta;
};

export type ScoreMode =
  | "inflation-index"
  | "employment-level"
  | "unemployment-rate"
  | "ism-diffusion"
  | "sentiment-level"
  | "housing-permits"
  | "money-supply"
  | "policy-rate"
  | "treasury-yield"
  | "usd-broad";

export type DriverNarrative = {
  definition: string;
  whyItMatters: string;
  inflationImpact: string;
  growthImpact: string;
  fedTransmission: string;
  yieldDxyChain: string;
  currentReadingLogic: string;
  scoringLogic: string;
};

export type DriverConfig = {
  slug: string;
  title: string;
  shortTitle: string;
  category: DriverCategory;
  description: string;
  frequency: SeriesFrequency;
  weight: number;
  scoreMode: ScoreMode;
  scoreDirection: ScoreDirection;
  primarySeries: {
    kind: DataSourceKind;
    seriesId?: string;
    fallbackCsvPath?: string;
    latestJsonPath?: string;
    label: string;
    sourceLabel: string;
    sourceUrl?: string;
    units: string;
  };
  secondarySeries?: {
    kind: "market-dxy-adapter";
    label: string;
    sourceLabel: string;
    sourceUrl?: string;
    units: string;
  };
  narrative: DriverNarrative;
  notes?: string[];
};

export type DriverMetrics = {
  latest: number | null;
  previous: number | null;
  absoluteChange: number | null;
  percentChange: number | null;
  yoy: number | null;
  annualized3m: number | null;
  annualized6m: number | null;
  avg1y: number | null;
  avg3y: number | null;
  allTimeHigh: number | null;
  allTimeLow: number | null;
  latestDate: string | null;
  previousDate: string | null;
  score: number | null;
  conviction: Conviction;
  conclusion: BiasConclusion;
  reasoning: string[];
  twelveMonthContext: string[];
  horizonOutlooks: DriverHorizonOutlook[];
  chartData: ObservationPoint[];
};

export type DriverHorizonOutlook = {
  horizon: TimeHorizon;
  score: number | null;
  conviction: Conviction;
  conclusion: BiasConclusion;
  summary: string;
};

export type DriverAnalysis = {
  driver: DriverConfig;
  primarySeries: SeriesBundle;
  secondarySeries?: SeriesBundle | null;
  metrics: DriverMetrics;
};

export type DashboardBucket = {
  category: DriverCategory;
  score: number | null;
  conviction: Conviction;
  drivers: DriverAnalysis[];
};

export type DashboardAggregate = {
  score: number | null;
  conviction: Conviction;
  conclusion: BiasConclusion;
  summary: string;
  baseCaseHorizon: DashboardHorizonOutlook | null;
  horizonOutlooks: DashboardHorizonOutlook[];
  bullishDrivers: DriverAnalysis[];
  bearishDrivers: DriverAnalysis[];
  strongestPositives: DriverAnalysis[];
  strongestNegatives: DriverAnalysis[];
  buckets: DashboardBucket[];
};

export type DashboardHorizonOutlook = {
  horizon: TimeHorizon;
  score: number | null;
  conviction: Conviction;
  conclusion: BiasConclusion;
  summary: string;
  supportingDrivers: DriverAnalysis[];
};

export type NewsletterFrequency = "weekly" | "monthly";

export type EconomicCalendarEvent = {
  date: string;
  releaseId: number;
  releaseName: string;
  relatedDrivers: string[];
  importance: "high" | "medium";
};

export type SnapshotDriver = {
  slug: string;
  title: string;
  latest: number | null;
  latestDate: string | null;
  score: number | null;
  conclusion: BiasConclusion;
  change: number | null;
};

export type MacroSnapshot = {
  id: string;
  frequency: NewsletterFrequency;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  title: string;
  summary: string;
  dxyScore: number | null;
  dxyConclusion: BiasConclusion;
  dxyPlay: {
    bias: string;
    expression: string;
    confirmation: string;
    invalidation: string;
    riskNote: string;
  };
  strongestDrivers: SnapshotDriver[];
  recentReleases: SnapshotDriver[];
  upcomingCalendar: EconomicCalendarEvent[];
};

export type MarketingDraft = {
  id: string;
  channel: string;
  title: string;
  body: string;
  note: string;
};
