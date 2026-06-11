import type { Metadata } from "next";
import { CalendarDays, MailCheck, ShieldCheck } from "lucide-react";
import { NewsletterForm } from "@/components/newsletter-form";
import { isButtondownConfigured } from "@/lib/buttondown";
import { HeroCard, SurfaceCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "Free Weekly Macro Snapshot",
  description: "Receive a concise weekly US macro, economic calendar, and DXY scenario snapshot.",
};

export default function NewsletterPage() {
  return (
    <div className="page-grid">
      <HeroCard>
        <span className="eyebrow">Free research email</span>
        <div className="hero-copy">
          <div>
            <h1>The Weekly Macro / DXY Snapshot</h1>
            <p>
              One concise email covering what changed, the important releases ahead, the current DXY regime,
              and the conditions that confirm or invalidate the base case.
            </p>
            <NewsletterForm configured={isButtondownConfigured()} />
          </div>
          <div className="hero-side-note">
            <strong>No noise, no paid tier</strong>
            <p>Free during the public launch. Confirmed opt-in only, with one-click unsubscribe.</p>
          </div>
        </div>
      </HeroCard>

      <div className="three-column">
        <SurfaceCard><MailCheck size={20} /><h3>What changed</h3><p>A ranked review of newly released inflation, growth, policy, and market data.</p></SurfaceCard>
        <SurfaceCard><CalendarDays size={20} /><h3>What comes next</h3><p>A focused calendar of the releases that matter to the dashboard’s DXY framework.</p></SurfaceCard>
        <SurfaceCard><ShieldCheck size={20} /><h3>The playbook</h3><p>A conditional bias with confirmation, invalidation, and risk framing. Never a signal service.</p></SurfaceCard>
      </div>
    </div>
  );
}
