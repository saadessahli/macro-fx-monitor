export const siteConfig = {
  name: "Macro FX Monitor",
  shortName: "Macro FX",
  description:
    "A source-backed US macro dashboard translating inflation, growth, Federal Reserve policy, and Treasury yields into a structured DXY outlook.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  repositoryUrl:
    process.env.NEXT_PUBLIC_REPOSITORY_URL ??
    "https://github.com/saadessahli/macro-fx-monitor",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
};
