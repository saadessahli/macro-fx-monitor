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

export type XContentType =
  | "single"
  | "thread"
  | "educational"
  | "driver"
  | "weekly-recap"
  | "contrarian";

export type MarketingDraftStatus = "draft" | "ready" | "posted";
export type MarketingTone = "professional" | "simple" | "analytical" | "direct";
export type MarketingVariationStyle = "conservative" | "educational" | "engagement";
export type MarketingResultQuality = "bad" | "okay" | "good" | "strong";
export type MarketingPlanStatus = "draft" | "copied" | "posted" | "skipped";
export type MarketContextCategory =
  | "inflation"
  | "Fed"
  | "labor"
  | "growth"
  | "yields"
  | "USD"
  | "risk sentiment"
  | "oil"
  | "geopolitical"
  | "other";
export type MarketSentiment = "risk-on" | "risk-off" | "neutral" | "uncertain";
export type ContextImportance = "low" | "medium" | "high";
export type DxyRelevance = "low" | "medium" | "high";
export type ManualContextKind = "note" | "event" | "headline" | "geopolitical";
export type MarketingIdeaCategory =
  | "educational macro concept"
  | "event preview"
  | "event reaction"
  | "geopolitical context"
  | "risk management reminder"
  | "dashboard snapshot"
  | "confirmation / invalidation"
  | "thread idea";

export type MarketingQualityScores = {
  clarity: number;
  relevance: number;
  hook: number;
  educationalValue: number;
  promotionalRisk: number;
  financialAdviceRisk: number;
  repetitionRisk: number;
  risk: number;
  warnings: string[];
};

export type MarketingVariation = {
  style: MarketingVariationStyle;
  text: string;
  whyItWorks: string;
  characterCount: number;
  scores: MarketingQualityScores;
};

export type MarketingDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  contentType: XContentType;
  status: MarketingDraftStatus;
  title: string;
  textContent: string;
  threadPosts: string[];
  imageCardData: MarketingImageCardData;
  videoConfig: MarketingVideoConfig;
  snapshotId: string;
  snapshotDate: string;
  manuallyPostedAt: string | null;
  copiedAt: string | null;
  topic: string;
  tone: MarketingTone;
  instruction: string;
  variations: MarketingVariation[];
  qualityScores: MarketingQualityScores;
  versionNumber: number;
  postedUrl: string;
  notes: string;
};

export type MarketingImageCardData = {
  score: string;
  bias: string;
  drivers: string[];
  confirmation: string;
  invalidation: string;
  snapshotUrl: string;
  snapshotDate: string;
};

export type MarketingVideoConfig = MarketingImageCardData & {
  title: string;
  durationSeconds: number;
  hook: string;
  voiceoverScript: string;
  musicEnabled: boolean;
  musicUrl: string;
  musicVolume: number;
  subtitlesEnabled: boolean;
  voiceoverUrl: string;
};

export type MarketingSettings = {
  defaultTone: MarketingTone;
  dailyPostTarget: number;
  dailyReplyTarget: number;
  defaultDisclaimer: string;
  linkUsageFrequency: "never" | "low" | "medium" | "high";
  promotionalLevelLimit: number;
  preferredTopics: string[];
  blockedTopics: string[];
  blockedWords: string[];
  targetAudience: string;
  defaultCta: string;
  aiEnabled: boolean;
  xApiDiscoveryEnabled: boolean;
  manualFallbackEnabled: boolean;
  videoMusicEnabled: boolean;
  subtitlesEnabled: boolean;
};

export type MarketingDailyPlanItem = {
  id: string;
  contentType: XContentType | "reply" | "image" | "video";
  category?: MarketingIdeaCategory;
  topic: string;
  timeWindow: string;
  draftText: string;
  reason: string;
  sourceContext?: string;
  riskScore?: number;
  repetitionScore?: number;
  repetitionWarning?: string | null;
  goal: "educate" | "engage" | "drive dashboard visits" | "build credibility";
  status: MarketingPlanStatus;
};

export type MarketCalendarEvent = {
  id: string;
  eventName: string;
  country: string;
  currency: string;
  eventDate: string;
  eventTime: string;
  importance: ContextImportance;
  category: MarketContextCategory;
  previous: string;
  forecast: string;
  actual: string;
  source: string;
  sourceUrl: string;
  whyItMatters: string;
  isManual: boolean;
  refreshedAt: string;
};

export type MarketNewsItem = {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  topic: string;
  relevanceScore: number;
  macroImpactCategory: MarketContextCategory;
  sentiment: MarketSentiment;
  dxyRelevance: DxyRelevance;
  dxyAngle: string;
  isManual: boolean;
  refreshedAt: string;
};

export type ManualContextNote = {
  id: string;
  kind: ManualContextKind;
  title: string;
  details: string;
  contextDate: string;
  createdAt: string;
};

export type FreshMarketContext = {
  calendarEvents: MarketCalendarEvent[];
  newsItems: MarketNewsItem[];
  manualNotes: ManualContextNote[];
  calendarRefreshedAt: string | null;
  newsRefreshedAt: string | null;
  calendarApiEnabled: boolean;
  newsApiEnabled: boolean;
  calendarMode: "provider" | "fred-fallback" | "manual";
  newsMode: "provider" | "manual";
};

export type MarketingSystemStatus = {
  appVersion: string;
  commitSha: string | null;
  deployedAt: string | null;
  serverTime: string;
  snapshotDate: string;
  snapshotGeneratedAt: string;
  snapshotSource: "supabase" | "live-fallback";
  snapshotStale: boolean;
  latestDraftAt: string | null;
  planGeneratedAt: string;
  nextCalendarEvent: EconomicCalendarEvent | null;
  calendarRefreshedAt: string | null;
  newsRefreshedAt: string | null;
  latestManualContextAt: string | null;
  calendarApiEnabled: boolean;
  newsApiEnabled: boolean;
  fallbackContextMode: boolean;
  supabaseConnected: boolean;
  buttondownConfigured: boolean;
  aiEnabled: boolean;
  xApiDiscoveryEnabled: boolean;
};

export type ReplyOpportunityStatus = "new" | "copied" | "replied" | "skipped";

export type ReplyOpportunity = {
  id: string;
  createdAt: string;
  updatedAt: string;
  originalUrl: string;
  author: string;
  postText: string;
  detectedTopic: string;
  relevanceScore: number;
  replyShort: string;
  replyEducational: string;
  replyDashboard: string;
  replyQualityScore: number;
  promotionalRiskScore: number;
  status: ReplyOpportunityStatus;
  repliedAt: string | null;
  copiedAt: string | null;
  notes: string;
};

export type PostPerformance = {
  id: string;
  draftId: string | null;
  replyOpportunityId: string | null;
  postedUrl: string;
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  bookmarks: number;
  profileVisits: number;
  resultQuality: MarketingResultQuality;
  notes: string;
  createdAt: string;
  updatedAt: string;
};
