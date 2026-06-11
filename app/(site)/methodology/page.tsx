import type { Metadata } from "next";
import { SurfaceCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "Methodology",
  description: "How the Macro FX Monitor scores US macro drivers and translates them into a DXY regime.",
};

export default function MethodologyPage() {
  return (
    <div className="page-grid legal-page">
      <SurfaceCard>
        <span className="eyebrow">Research framework</span>
        <h1>Methodology</h1>
        <p>The dashboard is a transparent rules-based framework, not a predictive trading model.</p>
      </SurfaceCard>
      <SurfaceCard>
        <h3>1. Driver selection</h3>
        <p>Fourteen series cover inflation, labor, surveys, housing, liquidity, Federal Reserve policy, Treasury yields, and the broad US dollar.</p>
        <h3>2. Normalization and scoring</h3>
        <p>Each driver is evaluated against economically relevant thresholds, recent momentum, and its own historical regime. Scores range from -10 bearish for DXY to +10 bullish.</p>
        <h3>3. Weighting</h3>
        <p>Higher-impact inflation, labor, policy, and market transmission variables receive more weight. The aggregate is a weighted average of available driver scores.</p>
        <h3>4. Time horizons</h3>
        <p>One-to-three, three-to-six, and six-to-twelve-month views blend immediate momentum with structural context. They are scenarios rather than price targets.</p>
        <h3>5. Limitations</h3>
        <p>The model does not include positioning, options markets, geopolitical shocks, relative foreign macro data, or discretionary judgment. Economic data is revised and may be delayed.</p>
      </SurfaceCard>
    </div>
  );
}
