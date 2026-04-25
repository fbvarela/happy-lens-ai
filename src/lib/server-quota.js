import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { FREE_LIMITS, isPremium } from "@/lib/tier";

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getQuotaForUser(user) {
  const max = isPremium(user.plan) ? Infinity : FREE_LIMITS.ADJUSTMENTS_PER_DAY;
  const db = getDb();
  if (!db) return { used: 0, max, remaining: max, day: today() };
  const day = today();
  const rows = await db.select().from(schema.adjustmentQuota)
    .where(and(eq(schema.adjustmentQuota.userId, user.id), eq(schema.adjustmentQuota.day, day)))
    .limit(1);
  const used = rows[0]?.uploadsUsed ?? 0;
  return { used, max, remaining: Math.max(0, max - used), day };
}

export async function consumeUploadForUser(user) {
  if (isPremium(user.plan)) return { ok: true, remaining: Infinity };
  const db = getDb();
  if (!db) return { ok: true, remaining: FREE_LIMITS.ADJUSTMENTS_PER_DAY };
  const day = today();
  const current = await getQuotaForUser(user);
  if (current.used >= current.max) return { ok: false, remaining: 0, max: current.max };
  await db.insert(schema.adjustmentQuota)
    .values({ userId: user.id, day, uploadsUsed: 1, previewsUsed: 0 })
    .onConflictDoUpdate({
      target: [schema.adjustmentQuota.userId, schema.adjustmentQuota.day],
      set: { uploadsUsed: sql`${schema.adjustmentQuota.uploadsUsed} + 1` },
    });
  return { ok: true, remaining: current.remaining - 1, max: current.max };
}
