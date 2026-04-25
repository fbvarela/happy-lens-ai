import { NextResponse } from "next/server";

export const runtime = "nodejs";

const present = (v) => typeof v === "string" && v.trim().length > 0;

export async function GET() {
  return NextResponse.json({
    runtime: "nodejs",
    nodeEnv: process.env.NODE_ENV || null,
    vercelEnv: process.env.VERCEL_ENV || null,
    vercelRegion: process.env.VERCEL_REGION || null,
    env: {
      GROQ_API_KEY: present(process.env.GROQ_API_KEY),
      GROQ_API_KEY_length: present(process.env.GROQ_API_KEY) ? process.env.GROQ_API_KEY.trim().length : 0,
      DATABASE_URL: present(process.env.DATABASE_URL),
      POSTGRES_URL: present(process.env.POSTGRES_URL),
      SESSION_SECRET: present(process.env.SESSION_SECRET),
    },
    now: new Date().toISOString(),
  });
}
