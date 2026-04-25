import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

const sessionOptions = {
  password: process.env.SESSION_SECRET || "lens_dev_password_at_least_32_chars_xxxxxx",
  cookieName: "happy-lens-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, sessionOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  const db = getDb();
  if (!db) return { id: session.userId, email: session.email, plan: "free" };
  try {
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, session.userId)).limit(1);
    return rows[0] || null;
  } catch {
    return { id: session.userId, email: session.email, plan: "free" };
  }
}

export async function ensureUser(email) {
  const db = getDb();
  if (!db) throw new Error("Database not configured.");
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db.insert(schema.users).values({ email, plan: "free" }).returning();
  return created;
}
