import { average, clamp, convictionFromDistance } from "@/lib/format";
import { DriverConfig, DriverHorizonOutlook, DriverMetrics, ObservationPoint, TimeHorizon } from "@/types";

type BaseMetrics = Omit<
  DriverMetrics,
  "score" | "conviction" | "conclusion" | "reasoning" | "twelveMonthContext" | "horizonOutlooks" | "chartData"
>;

function periodsPerYear(frequency: DriverConfig["frequency"]) {
  return frequency === "daily" ? 252 : 12;
}

function last<T>(items: T[]) {
  return items.length ? items[items.length - 1] : null;
}

function annualizedRate(current: number, previous: number, periods: number, perYear: number) {
  if (current <= 0 || previous <= 0 || periods <= 0) return null;
  return (Math.pow(current / previous, perYear / periods) - 1) * 100;
}

function yearOverYear(data: ObservationPoint[], perYear: number) {
  if (data.length <= perYear) return null;
  const latest = data[data.length - 1]?.value;
  const previous = data[data.length - 1 - perYear]?.value;
  if (!latest || !previous) return null;
  return ((latest / previous) - 1) * 100;
}

function averageSlice(data: ObservationPoint[], count: number) {
  const slice = data.slice(-count).map((point) => point.value);
  return average(slice);
}

function normalize(value: number, low: number, high: number) {
  if (high === low) return 5;
  return clamp(((value - low) / (high - low)) * 10, 0, 10);
}

function toSignedScore(score: number) {
  return clamp((score - 5) * 2, -10, 10);
}

function conclusionFromSignedScore(score: number | null) {
  if (score === null) return "Neutral for DXY" as const;
  if (score >= 2.2) return "Bullish for DXY" as const;
  if (score <= -2.2) return "Bearish for DXY" as const;
  return "Neutral for DXY" as const;
}

function momentumSignal(driver: DriverConfig, metrics: BaseMetrics) {
  const latest = metrics.latest ?? 0;
  switch (driver.scoreMode) {
    case "inflation-index":
      return clamp(((metrics.annualized3m ?? metrics.yoy ?? 0) - 2) * 2.2, -10, 10);
    case "employment-level":
      return clamp((metrics.annualized3m ?? metrics.yoy ?? 0) * 1.6, -10, 10);
    case "unemployment-rate":
      return clamp((4.2 - latest) * 3 - Math.max(0, latest - (metrics.avg1y ?? latest)) * 6, -10, 10);
    case "ism-diffusion":
      return clamp((latest - 50) * 1.15 + (latest - (metrics.avg1y ?? latest)) * 0.4, -10, 10);
    case "sentiment-level":
      return clamp((latest - (metrics.avg1y ?? latest)) * 0.18 + (metrics.percentChange ?? 0) * 0.12, -10, 10);
    case "housing-permits":
      return clamp((metrics.annualized6m ?? metrics.yoy ?? 0) * 0.08, -10, 10);
    case "money-supply":
      return clamp(-(metrics.annualized3m ?? metrics.yoy ?? 0) * 0.12, -10, 10);
    case "policy-rate":
      return clamp((latest - (metrics.avg1y ?? latest)) * 1.8, -10, 10);
    case "treasury-yield":
      return clamp((latest - (metrics.avg1y ?? latest)) * 3 + (metrics.absoluteChange ?? 0) * 2, -10, 10);
    case "usd-broad":
      return clamp((metrics.percentChange ?? 0) * 0.5 + (metrics.absoluteChange ?? 0) * 0.25, -10, 10);
  }
}

function structuralSignal(driver: DriverConfig, metrics: BaseMetrics) {
  const latest = metrics.latest ?? 0;
  switch (driver.scoreMode) {
    case "inflation-index":
      return clamp(((metrics.yoy ?? 0) - 2) * 1.8 + ((metrics.annualized6m ?? metrics.yoy ?? 0) - 2) * 0.8, -10, 10);
    case "employment-level":
      return clamp((metrics.yoy ?? 0) * 1.4 + ((metrics.avg1y ?? latest) - (metrics.avg3y ?? latest)) * 0.02, -10, 10);
    case "unemployment-rate":
      return clamp((4.3 - latest) * 3.2 - Math.max(0, latest - (metrics.avg3y ?? latest)) * 4, -10, 10);
    case "ism-diffusion":
      return clamp((latest - 50) * 0.9 + ((metrics.avg1y ?? latest) - 50) * 0.4, -10, 10);
    case "sentiment-level":
      return clamp((latest - (metrics.avg3y ?? latest)) * 0.15, -10, 10);
    case "housing-permits":
      return clamp((metrics.yoy ?? 0) * 0.14 + ((metrics.avg1y ?? latest) - (metrics.avg3y ?? latest)) * 0.02, -10, 10);
    case "money-supply":
      return clamp(-(metrics.yoy ?? 0) * 0.22, -10, 10);
    case "policy-rate":
      return clamp((latest - (metrics.avg3y ?? latest)) * 1.4, -10, 10);
    case "treasury-yield":
      return clamp((latest - (metrics.avg3y ?? latest)) * 2.1, -10, 10);
    case "usd-broad":
      return clamp(((latest - (metrics.avg1y ?? latest)) / Math.max(1, Math.abs(metrics.avg1y ?? latest))) * 40, -10, 10);
  }
}

function outlookDirection(score: number | null) {
  if (score === null) return "neutral";
  if (score >= 2.2) return "bullish";
  if (score <= -2.2) return "bearish";
  return "neutral";
}

function formatMetric(value: number | null, suffix = "", digits = 2) {
  if (value === null) return "N/A";
  return `${value.toFixed(digits)}${suffix}`;
}

function summarizeBias(score: number | null) {
  const direction = outlookDirection(score);
  if (direction === "bullish") return "leans bullish for DXY";
  if (direction === "bearish") return "leans bearish for DXY";
  return "is broadly neutral for DXY";
}

function inflationHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig, metrics: BaseMetrics) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because near-term inflation momentum is running at ${formatMetric(metrics.annualized3m, "%")} annualized versus ${formatMetric(metrics.yoy, "%")} YoY. If inflation is not cooling fast enough, the market usually keeps a firmer Fed path in play.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the six-month inflation trend (${formatMetric(metrics.annualized6m, "%")}) still matters for whether disinflation is becoming durable. A sticky mid-cycle inflation regime generally keeps U.S. yields and DXY better supported.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the 12-month inflation regime remains the core signal for how restrictive the Fed may need to stay. Inflation that settles clearly above target tends to keep the dollar structurally firmer.`;
}

function employmentHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig, metrics: BaseMetrics) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because payroll momentum and labor demand shape the immediate growth narrative. A labor market still expanding at ${formatMetric(metrics.annualized3m, "%")} annualized makes it harder to price an urgent dovish Fed turn.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because sustained job creation feeds household income, spending, and services demand. That usually matters for both growth resilience and inflation persistence.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because a durable labor slowdown would normally precede a softer Fed and weaker yield support for DXY, while a resilient jobs backdrop keeps the medium-cycle dollar case intact.`;
}

function unemploymentHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig, metrics: BaseMetrics) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the current unemployment rate of ${formatMetric(metrics.latest, "%")} is one of the cleanest reads on labor slack. If unemployment starts climbing, the market usually moves quickly toward easier Fed pricing.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the direction of unemployment often tells us whether a soft patch is becoming a broader macro slowdown. Persistent labor softening typically undermines yields and the dollar.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because a sustained rise in labor slack would weaken the growth-inflation mix that has supported U.S. rates. Stable unemployment, by contrast, helps preserve the dollar's macro floor.`;
}

function ismHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig, metrics: BaseMetrics) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the latest diffusion reading of ${formatMetric(metrics.latest)} versus the 50 expansion line is a fast signal on whether activity is stabilizing or rolling over.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because sustained movement above or below 50 usually carries into the broader growth narrative, which then feeds Fed expectations and Treasury yields.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because a durable services or manufacturing regime matters for whether U.S. growth outperforms enough to keep DXY structurally supported.`;
}

function sentimentHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because soft-data momentum can confirm whether households are stabilizing after inflation shocks. This is a secondary signal, but it helps frame near-term consumption risk.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because improving confidence can support discretionary demand, while persistent weakness often foreshadows slower spending and a softer rates backdrop.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because sentiment is mainly a confirmation tool for the broader growth regime rather than a standalone DXY driver.`;
}

function housingHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because permits are an early, rate-sensitive read on whether tighter financial conditions are biting. Short-term stabilization suggests growth is absorbing current rates better than feared.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because housing turns often spill into construction, consumption, and credit-sensitive activity with a lag.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because a durable housing recovery or breakdown usually says something meaningful about the direction of U.S. domestic demand and the future yield backdrop.`;
}

function moneySupplyHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because near-term liquidity reacceleration or restraint can quickly change the market's read on how tight U.S. financial conditions really are.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the M2 trend influences the medium-term balance between nominal demand support and monetary discipline. Slower money growth is usually more DXY-supportive in this framework.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because persistent liquidity restraint tends to reinforce a structurally firmer dollar regime, while renewed broad money expansion would point the other way.`;
}

function policyRateHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig, metrics: BaseMetrics) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the current Fed stance directly anchors front-end rate differentials. A policy rate at ${formatMetric(metrics.latest, "%")} keeps the immediate carry story central to DXY.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the market starts asking whether restriction will persist or fade. The medium-term dollar view depends on whether incoming data validates a higher-for-longer path.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the longer policy question is whether the Fed can hold restrictive settings without growth breaking materially lower. That tension is decisive for the medium-cycle dollar outlook.`;
}

function treasuryHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because Treasury yields are the fastest transmission channel from macro repricing into FX. When U.S. yields stay firm, DXY usually gets immediate support.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because the yield regime reflects the market's blended view on growth, inflation, and Fed restraint.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because a durable higher-yield regime would keep the U.S. carry backdrop attractive, while a lasting decline in yields would normally weigh on the dollar.`;
}

function usdBroadHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig) {
  if (score === null) return `${driver.title} does not yet have enough data to form a usable ${horizon} DXY outlook.`;

  if (horizon === "1-3M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} as a confirmation signal. Broad-dollar strength tells us the macro regime is already translating into USD performance, even though this series is not the original causal driver.`;
  }

  if (horizon === "3-6M") {
    return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because a broad dollar that is holding its level suggests U.S. macro outperformance remains visible across trading partners.`;
  }

  return `${driver.title} ${summarizeBias(score)} over the next ${horizon} because a durable broad-dollar uptrend usually reflects an entrenched regime of tighter U.S. monetary and financial conditions than abroad.`;
}

function buildHorizonSummary(horizon: TimeHorizon, score: number | null, driver: DriverConfig, metrics: BaseMetrics) {
  switch (driver.scoreMode) {
    case "inflation-index":
      return inflationHorizonSummary(horizon, score, driver, metrics);
    case "employment-level":
      return employmentHorizonSummary(horizon, score, driver, metrics);
    case "unemployment-rate":
      return unemploymentHorizonSummary(horizon, score, driver, metrics);
    case "ism-diffusion":
      return ismHorizonSummary(horizon, score, driver, metrics);
    case "sentiment-level":
      return sentimentHorizonSummary(horizon, score, driver);
    case "housing-permits":
      return housingHorizonSummary(horizon, score, driver);
    case "money-supply":
      return moneySupplyHorizonSummary(horizon, score, driver);
    case "policy-rate":
      return policyRateHorizonSummary(horizon, score, driver, metrics);
    case "treasury-yield":
      return treasuryHorizonSummary(horizon, score, driver);
    case "usd-broad":
      return usdBroadHorizonSummary(horizon, score, driver);
  }
}

function buildModeSpecificHorizonScores(driver: DriverConfig, metrics: BaseMetrics, signedScore: number) {
  const momentum = momentumSignal(driver, metrics);
  const structural = structuralSignal(driver, metrics);

  switch (driver.scoreMode) {
    case "inflation-index":
      return {
        "1-3M": clamp(signedScore * 0.45 + momentum * 0.55, -10, 10),
        "3-6M": clamp(signedScore * 0.55 + momentum * 0.15 + structural * 0.3, -10, 10),
        "6-12M": clamp(signedScore * 0.45 + structural * 0.55, -10, 10),
      } satisfies Record<TimeHorizon, number>;
    case "employment-level":
      return {
        "1-3M": clamp(signedScore * 0.5 + momentum * 0.5, -10, 10),
        "3-6M": clamp(signedScore * 0.55 + momentum * 0.2 + structural * 0.25, -10, 10),
        "6-12M": clamp(signedScore * 0.4 + structural * 0.6, -10, 10),
      } satisfies Record<TimeHorizon, number>;
    case "unemployment-rate":
      return {
        "1-3M": clamp(signedScore * 0.5 + momentum * 0.5, -10, 10),
        "3-6M": clamp(signedScore * 0.45 + momentum * 0.2 + structural * 0.35, -10, 10),
        "6-12M": clamp(signedScore * 0.35 + structural * 0.65, -10, 10),
      } satisfies Record<TimeHorizon, number>;
    case "ism-diffusion":
      return {
        "1-3M": clamp(signedScore * 0.45 + momentum * 0.55, -10, 10),
        "3-6M": clamp(signedScore * 0.5 + momentum * 0.2 + structural * 0.3, -10, 10),
        "6-12M": clamp(signedScore * 0.35 + structural * 0.65, -10, 10),
      } satisfies Record<TimeHorizon, number>;
    case "sentiment-level":
      return {
        "1-3M": clamp(signedScore * 0.4 + momentum * 0.6, -10, 10),
        "3-6M": clamp(signedScore * 0.55 + structural * 0.45, -10, 10),
        "6-12M": clamp(signedScore * 0.4 + structural * 0.6, -10, 10),
      } satisfies Record<TimeHorizon, number>;
    case "housing-permits":
      return {
        "1-3M": clamp(signedScore * 0.45 + momentum * 0.55, -10, 10),
        "3-6M": clamp(signedScore * 0.45 + momentum * 0.15 + structural * 0.4, -10, 10),
        "6-12M": clamp(signedScore * 0.3 + structural * 0.7, -10, 10),
      } satisfies Record<TimeHorizon, number>;
    case "money-supply":
      return {
        "1-3M": clamp(signedScore * 0.5 + momentum * 0.5, -10, 10),
        "3-6M": clamp(signedScore * 0.45 + momentum * 0.15 + structural * 0.4, -10, 10),
        "6-12M": clamp(signedScore * 0.3 + structural * 0.7, -10, 10),
      } satisfies Record<TimeHorizon, number>;
    case "policy-rate":
      return {
        "1-3M": clamp(signedScore * 0.65 + momentum * 0.35, -10, 10),
        "3-6M": clamp(signedScore * 0.6 + structural * 0.4, -10, 10),
        "6-12M": clamp(signedScore * 0.4 + structural * 0.6, -10, 10),
      } satisfies Record<TimeHorizon, number>;
    case "treasury-yield":
      return {
        "1-3M": clamp(signedScore * 0.7 + momentum * 0.3, -10, 10),
        "3-6M": clamp(signedScore * 0.55 + momentum * 0.15 + structural * 0.3, -10, 10),
        "6-12M": clamp(signedScore * 0.35 + structural * 0.65, -10, 10),
      } satisfies Record<TimeHorizon, number>;
    case "usd-broad":
      return {
        "1-3M": clamp(signedScore * 0.75 + momentum * 0.25, -10, 10),
        "3-6M": clamp(signedScore * 0.65 + structural * 0.35, -10, 10),
        "6-12M": clamp(signedScore * 0.55 + structural * 0.45, -10, 10),
      } satisfies Record<TimeHorizon, number>;
  }
}

function buildHorizonOutlooks(
  driver: DriverConfig,
  metrics: BaseMetrics,
  signedScore: number | null
): DriverHorizonOutlook[] {
  if (signedScore === null) {
    return (["1-3M", "3-6M", "6-12M"] as TimeHorizon[]).map((horizon) => ({
      horizon,
      score: null,
      conviction: "Low",
      conclusion: "Neutral for DXY",
      summary: buildHorizonSummary(horizon, null, driver, metrics),
    }));
  }

  const horizonScores = buildModeSpecificHorizonScores(driver, metrics, signedScore);

  return (["1-3M", "3-6M", "6-12M"] as TimeHorizon[]).map((horizon) => {
    const score = Number(horizonScores[horizon].toFixed(1));
    return {
      horizon,
      score,
      conviction: convictionFromDistance(score),
      conclusion: conclusionFromSignedScore(score),
      summary: buildHorizonSummary(horizon, score, driver, metrics),
    };
  });
}

function buildTwelveMonthContext(driver: DriverConfig, metrics: BaseMetrics) {
  const context: string[] = [];

  switch (driver.scoreMode) {
    case "inflation-index":
      if (metrics.annualized3m !== null && metrics.yoy !== null) {
        context.push(
          `Recent inflation momentum is running at ${metrics.annualized3m.toFixed(2)}% annualized versus ${metrics.yoy.toFixed(2)}% YoY, which helps show whether price pressure is cooling or reheating.`
        );
      }
      if (metrics.avg1y !== null && metrics.avg3y !== null) {
        context.push(
          `The 12-month inflation regime is ${metrics.avg1y >= metrics.avg3y ? "firmer" : "softer"} than the 3-year average by ${Math.abs(metrics.avg1y - metrics.avg3y).toFixed(2)} index points.`
        );
      }
      break;
    case "employment-level":
      if (metrics.yoy !== null) {
        context.push(`Payrolls are up ${metrics.yoy.toFixed(2)}% YoY, which is the broadest 12-month read on labor-market resilience.`);
      }
      if (metrics.annualized6m !== null) {
        context.push(`The six-month annualized pace is ${metrics.annualized6m.toFixed(2)}%, showing whether hiring is decelerating materially or simply normalizing.`);
      }
      break;
    case "unemployment-rate":
      if (metrics.latest !== null && metrics.avg1y !== null) {
        context.push(
          `Unemployment is ${metrics.latest >= metrics.avg1y ? "above" : "below"} its 12-month average by ${Math.abs(metrics.latest - metrics.avg1y).toFixed(2)} percentage points, which is useful for spotting deterioration early.`
        );
      }
      if (metrics.avg1y !== null && metrics.avg3y !== null) {
        context.push(
          `The 12-month unemployment regime is ${metrics.avg1y >= metrics.avg3y ? "softer" : "tighter"} than the 3-year average by ${Math.abs(metrics.avg1y - metrics.avg3y).toFixed(2)} percentage points.`
        );
      }
      break;
    case "ism-diffusion":
      if (metrics.latest !== null) {
        context.push(
          `${driver.title} is currently ${metrics.latest >= 50 ? "above" : "below"} the 50 expansion line, which remains the key threshold for cyclical interpretation.`
        );
      }
      if (metrics.avg1y !== null && metrics.avg3y !== null) {
        context.push(
          `The last 12 months have been ${metrics.avg1y >= metrics.avg3y ? "stronger" : "weaker"} than the 3-year ISM regime by ${Math.abs(metrics.avg1y - metrics.avg3y).toFixed(2)} points.`
        );
      }
      break;
    case "sentiment-level":
      if (metrics.latest !== null && metrics.avg3y !== null) {
        context.push(
          `Sentiment is ${metrics.latest >= metrics.avg3y ? "above" : "below"} its 3-year average by ${Math.abs(metrics.latest - metrics.avg3y).toFixed(2)} points, which helps frame whether households are recovering from prior shocks.`
        );
      }
      break;
    case "housing-permits":
      if (metrics.yoy !== null) {
        context.push(`Permits are ${metrics.yoy.toFixed(2)}% YoY, giving a 12-month read on how much rate-sensitive housing activity has recovered or deteriorated.`);
      }
      if (metrics.annualized6m !== null) {
        context.push(`The six-month annualized trend is ${metrics.annualized6m.toFixed(2)}%, which is useful for detecting turns before they are obvious in broader growth data.`);
      }
      break;
    case "money-supply":
      if (metrics.yoy !== null) {
        context.push(`M2 is changing by ${metrics.yoy.toFixed(2)}% YoY, which helps define whether system liquidity is reaccelerating or still restrained.`);
      }
      if (metrics.annualized6m !== null) {
        context.push(`The six-month money-growth trend is ${metrics.annualized6m.toFixed(2)}% annualized, which is important for judging the direction of monetary conditions.`);
      }
      break;
    case "policy-rate":
      if (metrics.latest !== null && metrics.avg3y !== null) {
        context.push(
          `The policy rate is ${metrics.latest >= metrics.avg3y ? "above" : "below"} its 3-year average by ${Math.abs(metrics.latest - metrics.avg3y).toFixed(2)} percentage points, which is a clean way to judge how restrictive the current regime still is.`
        );
      }
      break;
    case "treasury-yield":
      if (metrics.latest !== null && metrics.avg1y !== null) {
        context.push(
          `The 10-year yield is ${metrics.latest >= metrics.avg1y ? "above" : "below"} its 12-month average by ${Math.abs(metrics.latest - metrics.avg1y).toFixed(2)} percentage points, which matters directly for the dollar carry story.`
        );
      }
      if (metrics.avg1y !== null && metrics.avg3y !== null) {
        context.push(
          `The 12-month yield regime is ${metrics.avg1y >= metrics.avg3y ? "higher" : "lower"} than the 3-year average by ${Math.abs(metrics.avg1y - metrics.avg3y).toFixed(2)} percentage points.`
        );
      }
      break;
    case "usd-broad":
      if (metrics.latest !== null && metrics.avg1y !== null) {
        context.push(
          `The broad dollar proxy is ${metrics.latest >= metrics.avg1y ? "above" : "below"} its 12-month average by ${Math.abs(metrics.latest - metrics.avg1y).toFixed(2)} points, which confirms whether macro support is already translating into USD strength.`
        );
      }
      break;
  }

  if (metrics.yoy !== null && context.length < 3) {
    context.push(`Over the last 12 months, the YoY change is ${metrics.yoy.toFixed(2)}%.`);
  }

  return context;
}

function scoreByMode(driver: DriverConfig, metrics: BaseMetrics) {
  const latest = metrics.latest;
  if (latest === null) return { score: null, reasoning: ["No data available yet."] };

  switch (driver.scoreMode) {
    case "inflation-index": {
      const yoy = metrics.yoy ?? 0;
      const ann3 = metrics.annualized3m ?? yoy;
      const score = clamp(5 + yoy * 0.45 + (ann3 - 2) * 0.25, 0, 10);
      return {
        score,
        reasoning: [
          `YoY inflation is ${yoy.toFixed(2)}%, which is the main hawkish input.`,
          `Three-month annualized inflation is ${ann3.toFixed(2)}%, which captures whether the latest trend is cooling or reheating.`,
        ],
      };
    }
    case "employment-level": {
      const yoy = metrics.yoy ?? 0;
      const ann3 = metrics.annualized3m ?? yoy;
      const score = clamp(5 + yoy * 0.9 + ann3 * 0.15, 0, 10);
      return {
        score,
        reasoning: [
          `Payroll growth is ${yoy.toFixed(2)}% YoY.`,
          `Short-run annualized job momentum is ${ann3.toFixed(2)}%, which helps gauge whether labor is still resilient.`,
        ],
      };
    }
    case "unemployment-rate": {
      const avg1y = metrics.avg1y ?? latest;
      const score = clamp(8 - latest * 1.15 - Math.max(0, latest - avg1y) * 1.6, 0, 10);
      return {
        score,
        reasoning: [
          `The unemployment rate is ${latest.toFixed(2)}%. Lower readings are more supportive for a resilient USD backdrop.`,
          `The score penalizes unemployment when it is rising above its own one-year average.`,
        ],
      };
    }
    case "ism-diffusion": {
      const avg1y = metrics.avg1y ?? latest;
      const score = clamp(5 + (latest - 50) * 0.35 + (latest - avg1y) * 0.2, 0, 10);
      return {
        score,
        reasoning: [
          `ISM is ${latest.toFixed(2)} relative to the 50 expansion threshold.`,
          `The score improves when the index is expanding or recovering against its recent average.`,
        ],
      };
    }
    case "sentiment-level": {
      const avg3y = metrics.avg3y ?? latest;
      const score = clamp(5 + (latest - avg3y) * 0.08 + (metrics.percentChange ?? 0) * 0.06, 0, 10);
      return {
        score,
        reasoning: [
          `Consumer sentiment is compared against its own three-year regime rather than a fixed macro threshold.`,
          `Improving soft data supports the growth block, though with lower weight than hard inflation or policy data.`,
        ],
      };
    }
    case "housing-permits": {
      const yoy = metrics.yoy ?? 0;
      const ann6 = metrics.annualized6m ?? yoy;
      const score = clamp(5 + yoy * 0.12 + ann6 * 0.06, 0, 10);
      return {
        score,
        reasoning: [
          `Building permits are ${yoy.toFixed(2)}% above or below last year.`,
          `Housing is rate-sensitive, so trend stabilization matters more than the raw level alone.`,
        ],
      };
    }
    case "money-supply": {
      const yoy = metrics.yoy ?? 0;
      const score = clamp(5 - yoy * 0.2 - (metrics.annualized3m ?? yoy) * 0.08, 0, 10);
      return {
        score,
        reasoning: [
          `M2 growth is treated inversely in this framework: faster liquidity growth is usually less supportive for DXY.`,
          `The score improves when money growth is restrained and liquidity conditions are tighter.`,
        ],
      };
    }
    case "policy-rate": {
      const avg3y = metrics.avg3y ?? latest;
      const score = clamp(5 + (latest - avg3y) * 0.9 + (metrics.percentChange ?? 0) * 0.03, 0, 10);
      return {
        score,
        reasoning: [
          `The effective policy rate is compared with the recent regime to measure how restrictive the Fed still is.`,
          `Higher policy restraint is generally supportive for the dollar unless growth deteriorates sharply elsewhere.`,
        ],
      };
    }
    case "treasury-yield": {
      const avg1y = metrics.avg1y ?? latest;
      const score = clamp(5 + (latest - avg1y) * 1.1 + (metrics.absoluteChange ?? 0) * 0.45, 0, 10);
      return {
        score,
        reasoning: [
          `Treasury yields are a direct FX transmission channel, so the score responds strongly to the level and direction of yields.`,
          `Higher and firmer yields generally improve the carry case for the dollar.`,
        ],
      };
    }
    case "usd-broad": {
      const score = normalize(
        latest,
        metrics.allTimeLow ?? latest,
        metrics.allTimeHigh ?? latest
      );
      const trendBoost = (metrics.percentChange ?? 0) * 0.2;
      return {
        score: clamp(score + trendBoost, 0, 10),
        reasoning: [
          `The broad dollar proxy is scored on both level and trend, since DXY confirmation matters for the macro regime.`,
          `This score is descriptive confirmation rather than a causal leading signal.`,
        ],
      };
    }
  }
}

export function calculateDriverMetrics(driver: DriverConfig, data: ObservationPoint[]): DriverMetrics {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const latestPoint = last(sorted);
  const previousPoint = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const perYear = periodsPerYear(driver.frequency);
  const latest = latestPoint?.value ?? null;
  const previous = previousPoint?.value ?? null;
  const absoluteChange = latest !== null && previous !== null ? latest - previous : null;
  const percentChange =
    latest !== null && previous !== null && previous !== 0 ? ((latest / previous) - 1) * 100 : null;
  const yoy = yearOverYear(sorted, perYear);
  const annualized3m =
    sorted.length > 3 ? annualizedRate(sorted[sorted.length - 1].value, sorted[sorted.length - 4].value, 3, perYear) : null;
  const annualized6m =
    sorted.length > 6 ? annualizedRate(sorted[sorted.length - 1].value, sorted[sorted.length - 7].value, 6, perYear) : null;
  const avg1y = averageSlice(sorted, perYear);
  const avg3y = averageSlice(sorted, perYear * 3);
  const allTimeHigh = sorted.length ? Math.max(...sorted.map((point) => point.value)) : null;
  const allTimeLow = sorted.length ? Math.min(...sorted.map((point) => point.value)) : null;

  const partialMetrics: BaseMetrics = {
    latest,
    previous,
    absoluteChange,
    percentChange,
    yoy,
    annualized3m,
    annualized6m,
    avg1y,
    avg3y,
    allTimeHigh,
    allTimeLow,
    latestDate: latestPoint?.date ?? null,
    previousDate: previousPoint?.date ?? null,
  };

  const scored = scoreByMode(driver, partialMetrics);
  const score = scored.score === null ? null : Number(toSignedScore(scored.score).toFixed(1));
  const conviction = convictionFromDistance(score);
  const conclusion = conclusionFromSignedScore(score);
  const horizonOutlooks = buildHorizonOutlooks(driver, partialMetrics, score);
  const twelveMonthContext = buildTwelveMonthContext(driver, partialMetrics);

  return {
    ...partialMetrics,
    score,
    conviction,
    conclusion,
    reasoning: scored.reasoning,
    twelveMonthContext,
    horizonOutlooks,
    chartData: sorted,
  };
}
