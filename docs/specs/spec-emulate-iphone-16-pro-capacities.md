# Spec — Emulate iPhone 16 Pro photo capacities

> Status: Draft · Author: fbvarela · Created: 2026-04-20

## Context

The Shot Coach MVP ([spec-shot-coach-iphone-16-pro.md](spec-shot-coach-iphone-16-pro.md)) ships a generic `GearProfile` for the iPhone 16 Pro with four lenses, ISO/shutter ranges and a Camera-app mode list. That's enough to return credible recipes but the advice is still phone-shaped-generic — it doesn't exercise what's unique about this device: the Camera Control button, Photographic Styles, Next-gen Portraits, Macro at 2 cm, ProRAW 12/48 MP workflow, 9-LED adaptive flash, Retina front flash, and the tetraprism 5× lens. The addendum appended to that spec lists authoritative hardware numbers. This spec picks those up and makes the coach recommend **iPhone-16-Pro-native moves** — not just settings that happen to be valid.

Grounding the coach in the real device is also what we need before the `/gear` feature generalises to non-phone bodies: if the iPhone 16 Pro profile isn't faithful, nothing else will be.

Related: [spec-shot-coach-iphone-16-pro.md](spec-shot-coach-iphone-16-pro.md) · [src/data/gear/iphone-16-pro.js](../../src/data/gear/iphone-16-pro.js) · [src/app/api/coach/recipe/route.js](../../src/app/api/coach/recipe/route.js).

## Goals

- Update the `IPHONE_16_PRO` gear profile to match the Apple-published spec: per-lens resolution + aperture + focal-length-eq + OIS type + MP count, plus the TrueDepth front camera as a real lens entry.
- Surface **device-native controls** in the recipe output so the coach's advice reads as iPhone-16-Pro-specific:
  - Photographic Style (Standard / Vibrant / Natural / Luminous / Dramatic / Quiet / Amber / Gold / Rose Gold / …), when relevant to the subject.
  - Camera Control button gesture hints (light-press → Depth / Zoom / Cameras / Style / Tone) when that's the fastest way to the recommended setting.
  - AE/AF-lock instruction where manual locking matters (long backlit scenes, reframing after focus).
  - Format recommendation: HEIF / JPEG / ProRAW 12 MP / ProRAW 48 MP / ProRes — picked from subject + intent, not just "ProRAW always".
- Add Macro as a first-class affordance: the ultrawide's 2 cm minimum focus distance becomes an explicit recipe capability for the `macro` preset.
- Model the 9-LED Adaptive True Tone flash and the Retina Flash (front) — recipes for indoor portraits / low-light can recommend on-device flash when an external flash isn't attached.
- Keep the Zod recipe schema stable for non-iPhone gear; iPhone-specific extensions live under an optional `iphone` sub-object so Pentax recipes aren't polluted.

## Non-goals

- New UI chrome for the extra fields — render them inline in the existing recipe card (Format row, Photographic Style chip, Camera Control hint, Flash bar).
- Real-time camera preview or invoking the iOS Camera app. Recipes remain instructions the user applies manually.
- Third-party iPhone models (15 Pro, 17 Pro). This spec locks the fidelity pass to the 16 Pro; other phones can copy the pattern later.
- Video-specific advice (ProRes / Cinematic / Action Mode tuning). The coach stays photo-first; video can be a follow-up.

## Proposed design

### Updated GearProfile for iPhone 16 Pro

Rewrite `src/data/gear/iphone-16-pro.js` to match the addendum's spec, adding a few fields the coach uses:

```js
{
  id: "iphone-16-pro",
  label: "iPhone 16 Pro",
  kind: "phone",
  modes: ["Photo", "Portrait", "Night", "ProRAW", "Cinematic", "Action", "Pano", "Macro", "Selfie"],
  photographicStyles: ["Standard", "Vibrant", "Natural", "Luminous", "Dramatic", "Quiet", "Amber", "Gold", "Rose Gold", "Ethereal"],
  cameraControl: {
    gestures: ["Exposure", "Depth", "Zoom", "Cameras", "Style", "Tone"],
    note: "Light-press to open the Camera Control overlay; full-press to shoot.",
  },
  formats: {
    standard: ["HEIF", "JPEG"],
    pro: ["ProRAW-12", "ProRAW-48", "ProRes"],
  },
  lenses: [
    {
      id: "ultrawide", label: "Ultrawide 0.5×", megapixels: 48,
      focalEq: 13, fNumberFixed: 2.2, sensorSize: "1/2.55\"",
      focusPixels: "hybrid", fieldOfViewDeg: 120,
      ois: false,
      macro: { enabled: true, minFocusCm: 2 },
      proRaw: true,
    },
    {
      id: "main", label: "Fusion 1×", megapixels: 48,
      focalEq: 24, fNumberFixed: 1.78, sensorSize: "1/1.28\"",
      focusPixels: "100%",
      ois: "sensor-shift-g2",
      proRaw: true,
    },
    {
      id: "tele2x", label: "Main crop 2×", megapixels: 12,
      focalEq: 48, fNumberFixed: 1.78,
      note: "Crop of main sensor; lower light tolerance.",
      proRaw: true,
    },
    {
      id: "tele5x", label: "Tetraprism 5×", megapixels: 12,
      focalEq: 120, fNumberFixed: 2.8, sensorSize: "1/3.1\"",
      ois: "3d-sensor-shift-tetraprism",
      proRaw: true,
    },
    {
      id: "truedepth", label: "TrueDepth (front)", megapixels: 12,
      focalEq: 23, fNumberFixed: 1.9,
      focusPixels: true,
      retinaFlash: true,
      selfie: true,
    },
  ],
  flashes: [
    {
      id: "true-tone-9led", label: "Adaptive True Tone Flash (rear)",
      ledCount: 9, adaptiveColourTemp: true,
      adaptsToFocalLength: true,
      builtIn: true,
    },
    {
      id: "retina-flash", label: "Retina Flash (front screen)",
      screenBased: true,
      matchesAmbient: true,
      builtIn: true,
      frontOnly: true,
    },
  ],
  shutter: { minSec: 1 / 8000, maxSec: 30, nightModeMaxSec: 30 },
  iso: { min: 20, max: 12800 },
}
```

Values keep the shape the rest of the app already expects (`lenses[].id/label/fNumberFixed`, `modes`, `iso`, `shutter`), so existing consumers (gear-validator, recipe UI, `/gear` page, `/plan` shot list) keep working.

### Recipe schema extension

Extend `ShotRecipeSchema` with an optional iPhone block. Non-iPhone gear returns `null`:

```js
iphone: z.object({
  photographicStyle: z.enum([...]).nullable(),
  format: z.enum(["HEIF", "JPEG", "ProRAW-12", "ProRAW-48", "ProRes"]),
  cameraControlHint: z.string().nullable(),  // e.g. "Light-press → Depth → slide to 6"
  aeAfLockHint: z.string().nullable(),        // e.g. "Long-press the face to lock before recomposing"
  frontCamera: z.boolean(),                   // true when the recipe expects TrueDepth/selfie
  macroOverride: z.boolean(),                 // true when the recipe uses ultrawide macro at ≤10 cm
}).nullable()
```

The `lens` enum grows to include `truedepth`; `modes` grows to include `Selfie` and `Macro`. Because the app already relaxed both to `z.string()` (multi-gear support), nothing breaks at the schema level — we just let the prompt teach the model about the new values.

### Prompt changes

Update `buildPrompt()` in the recipe route to include an **iPhone 16 Pro capability brief** when `gear.id === "iphone-16-pro"`:

- List `photographicStyles`, `formats.pro`, `cameraControl.gestures`, ultrawide macro distance, adaptive 9-LED flash behaviour, Retina flash for selfies.
- Hard rules: use `truedepth` only when subject/scene calls for a selfie or front-facing shot; use `ProRAW-48` only when dynamic range and editing flexibility matter; use `HEIF` as the default for casual subjects; recommend a Photographic Style when it meaningfully changes the look (portrait, product, street); set `cameraControlHint` only when the user would reach the setting faster through the hardware button.
- Macro rule: subject `macro` → recipe must set `iphone.macroOverride=true`, lens `ultrawide`, and include the 2 cm focus distance in `position` or `focus`.

Non-iPhone gear: emit `iphone: null`; the coach's other guidance (lens/aperture/shutter/ISO/position/focus/stabilization) is unchanged.

### Flash handling

Current flash logic assumes an **attached external flash** (Metz, etc.) gated by the user's `useFlash` toggle. Extend it:

- If active gear is the iPhone 16 Pro and the subject is low-light / indoor / night, the LLM may set `flash.use=true` even without an external flash — `flash.notes` would then reference the built-in Adaptive True Tone Flash ("built-in 9-LED flash at -1 EV, warm side").
- If the subject is a selfie and ambient is low, recipes can invoke the Retina Flash.
- The toggle copy on the coach page stays the same (it only appears when gear has *external* flashes, which the iPhone profile does not).

### UI changes

- **Recipe card**: add a compact "iPhone" row below stats when `recipe.iphone` is present:
  - Format badge (HEIF / ProRAW-48 / …).
  - Photographic Style chip (with a small coloured swatch).
  - Camera Control hint line, when set.
  - AE/AF-lock hint line, when set.
- **Stat grid** gets one extra column on iPhone recipes: **Format**.
- No changes to `/plan`, `/gear`, or `/critique` beyond picking up the richer gear profile.

### Failure modes

- LLM proposes a `lens` not in the updated profile (e.g. `"front"`) → validator clamps to nearest, logs warning.
- LLM emits `iphone.*` fields for a non-iPhone gear → server strips the block before returning (defence in depth).
- LLM emits `Photographic Style` outside the known list → validator drops the field and warns.
- Macro subject with a non-iPhone body → `iphone.macroOverride` stays null; the generic macro guidance in `SubjectPreset` still applies.

## Alternatives considered

- **Flatten the iPhone fields onto the main `ShotRecipe`**. Rejected: it pollutes the schema for DSLRs and forces nullable-everything. A scoped `iphone` sub-object is cleaner and leaves room for `pentax`, `sony`, etc. if they need vendor-specific niceties later.
- **Hard-code Photographic Styles as canned post-processing.** Rejected: the coach's job is to tell the photographer what to do *in-camera*, not to simulate iOS Photo styles. We name the style and trust the user to set it in the iPhone Camera app.
- **Drop TrueDepth as a separate lens; treat Selfie as a camera mode only.** Rejected: recipes need to reference the selfie camera's 23 mm-eq f/1.9 constraints (different from the rear main), and future `/critique` will want to disambiguate EXIF. Modelling it as a lens is the honest choice.

## Risks & open questions

- Keeping the hardware list exhaustive — e.g. Spatial Photos, ProRes audio — balloons the schema fast. Scoping to photo-capture-relevant fields only for v1, and marking Spatial as a future follow-up. Yes
- LLM may over-reach with Photographic Styles (suggesting one for every shot). Mitigation: prompt says "recommend a Style only when it meaningfully changes the look"; we can add a `styleConfidence` field later if that's noisy. ok
- Cache namespacing: the current recipe cache key already includes locale and `useFlash`. We likely need to bump or version the cache key once the schema changes to avoid serving v0 recipes missing the `iphone` block — simplest fix is to append a `schemaVersion` constant to the key. ok

## Rollout plan

Phase 1 — land the updated `IPHONE_16_PRO` profile plus the extended schema + prompt behind no flag; the `iphone` field is optional so old clients ignore it. Phase 2 — update the recipe card to render Format / Photographic Style / Camera Control / AE-AF hints on iPhone recipes. Phase 3 — revisit Macro and Front-camera (TrueDepth) flows with real shoots; tune the prompt based on recipes that fire the wrong format or style.

## Success metrics

- ≥80% of iPhone 16 Pro recipes include a `format` value that matches the subject intent (spot-check on 25 seeded scenes: portrait → HEIF/ProRAW, product → ProRAW-48, street → HEIF, astro → ProRAW-48 or Night).
- Macro subject recipes use the ultrawide lens with `iphone.macroOverride=true` in ≥95% of runs.
- Selfie-framed prompts (notes containing "selfie", "front", "me") pick the `truedepth` lens ≥90% of the time.
- No increase in validator-clamp warnings after the change (i.e. the richer prompt doesn't make the model produce more out-of-range settings).
- Qualitative: a side-by-side of 10 recipes pre/post shows the post version mentions at least one iPhone-16-Pro-native affordance (Style, Camera Control, ProRAW-48, Macro, Retina Flash) per recipe when it's genuinely useful.
