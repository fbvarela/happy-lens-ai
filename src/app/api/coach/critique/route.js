import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { CritiqueSchema } from "@/lib/critique-schema";
import { visionModel, hasVisionKey } from "@/lib/vision-provider";

export const runtime = "nodejs";
export const maxDuration = 30;

const LOCALE_NAME = { en: "English", es: "Spanish (Spain)" };
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

function stubCritique(intent, exif) {
  return {
    verdict: { score: 3, headline: "Stub critique — set GROQ_API_KEY to enable the vision coach." },
    strengths: ["Image received and EXIF parsed."],
    issues: [{ area: "technical", observation: "AI vision not available in this environment." }],
    tryNext: ["Add GROQ_API_KEY to .env.local to unlock real critique."],
    recipeTweaks: { lens: null, fNumber: null, shutter: null, iso: null, ev: null, note: intent ? `Intent noted: ${intent}` : null },
  };
}

function buildPromptParts({ intent, exif, locale }) {
  const langName = LOCALE_NAME[locale] || "English";
  const exifSummary = exif
    ? `EXIF: ${JSON.stringify({
        camera: exif.Make && exif.Model ? `${exif.Make} ${exif.Model}` : exif.Model || null,
        lens: exif.LensModel || exif.LensMake || null,
        focalLengthMm: exif.FocalLength ?? null,
        focalLength35mm: exif.FocalLengthIn35mmFormat ?? null,
        fNumber: exif.FNumber ?? null,
        shutter: exif.ExposureTime ? `${exif.ExposureTime}s` : null,
        iso: exif.ISO ?? null,
        ev: exif.ExposureCompensation ?? null,
        dateTaken: exif.DateTimeOriginal || exif.CreateDate || null,
        gps: exif.latitude != null && exif.longitude != null ? { lat: exif.latitude, lng: exif.longitude } : null,
        orientation: exif.Orientation ?? null,
        flash: exif.Flash ?? null,
      })}`
    : "EXIF: unavailable.";
  return [
    `You are a photo critique coach. The photographer is using an iPhone 16 Pro unless EXIF says otherwise.`,
    `IMPORTANT: Write every human-readable field (verdict.headline, strengths, issues[].observation, tryNext, recipeTweaks.note) in ${langName}. Keep technical tokens (f-numbers, shutter strings, lens names, ISO, EV values) unchanged. The 'area' enum in issues must stay in English.`,
    intent ? `Stated intent for this shot: ${intent}` : "Intent not provided — infer it from the image.",
    exifSummary,
    "Look at the attached photo. Produce a critique grounded in what you actually see plus the EXIF.",
    "Rules:",
    "- Do not hallucinate metadata. If EXIF says null, don't invent numbers.",
    "- `issues` must reference something visible in the image or measurable from EXIF.",
    "- `tryNext` must be concrete tweaks, not platitudes.",
    "- `recipeTweaks`: set fields to null if no change; otherwise propose values that are achievable on the iPhone 16 Pro.",
    "- `verdict.headline` must be specific (no 'nice photo').",
  ].join("\n");
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const { imageDataUrl, intent, exif, locale = "en" } = body || {};
  if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image data URL required." }, { status: 400 });
  }
  if (imageDataUrl.length > Math.ceil(MAX_IMAGE_BYTES * 1.4)) {
    return NextResponse.json({ error: "Image too large (max ~4 MB after compression)." }, { status: 413 });
  }

  if (!hasVisionKey()) {
    return NextResponse.json({ ...stubCritique(intent, exif), source: "stub" });
  }

  try {
    const { object } = await generateObject({
      model: visionModel(),
      schema: CritiqueSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPromptParts({ intent, exif, locale }) },
            { type: "image", image: imageDataUrl },
          ],
        },
      ],
    });
    return NextResponse.json({ ...object, source: "groq" });
  } catch (err) {
    console.error("critique error", err);
    return NextResponse.json(
      { ...stubCritique(intent, exif), source: "fallback", error: String(err?.message || err) },
      { status: 200 },
    );
  }
}
