import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { PlanResponseSchema } from "@/lib/plan-schema";
import { dayWindows, hourlyWeather } from "@/lib/sun-day";

export const runtime = "nodejs";

const MODEL_ID = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const LOCALE_NAME = { en: "English", es: "Spanish (Spain)" };

function pickKeyHours(hours) {
  if (!hours) return [];
  const picks = [7, 11, 15, 19, 22].map((h) => hours.find((x) => new Date(x.time).getUTCHours() === h));
  return picks.filter(Boolean);
}

function stubPlan(windows, subjects) {
  const slots = [];
  if (windows?.sun?.goldenHourMorn) {
    slots.push({ time: windows.sun.goldenHourMorn, subjectId: "landscape", headline: "Morning golden-hour landscape", rationale: "Warm low light across the foreground.", lens: "main", cameraMode: "ProRAW" });
  }
  if (windows?.sun?.goldenHourEve) {
    slots.push({ time: windows.sun.goldenHourEve, subjectId: "portrait", headline: "Golden-hour portrait", rationale: "Flattering side-light.", lens: "tele2x", cameraMode: "Portrait" });
  }
  if (windows?.sun?.astroDarkStart) {
    slots.push({ time: windows.sun.astroDarkStart, subjectId: "astro", headline: "Milky Way window", rationale: "Sky below astronomical twilight; tripod recommended.", lens: "main", cameraMode: "Night" });
  }
  return { summary: "Stub plan — set GROQ_API_KEY for the AI shot list.", slots: slots.slice(0, 3) };
}

function buildPrompt({ lat, lng, date, notes, windows, weatherKey, locale }) {
  const langName = LOCALE_NAME[locale] || "English";
  return [
    `You are planning a single-day photo shoot for a photographer using an iPhone 16 Pro.`,
    `IMPORTANT: Write every human-readable field (summary, headline, rationale) in ${langName}. Keep technical enum values (subjectId, lens, cameraMode) in English. Slot times must be ISO timestamps within the requested day.`,
    `Location: lat=${lat}, lng=${lng}. Date: ${date}. Notes: ${notes || "none"}.`,
    `Day light windows (ISO): ${JSON.stringify(windows)}`,
    `Weather at key hours: ${JSON.stringify(weatherKey)}`,
    "",
    "Produce 3–5 shot-list slots across the day. Prefer times that match real light windows (golden/blue/astro) and real weather (skip astro under thick cloud, pick overcast for portraits, etc.).",
    "Each slot picks ONE subjectId from [portrait, landscape, astro, macro, wildlife, street, product, lowlight, action].",
    "Each slot picks ONE lens from [ultrawide, main, tele2x, tele5x] and a cameraMode that suits it.",
    "Rationale is ONE specific sentence — no platitudes.",
    "Return also a one-paragraph summary of the day's opportunity at this place.",
  ].join("\n");
}

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const { lat, lng, date, notes, locale = "en" } = body || {};
  if (lat == null || lng == null) {
    return NextResponse.json({ error: "lat and lng required." }, { status: 400 });
  }

  const windows = dayWindows({ lat, lng, date });
  const weather = await hourlyWeather({ lat, lng, date });
  const weatherKey = pickKeyHours(weather);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ...stubPlan(windows), windows, weather, source: "stub" });
  }

  try {
    const groq = createGroq({ apiKey });
    const { object } = await generateObject({
      model: groq(MODEL_ID),
      schema: PlanResponseSchema,
      prompt: buildPrompt({ lat, lng, date, notes, windows, weatherKey, locale }),
    });
    return NextResponse.json({ ...object, windows, weather, source: "groq" });
  } catch (err) {
    console.error("plan/day error", err);
    return NextResponse.json(
      { ...stubPlan(windows), windows, weather, source: "fallback", error: String(err?.message || err) },
      { status: 200 },
    );
  }
}
