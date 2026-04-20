# Spec — Coach camera-function icons

> Status: Draft · Author: fbvarela · Created: 2026-04-20

## Context

The coach recipe card currently communicates every camera affordance in words plus an occasional emoji: `f/1.78`, `1/125s`, "Camera Control. Light-press → Style → Vibrant.", "Flash. ⚡ TTL -1/3 EV…", `📄 HEIF`, `🎨 Vibrant`, `📱 iPhone 16 Pro`. On a 402 px mobile viewport that's a dense block of prose for a user about to **look away from the app and into their camera**. Emojis render inconsistently across platforms (Windows vs iOS vs Android) and don't visually match the thing the user is about to touch (the iPhone hardware Camera Control button, the aperture iris, the dial on a DSLR body).

Related surfaces already use mixed approaches: recipe stats (plain text), iPhone strip (`📄`/`🎨` emoji badges), subject chips (emoji per subject), gear pill (one 📱/📷 emoji). We should unify that into a small, brand-aligned SVG icon set that **emulates the actual camera affordances** so a photographer can pattern-match the icon in the app to the control on their camera.

Related: [spec-emulate-iphone-16-pro-capacities.md](spec-emulate-iphone-16-pro-capacities.md) · [src/app/coach/page.jsx](../../src/app/coach/page.jsx) (recipe strip) · [public/icons/icon.svg](../../public/icons/icon.svg) (existing aperture-iris mark that sets the style).

## Goals

- Ship a small set of **functional** SVG icons (≈12 in v1) that stand for the camera concepts the coach talks about: aperture, shutter, ISO, EV, camera mode, focus, stabilization, flash (on/off/TTL), Photographic Style swatch, Camera Control hardware button, AE/AF-lock padlock, macro flower, night crescent, lens picker (0.5× / 1× / 2× / 5×), sun-position compass.
- Replace the current emoji-and-text approach on the recipe card and the iPhone strip with **icon + value** pairs so each stat reads in a glance.
- Icons inherit text colour (`currentColor`) so the existing brand palette (bark on cream, leaf for "on", clay for warnings) just works — no per-icon theming code.
- Keep the existing subject-chip emojis (🏔️ for landscape, 🐕 for wildlife, etc.) unless they fit the icon style — this spec is about **camera functions**, not subjects.
- Every icon has `role="img"` + a translated `aria-label` so screen readers announce "aperture f/1.78" not "svg".

## Non-goals

- Replacing the Happy Factory brand mark or the app-icon SVG — that stays as-is.
- Animated icons or Lottie — static, cacheable SVGs only.
- A full design-system icon library. We add camera functions we surface today; anything else can land later when a new feature introduces it.
- Replacing subject emojis unless doing so genuinely clarifies the UI (reserved for a follow-up).
- Shipping a new icon-picker CMS or runtime icon registry — we hand-author each SVG and import it.

## Proposed design

### Icon inventory (v1)

| Concept | File | Visual |
|---|---|---|
| Aperture (generic) | `ApertureIcon.jsx` | 6-blade iris; optional inner label = f-number |
| Shutter speed | `ShutterIcon.jsx` | Clock-face with a single hand and the label as text |
| ISO | `IsoIcon.jsx` | Pill with the letters "ISO" in Fraunces |
| EV | `EvIcon.jsx` | ±Δ wedge with a dot on the zero line |
| Camera mode | `ModeDialIcon.jsx` | PASM dial with one sector highlighted |
| Focus point | `FocusIcon.jsx` | Viewfinder corner brackets |
| Stabilization | `StabIcon.jsx` | Sensor-shift shape with directional arrows |
| Flash (on) | `FlashOnIcon.jsx` | Lightning bolt filled sun-gold |
| Flash (off) | `FlashOffIcon.jsx` | Lightning bolt with a strike-through |
| Photographic Style | `StyleSwatchIcon.jsx` | Two rectangles with a gradient dot (palette hue by style name) |
| Camera Control button | `CameraControlIcon.jsx` | The actual pill-shape capacitive button from the iPhone 16 Pro with the inset ring |
| AE/AF lock | `LockIcon.jsx` | Padlock with a small AF square |
| Macro | `MacroIcon.jsx` | Flower + magnifier |
| Night | `NightIcon.jsx` | Crescent moon with an exposure-time label slot |
| Lens picker | `LensRingIcon.jsx` | Circle with a text slot for `0.5×` / `1×` / `2×` / `5×` |
| Sun position | `SunCompassIcon.jsx` | Compass N-E-S-W with a sun glyph at the given azimuth |

All share a 24×24 viewBox (pairs cleanly with the existing 99 px pill chips and the recipe stat labels) and render with `stroke="currentColor" stroke-width="1.5" fill="none"` except where a shape is filled (Camera Control ring, aperture iris interior, flash bolt). Size overrides via a `size` prop.

### Where they're used

- **Recipe stat grid** ([src/app/coach/page.jsx](../../src/app/coach/page.jsx) `RecipeCard`): each cell becomes `<Icon> + label + value` on two lines. `Lens` gets the ring icon; `Aperture` the iris; `Shutter` the clock; `ISO` the pill; `EV` the wedge.
- **iPhone strip**: `📄 HEIF` → Format-chip with a small document icon; `🎨 Vibrant` → Style swatch; `Camera Control.` line → prefix with the Camera Control button icon; `AE/AF lock.` line → prefix with the padlock.
- **Flash line**: `⚡` becomes `FlashOnIcon` in leaf-green (built-in) or sun-gold (external attached), `FlashOffIcon` (muted) when off.
- **Sky & light card**: sun altitude/azimuth line gets `SunCompassIcon` positioned to the azimuth; moon gets `NightIcon`.
- **Gear page** lens list: lens label gets `LensRingIcon` prefix; flash entries get `FlashOnIcon`.

Subject chips (`🏔️ Landscape`, `🌌 Astro / Milky Way`, etc.) stay as emojis in v1 — they're subject categories, not camera functions. Replacing them is a follow-up once the function icons are stable.

### File layout

```
src/components/icons/
  index.js          // re-exports every icon + a type-safe `byName(name)` lookup
  Aperture.jsx      // each file: default export is a React component
  Shutter.jsx
  Iso.jsx
  Ev.jsx
  ModeDial.jsx
  Focus.jsx
  Stab.jsx
  FlashOn.jsx
  FlashOff.jsx
  StyleSwatch.jsx   // accepts a `style` prop like "Vibrant" and picks a palette
  CameraControl.jsx
  Lock.jsx
  Macro.jsx
  Night.jsx
  LensRing.jsx      // accepts a `lens` prop like "ultrawide" -> renders "0.5×"
  SunCompass.jsx    // accepts `azimuthDeg` -> rotates the glyph
```

All icons accept:
```js
function Icon({ size = 20, title, className, ...rest }) { ... }
```
- `title` → `<title>` inside the SVG for tooltips; also sets `aria-label`.
- `size` → width/height.
- `className` → extra classes (e.g. `recipe-stat-icon`).
- Visual style uses `currentColor`; callers set colour via `color:` (the stats grid already inherits `var(--bark)`).

### CSS alignment

Add to [globals.css](../../src/app/globals.css):

```css
.stat-with-icon { display: flex; align-items: center; gap: 6px; }
.recipe-stat-icon { flex: 0 0 auto; color: var(--bark); }
.iphone-chips .badge svg { vertical-align: -2px; margin-right: 4px; }
```

No Tailwind utilities touched. No new theme tokens — icons inherit the palette already defined in the brand spec.

### Accessibility

- `<svg role="img" aria-label={t("coach.recipe.aperture") + " f/" + fNumber}>` on the aperture icon, etc.
- Decorative inner strokes get `aria-hidden="true"`.
- Focus styles: when used inside a button (the lens picker), the parent button keeps its existing focus ring; icons don't introduce their own outline.

### Failure modes

- SVG fails to load (CSS missing, unusual browser) → component still renders; the text value beside it is authoritative.
- User prefers high contrast → icons honour `forced-colors: active` by using `currentColor` + `stroke`; no hard-coded `#3d2b1f`.
- Tree-shaking / bundle size: each icon is ~0.5–1.2 kB gzipped; ~12 icons = ~10 kB total. Cheap enough not to warrant a sprite sheet in v1.

### i18n

Each icon's `title` / `aria-label` comes from the existing `t()` dictionary. New keys added under `coach.icons.*`:
```
aperture, shutter, iso, ev, mode, focus, stabilization,
flashOn, flashOff, style, cameraControl, aeAfLock, macro, night,
lens, sunPosition
```
Short noun phrases, not sentences.

## Alternatives considered

- **Use an existing icon library (lucide, phosphor, heroicons).** Rejected. None of them have iPhone-16-Pro-native affordances — the Camera Control hardware button, the 0.5×/1×/2×/5× lens selector ring, a live aperture iris with an inner f-number. Using a generic icon pack makes the app look like every other photo app; the whole point is that the coach maps visually to the specific camera in the user's hand.
- **SVG sprite sheet + `<use href>`.** Rejected for v1 — it saves a few kB but complicates per-icon props (colour, label, variable text like `0.5×`). If the set grows past ~25 icons we can revisit.
- **Stick with emojis.** Rejected — inconsistent cross-platform rendering (📷 is literally different artwork on Windows/iOS/Android), no way to show a live f-number inside the icon, and they already fall short on the iPhone strip where we need hardware-matching glyphs.
- **Replace every label with only an icon.** Rejected — camera-settings literacy varies; the value (`f/1.78`, `1/125s`, `ISO 400`) must remain visible. Icons are a visual anchor, not a replacement for text.

## Risks & open questions

- Maintenance cost of hand-authored SVGs — 16 icons is small, but if the coach grows (manual-focus-distance, focus-peaking, AF-C modes) each addition is a bespoke file. Mitigation: document the 24×24 + 1.5-stroke + currentColor conventions in a short README alongside the icons folder.
- The `StyleSwatch` icon needs a hue per Photographic Style. The mapping (Vibrant → pink, Amber → amber, Gold → gold, Dramatic → deep teal…) is opinionated and may not match Apple's swatches. Ship my mapping in v1, adjust once we see real recipes.
- `SunCompassIcon` rotating with the azimuth can look confusing on a viewport with no orientation anchor. Keep the compass N-E-S-W labels always visible so the sun glyph's position is self-explanatory.
- Dark surfaces (the bark sidebar) need icons with lighter strokes. Relying on `currentColor` covers it — but spot-check the sidebar home-screen icon if we ever surface camera icons there.

## Rollout plan

Phase 1 — land the 16-icon set and replace the iPhone-strip emojis + the flash-line emoji, wire them into the recipe stat grid as "icon + label + value" cells. One-shot change, no feature flag. Phase 2 — swap the Sky/Light card emojis for `SunCompass` + `Night`. Phase 3 — evaluate subject-chip replacements; only ship if an icon genuinely reads better than the current emoji (likely yes for Macro/Astro, unclear for Portrait/Street). Phase 4 — if the icons prove useful, extend the set to the `/plan` shot-list slots.

## Success metrics

- Recipe card height at 402 px viewport drops by ≥15 % on a typical portrait recipe (measurable, since icons + values compress two-line prose into one-line cells).
- Qualitative: in a 5-user hallway test, users can point to the Camera Control button on an iPhone 16 Pro within 3 s of seeing the `CameraControlIcon` — validating the "icon matches the hardware" claim.
- No accessibility regressions — axe-core clean on `/coach` after landing the change (no missing labels on `svg role="img"`).
- Recipe copy-to-clipboard output is unchanged (icons are presentational only) — Copy still produces the same plaintext lines the field photographer pastes into Notes.
