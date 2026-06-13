import { NextResponse } from "next/server";
import { getAuthenticatedUser, isAdminEmail } from "@/lib/admin";
import { improveMarketingText, type ImprovementAction } from "@/lib/marketing-improvements";
import { siteConfig } from "@/lib/site";

const actions = new Set<ImprovementAction>([
  "shorter", "clearer", "professional", "less-promotional",
  "stronger-hook", "remove-link", "add-link", "thread",
]);

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as {
    text?: string;
    action?: ImprovementAction;
  } | null;
  if (!body?.text || !body.action || !actions.has(body.action)) {
    return NextResponse.json({ error: "Invalid improvement request." }, { status: 400 });
  }
  return NextResponse.json(
    improveMarketingText(String(body.text).slice(0, 6000), body.action, `${siteConfig.url}/snapshot`)
  );
}

