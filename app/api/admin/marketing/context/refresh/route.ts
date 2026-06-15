import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import {
  loadFreshMarketContext,
  refreshCalendarContext,
  refreshNewsContext,
} from "@/lib/market-context";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as { source?: "calendar" | "news" } | null;
  try {
    if (body?.source === "calendar") {
      const result = await refreshCalendarContext();
      return NextResponse.json({
        context: await loadFreshMarketContext(),
        message: result.mode === "provider"
          ? `Economic calendar refreshed from the configured provider (${result.events.length} events).`
          : `Economic calendar refreshed using the FRED fallback (${result.events.length} events).`,
      });
    }
    if (body?.source === "news") {
      const result = await refreshNewsContext();
      return NextResponse.json({
        context: await loadFreshMarketContext(),
        message: result.mode === "provider"
          ? `News context refreshed (${result.items.length} relevant headlines).`
          : "No news API is configured. Manual headline and geopolitical context remains available.",
      });
    }
    return NextResponse.json({ error: "Choose calendar or news." }, { status: 400 });
  } catch (error) {
    console.error("Market context refresh failed", error);
    return NextResponse.json(
      { error: "The selected market context source could not be refreshed." },
      { status: 502 }
    );
  }
}
