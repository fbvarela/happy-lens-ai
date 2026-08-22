import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const TTL_MS = 1000 * 60 * 30;
const MAX_ENTRIES = 200;

const store = globalThis.__coachCache ?? (globalThis.__coachCache = new Map());

export function cacheKey({ subjectId, gearId, scene }) {
  const lat = scene?.lat != null ? Math.round(scene.lat * 100) / 100 : "nolat";
  const lng = scene?.lng != null ? Math.round(scene.lng * 100) / 100 : "nolng";
  const hourBucket = scene?.dateTime ? new Date(scene.dateTime).toISOString().slice(0, 13) : "notime";
  const notesHash = (scene?.notes || "").trim().toLowerCase().slice(0, 40);
  return `${gearId}|${subjectId}|${lat}|${lng}|${hourBucket}|${notesHash}`;
}

// AI recipes persist to Postgres so they survive restarts/instances; the
// in-memory Map is just a fast layer on top.
export async function getCached(key) {
  const entry = store.get(key);
  if (entry) {
    if (Date.now() - entry.t > TTL_MS) store.delete(key);
    else return entry.v;
  }
  const db = getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(schema.coachRecipes).where(eq(schema.coachRecipes.cacheKey, key)).limit(1);
    if (!rows[0]) return null;
    if (Date.now() - new Date(rows[0].createdAt).getTime() > TTL_MS) return null;
    store.set(key, { t: Date.now(), v: rows[0].recipeJson });
    return rows[0].recipeJson;
  } catch {
    return null;
  }
}

export async function setCached(key, value) {
  store.set(key, { t: Date.now(), v: value });
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey) store.delete(oldestKey);
  }
  const db = getDb();
  if (!db) return;
  try {
    await db.insert(schema.coachRecipes).values({ cacheKey: key, recipeJson: value })
      .onConflictDoUpdate({
        target: schema.coachRecipes.cacheKey,
        set: { recipeJson: value, createdAt: new Date() },
      });
    // Keep at most 3 recipes per subject: evict older ones beyond the latest 3.
    const subjectId = key.split("|")[1];
    if (subjectId) {
      const rows = await db.select({ id: schema.coachRecipes.id, cacheKey: schema.coachRecipes.cacheKey })
        .from(schema.coachRecipes)
        .orderBy(desc(schema.coachRecipes.createdAt))
        .limit(100);
      const mine = rows.filter((r) => r.cacheKey.split("|")[1] === subjectId);
      const excess = mine.slice(3).map((r) => r.id);
      if (excess.length) await db.delete(schema.coachRecipes).where(inArray(schema.coachRecipes.id, excess));
    }
  } catch {
    // Persistence is best-effort; never fail the recipe response over it.
  }
}