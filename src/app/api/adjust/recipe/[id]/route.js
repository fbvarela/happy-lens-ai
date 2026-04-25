import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req, { params }) {
  const { id } = await params;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  const rows = await db.select().from(schema.adjustmentRecipes).where(eq(schema.adjustmentRecipes.id, id)).limit(1);
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({
    id: row.id,
    at: row.createdAt,
    deviceProfile: row.deviceProfile,
    subject: row.subjectSlug,
    thumbnail: row.thumbnailDataUrl,
    recipe: row.recipeJson,
  });
}
