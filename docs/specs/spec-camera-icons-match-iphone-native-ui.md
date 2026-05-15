# Spec — Coach advice must mirror the iPhone's native camera UI

> Status: Draft · Author: fbvarela · Created: 2026-04-21

## Context

Two related gaps between the coach's output and what an iPhone-16-Pro user can actually do with the stock iOS Camera app:

1. **Icons.** The previous icon work ([spec-coach-camera-function-icons.md](spec-coach-camera-function-icons.md), shipped in [#8](https://github.com/)) added a hand-authored camera-function icon set (aperture iris, shutter clock, ISO pill, EV wedge, etc.) standing for generic camera concepts. When the user first said "icons," they were pointing at a different reference: [`docs/specs/icons.jpg`](./icons.jpg), a screenshot of the **iPhone 16 Pro's own native camera UI**. The value of icons in coach prose isn't "make pretty camera-concept glyphs"; it is **"show the user the exact glyphs they will see on their iPhone screen so they can map the coach's instruction onto a finger-tap."**

2. **Parameters.** The coach currently emits `shutter: "1/250s"` and `iso: 200` for iPhone advice. Stock iOS 18 Camera on the iPhone 16 Pro **doesn't expose ISO or shutter as user controls at all** — those are outcomes, not inputs. A user can only reach exposure via EV compensation, Night-mode duration, AE/AF-lock-then-drag, and (in Portrait) the Camera Control depth slider. Everything else is the camera's call. Telling an iPhone-only user to "set ISO 200 · 1/250s" is dictating knobs they literally cannot turn.

Both gaps are the same design flaw: **the coach is prescribing a generic camera mental model instead of the iPhone's actual UI.** This spec fixes both — icon style *and* advice content — so every instruction names a control the user can see and a gesture they can perform.

The reference screenshot ([`docs/specs/icons.jpg`](./icons.jpg)) surfaces the concrete iOS camera controls the coach refers to in prose today:

- Top bar: `HEIF₂₄` format pill, night-mode crescent, flash-with-slash (off), 6-dot "more controls" grid.
- Frame: on-screen system hint text ("Aléjate." — move back) when macro auto-engages.
- Right gutter: `ƒ 2,8` in active yellow against a tick-scale (aperture slider in Portrait / Camera-Control adjust).
- Bottom-left: macro-flower-with-slash (macro disabled).
- Bottom centre: lens picker `0,5 · x1 · 2 · 5` with the active lens filled.

Those are the glyphs a coach instruction like *"Light-press Camera Control → Depth → ƒ2,8"* or *"tap the macro flower to disable auto-macro"* actually lands on.

Related:
- [spec-coach-camera-function-icons.md](spec-coach-camera-function-icons.md) — v1 icon set this spec revises.
- [spec-emulate-iphone-16-pro-capacities.md](spec-emulate-iphone-16-pro-capacities.md) — advice fields that reference these controls (Camera Control button, Photographic Style, AE/AF lock, Macro).
- [src/components/icons/index.jsx](../../src/components/icons/index.jsx) — current icon components.
- [src/app/api/coach/advice/route.js](../../src/app/api/coach/advice/route.js) — advice API (renamed from `/recipe`).
- [src/lib/advice-schema.js](../../src/lib/advice-schema.js) — advice Zod schema.
- [docs/specs/icons.jpg](./icons.jpg) — authoritative visual reference.

## Goals

- Treat [`docs/specs/icons.jpg`](./icons.jpg) as the **visual source of truth** for any icon that represents an on-screen iOS Camera control. Each such icon reads as "the same thing the user sees in iOS," not as our own reinterpretation.
- Revise the v1 icon set so the iOS-control icons (`FlashOffIcon`, `NightIcon`, `MacroIcon`, `LensRingIcon`, a new `FormatPillIcon`, a new `MoreControlsIcon`, a new `ApertureSliderIcon`) adopt the iOS glyph shape and layout visible in the reference.
- Keep the **physical-hardware** icons (`CameraControlIcon`, `ModeDialIcon` — representing the hardware capacitive button / a DSLR dial) as they are. Those are body icons, not screen icons, and have their own reference.
- Reframe the iPhone **advice content** so every instruction names a lever the user actually has. ISO and shutter stop being prescriptive inputs for iPhone advice; they become **read-only targets** the user can verify afterwards against EXIF.
- When the coach text instructs a user to tap an on-screen control, prefix the instruction with the icon that matches what they'll see — so the phrase and glyph land together.
- Add a short on-disk legend (in the icons folder README) mapping each iOS-control icon to its source glyph in `icons.jpg`, so future edits don't drift.

## Non-goals

- Redrawing the hardware-body icons (`CameraControlIcon`, etc.) — unaffected.
- Replicating Apple's SF Symbols pixel-for-pixel or shipping Apple-licensed assets. We draw **interpretations close enough to be instantly recognisable**, not copies.
- Animated reveals of the iOS slider scale. Static icon; text beside it carries the value.
- Dropping ISO/shutter from the **data model**. The schema keeps those fields so Pentax K-5 advice (where they are real inputs) still works. We only change how the iPhone path *presents* them.
- Extending the "match the native UI" treatment to non-iPhone gear. Other bodies keep generic camera-function icons and prescriptive exposure numbers; this rule is iPhone-specific because the iPhone's UI is uniquely constrained.
- Replacing the subject chips (🏔️, 🐕, etc.) — still out of scope, same as the prior spec.

## Proposed design

### Part A — Icon inventory diff vs. v1

| v1 icon | Keep? | Change |
|---|---|---|
| `ApertureIcon` (iris) | Keep | No change — used for the advice stat grid where "aperture as concept" reads better than the iOS slider.|
| `ShutterIcon` | Keep | No change. |
| `IsoIcon` | Keep | No change. |
| `EvIcon` | Keep | No change. |
| `ModeDialIcon` | Keep | No change — represents physical DSLR dial. |
| `FocusIcon` | Keep | No change. |
| `StabIcon` | Keep | No change. |
| `FlashOnIcon` | Keep | No change. |
| `FlashOffIcon` | **Revise** | Redraw to match the iOS top-bar lightning-with-diagonal-slash inside a pill-shaped chip (see `icons.jpg` top-right cluster). |
| `StyleSwatchIcon` | Keep | No change. |
| `CameraControlIcon` | Keep | Hardware-body icon, unaffected. |
| `LockIcon` (AE/AF) | Keep | No change. |
| `MacroIcon` | **Revise** | Two variants: `MacroIcon` (auto/on — flower) and **new** `MacroOffIcon` (flower + diagonal slash, yellow tint), matching the bottom-left control in `icons.jpg`. |
| `NightIcon` | **Revise** | Redraw as the iOS crescent-with-star-dots inside a pill (top-bar cluster). |
| `LensRingIcon` | **Revise** | Match the `0,5 · x1 · 2 · 5` pill row: a rounded-rect row with the active value filled in yellow (same hue used for active controls in iOS Camera). Accepts `lens: "0.5×" | "1×" | "2×" | "5×"`. |
| `SunCompassIcon` | Keep | No change. |
| **new** `FormatPillIcon` | Add | Pill with uppercase text inside and a small subscript (`HEIF₂₄`, `RAW`, `ProRAW₄₈`, `ProRes`). One component, text driven by `format` + `variant` props. |
| **new** `MoreControlsIcon` | Add | 2×3 dot grid inside a pill — matches the right-most control in the iOS top bar. |
| **new** `ApertureSliderIcon` | Add | `ƒ 2,8` style label + mini tick scale, used when the coach says *"Light-press Camera Control → Depth, dial to ƒ2,8."* Accepts `fNumber` prop. Active colour is iOS yellow; rest of the glyph uses `currentColor`. |

### Part B — Exposure levers: what the iPhone advice can prescribe

Stock iOS Camera (iPhone 16 Pro, iOS 18) user-facing exposure inputs:

| User control | In stock Camera? | Coach may prescribe? |
|---|---|---|
| EV compensation | Yes (adjust-and-lock drag, or Camera Control → Exposure) | **Yes — primary lever.** |
| Photographic Style | Yes | Yes. |
| Flash on / off / auto | Yes | Yes. |
| Night-mode duration | Yes (auto + manual slider when icon active) | Yes — give a duration when the scene triggers it. |
| AE/AF lock | Yes (long-press) | Yes. |
| Drag-to-adjust exposure after AE/AF lock | Yes | Yes — pair with the lock instruction. |
| Aperture (Depth slider) | Portrait only, via Camera Control → Depth | Yes, **only when `cameraMode === "Portrait"`**. |
| Macro on/off | Yes (bottom-left flower icon when close-up detected) | Yes. |
| Format (HEIF / ProRAW-12 / ProRAW-48 / ProRes) | Yes | Yes. |
| Lens pick (0.5× / 1× / 2× / 5×) | Yes | Yes. |
| **ISO** | **No** — not in stock Camera at all. | **No — read-only target only.** |
| **Shutter speed** | **No** — only Night-mode duration sets shutter indirectly. | **No — read-only target only.** |

Gear profile flag added in [src/data/gear/iphone-16-pro.js](../../src/data/gear/iphone-16-pro.js):

```js
manualExposureControl: false,  // stock iOS Camera doesn't expose ISO / shutter as inputs
```

Pentax K-5 and any future body with true manual control keep `manualExposureControl: true` (default) and are unaffected.

The advice API prompt ([src/app/api/coach/advice/route.js](../../src/app/api/coach/advice/route.js)) branches on this flag:

- **`manualExposureControl: true`** (Pentax etc.): ISO and shutter are prescriptive. No change.
- **`manualExposureControl: false`** (iPhone): ISO and shutter become **target readouts**. The actionable instruction goes into a new field on the iPhone hints sub-object:

```js
// IphoneHintsSchema extension
exposureHint: z.string().nullable()
  .describe("Stock-Camera exposure instruction in user's language. E.g. 'Dial EV +0.3 in the top bar, then tap-and-hold the subject's face to AE-lock.' Null when auto is enough."),
```

The advice card UI ([src/app/coach/page.jsx](../../src/app/coach/page.jsx) `AdviceCard`) renders for iPhone advice:

- **Targets row** (muted, smaller): `Target · ƒ1.78 · ~1/250s · ISO ~200 · EV 0` — labelled "Target" so the user knows it's a readout, not a setting to dial.
- **Action row** (prominent): the `exposureHint` string, prefixed with the `EvIcon` or `LockIcon` matching the lever.
- For Pentax advice, the stat grid stays exactly as it is today (prescriptive ISO/shutter/aperture). No visual regression.

The AI prompt gets an iPhone-specific instruction: *"The user cannot set ISO or shutter on stock iOS Camera. Fill iso/shutter with your best prediction of what the camera will pick given your recommended EV + lighting — these are targets the user verifies in EXIF, not inputs. Put the real action in `iphone.exposureHint`: which lever to pull (EV, AE/AF-lock-then-drag, Night-mode duration, or Portrait Depth slider), with a concrete value."*

### Part C — Visual tokens to match iOS

Add to [src/app/globals.css](../../src/app/globals.css) (scoped to icon use so they don't leak):

```css
:root {
  --ios-camera-yellow: #ffd60a; /* active-control yellow from icons.jpg */
  --ios-camera-chip: rgba(0,0,0,0.55); /* pill background */
}
```

Only the **iOS-control** icons reference these tokens. Advice-stat-grid icons keep inheriting `--bark` via `currentColor` exactly as today.

### Part D — Where they go in the UI

- **iPhone advice stat grid**: drop the prescriptive look for ISO and shutter; render them under a "Target" grouping with the muted `recipe-stat-label` style renamed to `.advice-stat-label` (see the Rename section below).
- **Advice iPhone-strip / on-screen-control instructions**: when a line says *"tap the macro flower to disable auto-macro,"* render `<MacroOffIcon size={18} />` inline with the sentence.
- **Format line**: `📄 HEIF` → `<FormatPillIcon format="HEIF" subscript="24" />`, sized to match the existing badge pill.
- **Flash-off line**: use the revised `FlashOffIcon` (pill-style) in muted bark; don't use the leaf-green flash-on glyph.
- **Night mode line**: `<NightIcon />` in the pill style when the coach advises night mode.
- **Lens picker line**: when the coach says "0.5× UW," render `<LensRingIcon lens="0.5×" />` matching the iOS row — so the user reads the phrase and sees the exact control they'll tap next.
- **Aperture hint**: where the coach suggests a specific ƒ-stop reachable via Camera Control depth, prefix with `<ApertureSliderIcon fNumber="2.8" />` rather than the generic iris (generic iris stays in the stat grid and in Pentax/DSLR advice).
- **Exposure hint** (new): when `iphone.exposureHint` is set, render an Action row with `<EvIcon />` or `<LockIcon />` depending on the lever the hint references, followed by the hint text.

### Part E — File layout

Grow [src/components/icons/index.jsx](../../src/components/icons/index.jsx) with the new components, or split into one-file-per-icon if the file grows past ~500 LOC. Either is fine — no mandate from this spec. Keep the shared `IconBase` + conventions (`24×24` viewBox, `currentColor`, `stroke-width="1.5"`) already in place.

Add a short `README.md` in the folder that embeds `icons.jpg` and maps each iOS-control icon to its crop, so the next editor can't drift without noticing.

### Part F — Product-wide rename: recipe → advice / consejo

The product concept formerly called "recipe" / "receta" becomes "advice" / "consejo" everywhere: user-facing copy, API routes, Zod schemas, React components, CSS classes, i18n keys, and linked spec paths. Rationale: the coach *advises* the user what to try — "recipe" was borrowed from the cooking metaphor and implied precise ingredients; "advice" reflects that on iPhone in particular the coach is guiding a lever-pull, not dictating a setting. This spec's Part B is the trigger for the rename: once ISO/shutter become read-only targets for iPhone, "recipe" over-promises.

Concretely:

- File renames: `src/app/api/coach/recipe/` → `src/app/api/coach/advice/`, `src/lib/recipe-schema.js` → `src/lib/advice-schema.js`, `src/lib/recipe-cache.js` → `src/lib/advice-cache.js`, `src/app/_components/LastRecipeCard.jsx` → `src/app/_components/LastAdviceCard.jsx`.
- Symbol renames: `RecipeResponseSchema` → `AdviceResponseSchema`, `ShotRecipeSchema` → `ShotAdviceSchema`, `RecipeCard` → `AdviceCard`, `LastRecipeCard` → `LastAdviceCard`, `stubRecipes` → `stubAdvice`, `clampRecipeToGear` → `clampAdviceToGear`, `recipeTweaks` → `adviceTweaks`, `recipes` (response array) → `advice`.
- CSS class renames: `.recipe-*` → `.advice-*`, `.last-recipe` → `.last-advice`.
- i18n key rename: `coach.recipe.*` → `coach.advice.*`.
- i18n value translations: English "recipe" / "recipes" → "advice" (uncountable) or "piece of advice" where a count is needed; Spanish "receta" / "recetas" → "consejo" / "consejos".
- localStorage: key prefix `hl.coach.*` unchanged (preserves user history), but the stored JSON field name flips from `recipes` to `advice`. Entries saved before the rename will be ignored on read (MVP — no prod users to migrate).

### Part G — Accessibility

- `aria-label` / `title` for iOS-control icons use **verbs**, not nouns, because they represent actions: `t("coach.icons.turnFlashOff")` → "Turn flash off", not just "Flash off". Mirrors how the coach instructs.
- `ApertureSliderIcon` reads the value: `aria-label={`Aperture slider set to ƒ/${fNumber}`}`.
- `LensRingIcon` reads the active lens: `aria-label={`${lens} lens selected`}`.
- The iPhone "Target" row on the advice card gets an `aria-label="Target exposure (read-only). Adjust via the instruction below."` so screen-reader users don't assume the numbers are actionable.
- `role="img"` stays on icons; decorative inner strokes keep `aria-hidden`.

### Part H — Failure modes

- Coach advice references an iOS control we haven't drawn yet → render a generic fallback icon + text. Track missing glyphs in the icons README.
- Yellow token clashes with future dark/high-contrast theme → `forced-colors: active` swaps the yellow for `Highlight` via `color-scheme` rules; add that to the CSS block above.
- User locale changes comma/decimal separator ("2.8" vs "2,8") → `ApertureSliderIcon` respects `Intl.NumberFormat` for the inline value.
- AI returns a prescriptive ISO/shutter for iPhone despite the prompt instruction → UI still renders them under "Target" (read-only styling), so the user isn't told to set something they can't.
- `exposureHint` missing on an iPhone advice → UI falls back to a default "Let the camera meter — tap to focus on your subject." string so the action row is never empty.

## Alternatives considered

- **Ship SF Symbols directly.** Rejected. Licensing is restricted to Apple-platform apps, and we render in a web PWA targeting Android and web too. Drawing iOS-faithful interpretations is legally clean and visually equivalent for instructional purposes.
- **Leave the v1 icons alone and just link the screenshot from docs.** Rejected. The value of icons in coach prose is that the user recognises the glyph instantly; a docs link gets looked at once and never again.
- **Drop ISO/shutter from iPhone advice entirely.** Rejected. They're still useful *after* the shot — the user can compare the camera's EXIF to the target and learn whether their lever-pull landed. Hiding them loses that feedback loop.
- **Lock advice to "Portrait mode only" for any aperture recommendation.** Rejected as too restrictive. Non-Portrait advice simply omits aperture from the action row (aperture stays in the target readout) — doesn't need a hard constraint on the schema.
- **Photograph the iPhone screen and use raster crops.** Rejected — bad at every resolution, no `currentColor` theming, no i18n-friendly labels, no ability to swap values like `ƒ2,8` → `ƒ4,0`.
- **Keep the "recipe" name.** Rejected — once ISO/shutter are read-only for the iPhone path, "recipe" over-promises precision the coach no longer delivers. "Advice" sets the right expectation in both languages.

## Risks & open questions

- "Close enough to be recognisable" is judgement-based for the icons. Mitigation: commit the `icons.jpg` crops into the icons README and diff against them during review.
- Yellow highlight colour introduces a second palette into a coach UI that was otherwise bark/cream/leaf. Keep yellow scoped to *active iOS-control* glyphs only; audit `globals.css` for accidental reuse.
- Adding `ApertureSliderIcon` duplicates conceptual territory with `ApertureIcon`. The rule is: **stat grid → `ApertureIcon`; coach instruction that says "tap Camera Control and slide" → `ApertureSliderIcon`.** Document in the icons README so future edits don't blur it.
- The iOS UI drifts each iOS release. If iOS 19 redesigns the lens picker or format pill, this spec's glyphs go stale. Accept the drift for now; review annually against a fresh screenshot.
- `HEIF₂₄` subscript in the reference is actually the Live Photo duration indicator, not a format variant. `FormatPillIcon`'s `subscript` prop should be typed narrowly (`"24" | "48" | undefined`) with a comment explaining what the subscript represents.
- The rename breaks any bookmarks / external links pointing at `/api/coach/recipe`. Acceptable: the API is not publicly documented, and the project is pre-release.
- AI may struggle to predict plausible ISO/shutter numbers without being prompted to *set* them. If the targets drift far from what real EXIF reports, users lose trust in the feedback loop — mitigate by comparing in critique and surfacing the delta.

## Rollout plan

Phase 1 — code-wide rename recipe→advice / consejo: file renames, symbol renames, CSS classes, i18n keys + values, spec path references. One atomic PR. Phase 2 — extend [src/components/icons/index.jsx](../../src/components/icons/index.jsx) with the iOS-chip icons (`FormatPillIcon`, `MoreControlsIcon`, `ApertureSliderIcon`, `MacroOffIcon`) and revise `FlashOffIcon` / `NightIcon` / `MacroIcon` / `LensRingIcon` to match `icons.jpg`; add `--ios-camera-yellow`. Phase 3 — add `manualExposureControl: false` to the iPhone gear profile, add `exposureHint` to the iPhone hints schema, update the advice prompt, split the advice card into "Target" + "Action" rows for iPhone only. Phase 4 — icons-folder README with `icons.jpg` crops + mapping table.

## Success metrics

- In a 5-user hallway test, a user holding an iPhone 16 Pro can tap the control the coach referenced within 2 s of reading the line (vs. ~5–8 s in the current text-only version).
- Zero "I can't find ISO in the iPhone camera" reports after Phase 3 lands — the Action row makes clear which lever to actually pull.
- Delta between coach-predicted ISO/shutter targets and real EXIF ≤ 1 stop on 80 % of sampled iPhone shots — validates that "target readout" is still informative.
- Zero accessibility regressions — axe-core clean after each phase.
- Every new/revised icon has at least one screenshot-sourced crop embedded in the icons README; reviewer can eyeball the mapping in one glance.
