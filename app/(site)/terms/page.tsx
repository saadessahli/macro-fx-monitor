import type { Metadata } from "next";
import Link from "next/link";
import { SurfaceCard } from "@/components/ui";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <div className="page-grid legal-page">
      <SurfaceCard>
        <h1>Terms of Use</h1>
        <p>Last updated: June 11, 2026</p>
        <h3>Educational use</h3>
        <p>The site provides educational macroeconomic research. It does not provide investment advice, brokerage services, personalized recommendations, or guarantees.</p>
        <h3>Data and availability</h3>
        <p>Economic data may be delayed, revised, incomplete, or unavailable. The service may change or stop without notice.</p>
        <h3>FRED API</h3>
        <p>By using this application, users agree to be bound by the <Link className="inline-link" href="https://fred.stlouisfed.org/docs/api/terms_of_use.html">FRED API Terms of Use</Link>.</p>
        <h3>Acceptable use</h3>
        <p>Do not abuse public endpoints, attempt unauthorized access, interfere with operation, or use the service unlawfully.</p>
        <h3>Liability</h3>
        <p>The service is provided as-is without warranties. You remain responsible for your own financial and technical decisions.</p>
      </SurfaceCard>
    </div>
  );
}
