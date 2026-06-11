import { NextResponse } from "next/server";
import { loadFredSeriesBundle } from "@/lib/fred";
import { drivers } from "@/lib/drivers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  const { seriesId } = await params;
  const driver = drivers.find((item) => item.primarySeries.seriesId === seriesId);
  if (!driver) {
    return NextResponse.json({ error: "Unknown series." }, { status: 404 });
  }

  const bundle = await loadFredSeriesBundle({
    seriesId,
    label: driver.primarySeries.label,
    sourceLabel: driver.primarySeries.sourceLabel,
    sourceUrl: driver.primarySeries.sourceUrl,
    units: driver.primarySeries.units,
  });

  return NextResponse.json(bundle, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
