import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { AdjustmentRecipeSchema, clampRecipe, PHOTOGRAPHIC_STYLES, PORTRAIT_LIGHTING, DEPTH_FSTOPS } from "@/lib/adjustment-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

const VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const LOCALE_NAME = { en: "English", es: "Spanish (Spain)" };

function stubRecipe() {
  return {
    title: "Stub Lift",
    verdict: { score: 3, headline: "Stub critique — set GROQ_API_KEY to enable the real coach." },
    diagnosis: "Stub recipe — set GROQ_API_KEY in .env.local to enable real analysis.",
    strengths: ["Image received and EXIF parsed."],
    issues: [{ area: "technical", observation: "AI vision not available in this environment." }],
    photographicStyle: { preset: "Standard", tone: 0.2, color: 0, why: "Neutral baseline." },
    light: { exposure: 10, brilliance: 15, highlights: -25, shadows: 20, contrast: 10, brightness: 0, blackPoint: 5 },
    color: { saturation: 0, vibrance: 12, warmth: 5, tint: 0 },
    detail: { sharpness: 20, definition: 10, noiseReduction: 0, vignette: 0 },
    depth: null,
    reasons: [
      { slider: "Highlights", why: "Recover blown sky." },
      { slider: "Shadows", why: "Open up faces." },
      { slider: "Vibrance", why: "Lift muted color without overcooking skin." },
    ],
    warnings: ["Stub output — no model was called."],
  };
}

function buildPrompt({ exif, hasDepth, isIPhone16Pro, subject, locale }) {
  const langName = LOCALE_NAME[locale] || "English";
  const exifSummary = exif ? JSON.stringify({
    camera: exif.Make && exif.Model ? `${exif.Make} ${exif.Model}` : exif.Model || null,
    lens: exif.LensModel || null,
    fNumber: exif.FNumber ?? null,
    shutter: exif.ExposureTime ? `${exif.ExposureTime}s` : null,
    iso: exif.ISO ?? null,
    ev: exif.ExposureCompensation ?? null,
    flash: exif.Flash ?? null,
    dateTaken: exif.DateTimeOriginal || null,
  }) : "unavailable";

  return [
    "You are an iPhone Photos-app post-capture coach. You do TWO jobs in one pass: (1) critique the photo as shot, (2) prescribe exact iPhone 16 Pro Photos-app slider values to fix it. Your only adjustment vocabulary is the iPhone 16 Pro surface defined below. Never invent slider names.",
    `Write all human-readable strings (title, verdict.headline, diagnosis, strengths[], issues[].observation, photographicStyle.why, reasons[].why, warnings[]) in ${langName}. Slider names in reasons[].slider and the issues[].area enum stay in English.`,
    "",
    "CRITIQUE RULES:",
    "- `verdict.score`: 1 weak, 5 excellent. `verdict.headline` must reference what is actually in the frame.",
    "- `strengths` may be empty. Only list things genuinely working.",
    "- `issues[].area`: pick the most relevant enum. `observation`: ground in what is visible.",
    "- The `diagnosis` paragraph is the bridge: it explains why the upcoming slider moves were chosen.",
    "",
    "ADJUSTMENT SURFACE:",
    `- Photographic Style preset (enum): ${PHOTOGRAPHIC_STYLES.join(", ")}`,
    "- Photographic Style Tone: -1.0 to +1.0 step 0.1",
    "- Photographic Style Color: -1.0 to +1.0 step 0.1 (null for B&W styles)",
    "- Light: Exposure, Brilliance, Highlights, Shadows, Contrast, Brightness (each -100..+100); Black Point (0..100)",
    "- Color: Saturation, Vibrance, Warmth, Tint (each -100..+100)",
    "- Detail: Sharpness, Definition, Noise Reduction (0..100); Vignette (-100..+100)",
    `- Depth (only if a depth map is present): f-stop from ladder ${DEPTH_FSTOPS.map(x => "f/" + x).join(", ")}; Portrait Lighting (${PORTRAIT_LIGHTING.join(", ")}); Lighting Intensity (0..100)`,
    "",
    "RULES:",
    "- All numeric values must be exact iOS slider values. Use 0 for sliders you do not want to move.",
    "- Diagnose what is actually visible (clipped highlights, color cast, soft contrast, noise, framing). Do not hallucinate metadata.",
    "- `reasons` must contain a one-line why for every non-zero slider, in display order (Photographic Style → Light → Color → Detail → Depth). Max 12.",
    `- ${isIPhone16Pro ? "This is an iPhone 16 Pro photo — full slider set available." : "This is NOT an iPhone 16 Pro — output the equivalent values the user can dial in if they were on iPhone 16 Pro Photos.app."}`,
    `- ${hasDepth ? "Depth map detected — you MAY set the `depth` block." : "No depth map — leave `depth` null."}`,
    subject ? `- Subject hint: ${subject}` : "",
    "",
    "EXIF:",
    exifSummary,
  ].filter(Boolean).join("\n");
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  const { imageDataUrl, exif, subject, locale = "en" } = body || {};

  if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Image data URL required." }, { status: 400 });
  }
  if (imageDataUrl.length > Math.ceil(MAX_IMAGE_BYTES * 1.4)) {
    return NextResponse.json({ error: "Image too large (max ~4 MB after compression)." }, { status: 413 });
  }

  const isIPhone16Pro = !!(exif?.Model && /iPhone 16 Pro/i.test(exif.Model));
  const hasDepth = !!(exif && (exif.SubjectArea || /portrait/i.test(exif.SceneCaptureType || "") || exif.HasDepth === true));

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const clamped = clampRecipe(stubRecipe(), { hasDepth });
    return NextResponse.json({ ...clamped, deviceProfile: isIPhone16Pro ? "iphone-16-pro" : "generic", source: "stub" });
  }

  try {
    const groq = createGroq({ apiKey });
    const { object } = await generateObject({
      model: groq(VISION_MODEL),
      schema: AdjustmentRecipeSchema,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: buildPrompt({ exif, hasDepth, isIPhone16Pro, subject, locale }) },
          { type: "image", image: imageDataUrl },
        ],
      }],
    });
    const clamped = clampRecipe(object, { hasDepth });
    return NextResponse.json({ ...clamped, deviceProfile: isIPhone16Pro ? "iphone-16-pro" : "generic", source: "groq" });
  } catch (err) {
    console.error("adjust recipe error", err);
    const clamped = clampRecipe(stubRecipe(), { hasDepth });
    return NextResponse.json(
      { ...clamped, deviceProfile: isIPhone16Pro ? "iphone-16-pro" : "generic", source: "fallback", error: String(err?.message || err) },
      { status: 200 },
    );
  }
}
