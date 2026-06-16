export type HookStrength = "strong" | "moderate" | "weak";

export type DetectedHook = {
  type: string;
  example: string;
  strength: HookStrength;
};

export type CompetitorIntelligenceReport = {
  postCount: number;
  commonTopics: string[];
  strongestHooks: DetectedHook[];
  contentAngles: string[];
  engagementFactors: string[];
  weakPoints: string[];
  gaps: string[];
  opportunities: string[];
  differentiatedPostIdeas: string[];
  safeReplyAngles: string[];
  complianceNote: string;
};

const MACRO_TOPICS: Record<string, string[]> = {
  "USD / DXY": ["dxy", "dollar index", "dollar strength", "dollar weakness", " usd "],
  "Fed policy": ["fed ", "fomc", "powell", "rate hike", "rate cut", "federal reserve", "interest rate", "terminal rate"],
  "Inflation": ["cpi", "pce", "inflation", "prices rising", "deflationary", "deflation", "core price"],
  "Treasury yields": ["yield", "treasury", "10y", "2y", "10-year", "2-year", "spread", "bund", "basis point"],
  "Labor market": ["nfp", "jobs report", "employment", "unemployment", "payrolls", "labor market"],
  "Risk sentiment": ["risk-on", "risk-off", "risk appetite", "sentiment", "safe haven", "flight to quality"],
  "Oil / commodities": ["oil", "crude", "wti", "brent", "commodity", "energy price"],
  "Geopolitical risk": ["geopolitical", "war", "conflict", "iran", "china", "taiwan", "sanctions", "escalation"],
  "Forex pairs": ["eurusd", "gbpusd", "usdjpy", "eur/usd", "gbp/usd", "usd/jpy", "forex", "fx pair"],
  "Economic growth": ["gdp", "recession", "contraction", "expansion", "pmi", "ism manufacturing", "growth data"],
};

const HOOK_PATTERNS: Array<{
  type: string;
  test: (firstLine: string) => boolean;
  strength: HookStrength;
}> = [
  { type: "Stat / data opener", test: (l) => /^\d|%\s*[A-Z—]/.test(l), strength: "strong" },
  { type: "Question hook", test: (l) => l.includes("?"), strength: "strong" },
  { type: "Contrarian take", test: (l) => /\b(wrong|everyone|most people|unpopular|contrary|myth|actually)\b/i.test(l), strength: "strong" },
  { type: "Conditional / if-when opener", test: (l) => /^(if|when|what if|imagine)\b/i.test(l), strength: "moderate" },
  { type: "Bold superlative claim", test: (l) => /\b(biggest|never|always|only|first time|historic|extreme|critical)\b/i.test(l), strength: "moderate" },
  { type: "List / breakdown promise", test: (l) => /\b(here are|things to|steps|reasons why|ways|factors|drivers)\b/i.test(l), strength: "moderate" },
  { type: "Timely / breaking opener", test: (l) => /\b(today|yesterday|last week|this morning|just|breaking|right now)\b/i.test(l), strength: "weak" },
];

const ANGLE_KEYWORDS: Record<string, string[]> = {
  "Educational explainer": ["because", "means", "how to", "why ", "explained", "what is", "understand", "here's how"],
  "Data reveal": ["%", "basis point", "rose", "fell", "jumped", "dropped", "hit ", "printed", "came in"],
  "Opinion / personal take": ["i think", "my take", "in my view", "i believe", "my opinion", "my prediction", "i expect"],
  "Event preview": ["tomorrow", "next week", "this week", "coming ", "upcoming", "watch for", "preview", "ahead of"],
  "Event reaction": ["just released", "came out", "beat expectations", "missed", "surprised to the"],
  "Thread / deep dive": ["thread", "🧵", "1/", "(1/", "breakdown", "deep dive"],
  "Risk management reminder": ["invalidation", "stop loss", "caution", "be careful", "hedge", "position sizing", "risk management"],
  "Confirmation / bias check": ["confirmation", "bias", "confirms", "validates", "aligns with", "consistent with"],
};

const DXY_GAPS: Array<{ topic: string; angle: string }> = [
  { topic: "USD / DXY", angle: "Direct DXY Regime Score context — the consolidated 8-driver signal most macro accounts lack" },
  { topic: "Fed policy", angle: "Fed-to-DXY transmission chain: rate expectations → real yields → USD demand" },
  { topic: "Inflation", angle: "CPI → real yield → DXY cause-and-effect breakdown using live data" },
  { topic: "Treasury yields", angle: "Yield differential mechanics and how they drive DXY basket moves" },
  { topic: "Labor market", angle: "NFP surprise → Fed expectations → DXY regime shift analysis" },
  { topic: "Risk sentiment", angle: "Risk-off capital flows and their historical USD safe-haven demand signal" },
  { topic: "Oil / commodities", angle: "Petrodollar recycling and the oil-to-DXY correlation over macro cycles" },
  { topic: "Geopolitical risk", angle: "Geopolitical shock → capital flight → DXY impact framework" },
  { topic: "Forex pairs", angle: "EUR/USD weight in the DXY basket (57.6%) and regime implications" },
  { topic: "Economic growth", angle: "Growth surprise → Fed terminal rate repricing → DXY scenario tree" },
];

function lc(text: string) {
  return text.toLowerCase();
}

function firstLine(text: string): string {
  return text.split(/\n/)[0].trim();
}

function detectTopics(posts: string[]): string[] {
  const combined = lc(posts.join(" "));
  return Object.entries(MACRO_TOPICS)
    .map(([topic, keywords]): [string, number] => {
      const count = keywords.reduce((sum, kw) => {
        let n = 0;
        let start = 0;
        while (true) {
          const idx = combined.indexOf(kw, start);
          if (idx === -1) break;
          n++;
          start = idx + kw.length;
        }
        return sum + n;
      }, 0);
      return [topic, count];
    })
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([topic]) => topic);
}

function detectHooks(posts: string[]): DetectedHook[] {
  const found = new Map<string, DetectedHook>();
  for (const post of posts) {
    const line = firstLine(post);
    for (const pattern of HOOK_PATTERNS) {
      if (!found.has(pattern.type) && pattern.test(line)) {
        found.set(pattern.type, {
          type: pattern.type,
          example: line.length > 80 ? `${line.slice(0, 77)}…` : line,
          strength: pattern.strength,
        });
      }
    }
  }
  const order: Record<HookStrength, number> = { strong: 0, moderate: 1, weak: 2 };
  return [...found.values()].sort((a, b) => order[a.strength] - order[b.strength]);
}

function detectAngles(posts: string[]): string[] {
  const matched = new Set<string>();
  for (const post of posts) {
    const l = lc(post);
    for (const [angle, keywords] of Object.entries(ANGLE_KEYWORDS)) {
      if (keywords.some((kw) => l.includes(kw))) matched.add(angle);
    }
  }
  return [...matched];
}

function detectEngagementFactors(posts: string[]): string[] {
  const factors: string[] = [];
  const combined = lc(posts.join(" "));

  if (posts.some((p) => firstLine(p).includes("?"))) {
    factors.push("Opens with a question — directly invites reader response and reply activity.");
  }
  if (posts.some((p) => /\d+(\.\d+)?%/.test(p))) {
    factors.push("Specific percentages included — concrete data signals credibility over opinion.");
  }
  if (posts.some((p) => p.trim().length < 200)) {
    factors.push("Short format (under 200 chars) — high scan-ability, strong for first-impression reach.");
  }
  if (/\b(wrong|myth|most people|unpopular|actually)\b/i.test(combined)) {
    factors.push("Contrarian framing — generates strong agree/disagree engagement from two audiences.");
  }
  if (posts.some((p) => p.includes("\n"))) {
    factors.push("Multi-line visual breaks — improves readability and slows the scroll.");
  }
  if (/\b(thread|🧵|1\/)\b/.test(combined)) {
    factors.push("Thread format — drives high click-through to replies and sustained impression growth.");
  }
  if (/\b(today|just|now|breaking)\b/i.test(combined)) {
    factors.push("Timeliness signal — positions content as urgent rather than evergreen filler.");
  }
  if (!factors.length) {
    factors.push("No dominant engagement pattern detected across the sample — posts may rely on follower base rather than discovery-driven mechanics.");
  }
  return factors;
}

function detectWeakPoints(posts: string[], detectedTopics: string[]): string[] {
  const weak: string[] = [];
  const combined = lc(posts.join(" "));

  if (!/disclaimer|not financial advice|educational|for informational|not a recommendation/i.test(combined)) {
    weak.push("No educational disclaimer — creates advice-framing perception risk for the account.");
  }
  if (!/source|data from|according to|fred|fed\.gov|bls\.gov|census|data shows/i.test(combined)) {
    weak.push("No data source cited — reduces trust and makes claims harder to verify or share.");
  }
  if (/\b(definitely|guaranteed|will pump|will moon|for sure|100%|certain to)\b/i.test(combined)) {
    weak.push("Overconfident or guaranteed-outcome language — implies certainty where none exists.");
  }
  if (posts.length >= 2 && detectedTopics.length <= 2) {
    weak.push("Topic concentration — only 1–2 macro themes covered, limiting audience breadth and discovery.");
  }
  if (!/dxy|dollar index/i.test(combined)) {
    weak.push("No direct DXY context — macro commentary without the USD index anchor leaves a positioning gap your dashboard fills.");
  }
  if (posts.every((p) => !p.includes("?"))) {
    weak.push("No questions used — missed opportunity to drive replies and algorithmic engagement.");
  }
  if (!/invalidation|what breaks|if.*wrong|if.*incorrect|scenario/i.test(combined)) {
    weak.push("No invalidation scenario — most macro accounts present bias but skip the conditions under which that bias breaks.");
  }
  return weak.length
    ? weak
    : ["No significant weak points detected in the sample."];
}

function detectGaps(posts: string[], detectedTopics: string[]): string[] {
  const covered = new Set(detectedTopics);
  return DXY_GAPS
    .filter(({ topic }) => !covered.has(topic))
    .slice(0, 5)
    .map(({ topic, angle }) => `${topic} not covered — opportunity: ${angle}.`);
}

function detectOpportunities(gaps: string[], detectedTopics: string[]): string[] {
  const opps: string[] = [];

  if (!detectedTopics.includes("USD / DXY")) {
    opps.push("Position the DXY Regime Score as the missing synthesized signal — most macro accounts discuss individual inputs but offer no consolidated dashboard score.");
  }
  if (gaps.some((g) => /invalidation/i.test(g))) {
    opps.push("Own the invalidation narrative — publish scenario-based content showing exactly what flips the current bias, building a reputation for analytical rigor.");
  }
  if (!detectedTopics.includes("Treasury yields")) {
    opps.push("Cover the yield-to-DXY transmission chain — an underexplained topic that demonstrates source-backed macro literacy vs. surface-level commentary.");
  }
  if (!detectedTopics.includes("Fed policy")) {
    opps.push("Publish the Fed → real yields → USD demand chain as a reusable educational framework — less common than rate commentary alone.");
  }
  opps.push("Use the 8-driver scoring model as a differentiator — present macro as a system rather than opinion, which is more defensible and unusual on X.");
  opps.push("Publish a weekly macro calendar preview anchored to how each release will shift the DXY Regime Score — distinct from generic economic calendars.");

  return opps.slice(0, 5);
}

function generatePostIdeas(topics: string[]): string[] {
  const t0 = topics[0] ?? "macro data";
  const t1 = topics[1] ?? "a secondary driver";
  return [
    `Educational post: "Why ${t0} matters for the DXY — a source-backed breakdown using the 8-driver model." (Add real figures from your dashboard.)`,
    `Invalidation scenario: "My current DXY bias is driven by ${t0}. Here is exactly what would change it — and why the condition matters more than the headline number."`,
    `Contrarian angle: "Everyone is watching ${t1}. Here is the less-discussed driver that historically moves the DXY more — with the data to back it."`,
    `Event preview: "What to watch before this week's release — how each possible outcome will register across the 8 macro drivers and shift the Regime Score."`,
    `Educational concept: "The DXY is not just 'the dollar.' It is a basket of 6 currencies. Here is the weight of each — and which one dominates the current regime."`,
  ];
}

function generateReplyAngles(topics: string[]): string[] {
  const t0 = topics[0] ?? "this macro driver";
  return [
    `Add the DXY data layer: "Good point on ${t0}. On the DXY side, the current Regime Score is tracking [X/10] based on 8 macro inputs. Happy to share the live snapshot." — Educational, not promotional. Only use if it genuinely adds what the original post lacked.`,
    `Offer the invalidation frame: "Solid take. One thing worth adding: if [key condition] shifts, this DXY thesis breaks at [level]. That is the scenario I am watching before conviction increases." — Risk management framing that invites serious follow-up discussion.`,
    `Bridge to the source data: "For context, I track CPI, yields, NFP, sentiment, and five other drivers behind DXY in one place. Happy to share the latest regime snapshot if it adds to the thread." — Only post this when the offer is genuinely relevant. Never as a reply to unrelated posts.`,
  ];
}

export function analyzeCompetitorPosts(posts: string[]): CompetitorIntelligenceReport {
  const trimmed = posts.map((p) => p.trim()).filter(Boolean).slice(0, 5);

  if (!trimmed.length) {
    return {
      postCount: 0,
      commonTopics: [],
      strongestHooks: [],
      contentAngles: [],
      engagementFactors: [],
      weakPoints: ["No posts provided for analysis."],
      gaps: [],
      opportunities: [],
      differentiatedPostIdeas: [],
      safeReplyAngles: [],
      complianceNote: "Paste 1–5 competitor or macro posts above and click Analyze.",
    };
  }

  const commonTopics = detectTopics(trimmed);
  const strongestHooks = detectHooks(trimmed);
  const contentAngles = detectAngles(trimmed);
  const engagementFactors = detectEngagementFactors(trimmed);
  const weakPoints = detectWeakPoints(trimmed, commonTopics);
  const gaps = detectGaps(trimmed, commonTopics);
  const opportunities = detectOpportunities(gaps, commonTopics);
  const differentiatedPostIdeas = generatePostIdeas(commonTopics);
  const safeReplyAngles = generateReplyAngles(commonTopics);

  return {
    postCount: trimmed.length,
    commonTopics,
    strongestHooks,
    contentAngles,
    engagementFactors,
    weakPoints,
    gaps,
    opportunities,
    differentiatedPostIdeas,
    safeReplyAngles,
    complianceNote:
      "All post ideas and reply angles are educational suggestions for manual review only. Do not copy competitor posts directly. Nothing is posted, sent, or automated. Review all suggestions before use.",
  };
}
