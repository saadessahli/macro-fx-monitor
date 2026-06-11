import type { MetadataRoute } from "next";
import { drivers } from "@/lib/drivers";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/dashboard",
    "/snapshot",
    "/newsletter",
    "/about",
    "/methodology",
    "/data-sources",
    "/privacy",
    "/terms",
    "/disclaimer",
  ];

  return [
    ...routes.map((route) => ({
      url: `${siteConfig.url}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "/snapshot" ? "weekly" as const : "monthly" as const,
      priority: route === "" || route === "/dashboard" ? 1 : 0.7,
    })),
    ...drivers.map((driver) => ({
      url: `${siteConfig.url}/drivers/${driver.slug}`,
      lastModified: new Date(),
      changeFrequency: driver.frequency === "daily" ? "daily" as const : "monthly" as const,
      priority: 0.8,
    })),
  ];
}
