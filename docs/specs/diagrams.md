#### cenital schematics
- Add a new feature that draw a cenital schematic with the position of the subjects, the sun (movable along the day / hour) to depict shadows
and also for each position give the best approximation and camera params

#### Ideas

A **top-down light diagram** — an overhead SVG plan of the scene that shows the
sun, the subjects and the camera, with realistic shadows and per-position
camera advice. Everything it needs already exists in the app (`dayWindows` /
`sunSnapshot` for the sun, subject presets, gear profiles) — no new dependency.

- **Sun that moves with time**: a time slider sweeps the day; the sun marker
  follows the real azimuth/altitude from `sunSnapshot`. On the plan view the
  sun sits at its azimuth on the scene rim; shadows point *away* from it and
  lengthen as the sun drops: `shadow length ≈ subject height / tan(alt)`.
  Low sun (golden hour) → long shadows; high noon → short, tight shadows.
- **Draggable subjects + camera**: place the couple (or any subject) and the
  photographer on the plan. The app computes the bearing from camera→subject
  vs. the sun azimuth and classifies the light: front-lit / side-lit / rim /
  backlit — and flips the advice accordingly (backlit → +0.3–0.7 EV + AE/AF
  lock on the face; side → keep both faces open; etc.).
- **Camera params per position**: reuse the selected subject preset's recipe
  (`preferredLens`, `shutterFloorSec`, `isoCeiling`, `cameraMode`) plus an
  EV/light-mode note derived from the sun angle. Deterministic — no AI needed.
- **"Based on a real photo"**: the schematic can sit on an **OpenStreetMap
  raster tile** (free, no API key) centered on the scene lat/lng — a real
  top-down aerial base to place markers on. Falls back to a pure schematic if
  offline or no coords.
- **Best-window hints**: highlight golden hour / blue hour on the slider using
  `dayWindows` (sunrise, goldenHour, solarNoon, goldenHourEve, sunset) so the
  user can drag to the ideal window and watch the shadows change.

#### Plan (minimum diff)

1. **New `/diagram` route** (client component, App Router): lat/lng + date +
   time slider + subject-preset chips + gear selector. Deep-linkable:
   `?subject=&lat=&lng=&dateTime=` (reuses the same params `/coach` reads).
2. **Inline SVG renderer** (no dep): scene circle + N marker, sun marker +
   day-path arc, one draggable shadow wedge per subject (anti-sun direction,
   length ∝ `h/tan(alt)`), draggable subject + camera points (pointer events
   map SVG coords → plan coords).
3. **Light classifier**: `relAngle(camera→subject bearing, sun azimuth)` →
   front/side/rim/backlit + a one-line advice string per mode.
4. **Camera params**: read the subject preset recipe + gear, show
   lens/f/shutter/ISO/mode with the light-mode EV note. (Optionally deep-link
   to `/coach` for a full recipe.)
5. **Optional aerial base**: OSM raster tile via the standard slippy-map
   lat/lng→tile formula (no key) as a toggle; schematic-only otherwise.
6. **Entry point**: a "Light diagram" button in the coach scene step (and/or
   plan slots) that deep-links into `/diagram` with the current scene.
7. **i18n**: en/es strings.
8. **Verify**: build + manual check that dragging the slider moves the sun and
   rotates/lengthens shadows, and that the light advice flips correctly.

Skipped: overlaying on a real perspective camera photo (needs projection math),
a paid map provider, sun-as-draggable, multi-scene editor. Add only if the
schematic feels too abstract.


### issues
- [x] the photographer can cast a shadow also.
- [x] when i chose pentax k5 with a manual 18-55mm lens, data of lens and aperture is missing. why? (root cause: the preset's preferredLens ids are phone-lens ids that don't exist on the Pentax → lens lookup fell through to "—"; now falls back to the gear's own lens, and variable-aperture zooms show the f/3.5–5.6 range)
- [x] also, i want to select the active gear from Gear screen (and use it in all places) and remove the camera selection in all other pages (Gear screen already had the active picker; diagram now uses the active gear directly — its own camera chips were removed)

### improvements
- [x] The diagram could be improved, be more elegant and professional at least. (thinner scene ring and strokes, hour ticks on the rim at the sun's azimuth with 6/12/18 labels, slimmer marker labels)
- [x] Reduce the visor and the circles (halo rings around the subject/camera markers removed — a single dot with white stroke remains; the invisible 18px drag hit-area is kept for touch)
- [x] Think about making it more interesting (camera view cone derived from the active lens' field of view, aimed at the first subject — wider on the phone's ultrawide, tighter on the Pentax tele end)
- [x] would it be possible to calculate the depth of field with sliders for aperture and speed? (aperture + shutter sliders in the camera card; DoF from aperture, lens focal length and an explicit focus target — Subject 1 by default, Subject 2 or custom distance; tripod warning when the shutter is slower than 1/focal-eq)
- [x] reduce the sun and the visor itself, less childish circles (sun: cartoon rays removed — thin ring + small disc; FOV cone shortened to 34px and fainter; shadow wedges narrowed and capped at 40px)
- [x] Instead of infinite symbol on diagram, show the DoF band until the scene edge.
- [x] Take into account the weather conditions: sunny/cloudy (hourly cloud cover from Open-Meteo softens shadows, dims the sun marker and adds a weather note to the light advice)
- [x] show distances between the photographer and the subjects (subtle dashed measurement lines with midpoint labels in metres)
