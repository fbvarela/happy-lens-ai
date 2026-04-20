import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { RecipeResponseSchema } from "@/lib/recipe-schema";
import { clampRecipeToGear, resolveGear } from "@/lib/gear-validator";
import { getSubjectPreset } from "@/data/subjects/presets";
import { sunSnapshot } from "@/lib/sun";
import { weatherSnapshot } from "@/lib/weather";
import { sceneGuard } from "@/lib/scene-guard";
import { cacheKey, getCached, setCached } from "@/lib/recipe-cache";

export const runtime = "nodejs";

const MODEL_ID = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const LOCALE_NAME = { en: "English", es: "Spanish (Spain)" };

function stubRecipes(subject, gear, sky, useFlash) {
  const lens = gear.lenses[0];
  const fn = lens.fNumberFixed ?? lens.fNumberMin ?? 5.6;
  const night = sky && sky.sun.altitudeDeg < -6;
  const flash = gear.flashes?.[0];
  return {
    recipes: [
      {
        label: "Primary",
        lens: lens.id,
        fNumber: fn,
        shutter: night ? "6s" : "1/250s",
        iso: night ? 3200 : 200,
        ev: 0,
        cameraMode: gear.modes?.[0] || "Av",
        focus: "AF-S on the main subject.",
        stabilization: night ? "Tripod required; 2s self-timer." : "Handheld; elbows tucked.",
        position: `Stand about 3 m from the subject; place key light at ~45° off-axis.`,
        compositionTips: ["Rule-of-thirds on the strongest line.", "Leave breathing room on the side the subject faces."],
        warnings: ["Stub recipe — set GROQ_API_KEY to enable the AI coach."],
        flash: useFlash && flash
          ? { use: true, notes: `${flash.label} TTL, -1 EV, bounce ceiling.` }
          : { use: false, notes: "No flash." },
      },
    ],
  };
}

function describeGear(gear, useFlash) {
  const flashes = gear.flashes || [];
  const attachedFlash = useFlash && flashes[0] ? flashes[0] : null;
  return {
    id: gear.id,
    label: gear.label,
    kind: gear.kind,
    bodyNotes: gear.bodyNotes || null,
    cropFactor: gear.cropFactor || null,
    modes: gear.modes || [],
    exposureModes: gear.exposureModes || null,
    iso: gear.iso,
    shutter: gear.shutter,
    lenses: gear.lenses.map((l) => ({
      id: l.id,
      label: l.label,
      focalEq: l.focalEq ?? null,
      focalRangeMm: l.focalRangeMm ?? null,
      fNumberFixed: l.fNumberFixed ?? null,
      fNumberMin: l.fNumberMin ?? null,
      fNumberMax: l.fNumberMax ?? null,
      variableAperture: !!l.variableAperture,
      apertureAtWide: l.apertureAtWide ?? null,
      apertureAtTele: l.apertureAtTele ?? null,
      ois: l.ois ?? null,
      note: l.note ?? null,
    })),
    attachedFlash,
  };
}

function buildPrompt({ subject, scene, gear, sky, weather, guardIssues, locale, useFlash }) {
  const langName = LOCALE_NAME[locale] || "English";
  const gearDesc = describeGear(gear, useFlash);
  const lines = [
    `You are a shot coach for a photographer using a ${gear.label}.`,
    `IMPORTANT: Write every human-readable field (label, position, focus, stabilization, compositionTips, warnings, flash.notes) in ${langName}. Keep technical tokens unchanged (numeric f-numbers, shutter strings like "1/250s", lens ids from the gear profile, cameraMode values from the gear's modes list).`,
    `Gear profile (JSON, authoritative): ${JSON.stringify(gearDesc)}`,
    `Subject preset: ${JSON.stringify(subject)}`,
    `Scene: ${JSON.stringify(scene)}`,
    sky ? `Sky/light snapshot: ${JSON.stringify(sky)}` : "Sky snapshot unavailable.",
    weather ? `Weather snapshot: ${JSON.stringify(weather)}` : "Weather snapshot unavailable.",
  ];
  if (guardIssues.length) {
    lines.push(`Scene-subject issues flagged by pre-check: ${JSON.stringify(guardIssues)}`);
  }
  if (useFlash && gearDesc.attachedFlash) {
    lines.push(
      `FLASH IS AVAILABLE: ${JSON.stringify(gearDesc.attachedFlash)}. Use it when it actually helps the shot (fill in harsh light, subject separation in low light, freezing motion indoors). If the subject doesn't benefit (bright sun, landscape, astro), set flash.use=false with a one-line reason.`,
    );
  } else {
    lines.push("NO EXTERNAL FLASH. Every recipe must set flash.use=false with notes='No flash.'.");
  }
  lines.push(
    "",
    "Produce 1–3 shot recipes. The PRIMARY recipe is the best bet; alternates cover 'if the light drops' or 'for a tighter crop'.",
    "Hard rules:",
    "- lens MUST be one of the gear's lens ids.",
    "- fNumber MUST be achievable on the chosen lens. For fixed-aperture lenses use exactly that f-number. For variable-aperture zooms stay within [fNumberMin, fNumberMax]; note variableAperture + apertureAtWide/apertureAtTele constraints.",
    "- ISO within the gear's supported range.",
    "- Shutter in realistic human format (e.g. '1/250s' or '6s').",
    "- cameraMode must come from the gear's modes (or exposureModes for DSLRs like 'Av', 'Tv', 'M').",
    "- Position must be concrete: direction relative to subject and light, approximate distance, height.",
    "- If the pre-check flagged a block/warn issue, include it verbatim in the primary recipe's warnings.",
    "- flash.use must be a boolean. If flash is attached and useful, set use=true and describe TTL/manual, FEC, bounce direction, sync type in flash.notes.",
  );
  return lines.join("\n");
}

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }

  const { subjectId, scene = {}, gear: gearInput, gearId = "iphone-16-pro", locale = "en", useFlash = false } = body || {};

  const subject = getSubjectPreset(subjectId);
  if (!subject) return NextResponse.json({ error: "Unknown subject." }, { status: 400 });

  const gear = resolveGear(gearInput || { id: gearId });
  const hasFlash = useFlash && (gear.flashes?.length || 0) > 0;

  const [sky, weather] = await Promise.all([
    Promise.resolve(sunSnapshot({ lat: scene.lat, lng: scene.lng, date: scene.dateTime })),
    weatherSnapshot({ lat: scene.lat, lng: scene.lng, date: scene.dateTime }),
  ]);
  const guardIssues = sceneGuard(subject, sky);
  const blocker = guardIssues.find((i) => i.level === "block");
  if (blocker) {
    return NextResponse.json({ error: blocker.message, code: "scene-incompatible", sky, weather }, { status: 422 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ...stubRecipes(subject, gear, sky, hasFlash), sky, weather, source: "stub" });
  }

  const key = cacheKey({ subjectId, gearId: gear.id, scene }) + `|${locale}|f${hasFlash ? 1 : 0}`;
  const cached = getCached(key);
  if (cached) return NextResponse.json({ ...cached, source: "cache" });

  try {
    const groq = createGroq({ apiKey });
    const { object } = await generateObject({
      model: groq(MODEL_ID),
      schema: RecipeResponseSchema,
      prompt: buildPrompt({ subject, scene, gear, sky, weather, guardIssues, locale, useFlash: hasFlash }),
    });
    const clamped = {
      recipes: object.recipes.map((r) => {
        const c = clampRecipeToGear(r, gear);
        if (guardIssues.length) {
          const extra = guardIssues.filter((i) => i.level === "warn").map((i) => i.message);
          c.warnings = [...(c.warnings || []), ...extra];
        }
        return c;
      }),
      sky,
      weather,
    };
    setCached(key, clamped);
    return NextResponse.json({ ...clamped, source: "groq" });
  } catch (err) {
    console.error("coach/recipe error", err);
    return NextResponse.json(
      { ...stubRecipes(subject, gear, sky, hasFlash), sky, weather, source: "fallback", error: String(err?.message || err) },
      { status: 200 },
    );
  }
}
