import { NextResponse } from "next/server";
import { ensureUser, getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

function isAllowedHost(req) {
  const host = req.headers.get("host") || "";
  if (host.includes("localhost") || host.includes("127.0.0.1")) return true;
  if (process.env.VERCEL_ENV === "preview") return true;
  return false;
}

export async function POST(req) {
  if (!isAllowedHost(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const email = (body.email || "test@happyfactory.app").toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  try {
    const user = await ensureUser(email);
    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    await session.save();
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, plan: user.plan } });
  } catch (err) {
    const msg = String(err?.message || err);
    const cause = String(err?.cause?.message || "");
    const blob = msg + " | " + cause;
    if (/Database not configured/i.test(blob)) {
      return NextResponse.json({ error: "Set DATABASE_URL in .env.local to enable accounts." }, { status: 500 });
    }
    if (/does not exist|relation .*users|undefined_table/i.test(blob)) {
      return NextResponse.json({ error: "Database tables missing. Run `npm run db:push` (or `db:migrate`) to apply src/db/migrations/." }, { status: 500 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
