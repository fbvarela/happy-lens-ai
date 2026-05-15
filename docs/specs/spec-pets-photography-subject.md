# Spec — Pets photography subject

> Status: Draft · Author: fbvarela · Created: 2026-04-20

## Context

The coach's current subject list ([src/data/subjects/presets.js](../../src/data/subjects/presets.js)) has Portrait, Landscape, Astro, Macro, Wildlife, Street, Product, Low-light indoor and Action. None of these fit the single most common "I want a photo of…" in a household: **pets**. Today a user photographing their cat on the sofa has to pick `portrait` (wrong compression on a phone-length tele for a small face at close range), `action` (too generic for a lazy cat), or `lowlight` (only sometimes). The advice misses pet-specific craft: eye-level framing, patience + burst for fleeting expressions, avoiding direct flash in the eyes, whisker lighting, fast shutters even for "sleeping" poses that can shift in a second.

Pets are also **scene-polymorphic** — the same cat needs different settings on the sofa, in the sunny garden, mid-zoomie, or curled up at night. A single flat `pet` preset would miss those differences; four flat presets (`pet-portrait`, `pet-outdoor`, `pet-indoor`, `pet-action`) would bloat the 9-chip subject row. We need a small 2-dimensional picker: subject = Pets, then a context chip row (where / what they're doing), and ideally an animal toggle so the coach can tune (eye level for cats = low; dogs = varies).

Related: [spec-shot-coach-iphone-16-pro.md](spec-shot-coach-iphone-16-pro.md) (subject presets seed defaults) · [spec-emulate-iphone-16-pro-capacities.md](spec-emulate-iphone-16-pro-capacities.md) (iphone-native hints) · existing coach wire-up in [src/app/coach/page.jsx](../../src/app/coach/page.jsx).

## Goals

- Add a single `pets` entry to `SUBJECT_PRESETS` that behaves like the other subjects (seeds shutter floor, ISO ceiling, preferred lens, camera mode, intent).
- When Pets is selected, surface a secondary **context** chip row — *Portrait · Garden · Indoor · Action · Sleeping / still* — plus an **animal** toggle (Cat / Dog / Other) so the coach can tune advice.
- Feed subject + context + animal into the LLM prompt so recipes are concretely pet-aware (eye-level framing, burst, no direct flash in eyes, fast shutter for any waking pet, low-ISO ProRAW for studio-like sleeping portraits, etc.).
- Works for both the iPhone 16 Pro (default) and the Pentax K-5 gear profile without code changes — the same context/animal signals flow through the existing gear-aware prompt.
- Cover EN + ES for every new label, chip and ethics line.
- Integrate with the existing scene-guard so obvious incompatibilities surface gracefully (e.g. *Garden* context with the sun below horizon → warn: bring flash or switch to Indoor).

## Non-goals

- **Pet recognition from the photo.** The `/critique` route already looks at the image; teaching it "this is a cat vs dog" is a `/critique`-side spec.
- **Breed-specific advice.** We can't meaningfully help "how to photograph a black Labrador vs a golden" inside an MVP.
- **Animal welfare interventions** beyond simple coach-side hints ("no direct flash in eyes", "keep treats out of frame").
- **Pet safety scoring / ethics flags** — we add one-line ethics notes where useful but do not build a reporting surface.
- Adding more animals than Cat / Dog / Other in v1 (no rabbits/birds/reptiles picker until we see demand).
- A separate top-level `/pets` route — this is a subject inside the existing `/coach` flow.

## Proposed design

### Data model

Extend [src/data/subjects/presets.js](../../src/data/subjects/presets.js):

```js
{
  id: "pets",
  label: "Pets",
  icon: "🐾",
  preferredLens: ["main", "tele2x"],
  shutterFloorSec: 1 / 250,      // waking pets move fast
  isoCeiling: 3200,
  cameraMode: "Photo",
  intent: "Eye-level framing, fast shutter, patience; never direct flash in the eyes.",
  contexts: ["portrait", "garden", "indoor", "action", "sleeping"],
  animals: ["cat", "dog", "other"],
  defaultContext: "portrait",
  defaultAnimal: "cat",
}
```

Plus a companion map in a new `src/data/subjects/pet-contexts.js`:

```js
export const PET_CONTEXTS = {
  portrait: {
    label: "Portrait",
    icon: "📷",
    preferredLens: ["tele2x", "tele5x"],
    shutterFloorSec: 1 / 250,
    isoCeiling: 1600,
    cameraMode: "Portrait",
    hint: "Drop to pet eye level. Tap-to-focus on the eye closer to the lens.",
  },
  garden: {
    label: "In the garden",
    icon: "🌿",
    preferredLens: ["main", "tele2x"],
    shutterFloorSec: 1 / 500,
    isoCeiling: 800,
    cameraMode: "Photo",
    hint: "Side-light is better than overhead sun; watch for whisker backlight.",
  },
  indoor: {
    label: "At home",
    icon: "🛋️",
    preferredLens: ["main"],
    shutterFloorSec: 1 / 200,
    isoCeiling: 3200,
    cameraMode: "Photo",
    hint: "Open the aperture, bounce any flash off the ceiling. Never direct-flash into the eyes.",
  },
  action: {
    label: "Playing / running",
    icon: "🏃",
    preferredLens: ["tele2x", "tele5x"],
    shutterFloorSec: 1 / 1000,
    isoCeiling: 6400,
    cameraMode: "Action",
    hint: "Use burst. Pre-focus where the pet will cross (a toy, a door).",
  },
  sleeping: {
    label: "Sleeping / still",
    icon: "😴",
    preferredLens: ["main", "tele2x"],
    shutterFloorSec: 1 / 125,
    isoCeiling: 1600,
    cameraMode: "ProRAW",
    hint: "Move slowly; one shutter click can wake a cat. Shoot quiet shutter.",
  },
};

export const PET_ANIMAL_HINTS = {
  cat: "Get below eye level — on the floor, camera tilted up. Leave space above the whiskers.",
  dog: "Match energy — crouch for a small dog, stand ready for a jumping one. Get the eyes sharp.",
  other: "Match the animal's eye line. Leave space in the direction it's looking.",
};
```

The subject preset's `contexts` / `animals` are strings referencing these maps — the coach resolves them at render time. No schema migration; existing presets are untouched.

### UI flow ([coach/page.jsx](../../src/app/coach/page.jsx))

1. Step 1 — Subject chip row gets a new Pets chip (🐾 Pets).
2. When `subjectId === "pets"`:
   - A **second chip row** appears directly below, seeded with `SUBJECT.pets.contexts`, labelled by the translated context name. Default selection = `"portrait"`.
   - A third, compact toggle row: Cat / Dog / Other (segmented buttons or chip trio). Default = last-used from localStorage (`hl.coach.pet.animal.v1`), fallback Cat.
3. Steps 2 (Scene) and 3 (Gear) are unchanged.
4. On submit, payload adds `petContext` and `animal`:

```js
{
  subjectId: "pets",
  petContext: "garden",
  animal: "dog",
  gear, useFlash, locale,
  scene: {...},
}
```

Non-Pets subjects omit the extra fields; the server treats them as ignored.

### API route change ([api/coach/advice/route.js](../../src/app/api/coach/advice/route.js))

- Accept `petContext` and `animal` on the request body.
- When `subjectId === "pets"`, resolve the `PET_CONTEXTS[petContext]` entry and merge it into the subject preset the prompt sees — the context's `shutterFloorSec`/`isoCeiling`/`preferredLens`/`cameraMode` override the pet-generic defaults.
- Prepend a short **pets brief** to the prompt:
  ```
  PETS SUBJECT — animal: dog, context: garden.
  Context hint: "Side-light is better than overhead sun; watch for whisker backlight."
  Animal hint: "Match energy — crouch for a small dog, stand ready for a jumping one. Get the eyes sharp."
  Rules:
  - Eye-level framing is default; state the pet's eye-line in `position`.
  - Never direct-flash into the eyes; bounce off ceiling or use natural light.
  - If context is `action` or animal is a puppy/kitten, set shutter ≥ 1/1000 s and suggest burst in `focus`.
  - If context is `sleeping`, note silent / quiet-shutter mode when available.
  ```
- Cache key includes `petContext` + `animal` so EN/ES toggling and context switches do not serve stale recipes.
- No schema change to `ShotRecipeSchema` — the existing fields cover the output (lens / fNumber / shutter / iso / cameraMode / focus / stabilization / position / compositionTips / warnings / flash / iphone). Pet-specific content lives inside those strings.

### Scene guard interplay ([src/lib/scene-guard.js](../../src/lib/scene-guard.js))

Add light rules:
- `pets` + `garden` + sun altitude < 5° → warn "Sun is too low for a well-lit garden pet shot; try an earlier window or switch to Indoor."
- `pets` + `indoor` + animal `dog` + midday strong sun → warn "Daylight through a window will blow out a dog's white chest. Use a north-facing window or close the blinds."
- `pets` + `action` + sun below horizon → warn "Not enough light for a 1/1000 s shutter freeze; drop to `portrait` context or switch to a static shot."

These are warns (non-blocking). No new block-level rules in v1.

### i18n

Add keys in [src/lib/i18n/dictionaries.js](../../src/lib/i18n/dictionaries.js):

```
subject.pets                     EN: Pets                    ES: Mascotas
coach.pets.context.label         EN: Where / what            ES: Dónde / qué hace
coach.pets.context.portrait      EN: Portrait                ES: Retrato
coach.pets.context.garden        EN: In the garden           ES: En el jardín
coach.pets.context.indoor        EN: At home                 ES: En casa
coach.pets.context.action        EN: Playing / running       ES: Jugando / corriendo
coach.pets.context.sleeping      EN: Sleeping / still        ES: Dormido / quieto
coach.pets.animal.label          EN: Animal                  ES: Animal
coach.pets.animal.cat            EN: Cat                     ES: Gato
coach.pets.animal.dog            EN: Dog                     ES: Perro
coach.pets.animal.other          EN: Other                   ES: Otro
```

The LLM still writes `position` / `focus` / `rationale` in the active locale — we feed hint strings translated too.

### Failure modes

- User picks Pets, submits without picking a context → server falls back to `SUBJECT.pets.defaultContext === "portrait"`.
- Context value unknown (e.g. stale client) → server falls back to `defaultContext`, warns in `warnings`.
- Animal value unknown → treat as `other`.
- LLM ignores the pets brief and produces a generic recipe → no hard validation, but cache key divergence means future requests with the same pet context/animal will not collide.

## Alternatives considered

- **Four flat pet subjects (`pet-portrait`, `pet-outdoor`, `pet-indoor`, `pet-action`).** Rejected. That would push the subject chip row to 13 items and mix "what I'm shooting" (pets) with "where I'm shooting it" (garden / indoor) — the latter is a context shared by multiple subjects (pets, family, newborn…). The 2-D picker scales better.
- **A freeform "subject description" textbox instead of discrete chips.** Rejected for v1 — the whole coach premise is that structured subject presets let us inject verified craft into the prompt, not rely on the LLM to guess. Free text is fine in the existing notes field.
- **Adding a new top-level `/pets` route.** Rejected — duplicates the coach UI; pets is a subject, not a separate app mode. Keep it inside `/coach`.
- **Auto-detecting pets from `notes`.** Rejected — too brittle ("my pug Henry" vs "henri from accounting"), and the user deserves an explicit choice that shapes the prompt predictably.

## Risks & open questions

- Scope creep into pet-welfare UI — the ethics notes are lightweight copy today, but reviewers may push for stronger nudges (no flash ever, safety distances). Keep v1 copy factual and limited to craft impact.
- Kittens / puppies get their own movement profile (way more chaotic than adults). v1 treats Cat/Dog as binary; we can add a subtype ("young / adult") later if the action context consistently under-shoots shutter speed.
- The cache-key explosion risk (subject × 5 contexts × 3 animals × locales × flash) is bounded — Groq latency and our LRU (200 entries, 30 min) handle it. Will revisit if the cache hit rate drops.
- Context chip row on a 402 px viewport needs to wrap cleanly — re-use the existing `.chip-row { flex-wrap: wrap }` pattern from subject chips; no new CSS required.
- Interaction with the icon spec ([spec-coach-camera-function-icons.md](spec-coach-camera-function-icons.md)) — context chips stay emoji-labelled in v1; a `PetsIcon` / `SleepingIcon` / `GardenIcon` set is a follow-up.

## Rollout plan

Phase 1 — ship the data + chip rows + prompt wiring behind no flag; the new subject is additive and old clients that don't know about Pets simply won't show it (no server-side breakage either way). Phase 2 — add the scene-guard pet rules once Phase 1 lands and we have at least a few days of recipes to calibrate the thresholds. Phase 3 — evaluate breaking `other` animal into rabbit/bird/reptile based on real usage.

## Success metrics

- ≥15 % of coach sessions in the first two weeks select `subjectId === "pets"` — signals real demand.
- Of pets sessions, ≥60 % pick a non-default context (i.e. the context picker earns its footprint).
- Recipe latency unchanged (the extra prompt lines and cache namespace do not push P95 past the existing 8 s budget).
- Qualitative: in a 5-pet-owner hallway test, ≥4/5 agree the returned recipe reads as "pet-aware" (mentions eye level, burst, no direct flash) rather than as a generic Portrait/Action recipe with a cat pasted in.
- No spike in scene-incompatible 422s — indicates the guard rules don't over-block the new subject.
