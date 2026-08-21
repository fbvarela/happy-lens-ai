import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_EXAMPLES = 60;
const MAX_DATA_URL_CHARS = 550_000;

// ponytail: no per-user ownership — anyone signed in can add/delete the shared gallery; add ownership if abuse shows up
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ examples: [] });
  const rows = await db.select().from(schema.engagementExamples)
    .orderBy(schema.engagementExamples.createdAt)
    .limit(MAX_EXAMPLES);
  return NextResponse.json({ examples: rows });
}

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const { dataUrl } = await req.json().catch(() => ({}));
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/jpeg;base64,")) {
    return NextResponse.json({ error: "dataUrl must be a JPEG data URL." }, { status: 400 });
  }
  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    return NextResponse.json({ error: "Image too large." }, { status: 413 });
  }
  const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(schema.engagementExamples);
  if (count >= MAX_EXAMPLES) {
    // Keep the gallery bounded but never block a save: evict the oldest example.
    const oldest = await db.select({ id: schema.engagementExamples.id })
      .from(schema.engagementExamples)
      .orderBy(schema.engagementExamples.createdAt)
      .limit(1);
    if (oldest[0]) await db.delete(schema.engagementExamples).where(eq(schema.engagementExamples.id, oldest[0].id));
  }
  const rows = await db.insert(schema.engagementExamples).values({ imageDataUrl: dataUrl }).returning();
  return NextResponse.json({ ok: true, example: rows[0] });
}

export async function DELETE(req) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const db = getDb();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  await db.delete(schema.engagementExamples).where(eq(schema.engagementExamples.id, id));
  return NextResponse.json({ ok: true });
}
