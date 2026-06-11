import type { Metadata } from "next";
import { SurfaceCard } from "@/components/ui";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="page-grid legal-page">
      <SurfaceCard>
        <h1>Privacy Policy</h1>
        <p>Last updated: June 11, 2026</p>
        <h3>Information collected</h3>
        <p>The newsletter form collects the email address you submit. Basic technical information may be processed for security, spam prevention, and aggregate site operation.</p>
        <h3>How information is used</h3>
        <p>Your email is used only to manage your subscription and deliver requested macro snapshots. It is not sold.</p>
        <h3>Service providers</h3>
        <p>Hosting, newsletter delivery, database storage, and operational analytics may be provided by third-party processors identified in the project documentation.</p>
        <h3>Your choices</h3>
        <p>Every newsletter includes an unsubscribe mechanism. You may also contact the maintainer to request deletion.</p>
        <h3>Changes</h3>
        <p>This policy may be updated as the project and its service providers evolve.</p>
      </SurfaceCard>
    </div>
  );
}
