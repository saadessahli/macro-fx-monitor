import type { Metadata } from "next";
import { SurfaceCard } from "@/components/ui";

export const metadata: Metadata = { title: "Financial Disclaimer" };

export default function DisclaimerPage() {
  return (
    <div className="page-grid legal-page">
      <SurfaceCard>
        <h1>Financial Disclaimer</h1>
        <p>
          All content is for information and education only. Nothing on this website or in its emails is an offer,
          solicitation, trading signal, or recommendation to buy or sell any security, currency, derivative, or other
          financial instrument.
        </p>
        <p>
          Macro scenarios can be wrong. Markets can react differently from historical relationships, and losses can
          exceed expectations. Consult a qualified professional before making financial decisions.
        </p>
      </SurfaceCard>
    </div>
  );
}
