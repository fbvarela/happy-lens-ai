import { z } from "zod";

const i = (min, max) => z.number().int().min(min).max(max).nullable();
const f = (min, max) => z.number().min(min).max(max).nullable();

export const PHOTOGRAPHIC_STYLES = [
  "Standard", "Amber", "Gold", "Rose Gold", "Neutral", "Vibrant", "Natural",
  "Luminous", "Dramatic", "Quiet", "Cozy", "Ethereal", "Muted B&W", "Stark B&W",
];

export const PORTRAIT_LIGHTING = [
  "Natural", "Studio", "Contour", "Stage", "Stage Mono", "High-Key Mono",
];

export const DEPTH_FSTOPS = [1.4, 1.8, 2.0, 2.5, 2.8, 3.5, 4.0, 4.5, 5.6, 6.3, 7.1, 8.0, 9.0, 10, 11, 13, 14, 16];

export const AdjustmentRecipeSchema = z.object({
  title: z.string().describe("Editorial 2-5 word recipe name."),
  verdict: z.object({
    score: z.number().int().min(1).max(5).describe("1=weak to 5=excellent."),
    headline: z.string().describe("One-line verdict on the photo as shot. Specific, no platitudes."),
  }),
  diagnosis: z.string().describe("One paragraph: what is in the frame and what hurts it."),
  strengths: z.array(z.string()).max(4).describe("What the shot already does well. May be empty, but include the field."),
  issues: z.array(z.object({
    area: z.enum(["composition", "light", "focus", "exposure", "color", "motion", "subject", "technical"]),
    observation: z.string(),
  })).max(5).describe("Concrete issues visible in the frame. May be empty."),
  photographicStyle: z.object({
    preset: z.enum(PHOTOGRAPHIC_STYLES),
    tone: f(-1, 1).describe("−1.0 to +1.0, step 0.1. Null for B&W."),
    color: f(-1, 1).describe("−1.0 to +1.0, step 0.1. Null for B&W or Standard."),
    why: z.string(),
  }),
  light: z.object({
    exposure: i(-100, 100),
    brilliance: i(-100, 100),
    highlights: i(-100, 100),
    shadows: i(-100, 100),
    contrast: i(-100, 100),
    brightness: i(-100, 100),
    blackPoint: i(0, 100),
  }),
  color: z.object({
    saturation: i(-100, 100),
    vibrance: i(-100, 100),
    warmth: i(-100, 100),
    tint: i(-100, 100),
  }),
  detail: z.object({
    sharpness: i(0, 100),
    definition: i(0, 100),
    noiseReduction: i(0, 100),
    vignette: i(-100, 100),
  }),
  depth: z.object({
    fStop: z.number().nullable().describe("From DEPTH_FSTOPS ladder. Null if no depth map."),
    portraitLighting: z.enum(PORTRAIT_LIGHTING).nullable(),
    lightingIntensity: i(0, 100),
  }).nullable(),
  reasons: z.array(z.object({
    slider: z.string(),
    why: z.string(),
  })).max(12).describe("One short why per non-zero slider, in display order."),
  warnings: z.array(z.string()).describe("Schema clamps & device-capability notes. May be empty."),
});

const clampInt = (v, min, max) => {
  if (v == null) return null;
  const n = Math.round(v);
  return Math.max(min, Math.min(max, n));
};
const clampFloat = (v, min, max, step = 0.1) => {
  if (v == null) return null;
  const snapped = Math.round(v / step) * step;
  return Math.max(min, Math.min(max, Number(snapped.toFixed(1))));
};
const snapFstop = (v) => {
  if (v == null) return null;
  return DEPTH_FSTOPS.reduce((best, f) => Math.abs(f - v) < Math.abs(best - v) ? f : best, DEPTH_FSTOPS[0]);
};

export function clampRecipe(recipe, { hasDepth = false } = {}) {
  const warnings = [...(recipe.warnings || [])];
  const out = structuredClone(recipe);

  const ps = out.photographicStyle;
  const isBW = ps.preset === "Muted B&W" || ps.preset === "Stark B&W";
  ps.tone = clampFloat(ps.tone, -1, 1);
  ps.color = isBW ? null : clampFloat(ps.color, -1, 1);
  if (isBW && recipe.photographicStyle.color != null) warnings.push("Color stripped: B&W style does not accept Color.");

  for (const k of ["exposure", "brilliance", "highlights", "shadows", "contrast", "brightness"]) out.light[k] = clampInt(out.light[k], -100, 100);
  out.light.blackPoint = clampInt(out.light.blackPoint, 0, 100);

  for (const k of ["saturation", "vibrance", "warmth", "tint"]) out.color[k] = clampInt(out.color[k], -100, 100);

  out.detail.sharpness = clampInt(out.detail.sharpness, 0, 100);
  out.detail.definition = clampInt(out.detail.definition, 0, 100);
  out.detail.noiseReduction = clampInt(out.detail.noiseReduction, 0, 100);
  out.detail.vignette = clampInt(out.detail.vignette, -100, 100);

  if (!hasDepth) {
    if (out.depth) warnings.push("Depth controls dropped: no depth map detected on this image.");
    out.depth = null;
  } else if (out.depth) {
    const original = out.depth.fStop;
    out.depth.fStop = snapFstop(out.depth.fStop);
    if (original != null && out.depth.fStop !== original) warnings.push(`Depth f-stop snapped from f/${original} to f/${out.depth.fStop}.`);
    out.depth.lightingIntensity = clampInt(out.depth.lightingIntensity, 0, 100);
  }

  out.warnings = warnings;
  return out;
}
