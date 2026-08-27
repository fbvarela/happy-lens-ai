# AGENTS.md

HappyLens AI — Next.js 16 (App Router, **JavaScript**), React 19, Tailwind v4, PWA, Drizzle + Neon Postgres, Vercel AI SDK. Shot coach / photo-trip planner; part of the Happy Factory suite.

Deep architecture reference: read `CLAUDE.md` (accurate — trust code in `src/`, not `README.md`, for current routes).

## Commands & tooling

- **Package manager is `pnpm`** (`pnpm-lock.yaml` is tracked). `package-lock.json` was deliberately removed (commit 6b8bf1a) — do not commit it. README/CLAUDE's `npm install` is stale.
- `pnpm dev` → `next dev --webpack -p 3014`. `pnpm build` → `next build --webpack`. `pnpm start` → `next start -p 3014`. Port is always **3014**.
- **`pnpm lint` is broken** (Next 16 removed `next lint`; there is no eslint config). Do not rely on it. Verification = `pnpm build` + a smoke check.
- **No test framework** is configured. Don't invent one; verify by building and hitting routes manually.
- `next.config.js` sets `output: "standalone"` — `pnpm start` works locally but logs a warning that it ignores standalone (the standalone bundle is for production Node hosting). Warning is harmless.
- Path alias `@/*` → `src/*` (jsconfig.json). Routes are `.jsx`; API routes set `export const runtime = "nodejs"` where they touch DB/session.

## Environment / AI providers

- **Actual env vars read in code** (`grep process.env`): `DATABASE_URL`, `POSTGRES_URL`, `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_VISION_MODEL`, `REPLICATE_API_TOKEN`, `SESSION_SECRET`, `NODE_ENV`, `VERCEL_ENV`, `VERCEL_REGION`.
- Keys in `.env.example` that are **NOT read anywhere** and do nothing: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `COHERE_API_KEY`, `FAL_API_KEY`, `OPENWEATHER_API_KEY`. Don't assume adding them does anything.
- Text/vision AI: **Groq only**. Image generation for engagement example photos: **Replicate** (`REPLICATE_API_TOKEN`).
- **AI routes fail soft**: missing key → HTTP 200 with `source: "stub"`; a provider throw → HTTP 200 `source: "fallback"` with the message. **A 200 does not mean real AI output — always check `source`.**

## Database (Drizzle + Neon)

- `getDb()` returns `null` (does not throw) when `DATABASE_URL`/`POSTGRES_URL` is unset — callers must null-check (e.g. `getCurrentUser` falls back to a session-only user object).
- `db:*` scripts (`drizzle.config.js` uses `loadEnvConfig`) **throw** if `DATABASE_URL` is missing. Migrations live in `src/db/migrations/`.
- Schema: `src/db/schema.js` (tables: `users`, `adjustment_recipes`, `subject_baselines`, `batch_jobs`, `engagement_examples`, `coach_recipes`). `engagement_examples` stores the permanent example gallery; `coach_recipes` persists AI shot recipes (recipe-cache is DB-backed, in-memory Map is just a fast layer).
- No premium/quota system: tiers, quotas and the `adjustment_quota` table were removed. Everything is free/unlimited. Don't reintroduce rate-limit logic.

## Gotchas

- **Engagement example gallery**: `/api/coach/examples` (upload + list + delete, persisted to `engagement_examples`) is on `main`. The **AI generate** route `/api/coach/examples/generate` (Replicate) is part of the `feat/ai-examples` branch / PR #26 — not yet on `main`.
- **Replicate flux-schnell**: the generate route posts `output_format: "jpg"` — **the API rejects `jpeg`** (accepts `webp|jpg|png`). Don't "fix" it to `jpeg`.
- Replicate returns temp signed image URLs (~24h); the client "Save to examples" path fetches → downscales → persists to Postgres so AI examples stay permanent.
- `engagement_tips`/`subject-tips` styling: shared tips lists reuse `.subject-tips`; grids use `.card-grid` (never inline `gridTemplateColumns`) — cross-app convention.
- PWA build emits `public/sw.js`, `workbox-*.js`, `fallback-*.js`, `swe-worker-*.js` — the latter two are gitignored but **already tracked** in git; a build modifies them. Exclude them from feature commits (`git checkout -- public/fallback-*` before committing).
- i18n: custom system (`src/lib/i18n/LocaleProvider.jsx` + `dictionaries.js`), `en`/`es`, `useT()`/`useLocale()`. Add strings to BOTH locales.

## Deploy & branch flow

- Only CI workflow: `sync-dev-from-main.yml` — on merge to `main`, force-pushes `main` onto `dev` (a mirror that drives Vercel preview `lens-dev.happyfactory.app`). **Never edit `dev` directly; merge to `main`.**
- Manual login for testing: `POST /api/auth/test-login` `{ email }` — gated to `localhost`/`127.0.0.1` or `VERCEL_ENV=preview`, returns 404 elsewhere.
