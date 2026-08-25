import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { AdjustmentRecipeSchema, clampRecipe, PHOTOGRAPHIC_STYLES } from "@/lib/adjustment-schema";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, schema } from "@/lib/db";
import { visionModel, hasVisionKey } from "@/lib/vision-provider";

async function persistBatch({ user, sharedRecipe, perPhoto }) {
  if (!user) return null;
  const db = getDb();
  if (!db) return null;
  try {
    const [row] = await db.insert(schema.batchJobs).values({
      userId: user.id,
      photoCount: perPhoto.length,
      sharedRecipeJson: sharedRecipe,
      perPhotoDeltasJson: perPhoto,
    }).returning({ id: schema.batchJobs.id });
    return row?.id || null;
  } catch (err) {
    console.error("persistBatch failed", err);
    return null;
  }
}

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTOS = 12;
const LOCALE_NAME = { en: "English", es: "Spanish (Spain)" };

const DeltaSchema = z.object({
  light: z.object({
    exposure: z.number().int().min(-100).max(100),
    highlights: z.number().int().min(-100).max(100),
    shadows: z.number().int().min(-100).max(100),
  }),
  color: z.object({
    warmth: z.number().int().min(-100).max(100),
    tint: z.number().int().min(-100).max(100),
  }),
  why: z.string(),
});

const BatchOutputSchema = z.object({
  shared: AdjustmentRecipeSchema,
  perPhoto: z.array(DeltaSchema),
});

function stubBatch(count) {
  const shared = clampRecipe({
    title: "Shared Set Lift",
    diagnosis: "Stub — set GROQ_API_KEY to enable batch analysis.",
    photographicStyle: { preset: "Standard", tone: 0.2, color: 0, why: "Neutral baseline." },
    light: { exposure: 5, brilliance: 10, highlights: -20, shadows: 15, contrast: 8, brightness: 0, blackPoint: 4 },
    color: { saturation: 0, vibrance: 8, warmth: 4, tint: 0 },
    detail: { sharpness: 15, definition: 8, noiseReduction: 0, vignette: 0 },
    depth: null,
    reasons: [{ slider: "Highlights", why: "Tame mixed-light highlights across the set." }],
    warnings: ["Stub output — no model was called."],
  }, { hasDepth: false });
  return {
    shared,
    perPhoto: Array.from({ length: count }, (_, i) => ({
      light: { exposure: i % 2 ? 5 : -5, highlights: 0, shadows: 0 },
      color: { warmth: 0, tint: 0 },
      why: "Stub delta — no model was called.",
    })),
  };
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { images, locale = "en" } = body || {};

  if (!Array.isArray(images) || images.length < 2) {
    return NextResponse.json({ error: "Send at least 2 images." }, { status: 400 });
  }
  if (images.length > MAX_PHOTOS) {
    return NextResponse.json({ error: `Max ${MAX_PHOTOS} photos per batch.` }, { status: 413 });
  }
  if (!images.every((u) => typeof u === "string" && u.startsWith("data:image/"))) {
    return NextResponse.json({ error: "Each image must be a data URL." }, { status: 400 });
  }

  const user = await getCurrentUser().catch(() => null);

  if (!hasVisionKey()) {
    const out = { ...stubBatch(images.length), source: "stub" };
    const id = await persistBatch({ user, sharedRecipe: out.shared, perPhoto: out.perPhoto });
    return NextResponse.json(id ? { ...out, id } : out);
  }

  const langName = LOCALE_NAME[locale] || "English";
  const prompt = [
    "You are an iPhone Photos-app post-capture coach analyzing a SET of photos from one shoot.",
    `Write all human-readable strings in ${langName}. Slider names stay in English.`,
    `Output: ONE shared AdjustmentRecipe that applies to the whole set, plus a per-photo delta (only Exposure, Highlights, Shadows, Warmth, Tint differ).`,
    `Photographic Style preset must be one of: ${PHOTOGRAPHIC_STYLES.join(", ")}.`,
    `All slider values are exact iPhone 16 Pro iOS Photos slider integers, ranges per the schema. Use 0 for unchanged sliders.`,
    `${images.length} photos follow, in order.`,
  ].join("\n");

  try {
    const { object } = await generateObject({
      model: visionModel(),
      schema: BatchOutputSchema,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...images.map((image) => ({ type: "image", image })),
        ],
      }],
    });
    if (object.perPhoto.length !== images.length) {
      while (object.perPhoto.length < images.length) {
        object.perPhoto.push({ light: { exposure: 0, highlights: 0, shadows: 0 }, color: { warmth: 0, tint: 0 }, why: "" });
      }
      object.perPhoto = object.perPhoto.slice(0, images.length);
    }
    object.shared = clampRecipe(object.shared, { hasDepth: false });
    const id = await persistBatch({ user, sharedRecipe: object.shared, perPhoto: object.perPhoto });
    return NextResponse.json(id ? { ...object, id, source: "groq" } : { ...object, source: "groq" });
  } catch (err) {
    console.error("adjust batch error", err);
    const out = { ...stubBatch(images.length), source: "fallback", error: String(err?.message || err) };
    const id = await persistBatch({ user, sharedRecipe: out.shared, perPhoto: out.perPhoto });
    return NextResponse.json(id ? { ...out, id } : out, { status: 200 });
  }
}
