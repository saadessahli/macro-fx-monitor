import { notFound } from "next/navigation";
import { DriverPageView } from "@/components/driver-page-view";
import { loadDriverAnalysis } from "@/lib/series";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DriverPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const analysis = await loadDriverAnalysis(slug);

  if (!analysis) {
    notFound();
  }

  return <DriverPageView analysis={analysis} />;
}
