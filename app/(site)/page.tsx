import Link from "next/link";
import { drivers } from "@/lib/drivers";
import { HeroCard, SurfaceCard } from "@/components/ui";
import { NewsletterForm } from "@/components/newsletter-form";
import { isButtondownConfigured } from "@/lib/buttondown";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HomePage() {
  const inflation = drivers.filter((driver) => driver.category === "Inflation");
  const growth = drivers.filter((driver) => driver.category === "Growth");
  const policy = drivers.filter((driver) => driver.category === "Policy" || driver.category === "Market");

  return (
    <div className="page-grid">
      <HeroCard>
        <span className="eyebrow">Framework</span>
        <div className="hero-copy home-hero">
          <div>
            <h1>Macro FX Monitor</h1>
            <p>
              Built to turn raw macro releases into a disciplined dollar framework: inflation and growth first, then Fed transmission, then yields, then DXY.
            </p>
          </div>
          <div className="hero-side-note">
            <strong>Core thesis</strong>
            <p>News macro -&gt; Inflation / Growth -&gt; Fed -&gt; Treasury yields -&gt; DXY</p>
          </div>
        </div>
        <div className="macro-chain">
          <span>Macro news</span>
          <span>Inflation</span>
          <span>Growth</span>
          <span>Fed</span>
          <span>Yields</span>
          <span>DXY</span>
        </div>
      </HeroCard>

      <div className="three-column">
        <SurfaceCard>
          <div className="section-head">
            <h3>Inflation pillar</h3>
            <p>The inflation block drives the hawkish vs dovish policy reaction function.</p>
          </div>
          <ul className="clean-list">
            {inflation.map((driver) => (
              <li key={driver.slug}>
                <Link href={`/drivers/${driver.slug}`} className="inline-link">
                  {driver.title}
                </Link>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-head">
            <h3>Growth pillar</h3>
            <p>Labor, housing, surveys, and ISM help define whether the economy is accelerating or cooling.</p>
          </div>
          <ul className="clean-list">
            {growth.map((driver) => (
              <li key={driver.slug}>
                <Link href={`/drivers/${driver.slug}`} className="inline-link">
                  {driver.title}
                </Link>
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard>
          <div className="section-head">
            <h3>Policy and market pillar</h3>
            <p>Fed stance, Treasury yields, liquidity, and the dollar itself confirm the macro regime.</p>
          </div>
          <ul className="clean-list">
            {policy.map((driver) => (
              <li key={driver.slug}>
                <Link href={`/drivers/${driver.slug}`} className="inline-link">
                  {driver.title}
                </Link>
              </li>
            ))}
          </ul>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <div className="section-head">
          <h3>How to use the site</h3>
        </div>
        <ol className="clean-list ordered">
          <li>Start on the Global DXY Dashboard to read the aggregate regime score.</li>
          <li>Check the strongest positive and negative drivers to understand what is moving the macro view.</li>
          <li>Use the dedicated driver pages to trace inflation, growth, Fed, yields, and DXY transmission in detail.</li>
        </ol>
      </SurfaceCard>

      <SurfaceCard className="newsletter-cta">
        <div>
          <span className="eyebrow">Free weekly research</span>
          <h3>Get the macro regime, calendar, and DXY playbook in one email.</h3>
          <p>Confirmed opt-in, no paid tier, and one-click unsubscribe.</p>
        </div>
        <NewsletterForm compact configured={isButtondownConfigured()} />
      </SurfaceCard>
    </div>
  );
}
