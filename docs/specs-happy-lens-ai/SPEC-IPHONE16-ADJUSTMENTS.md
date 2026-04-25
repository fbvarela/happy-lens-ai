# Happy Lens AI — iPhone 16 Pro Post-Adjustments — Product Specification

> **Part of The Happy Factory suite.**
> Follows all platform conventions defined in `HAPPY-FACTORY-CONTEXT.md` and `BRAND-SPEC.md`.
> Design reference: `happy-shelter-ai`.
> Scope focus: **a focused feature module within Happy Lens AI** — upload a photo, get back the exact iPhone 16 Pro post-capture adjustment values to dial in.

---

## 1. Vision

A photo-improvement coach that bridges the gap between "this shot is fine" and "this shot is great" — without leaving the iPhone Photos app. The user uploads any photo (ideally one shot on an iPhone 16 Pro). A vision model analyzes light, color, contrast, depth, and noise, and returns a **named recipe of adjustment values** that map 1:1 to the sliders Apple exposes in the iOS Photos editor: Photographic Style, Exposure, Brilliance, Highlights, Shadows, Contrast, Brightness, Black Point, Saturation, Vibrance, Warmth, Tint, Sharpness, Definition, Noise Reduction, Vignette — plus Depth Control and the Portrait Lighting selector when the photo carries a depth map.

**Core insight:** Apple already ships world-class non-destructive editing tools on every iPhone. The friction is not capability — it is **knowing which sliders to move and by how much**. Lightroom presets ignore Apple's controls; Apple's own "Auto" button is opaque. Nothing tells a user *"set Highlights to −35, Warmth to +12, Photographic Style to Standard with Tone +0.4 / Color −0.3"*.

**Differentiator:** Output is **constrained to the exact iPhone 16 Pro adjustment surface** — the slider names, ranges, and defaults Apple ships in iOS 18+. No generic "increase contrast slightly." Every recommendation is a number the user can type into the Photos app, in order, with a one-line "why."

Slots into Happy Lens AI as a sibling to `/critique`. Where Critique answers *"is this a good photo?"*, Adjustments answers *"how do I make it better right now, on this device?"*.

---

## 2. Target Users

| Persona                 | Description                                                                                          |
|-------------------------|------------------------------------------------------------------------------------------------------|
| **iPhone hobbyist**     | Owns iPhone 16 Pro, edits in Photos app, never uses Lightroom — wants concrete slider values         |
| **Casual sharer**       | Posts to Instagram / family chats — wants a quick "fix this for me" pass before sharing              |
| **Pet & kid parent**    | High-volume, low-time editor — wants one-tap recipes for repeated subjects (golden retriever, baby)  |
| **Travel iPhone shooter** | Shoots ProRAW on trips, edits on-device the same evening, doesn't want to round-trip to a laptop   |
| **Style learner**       | Wants to understand *why* an adjustment helps, so future shots get edited faster                     |

**Initial device:** iPhone 16 Pro (full slider set + Photographic Styles v2 + LiDAR-driven Depth Control).
**Second device:** iPhone 15 Pro (subset — Photographic Styles v1).
**Out of scope:** Android, third-party editor recipes, RAW develop math.

---

## 3. Feature Tiers

### 3.1 Free Tier

| Feature                               | Limit                                |
|---------------------------------------|--------------------------------------|
| Photo uploads for adjustment recipe   | 5 per day                            |
| Photographic Styles recommendation    | Standard + 4 Apple presets           |
| Recipe export (copy-to-clipboard text)| Unlimited                            |
| Recipe history                        | Last 10                              |
| Side-by-side preview (simulated)      | 3 per day                            |

### 3.2 Premium Tier — $9.99/mo or $99/yr (`plan='premium'`)

| Feature                               | Limit                                |
|---------------------------------------|--------------------------------------|
| Photo uploads                         | Unlimited                            |
| Custom Photographic Style suggestions | Tone + Color tuned per photo         |
| Batch mode (album → consistent recipe)| Up to 50 photos                      |
| Subject memory ("my dog Kira")        | Per-subject baseline recipe          |
| Side-by-side preview (CSS-simulated)  | Unlimited                            |
| Export as Shortcuts / Photos workflow | Included                             |

### 3.3 Bundle Tier — $19.99/mo or $199/yr (`plan='bundle'`)

All Premium + every Happy Factory app. `isPremium(plan)` treats `'premium'` and `'bundle'` identically.

---

## 4. Feature Details

### 4.1 Upload & Analyze (`/adjust`)

Single-screen flow on top of the existing Lens upload pipeline.

1. **Drop / pick photo** — accepts JPEG, HEIC, PNG, ProRAW DNG. Max 50 MB. EXIF read client-side via `exifr` (already a dep).
2. **Detect device profile** — read EXIF `Make`/`Model` + `LensModel`. If iPhone 16 Pro → full slider set. If older iPhone → degrade gracefully. If non-iPhone → warn and offer the iPhone 16 Pro slider set as a "what would Apple's editor do" mapping.
3. **Detect ancillary data** — depth map (HEIC auxiliary image), Portrait mode flag, Photographic Style baked-in metadata, ProRAW flag, Night mode duration.
4. **Vision pass** — image + metadata → `POST /api/adjust/recipe`. Returns `AdjustmentRecipeSchema` (Zod-validated, all slider values clamped to legal iOS ranges).
5. **Render recipe card** — ordered list of slider moves with values, the "why," a one-line Photographic Style choice, optional Depth Control f-stop, optional Portrait Lighting selector.

### 4.2 The Adjustment Surface (iOS 18 / iPhone 16 Pro)

The model's output is **constrained** to this exact surface. Every value is an integer in the displayed iOS range; the schema rejects anything else.

| Group              | Control               | Range        | Notes                                                    |
|--------------------|-----------------------|--------------|----------------------------------------------------------|
| **Photographic Style** | Style preset       | enum         | Standard, Amber, Gold, Rose Gold, Neutral, Vibrant, Natural, Luminous, Dramatic, Quiet, Cozy, Ethereal, Muted B&W, Stark B&W |
|                    | Tone                  | −1.0 … +1.0  | Step 0.1                                                 |
|                    | Color                 | −1.0 … +1.0  | Step 0.1 (only for color styles)                         |
| **Light**          | Exposure              | −100 … +100  |                                                          |
|                    | Brilliance            | −100 … +100  |                                                          |
|                    | Highlights            | −100 … +100  |                                                          |
|                    | Shadows               | −100 … +100  |                                                          |
|                    | Contrast              | −100 … +100  |                                                          |
|                    | Brightness            | −100 … +100  |                                                          |
|                    | Black Point           | 0 … 100      |                                                          |
| **Color**          | Saturation            | −100 … +100  |                                                          |
|                    | Vibrance              | −100 … +100  |                                                          |
|                    | Warmth                | −100 … +100  |                                                          |
|                    | Tint                  | −100 … +100  |                                                          |
| **Detail**         | Sharpness             | 0 … 100      |                                                          |
|                    | Definition            | 0 … 100      |                                                          |
|                    | Noise Reduction       | 0 … 100      |                                                          |
|                    | Vignette              | −100 … +100  |                                                          |
| **Depth (Portrait only)** | Depth Control  | f/1.4 … f/16 | Apple's discrete f-stop ladder                          |
|                    | Portrait Lighting     | enum         | Natural, Studio, Contour, Stage, Stage Mono, High-Key Mono |
|                    | Lighting Intensity    | 0 … 100      |                                                          |

The `AdjustmentRecipeSchema` (Zod) clamps each field and surfaces clamps in `warnings[]` so the user is never told to set a value that doesn't exist.

### 4.3 The Recipe Card

Output rendered in the brand's `card-grid` (no inline grids — see feedback memory). Contents:

- **Title** — short editorial name, e.g. *"Warm Golden-Hour Lift."*
- **One-paragraph diagnosis** — what the model saw (clipped highlights, magenta cast, soft shadows, etc.).
- **Ordered slider list** — group headers (Photographic Style → Light → Color → Detail → Depth), each row is `Slider name · value · 1-line why`.
- **Photographic Style block** — the chosen preset, plus Tone/Color values if not Standard.
- **Copy as text** button — produces the same list as plain text for pasting into Notes / Shortcuts.
- **Open in Photos** button — opens the photo via `photos-redirect://` deep link when on iOS Safari (best-effort; falls back to instructions).
- **"Why these moves"** expandable — full explanation, ~120 words, plain language.

### 4.4 Side-by-Side Preview (simulated)

A best-effort CSS approximation: the original `<img>` and a duplicate with `filter: brightness() contrast() saturate() hue-rotate() …` driven by the recipe values. Labelled **"Simulated — final result depends on Photos app render."** Free tier capped at 3 / day, Premium unlimited.

### 4.5 Subject Memory (Premium)

If the user tags a subject (e.g. *"Kira – golden retriever"*), recipes are averaged into a per-subject baseline so subsequent uploads of the same subject converge on a consistent look. Stored as `subject_baselines` rows keyed on `(user_id, subject_slug)`.

### 4.6 Batch Mode (Premium)

Upload up to 50 photos from a single shoot. Model returns a **single shared recipe** plus per-photo deltas (only the sliders that need to differ). Designed for travel albums and event sets.

---

## 5. Data Model

New Drizzle tables (additive to the existing `happy-lens-ai` schema):

| Table                  | Key columns                                                                                  |
|------------------------|----------------------------------------------------------------------------------------------|
| `adjustment_recipes`   | `id`, `user_id`, `image_hash`, `device_profile`, `recipe_json`, `warnings_json`, `created_at` |
| `subject_baselines`    | `id`, `user_id`, `subject_slug`, `display_name`, `baseline_recipe_json`, `sample_count`, `updated_at` |
| `batch_jobs`           | `id`, `user_id`, `photo_count`, `shared_recipe_json`, `per_photo_deltas_json`, `created_at`  |
| `adjustment_quota`     | `user_id`, `day` (date), `uploads_used`, `previews_used` (free-tier counters)                |

`recipe_json` shape mirrors `AdjustmentRecipeSchema`. `image_hash` is a SHA-256 of the resized JPEG sent to the model so repeat uploads short-circuit to cached recipes.

Images themselves are **not persisted** by default — only the hash + recipe. Users can opt in to keeping originals in Vercel Blob (private) for batch / subject-baseline replay.

---

## 6. AI Integration

- **Provider:** Vercel AI Gateway, default model `anthropic/claude-sonnet-4-6` (multimodal). Fallback `openai/gpt-4.1-mini` via the gateway. No direct provider package — use plain `"provider/model"` strings.
- **Why a vision model:** the recipe must reflect what's in the frame (skin tones, sky clipping, subject-vs-background contrast). Pure EXIF heuristics can't see clipped highlights.
- **Prompt approach:** system prompt pins the model to the iPhone 16 Pro slider taxonomy (full table from §4.2 inlined) and forbids any other vocabulary. User turn = image + EXIF JSON + optional subject hint. Output coerced through `generateObject` with `AdjustmentRecipeSchema`.
- **Validation:** Zod schema clamps out-of-range values, drops Depth/Portrait Lighting fields when no depth map present, and pushes a human-readable note onto `warnings[]` for every clamp/strip. The user sees exactly what the model wanted and what the schema enforced.
- **Caching:** keyed on `image_hash + device_profile + subject_slug`. TTL 30 days. Stored via Vercel Runtime Cache.
- **No user images leave the gateway.** Zero-data-retention provider routes only.

---

## 7. Navigation & Screens

New routes added under `happy-lens-ai/src/app/`:

| Route                  | Purpose                                                      |
|------------------------|--------------------------------------------------------------|
| `/adjust`              | Upload + recipe screen (the main feature)                    |
| `/adjust/[id]`         | Permalinked recipe (shareable, owner-private by default)     |
| `/adjust/history`      | List of past recipes, filter by device / subject             |
| `/adjust/subjects`     | Subject baselines (Premium) — manage, rename, reset          |
| `/adjust/batch`        | Batch mode (Premium) — multi-upload, shared recipe view      |
| `/api/adjust/recipe`   | `POST` — image + metadata → `AdjustmentRecipeSchema`         |
| `/api/adjust/batch`    | `POST` — multi-image → shared recipe + deltas                |
| `/api/adjust/preview`  | `GET` — returns CSS filter string for side-by-side render    |

Sidebar (desktop) and bottom-nav (mobile) gain an **Adjust** entry between **Critique** and **Gear**, using the existing emoji convention.

---

## 8. Tech Stack

- **Framework:** Next.js 16 App Router, React 19, JS (matches current `happy-lens-ai`).
- **Bundler:** Turbopack (dev), webpack (prod, required by PWA wrapper).
- **Styling:** Tailwind v4 + shared Happy Factory tokens. All grids via `.card-grid` class.
- **AI:** Vercel AI SDK v6 + AI Gateway, multimodal `generateObject`.
- **EXIF:** `exifr` (already in deps).
- **DB:** Neon Postgres + Drizzle (additive migration).
- **Storage:** Vercel Blob (opt-in originals, private).
- **Cache:** Vercel Runtime Cache, tag-based invalidation per `user_id`.
- **Auth:** existing magic-link flow (Resend + iron-session). Test login via `POST /api/auth/test-login` (preview + localhost only — see test-login convention memory).
- **Payments:** Stripe (`STRIPE_LENS_*` for app prices, `STRIPE_BUNDLE_*` for the bundle).
- **Deployment:** Vercel, port 3014 local, `lens.happyfactory.app` prod.

---

## 9. Non-Functional Requirements

- **Performance:** recipe round-trip ≤ 6 s p95 for a 12 MP HEIC. Image resized client-side to max 2048 px long edge before upload.
- **Mobile-first:** primary form factor is iPhone Safari. All interactive targets ≥ 44 px. No inline grid templates anywhere.
- **Offline:** PWA caches the last 10 recipes for read-only replay. New uploads require network.
- **Accessibility:** every slider value rendered as text (not just a bar), recipe card is fully screen-reader navigable, color is never the sole signal.
- **Privacy:** images not persisted by default; explicit opt-in for retention; recipes stripped of EXIF GPS before sharing.
- **i18n:** EN + ES-ES at launch, matching the rest of Lens. Slider names keep their Apple English labels in both locales (these are UI strings the user will look for in Photos.app).
- **Quota enforcement:** server-side via `adjustment_quota` table; 429 with a tier-upgrade hint when exceeded.

---

## 10. Phased Roadmap

### Phase 0 — Schema + scaffolding (≈ 0.5 day)
- `AdjustmentRecipeSchema` (Zod) with the full §4.2 surface.
- Drizzle migrations for the 4 new tables.
- Empty route shells for `/adjust` and `/api/adjust/recipe`.

### Phase 1 — MVP (≈ 2 days)
- Upload + EXIF detect + device profile inference.
- `POST /api/adjust/recipe` wired to AI Gateway with Claude Sonnet 4.6 multimodal.
- Recipe card UI, copy-as-text, simulated CSS preview.
- Free-tier quota counters.
- History list (last 10).

### Phase 2 — Polish & Premium (≈ 2 days)
- Subject memory (`subject_baselines`).
- Permalinked recipes `/adjust/[id]`.
- "Open in Photos" deep link with iOS detection.
- Premium gating via `<PremiumGate>` and `isPremium(plan)`.
- Stripe wiring for `STRIPE_LENS_*`.

### Phase 3 — Batch & power tools (≈ 2 days)
- Batch mode (up to 50 photos) → shared recipe + deltas.
- Export as Apple Shortcuts workflow (best-effort `.shortcut` file).
- Subject baseline editor and reset.

### Phase 4 — Device expansion (ongoing)
- iPhone 15 Pro profile (Photographic Styles v1, no Stage Mono Lighting).
- iPhone 17 Pro profile when iOS exposes it.
- Per-device slider taxonomies stored as JSON in `src/data/devices/` so adding a device is data-only.

### Out of scope (for now)
- Android editor recipes.
- Lightroom / Darkroom XMP export.
- On-device ML inference.
- Editing the photo on our servers (we only *describe* the edit).
