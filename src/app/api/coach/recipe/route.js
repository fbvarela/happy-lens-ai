import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { RecipeResponseSchema } from "@/lib/recipe-schema";
import { clampRecipeToGear, resolveGear } from "@/lib/gear-validator";
import { getSubjectPreset, resolveBwContext } from "@/data/subjects/presets";
import { resolvePetContext, resolvePetAnimal, PET_ANIMAL_HINTS } from "@/data/subjects/pet-contexts";
import { sunSnapshot } from "@/lib/sun";
import { weatherSnapshot } from "@/lib/weather";
import { sceneGuard } from "@/lib/scene-guard";
import { cacheKey, getCached, setCached } from "@/lib/recipe-cache";

export const runtime = "nodejs";

const MODEL_ID = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const LOCALE_NAME = { en: "English", es: "Spanish (Spain)" };
const SCHEMA_VERSION = "v2"; // bump when ShotRecipeSchema changes shape

function stubRecipes(subject, gear, sky, useFlash) {
  const lens = gear.lenses[0];
  const fn = lens.fNumberFixed ?? lens.fNumberMin ?? 5.6;
  const night = sky && sky.sun.altitudeDeg < -6;
  const flash = gear.flashes?.[0];
  const isIphone = gear.id === "iphone-16-pro";
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
        iphone: isIphone
          ? { photographicStyle: "Standard", format: night ? "ProRAW-48" : "HEIF", cameraControlHint: null, aeAfLockHint: null, frontCamera: false, macroOverride: false }
          : null,
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
    photographicStyles: gear.photographicStyles || null,
    cameraControl: gear.cameraControl || null,
    formats: gear.formats || null,
    builtInFlashes: flashes.filter((f) => f.builtIn).map((f) => ({ id: f.id, label: f.label, frontOnly: !!f.frontOnly })),
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
      macro: l.macro ?? null,
      selfie: !!l.selfie,
      note: l.note ?? null,
    })),
    attachedFlash,
  };
}

function buildPetsBrief(subject) {
  if (subject.id !== "pets") return null;
  return [
    "",
    `PETS SUBJECT — animal: ${subject.animal}, context: ${subject.petContextId}.`,
    `Context hint: "${subject.petContextHint}"`,
    `Animal hint: "${subject.animalHint}"`,
    "Rules:",
    "- Eye-level framing is the default; state the pet's eye-line in `position`.",
    "- Never direct-flash into the eyes; bounce off ceiling or use natural light.",
    "- If context is `action` or the animal is a puppy/kitten, set shutter at least 1/1000 s and suggest burst in `focus`.",
    "- If context is `sleeping`, mention silent / quiet-shutter where the gear supports it.",
  ].join("\n");
}

function buildBwBrief(subject) {
  if (subject.id !== "bw") return null;
  const lowkey = subject.bwContextId === "lowkey";
  return [
    "",
    `BLACK & WHITE SUBJECT — context: ${subject.bwContextId}.`,
    `Context hint: "${subject.bwContextHint}"`,
    "Rules:",
    "- Color is gone: build the shot from tone, contrast, texture, shape and line; say so in `compositionTips`.",
    "- Recommend a B&W capture path: on iPhone prefer Camera Filters (Mono / Silvertone / Noir) or shoot ProRAW-48 and convert later; set iphone.format accordingly. Never set iphone.photographicStyle to a B&W value — it isn't in the gear's list.",
    "- Expose for the highlights. For low-key, set negative EV (−1 to −2) and give an AE/AF-lock-then-recompose hint in iphone.aeAfLockHint.",
    lowkey
      ? "- Low-key: `position` must put the subject against a dark or shadowed background with a single side or back light for rim separation; keep the frame sparse."
      : "- Classic: side light and strong shadow read best; overcast gives soft, quiet tones.",
  ].join("\n");
}

function buildPrompt({ subject, scene, gear, sky, weather, guardIssues, locale, useFlash }) {
  const langName = LOCALE_NAME[locale] || "English";
  const gearDesc = describeGear(gear, useFlash);
  const lines = [
    `You are a shot coach for a photographer using a ${gear.label}.`,
    `IMPORTANT: Write every human-readable field (label, position, focus, stabilization, compositionTips, warnings, flash.notes, iphone.cameraControlHint, iphone.aeAfLockHint) in ${langName}. Keep technical tokens unchanged (numeric f-numbers, shutter strings like "1/250s", lens ids from the gear profile, cameraMode values from the gear's modes list, iphone.format enum, iphone.photographicStyle name — these are Apple brand tokens the user needs to find in the iOS Camera app).`,
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
      `EXTERNAL FLASH ATTACHED: ${JSON.stringify(gearDesc.attachedFlash)}. Use it when it actually helps the shot (fill in harsh light, subject separation in low light, freezing motion indoors). If the subject doesn't benefit (bright sun, landscape, astro), set flash.use=false with a one-line reason.`,
    );
  } else if (gearDesc.builtInFlashes?.length) {
    lines.push(
      `BUILT-IN FLASHES AVAILABLE (no external): ${JSON.stringify(gearDesc.builtInFlashes)}. The rear Adaptive True Tone Flash is a 9-LED unit that shifts colour temperature and focal-length spread — recipe may set flash.use=true for indoor/low-light fill, but only when it truly helps (don't use for astro, landscape, bright sun). Retina Flash is screen-based and only makes sense with the TrueDepth (front) camera.`,
    );
  } else {
    lines.push("NO FLASH AVAILABLE. Every recipe must set flash.use=false with notes='No flash.'.");
  }

  if (gear.id === "iphone-16-pro") {
    lines.push(
      "",
      "IPHONE 16 PRO CAPABILITY BRIEF — use these in the 'iphone' sub-object:",
      `- Photographic Styles: ${JSON.stringify(gearDesc.photographicStyles)}. Recommend one only when it meaningfully changes the look (portrait, product, street); otherwise null.`,
      `- Camera Control button gestures: ${JSON.stringify(gearDesc.cameraControl?.gestures)}. Set iphone.cameraControlHint ONLY when the user would reach the setting faster via the hardware button (e.g. 'Light-press → Depth → slide to f/2.8', 'Light-press → Style → Vibrant'). Otherwise null.`,
      `- Formats: HEIF (default, efficient), JPEG (compat), ProRAW-12 (standard RAW edits), ProRAW-48 (max dynamic range + editing headroom, use for landscape/product/astro), ProRes (video only — never pick for a photo recipe).`,
      "- AE/AF lock: long-press the subject in the viewfinder; set iphone.aeAfLockHint when lock-then-recompose materially helps (backlit, tricky light, reframing).",
      "- Macro: subject 'macro' → lens 'ultrawide', iphone.macroOverride=true, cameraMode 'Macro', and position/focus must mention the 2 cm minimum focus distance. Any other subject keeps macroOverride=false.",
      "- TrueDepth (front / selfie) lens: pick it only when notes mention selfie / front / me / vlog. Set iphone.frontCamera=true and use Retina Flash (screen) for low-light selfies.",
      "- iphone.format is REQUIRED (pick one of HEIF/JPEG/ProRAW-12/ProRAW-48). HEIF is the safe default for casual subjects; ProRAW-48 for landscape/product/astro; HEIF or ProRAW-12 for portrait/street.",
      "- Every other gear: emit iphone: null.",
    );
  } else {
    lines.push("", "This gear is NOT an iPhone 16 Pro — set iphone: null on every recipe.");
  }

  const petsBrief = buildPetsBrief(subject);
  if (petsBrief) lines.push(petsBrief);
  const bwBrief = buildBwBrief(subject);
  if (bwBrief) lines.push(bwBrief);
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

  const { subjectId, scene = {}, gear: gearInput, gearId = "iphone-16-pro", locale = "en", useFlash = false, petContext: petContextId, animal: animalId, bwContext: bwContextId } = body || {};

  const basePreset = getSubjectPreset(subjectId);
  if (!basePreset) return NextResponse.json({ error: "Unknown subject." }, { status: 400 });

  let subject = basePreset;
  let petContext = null;
  let animal = null;
  if (subjectId === "pets") {
    petContext = resolvePetContext(petContextId || basePreset.defaultContext);
    animal = resolvePetAnimal(animalId || basePreset.defaultAnimal);
    subject = {
      ...basePreset,
      preferredLens: petContext.preferredLens,
      shutterFloorSec: petContext.shutterFloorSec,
      isoCeiling: petContext.isoCeiling,
      cameraMode: petContext.cameraMode,
      petContextId: petContext.id,
      petContextHint: petContext.hint,
      animal,
      animalHint: PET_ANIMAL_HINTS[animal],
    };
  }
  if (subjectId === "bw") {
    const bwContext = resolveBwContext(bwContextId || basePreset.defaultContext);
    subject = {
      ...basePreset,
      preferredLens: bwContext.preferredLens,
      shutterFloorSec: bwContext.shutterFloorSec,
      isoCeiling: bwContext.isoCeiling,
      cameraMode: bwContext.cameraMode,
      bwContextId: bwContext.id,
      bwContextHint: bwContext.hint,
    };
  }

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

  const petKeyPart = subjectId === "pets" ? `|pets:${subject.petContextId}:${subject.animal}` : "";
  const bwKeyPart = subjectId === "bw" ? `|bw:${subject.bwContextId}` : "";
  const key = cacheKey({ subjectId, gearId: gear.id, scene }) + `|${locale}|f${hasFlash ? 1 : 0}|${SCHEMA_VERSION}${petKeyPart}${bwKeyPart}`;
  const cached = await getCached(key);
  if (cached) return NextResponse.json({ ...cached, source: "cache" });

  try {
    const groq = createGroq({ apiKey });
    const { object } = await generateObject({
      model: groq(MODEL_ID),
      schema: RecipeResponseSchema,
      prompt: buildPrompt({ subject, scene, gear, sky, weather, guardIssues, locale, useFlash: hasFlash }),
    });
    const isIphone = gear.id === "iphone-16-pro";
    const clamped = {
      recipes: object.recipes.map((r) => {
        const c = clampRecipeToGear(r, gear);
        if (guardIssues.length) {
          const existing = new Set((c.warnings || []).map((w) => w.trim()));
          const extra = guardIssues
            .filter((i) => i.level === "warn")
            .map((i) => i.message)
            .filter((m) => !existing.has(m.trim()));
          c.warnings = [...(c.warnings || []), ...extra];
        }
        c.iphone = isIphone ? (c.iphone || null) : null;
        return c;
      }),
      sky,
      weather,
    };
    await setCached(key, clamped);
    return NextResponse.json({ ...clamped, source: "groq" });
  } catch (err) {
    console.error("coach/recipe error", err);
    return NextResponse.json(
      { ...stubRecipes(subject, gear, sky, hasFlash), sky, weather, source: "fallback", error: String(err?.message || err) },
      { status: 200 },
    );
  }
}
