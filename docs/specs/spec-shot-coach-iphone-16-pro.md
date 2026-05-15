# Spec — Shot Coach MVP (iPhone 16 Pro)

> Status: Draft · Created: 2026-04-20

## Context

HappyLens is a photo-trip planner and shot coach (Next.js 16 App Router, React 19, PWA). The landing page already teases four modules — `/plan`, `/critique`, `/gear`, `/conditions` — but only `/plan` and `/critique` have placeholder pages; `/gear` and `/conditions` are marked "Soon" in [page.jsx:23](src/app/page.jsx:23).

To ship a credible v1 of the "shot coach" promise, we need a feature that actually tells the photographer **what settings to use, where to stand, and when to shoot**, given their equipment. Rather than supporting every camera on day one, the MVP targets a single, well-specified device: the iPhone 16 Pro. This bounds the hardware model (fixed lens set, known sensor sizes, known computational-photography modes) so recommendations can be concrete and verifiable.

Related: [README.md](README.md) module list; existing placeholder [plan/page.jsx](src/app/plan/page.jsx).

## Goals

- Given a **subject type** (portrait, landscape, astro, macro, wildlife, street, product, low-light indoor, action) and a **scene context** (location, date/time, weather/light), produce a concrete **shot recipe**: lens choice (1×/2×/5×/ultrawide), f-number, shutter speed, ISO, exposure compensation, focus mode, stabilization notes, and iOS Camera app mode (Photo / Night / ProRAW / Cinematic / Action).
- Give **positional / compositional guidance**: where to stand relative to subject and light (sun azimuth/elevation, horizon, background), framing tips, and any safety/ethics notes for the subject type.
- Package it as a new `/coach` route (or extend `/plan`) that works offline-first as a PWA so it's useful in the field.
- Ground the recommendation in the iPhone 16 Pro's actual optical spec (focal lengths, max apertures, sensor pixel pitch, min shutter, OIS limits) rather than generic advice.

## Non-goals

- Supporting DSLRs, mirrorless bodies, or other phones in v1. The `/gear` module will generalize this later.
- Automated EXIF critique of captured photos — that's the separate `/critique` module.
- Real-time AR overlay / viewfinder integration. Web can't drive the iOS Camera app; we give instructions the user applies manually.
- Booking, permits, travel logistics, or social sharing.
- Training a custom vision model. Use Vercel AI SDK with a hosted LLM + structured-output schema.

## Proposed design

### User flow

1. User lands on `/coach` (new route) or clicks a CTA from `/plan`.
2. Step 1 — **Subject**: pick a preset (portrait, landscape, astro, wildlife, street, product, low-light, action). Each preset seeds defaults.
3. Step 2 — **Scene**: location (geolocation or manual), date/time, optional notes ("backlit", "indoors", "moving subject").
4. Step 3 — **Equipment**: defaults to  iPhone 16 Pro. Read-only in v1, but the UI shows it as a selectable gear profile so the later `/gear` feature slots in cleanly.
5. Output — **Shot Recipe card(s)**: one primary recipe plus 1–2 alternates ("if the light drops", "for a tighter crop"), each with the fields listed in Goals.

### Data model (client-side only for v1)

- `GearProfile` — static JSON for iPhone 16 Pro in `src/data/gear/iphone-16-pro.js`:
  - Lenses: ultrawide (0.5×, ~13mm-eq, f/2.2), main (1×, 24mm-eq, f/1.78), tele 2× crop, tele 5× (120mm-eq, f/2.8).
  - Sensor sizes / pixel pitch per lens, min/max shutter, OIS, ProRAW support, Night/Action/Cinematic mode availability.
- `SubjectPreset` — static JSON in `src/data/subjects/*.js`: default aperture intent, shutter-speed floor, ISO ceiling, preferred focal range, composition hints.
- `ShotRecipe` — LLM-produced, validated against a Zod schema before rendering. Fields: `lens`, `fNumber`, `shutter`, `iso`, `ev`, `cameraMode`, `focus`, `stabilization`, `position`, `compositionTips`, `warnings`.

### APIs / routes

- `src/app/coach/page.jsx` — the 3-step form + results.
- `src/app/api/coach/advice/route.js` — POST `{ subject, scene, gearId }` → `ShotAdvice[]`.
  - Server builds a prompt that injects the `GearProfile` capabilities and `SubjectPreset` defaults so the model can only recommend settings the phone can actually achieve.
  - Uses Vercel AI SDK `generateObject` with the `ShotRecipe` Zod schema for type-safe output.
  - Pulls sun/weather from the same providers the existing `/plan` page will use (stub for v1 if not wired yet).

### Failure modes

- No geolocation permission → fall back to manual location entry.
- LLM returns a recipe that violates the gear profile (e.g., f/1.4 on a f/1.78 lens) → schema validator clamps to the nearest legal value and flags it in `warnings`.
- Offline → PWA serves the last successful recipe for the same subject+location hash; form still renders; submit queues until online.
- Sunset/astro recommendations when sun position is wrong for the requested time → server computes sun/moon locally (e.g., `suncalc`) and rejects incompatible subjects with a helpful message.

## Alternatives considered

- **Generic "any camera" coach from day one.** Rejected: the quality of advice collapses without knowing max aperture, sensor size, and mode set. Recommending f/1.4 to a phone user is useless. Narrowing to one device lets the MVP be specific and correct.
- **Pure rules engine, no LLM.** Rejected for v1: the positional/compositional guidance is the hardest part to hand-author across 8 subject types × arbitrary scenes. LLM + structured output gives us coverage fast; we can distill back to rules once we see real traffic.
- **Fold this into `/plan` instead of a new route.** Viable, and we should share components. Keeping `/coach` as its own route for v1 keeps the scope crisp and avoids reworking `/plan`'s existing skeleton until it's decided what `/plan` becomes.

## Risks & open questions

- iPhone 16 Pro optical spec — some numbers above are placeholders pending confirmation from Apple's published spec sheet. The `GearProfile` JSON must be sourced from an authoritative reference before launch.
- LLM cost/latency per recipe — needs a caching strategy (hash of `{subject, rounded location, hour bucket, gearId}`). Free cohere or groq
- Legal/ethics copy for wildlife and street subjects — should we ship warnings by default? Probably yes.
- Do we need any server-side persistence in v1, or is client-local enough? Current assumption: images on cloudflare  

## Rollout plan

Phase 1 — land `/coach` behind no flag but unlinked from the homepage; manual QA with 5–10 real shoots on an iPhone 16 Pro. Phase 2 — replace the "Soon" `/gear` card on the homepage with a `/coach` card once recipes feel trustworthy. Phase 3 — generalize `GearProfile` to support a second device (likely a Sony or Fuji body) and introduce the real `/gear` picker.

## Success metrics

- ≥70% of test shoots report the recipe was "useful as-is" or "useful with minor tweaks" (in-app thumbs + optional note).
- <5% of recipes flagged by the schema validator as gear-incompatible (indicates prompt quality).
- P50 recipe latency under 3s, P95 under 8s.
- Return usage: ≥30% of users who generate a recipe generate a second one within 14 days.

###  Camera Hardware & Lens Specifications
The iPhone 16 Pro features a quad-camera system (three rear, one front) built around a new 48MP sensor architecture .

- Lens Type	Resolution & Aperture	Focal Length	Key Features
- Fusion (Main)	48MP, ƒ/1.78	24 mm	2nd-gen Sensor-shift OIS, 100% Focus Pixels
- Ultra Wide	48MP, ƒ/2.2	13 mm	120° field of view, Hybrid Focus Pixels
- Telephoto	12MP, ƒ/2.8	120 mm	Tetraprism design, 3D Sensor-shift OIS, 5x optical zoom
- TrueDepth (Front)	12MP, ƒ/1.9	23 mm	Focus Pixels auto-focus, Retina Flash
- Manual Controls & Camera Control
- The new Camera Control (hardware button) provides DSLR-like tactile interaction for manual adjustments. You can lightly press to trigger a secondary menu to adjust the following parameters without touching the screen :
- Exposure: Manually brighten or darken the scene (+/- EV).
- Depth: Adjust the level of background blur (bokeh) before taking the shot.
- Zoom: Seamless control over all optical lenses (0.5x, 1x, 2x, 5x).
- Cameras: Quickly switch between the physical lenses.
- Style/Tone: Adjust the mood and color palette of the Photographic Styles.
- Additionally, standard manual controls via the touchscreen allow you to lock focus and exposure (AE/AF Lock) by long-pressing the viewfinder .

### Formats & Resolution
- You have high flexibility regarding file formats and resolutions for maximum editing flexibility .
- Standard Formats: HEIF (efficient, default), JPEG (selectable in Settings).
- Pro Formats:
  - Apple ProRAW: Available in 12 MP or 48 MP (DNG format).
  - ProRes: For video (up to 4K at 120 fps when recording to external storage).

New 48MP Workflow: You can shoot 48MP photos in HEIF (saving space) or ProRAW (maximum editing data) .

### Flash & Lighting
- Rear Flash: Adaptive True Tone Flash. It utilizes 9 LEDs that adjust their intensity and color temperature based on the focal length. It provides uniform lighting for wide shots and precise, focused light for telephoto shots .
- Front Flash: Retina Flash. Uses the screen to match the ambient light color temperature for natural-looking selfies .

### Notable Computational & Creative Features
- Photographic Styles (Latest Gen): Apply real-time color and tone adjustments to specific color palettes (like "Gold" or "Amber") while preserving skin tones. Unlike filters, these are baked into the raw data of the photo .
- Next-gen Portraits: Capture Portrait mode data automatically (even without switching to Portrait mode). You can adjust the focus point and background blur after taking the photo .
- Macro Photography: Enabled by the Ultra Wide camera, allowing focus as close as 2 cm.
- Spatial Photos: Capture 3