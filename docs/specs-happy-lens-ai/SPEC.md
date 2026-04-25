# Happy Lens AI — Product Specification

> **Part of The Happy Factory suite.**
> Follows all platform conventions defined in `HAPPY-FACTORY-CONTEXT.md` and `BRAND-SPEC.md`.
> Design reference: `happy-shelter-ai`.
> Scope focus: **full product spec with a dedicated Pets subject area** (cats & dogs at home or in the garden — no wildlife in nature).

---

## 1. Vision

Happy Lens AI is a **photo-trip planner and shot coach**: given a subject, a scene, and the photographer's actual kit, it produces a concrete recipe — lens, aperture, shutter, ISO, EV, camera mode, focus, stabilization, position, composition — plus context like sun/moon altitude and weather. It turns "I want to photograph X" into "stand here, set this, shoot now."

**Core insight:** Most photography apps either plan trips (PhotoPills, Sun Surveyor) or critique photos after the fact (Lightroom, ViewNX). Nothing sits in between. Photographers — especially phone photographers and hobbyists — need an in-the-moment **shot coach** that knows their gear's actual limits and the current light.

**Differentiator:** Gear-aware recipes. The LLM is constrained by a `GearProfile` JSON so it cannot recommend f/1.4 on an f/1.78 phone lens, or 1/8000s on a body whose min shutter is 1/4000s. A Zod schema clamps illegal values to the nearest legal one and flags the clamp in `warnings`.

---

## 2. Target Users

| Persona                  | Description                                                                                            |
|--------------------------|--------------------------------------------------------------------------------------------------------|
| **iPhone hobbyist**      | Has an iPhone 16 Pro, wants better-than-default shots, doesn't know ProRAW / Night / Action mode rules |
| **Enthusiast**           | Owns one mirrorless/DSLR (e.g. Pentax K5), needs reminders on settings per subject and light           |
| **Traveling photographer** | Plans around golden hour, blue hour, astro windows; wants weather + sun in one place                 |
| **Pet owner**            | Wants great photos of their cat or dog at home or in the garden — poor light, fast motion, low angles  |
| **Calm planner**         | Browses curated shot lists the night before, saves recipes for the morning shoot                       |

**Initial device:** iPhone 16 Pro (fully specified). Second profile: Pentax K5 DSLR (in-repo). More devices follow the same `GearProfile` schema.

---

## 3. Feature Tiers

### 3.1 Free Tier

| Feature                                  | Limit                              |
|------------------------------------------|------------------------------------|
| Subject presets                          | All 10 (incl. **Pets**) unlimited  |
| Shot recipes per day                     | 10                                 |
| Photo critique (EXIF + vision)           | 3 per day                          |
| Gear profiles                            | 2 (iPhone 16 Pro, Pentax K5)       |
| Day planner (sun/moon/weather)           | Current location only              |
| Recipe cache / offline replay            | Last 10 recipes                    |
| Localization (EN / ES-ES)                | Included                           |

### 3.2 Premium Tier — $9.99/mo or $99/yr (`plan='premium'`)

| Feature                                  | Limit                              |
|------------------------------------------|------------------------------------|
| Shot recipes                             | Unlimited                          |
| Photo critique (batch)                   | Unlimited                          |
| Gear profiles (custom)                   | Add any camera/lens combo          |
| Day planner                              | Any saved location                 |
| External flash workflow                  | Unlocked (TTL/manual/FEC hints)    |
| Pet profile memory                       | Per-pet settings + composition tips|
| Recipe history & favorites               | Unlimited, cross-device            |

### 3.3 Bundle Tier — $19.99/mo or $199/yr (`plan='bundle'`)

All Premium features + full access to every Happy Factory app.

`isPremium(plan)` treats `'premium'` and `'bundle'` identically.

---

## 4. Feature Details

### 4.1 Shot Coach (`/coach`)

Three-step form → one primary `ShotRecipe` + up to two alternates.

1. **Subject** — pick a preset from `SUBJECT_PRESETS` in [src/data/subjects/presets.js](../../src/data/subjects/presets.js). Each preset seeds `preferredLens`, `shutterFloorSec`, `isoCeiling`, `cameraMode`, and a one-line `intent`.
2. **Scene** — geolocation or manual lat/lng, date/time (with `TIME_PRESETS` for golden hour / blue hour / astro / now), free-text notes.
3. **Equipment** — active profile from `useGearStore` (defaults to iPhone 16 Pro). Optional external flash toggle when the profile includes a flash.

`POST /api/coach/recipe` builds a prompt, constrains it with the `GearProfile`, and returns `RecipeResponseSchema` validated output. iPhone-specific hints (`photographicStyle`, ProRAW format, Camera Control gestures, AE/AF lock) are emitted only when the active gear is the iPhone profile.

**Scene guard** ([src/lib/scene-guard.js](../../src/lib/scene-guard.js)) rejects incompatible subject+sun combinations before calling the model (e.g. astro while sun is above -6°).

### 4.2 Pets Subject (new — this spec's focus)

**What it is:** A first-class subject preset for **pets at home or in the garden**. Cats and dogs are the canonical cases; the preset also works for small mammals (rabbits, ferrets), birds in a cage, and aquarium fish.

**What it is NOT:** Wildlife in nature. That remains the separate `wildlife` preset, which assumes distance, telephoto reach, and ethical spacing. The `pets` preset assumes **short subject distance, indoor/garden light, a cooperating or semi-cooperating subject, and no ethics-of-distance concerns**.

**Sub-scenes** (exposed as a second-level picker when Subject = Pets):

| Sub-scene             | Typical light        | Motion             | Notes                                           |
|-----------------------|----------------------|--------------------|-------------------------------------------------|
| `pet.portrait.indoor` | Mixed / dim          | Low                | Portrait mode; catch-light in the eyes; floor level |
| `pet.portrait.garden` | Daylight / open shade| Low                | Portrait mode; green background compression    |
| `pet.action.fetch`    | Daylight             | High               | Freeze motion, burst/Action mode                |
| `pet.action.zoomies`  | Indoor / garden      | Very high          | Pre-focus on a corridor; continuous AF          |
| `pet.napping`         | Dim / window-lit     | None               | Silent shutter, long-ish exposure ok            |
| `pet.with-owner`      | Any                  | Low                | Two-subject framing, focus on nearest eye       |

**Preset defaults** (to be added to [src/data/subjects/presets.js](../../src/data/subjects/presets.js)):

```js
{
  id: "pets",
  label: "Pets",
  icon: "🐾",
  preferredLens: ["main", "tele2x"],   // short distance, avoid distortion from ultrawide
  shutterFloorSec: 1 / 250,            // freeze head turns and tail flicks
  isoCeiling: 3200,                    // indoor reality
  cameraMode: "Portrait",              // owner's default workflow; Action swaps in for pet.action.*
  intent: "Close-range cats & dogs at home or in the garden — not wildlife.",
}
```

**Default iPhone workflow:** Portrait mode is the user's usual choice for pets — it renders the muzzle with natural subject separation and lets depth be adjusted after capture via the Camera Control button. The coach therefore defaults to `cameraMode: "Portrait"` and emits an iPhone hint like *"Press the Camera Control button, swipe to Depth, dial f/2.0–f/2.8 for a soft background while keeping both eyes sharp"*. It only swaps to:

- **Action mode** — when sub-scene is `pet.action.fetch` or `pet.action.zoomies` (Portrait mode can't keep up with zoomies).
- **Night mode** — when sub-scene is `pet.napping` in a dim room and the pet is holding still long enough for a multi-second capture.
- **Photo mode (standard)** — when the user has no flash and the scene is bright enough that Portrait's aperture simulation would clip highlights.

**Gear-aware adjustments the coach makes:**

- **iPhone 16 Pro:** defaults to **Portrait mode** on the 1× main lens (or 2× crop for tighter muzzle framing), with an iPhone hint explaining how to dial depth via the Camera Control button; never recommends the 5× tele for a pet in the same room; avoids ultrawide unless the user explicitly wants a wide-angle "tiny-paws" look. Falls back to Photo mode only when Portrait-mode depth simulation would clip highlights in bright daylight.
- **Pentax K5 + flash:** allows bounce-flash recipes for low-light indoor; clamps shutter to the camera's X-sync speed (1/180s) when flash is enabled.
- **Any gear, `pet.action.*`:** raises `shutterFloorSec` to 1/500s or 1/1000s and warns if ISO ceiling will be exceeded under current light.

**Composition & ethics hints the LLM must include:**

- Shoot at the pet's eye level (get low for small dogs, lie flat for cats).
- Catch-light in at least one eye; use a window or doorway as the key light source.
- Avoid direct on-camera flash near sleeping pets; prefer bounce or ambient.
- For black-coated dogs or tortie cats, add +0.7 EV to avoid under-exposure.
- For white-muzzled subjects against bright backgrounds, spot-meter on the face.

**Safety / welfare copy** (rendered as `warnings[]` when applicable):

- Never use direct flash in a cat's or dog's face at close range.
- Do not physically pose a pet to hit a recipe; wait for a natural moment.
- If the pet shows stress signals (tail tucked, ears back, panting), stop.

### 4.3 Plan Day (`/plan`)

Sun/moon/weather timeline for a chosen location and date. Surfaces the best windows for each subject type (golden hour ranges for portraits, astronomical-dark window for astro, blue-hour band for cityscapes). Implementation lives in [src/app/api/plan/day/](../../src/app/api/plan/day) and [src/lib/sun-day.js](../../src/lib/sun-day.js).

### 4.4 Critique (`/critique`)

Drop a photo → EXIF parse via `exifr` + vision-model critique → structured notes keyed to the recipe's field set. Uses [src/lib/critique-schema.js](../../src/lib/critique-schema.js).

### 4.5 Gear (`/gear`)

Browse and switch gear profiles from [src/data/gear/](../../src/data/gear). Current profiles: `iphone-16-pro`, `pentax-k5`. Validation lives in [src/lib/gear-validator.js](../../src/lib/gear-validator.js); the store persists selection in `localStorage` via [src/lib/gear-store.js](../../src/lib/gear-store.js).

### 4.6 Conditions (`/conditions`)

Tonight-specific astro/light dashboard — moon phase, milky-way visibility window, cloud cover. Currently stubbed; powered by the same sun/weather libs.

### 4.7 Authentication & Payments (per Happy Factory standards)

- Magic-link auth via Resend + iron-session.
- Stripe: `STRIPE_LENS_MONTHLY/ANNUAL` + shared `STRIPE_BUNDLE_MONTHLY/ANNUAL`.
- `<PremiumGate>` on batch critique, custom gear, pet profiles, flash workflow.

### 4.8 PWA & Responsive

- `@ducanh2912/next-pwa`, offline fallback at [src/app/offline/](../../src/app/offline).
- Dark bark sidebar + bottom nav + FAB; perfect at 375px.
- Recipe cache via [src/lib/recipe-cache.js](../../src/lib/recipe-cache.js) for offline replay.

---

## 5. Data Model

Current v1 is **client-side only** — no DB yet. `useGearStore` and `recipe-cache` persist to `localStorage`. Server endpoints are stateless.

When persistence lands (Phase 3), the schema follows Happy Factory conventions:

```
users           id, email, created_at
magic_links     id, email, token_hash, expires_at, used, created_at
sessions        id, user_id, expires_at, created_at
subscriptions   id, user_id, stripe_customer_id, stripe_subscription_id,
                plan ('free'|'premium'|'bundle'), status, current_period_end

gear_profiles   id, user_id (null for built-ins), slug, label,
                lenses_json, modes_json, exposure_modes_json,
                flashes_json, photographic_styles_json, created_at

recipes         id, user_id, subject_id, sub_scene (nullable, e.g. 'pet.napping'),
                scene_json, gear_id, recipe_json, created_at

pets            id, user_id, name, species ('cat'|'dog'|'other'),
                coat_color, typical_indoor_lux, notes, created_at

pet_recipes     id, pet_id, recipe_id, context ('indoor'|'garden'|...),
                rating (1-5, optional), created_at
```

The `pets` + `pet_recipes` tables are **Premium-only** (`Pet profile memory` feature). Free users still get the Pets subject preset; they just don't get per-pet memory.

---

## 6. AI Integration

| Concern         | Choice                                                              |
|-----------------|---------------------------------------------------------------------|
| SDK             | Vercel AI SDK (`ai` v6)                                             |
| Provider        | `@ai-sdk/groq` (free tier, fast). Fallback: Cohere or Anthropic.    |
| Call style      | `generateObject` with Zod schemas                                   |
| Recipe schema   | [src/lib/recipe-schema.js](../../src/lib/recipe-schema.js) — `ShotRecipeSchema`, `RecipeResponseSchema`, `IphoneHintsSchema` |
| Critique schema | [src/lib/critique-schema.js](../../src/lib/critique-schema.js)      |
| Plan schema     | [src/lib/plan-schema.js](../../src/lib/plan-schema.js)              |
| Guarding        | `scene-guard.js` pre-filter + `gear-validator.js` post-clamp        |
| Caching         | Hash of `{subject, sub_scene, rounded_lat, rounded_lng, hour_bucket, gear_id, flash, locale}` in [recipe-cache.js](../../src/lib/recipe-cache.js) |
| i18n            | Prompt and output localized via [src/lib/i18n/](../../src/lib/i18n) (EN / ES-ES) |

**Prompting principle:** the gear profile JSON is injected verbatim into the system prompt so the model sees the legal parameter space. The schema validator is the safety net, not the primary constraint.

---

## 7. Navigation & Screens

Matches the current App Router structure under [src/app/](../../src/app):

| Route           | File                                        | Purpose                                  |
|-----------------|---------------------------------------------|------------------------------------------|
| `/`             | [page.jsx](../../src/app/page.jsx)          | Landing + feature grid + last recipe     |
| `/coach`        | [coach/page.jsx](../../src/app/coach/page.jsx) | 3-step form → shot recipes            |
| `/plan`         | [plan/page.jsx](../../src/app/plan/page.jsx)| Day planner — sun/moon/weather timeline  |
| `/critique`     | [critique/page.jsx](../../src/app/critique/page.jsx) | Upload + EXIF + vision critique  |
| `/gear`         | [gear/page.jsx](../../src/app/gear/page.jsx)| Gear profile picker                      |
| `/conditions`   | *(planned)*                                 | Tonight astro/light dashboard            |
| `/offline`      | [offline/](../../src/app/offline)           | PWA offline fallback                     |
| `/api/coach/recipe`   | `api/coach/recipe/`                   | POST → `RecipeResponseSchema`            |
| `/api/coach/critique` | `api/coach/critique/`                 | POST image → critique                    |
| `/api/plan/day`       | `api/plan/day/`                       | GET/POST → day plan                      |

**Pets entry points** (to be added):

- `/coach?subject=pets` — deep link from homepage feature card.
- Sub-scene picker rendered inside `/coach` when `subjectId === 'pets'`.
- `/pets` *(Premium, Phase 3)* — list of saved pet profiles with per-pet recipe history.

---

## 8. Tech Stack

| Layer         | Technology                                                           |
|---------------|----------------------------------------------------------------------|
| Framework     | Next.js 16 (App Router, JS, Webpack)                                 |
| Runtime       | React 19                                                             |
| Styling       | Tailwind v4 + `globals.css` tokens from shelter-ai                   |
| Fonts         | DM Sans + Fraunces + Caveat                                          |
| AI            | Vercel AI SDK (`ai` v6) + `@ai-sdk/groq` (default)                   |
| Images        | `exifr` for metadata; Cloudflare for uploads (planned)               |
| Sun/moon      | `suncalc`                                                            |
| Weather       | Open-Meteo (free, no key)                                            |
| PWA           | `@ducanh2912/next-pwa`                                               |
| Validation    | `zod` v4                                                             |
| i18n          | Custom `LocaleProvider` under [src/lib/i18n/](../../src/lib/i18n)    |
| Auth          | Magic link via Resend + iron-session *(planned — not yet wired)*     |
| DB            | Neon + Drizzle *(planned when persistence lands)*                    |
| Payments      | Stripe single-app + bundle *(planned)*                               |
| Deployment    | Vercel, domain `lens.happyfactory.app`, local port `3014`            |

---

## 9. Non-Functional Requirements

| Requirement                | Target                                                     |
|----------------------------|------------------------------------------------------------|
| P50 recipe latency         | < 3s                                                       |
| P95 recipe latency         | < 8s                                                       |
| Recipe validator clamp rate| < 5% (prompt-quality signal)                               |
| Offline                    | Last 10 recipes replayable from `recipe-cache`; form renders; submit queues until online |
| PWA Lighthouse             | ≥ 95                                                       |
| FCP                        | < 1.5s on 4G                                               |
| Accessibility              | WCAG 2.1 AA; tap targets ≥ 44px; `input` font-size ≥ 16px  |
| i18n                       | EN + ES-ES shipped; output localized via AI SDK            |
| Responsive                 | 320 / 375 / 768 / 1024 / 1440 breakpoints                  |
| Security headers           | Per Happy Factory `vercel.json` template                   |

---

## 10. Phased Roadmap

### Phase 0 — Shipped

- [x] `/coach` — 3-step shot coach with iPhone 16 Pro hints ([#2](https://github.com/)).
- [x] Critique module + caching + time presets + brand alignment ([#3](https://github.com/)).
- [x] i18n: EN + ES-ES with AI-response localization ([#4](https://github.com/)).
- [x] `/plan` day planner + multi-gear with optional external flash ([#5](https://github.com/)).
- [x] iPhone 16 Pro capacity emulation ([#6](https://github.com/)).

### Phase 1 — Pets subject (this spec)

1. Add `pets` preset to [src/data/subjects/presets.js](../../src/data/subjects/presets.js).
2. Extend the coach form with a **sub-scene picker** that appears only when `subjectId === 'pets'`. Options: `portrait.indoor`, `portrait.garden`, `action.fetch`, `action.zoomies`, `napping`, `with-owner`.
3. Pass `subScene` through to `/api/coach/recipe`; include it in the cache key.
4. Update the prompt with pet-specific composition rules (eye level, catch-light, coat-color EV compensation) and welfare warnings.
5. Add `pet-welfare` tests to the recipe validator: flag any recipe with direct flash + close distance on a pet subject.
6. Homepage feature card + `/coach?subject=pets` deep link.
7. i18n strings for the new subject, sub-scenes, warnings.

### Phase 2 — Conditions dashboard + more gear

- `/conditions` screen (tonight astro window, moon phase, cloud cover).
- Third `GearProfile` (likely Fuji X-T or Sony α). Generalize the iPhone-only hint fields into per-profile extension objects.

### Phase 3 — Persistence & Premium

- Magic-link auth + Neon/Drizzle schema (section 5).
- Stripe checkout (single-app + bundle), `/api/tier`, `<PremiumGate>`.
- **Pet profiles** (Premium): per-pet name, species, coat color, typical indoor lux, and a memory of which recipes worked. Recipes for a named pet bias toward previously-successful settings.
- Recipe history, cross-device sync, favorites.

### Phase 4 — Batch critique & sharing

- Upload N photos from a shoot → per-photo critique + overall trip summary.
- Shareable trip reports (public link with redacted location).
- Following / feed (de-prioritized unless user demand).

---

## 11. Open Questions

- **Per-pet memory UX** — is a separate `/pets` screen the right home, or embed it inside `/coach` as "Who are you shooting?" Likely `/pets` because it lets the user curate without invoking the coach.
- **Species coverage** — the `pets` preset labels "cats & dogs" but the sub-scenes generalize. Do we expose a `species` field to the user, or infer from the uploaded photo in Phase 4? Current plan: optional field, default unknown.
- **Flash + pets** — hard-block direct on-camera flash on pet subjects at <1m, or warn only? Current plan: warn, don't block (some users use red-eye-reduction modes responsibly).
- **Persistence trigger** — keep client-only until a real demand signal, or ship auth + DB with Phase 1 so pet profiles have somewhere to live? Leaning toward Phase 3.
