#### Wedding photos
- A friend wants me to photograph her and her fiancee before the wedding.
- Create another option for this with tips.
- The photos would be taken on the countryside, with pasture and trees. Also there is a little pavimented road and a little
hill with a good view.
- Also i want to be able to upload to have them as examples on this section.
- Generate photos with ai as example as well with a whole explanation.

#### Ideas

New subject preset: **Engagement / Couple** (`engagement`). It is a portrait
variant tuned for two people outdoors, plus location tips for the four spots:

| Spot | Why it works | Tips |
|------|--------------|------|
| Hill with view | Clean background, best light | Shoot golden hour (last hour before sunset). Place couple on the ridge, sky behind. Expose for faces, +0.3–0.7 EV if backlit. |
| Paved road | Leading lines | Couple walking away/toward camera, tele2x for compression. Shoot from low angle centered on the road. |
| Trees | Shade = soft even light | Open shade for midday; backlight through leaves near sunset for rim light. Watch dappled-light patches on faces. |
| Pasture | Wide environmental context | Ultrawide/main, couple small in frame for scale. Wind: faster shutter (1/250+) for hair/dress movement. |

Preset values (portrait base, adjusted for two moving subjects):
- `preferredLens: ["tele2x", "main"]`, `cameraMode: "Portrait"`
- `shutterFloorSec: 1/200` (two people = someone blinks/moves)
- `isoCeiling: 800`
- intent: "Natural-light couple session; keep both faces in focus (f/2.8–f/4 equivalent), candid between poses."

Extra coaching tips to surface:
- Schedule 2 slots: ~1h after sunrise or ~1.5h before sunset; avoid noon pasture shots.
- Burst mode for laughs/walks; review later.
- Bring a reflector or use the road/pale grass as bounce fill.
- Shoot both wide (place) and tight (hands, ring, glances).

Example gallery ("upload to have them as examples"):
- Upload 1+ photos in the engagement section → downscaled client-side → stored in Postgres (`engagement_examples`) → shown as a thumbnail grid of reference shots.
- `src/app/api/coach/examples` GET/POST/DELETE; JPEG data URLs, ~550 KB cap, 15-image cap, 401 without session. Migration `0001_conscious_millenium_guard`.

AI example generation ("generate photos with ai as example as well with a whole explanation"):
- Spot chips (Hill / Road / Trees / Pasture) in the engagement section → `POST /api/coach/examples/generate`.
- Server posts a per-spot photorealistic prompt to Replicate `black-forest-labs/flux-schnell`, polls the prediction, returns the generated image URL.
- Each generated photo is shown with a whole explanation (composition, settings, why it works) — localized en/es.
- "Save to examples" fetches the generated image client-side, downscales it and persists it to the same gallery, so AI examples become permanent like uploads.
- No `REPLICATE_API_TOKEN` → graceful stub ("Set REPLICATE_API_TOKEN…"), matching the app's fail-soft pattern. Provider documented in `.env.example`.

#### Plan (minimum diff)

1. `src/data/subjects/presets.js` — add `engagement` preset (icon `Heart` from lucide, already installed), including a `tips: [...]` array with the spot tips above.
2. `src/lib/plan-schema.js` — add `"engagement"` to the `subjectId` enum (also check `adjustment-schema.js` style enums if they list subjects).
3. Coach flow: render `tips` for the selected subject on the recipe result/subject step in `/coach` (one small block, reuse `.card` styles). Only show when preset has `tips` — no new UI component.
4. Same engagement section: add example gallery — `<input type="file" accept="image/*" multiple>`, downscale via image-decode.js, localStorage list, thumbnail grid + delete. All client-side, no API route.
5. i18n: add `en`/`es` strings for label + tips + gallery in `src/lib/i18n/dictionaries.js`.
6. Verify: `npm run lint && npm run build`, then pick Engagement in /coach, confirm tips render and upload/delete of example photos works.

Skipped: separate "wedding planner" module, per-spot GPS features, new API routes,
server-side storage for examples. Add server sync only if examples must survive
device changes.
