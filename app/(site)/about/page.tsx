import type { Metadata } from "next";
import Link from "next/link";
import { Github, Mail, Target } from "lucide-react";
import { siteConfig } from "@/lib/site";
import { SurfaceCard } from "@/components/ui";

export const metadata: Metadata = {
  title: "About",
  description: "Why Macro FX Monitor exists and how to study its source-visible research project.",
};

export default function AboutPage() {
  return (
    <div className="page-grid legal-page">
      <SurfaceCard>
        <span className="eyebrow">Open research project</span>
        <h1>About Macro FX Monitor</h1>
        <p>
          Macro FX Monitor was built to make the chain from economic releases to Federal Reserve expectations,
          Treasury yields, and the US dollar easier to inspect and challenge.
        </p>
      </SurfaceCard>
      <div className="three-column">
        <SurfaceCard>
          <Target size={20} />
          <h3>Mission</h3>
          <p>Turn scattered macro releases into a transparent, repeatable framework rather than a stream of isolated headlines.</p>
        </SurfaceCard>
        <SurfaceCard>
          <Github size={20} />
          <h3>Source visible</h3>
          <p>
            {siteConfig.repositoryUrl ? (
              <Link className="inline-link" href={siteConfig.repositoryUrl}>View the code and methodology on GitHub for learning, portfolio, and demonstration purposes.</Link>
            ) : "The public GitHub repository will be linked after launch."}
          </p>
        </SurfaceCard>
        <SurfaceCard>
          <Mail size={20} />
          <h3>Contact</h3>
          <p>
            {siteConfig.contactEmail ? (
              <Link className="inline-link" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</Link>
            ) : "Public contact details will be added during deployment."}
          </p>
        </SurfaceCard>
      </div>
    </div>
  );
}
