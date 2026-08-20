#### Black and white
- add a section to take black and white photos
- also, really contrasted photos with black background.
- Add your ideas.

#### Ideas

New subject preset: **Black & White** (`bw`). B&W is a treatment, not a scene,
but the app's model is subject chips — and shooting B&W changes metering,
framing and light choices, so it earns a preset. Two contexts (same sub-picker
pattern as Pets):

| Context | Goal | Key tips |
|---------|------|----------|
| Classic B&W | Tonal, timeless mono | See in tones: side light, texture, shape beat color. Shoot ProRAW-48 + HEIF to keep color for later, or commit in-camera (swipe up → Filters → Mono / Silvertone / Noir). Expose for highlights — shadows recover, blown highlights don't. |
| Low-key (black background) | High contrast, subject on pure black | Subject lit, background in shadow/dark surface. Underexpose −1 to −2 EV; AE/AF lock on the subject's brightest edge, recompose. One side/back light (window, sunset) for rim separation. Tele2x/5x to exclude surroundings. Noir filter; raise Black Point + vignette in Photos. |

Preset values:
- `bw` base: `preferredLens: ["main", "tele2x"]`, `shutterFloorSec: 1/125`, `isoCeiling: 800`, `cameraMode: "Photo"`
- `lowkey` context overrides: `preferredLens: ["tele2x", "tele5x"]`, `isoCeiling: 1600` (dark scenes)
- intent: "Monochrome vision — tone, contrast and texture over color. Expose for the highlights."

Extra coaching tips to surface:
- Composition without color: leading lines, frames, repetition, silhouettes; move your feet to remove color-clutter.
- Overcast = soft, quiet tones; harsh sun = graphic shadows. Both work, pick on purpose.
- The Adjust tab already edits into B&W (Muted B&W / Stark B&W styles, Black Point, Contrast) — cross-reference it in a tip so shoot → edit forms a loop.

Already exists (do not rebuild): `Muted B&W` / `Stark B&W` Photographic Styles
+ contrast/black-point sliders in the Adjust flow (src/lib/adjustment-schema.js).
This spec only covers the shoot side.

#### Plan (minimum diff)

1. `src/data/subjects/presets.js` — add `bw` preset (icon `Contrast` from lucide, already installed), with `contexts: ["classic", "lowkey"]`, `defaultContext: "classic"` and a `tips: [...]` array, plus an inline `BW_CONTEXTS` export (id, hint, preferredLens, shutterFloorSec, isoCeiling) mirroring PET_CONTEXTS shape — no new file for just two contexts.
2. `src/app/api/coach/recipe/route.js` — mirror the pets block: when `subjectId === "bw"`, resolve context and merge overrides + hint into `subject` (also include context in the cache key, like pets).
3. `src/app/coach/page.jsx` — context sub-picker chips when `bw` is selected (copy the pets sub-picker block) + tips list (reuse the engagement tips block).
4. `src/lib/plan-schema.js` + `src/app/api/plan/day/route.js` — add `"bw"` to the subjectId enum and prompt list (overcast slots can become B&W opportunities).
5. i18n: `en`/`es` strings for label, contexts and tips in `src/lib/i18n/dictionaries.js`.
6. Verify: `npm run build`, pick B&W in /coach, check both contexts change the recipe, check /coach?subject=bw deep-link.

Skipped: example gallery (reuse engagement pattern only if asked), high-key context
(not requested), scene-guard rules (B&W works in any light). Add a guard only if
low-key recipes start coming out wrong at night/bright noon.
