import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | US Macro to DXY`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: ["US macro", "DXY", "Federal Reserve", "inflation", "Treasury yields", "economic calendar"],
  authors: [{ name: "Saad" }],
  creator: "Saad",
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} | US Macro to DXY`,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | US Macro to DXY`,
    description: siteConfig.description,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
