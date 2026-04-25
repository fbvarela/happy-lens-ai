import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ subjects: [] });
  const db = getDb();
  if (!db) return NextResponse.json({ subjects: [] });
  const rows = await db.select().from(schema.subjectBaselines).where(eq(schema.subjectBaselines.userId, user.id));
  return NextResponse.json({ subjects: rows });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const { subjectSlug, displayName, baseline } = body || {};
  if (!subjectSlug || !baseline) return NextResponse.json({ error: "subjectSlug and baseline required." }, { status: 400 });
  const existing = await db.select().from(schema.subjectBaselines)
    .where(and(eq(schema.subjectBaselines.userId, user.id), eq(schema.subjectBaselines.subjectSlug, subjectSlug)))
    .limit(1);
  if (existing[0]) {
    await db.update(schema.subjectBaselines)
      .set({ displayName, baselineRecipeJson: baseline, sampleCount: sql`${schema.subjectBaselines.sampleCount} + 1`, updatedAt: new Date() })
      .where(eq(schema.subjectBaselines.id, existing[0].id));
    return NextResponse.json({ ok: true, sampleCount: (existing[0].sampleCount || 0) + 1 });
  }
  await db.insert(schema.subjectBaselines).values({ userId: user.id, subjectSlug, displayName: displayName || subjectSlug, baselineRecipeJson: baseline, sampleCount: 1 });
  return NextResponse.json({ ok: true, sampleCount: 1 });
}
