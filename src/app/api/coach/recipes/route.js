import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

export const runtime = "nodejs";

function parseKey(key) {
  const p = (key || "").split("|");
  const hour = p[4] && p[4] !== "notime" ? p[4] : null;
  return {
    gearId: p[0] || null,
    subjectId: p[1] || null,
    lat: p[2] && p[2] !== "nolat" ? Number(p[2]) : null,
    lng: p[3] && p[3] !== "nolng" ? Number(p[3]) : null,
    dateTime: hour ? `${hour}:00` : null,
    notes: p[5] || null,
  };
}

export async function GET(req) {
  const db = getDb();
  if (!db) return NextResponse.json({ recipes: [] });
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 50);
  const rows = await db.select()
    .from(schema.coachRecipes)
    .orderBy(desc(schema.coachRecipes.createdAt))
    .limit(limit);
  const recipes = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    recipe: r.recipeJson,
    ...parseKey(r.cacheKey),
  }));
  return NextResponse.json({ recipes });
}