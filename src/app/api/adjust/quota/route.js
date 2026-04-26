import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getQuotaForUser } from "@/lib/server-quota";
import { isPremium } from "@/lib/tier";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ authed: false });
  const q = await getQuotaForUser(user);
  return NextResponse.json({
    authed: true,
    plan: user.plan || "free",
    premium: isPremium(user.plan),
    used: q.used,
    max: q.max === Infinity ? null : q.max,
    remaining: q.remaining === Infinity ? null : q.remaining,
    day: q.day,
  });
}
