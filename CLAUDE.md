# HappyLens AI

## Project Overview

HappyLens AI is a photo-trip planner and shot coach — one of ~23 sibling apps in the Happy Factory suite (independent Next.js apps sharing brand/auth/Stripe patterns). It helps photographers plan shoots (sun/moon/weather-aware shot lists), get AI vision critique on photos, generate camera-adjustment "recipes" tuned to their gear, and manage device/lens gear profiles. Deployed at `lens.happyfactory.app`, local dev on port 3014.

## Quick Start / Commands

```bash
cp .env.example .env.local
npm install
npm run dev          # next dev --webpack -p 3014
npm run build         # next build --webpack
npm run start          # next start -p 3014
npm run lint            # next lint
npm run db:generate      # drizzle-kit generate (from src/db/schema.js)
npm run db:migrate        # drizzle-kit migrate
npm run db:push            # drizzle-kit push (dev-time schema sync)
npm run db:studio           # drizzle-kit studio
```

There is no test script/framework configured in this project.

## Architecture

- **Stack**: Next.js 16 (App Router, JavaScript — no TypeScript), React 19, Tailwind CSS v4, PWA via `@ducanh2912/next-pwa`, Vercel AI SDK (`ai` + `@ai-sdk/groq`).
- **Routing**: `src/app/` — pages are `.jsx` (not `.tsx`). Main routes: `/` (home), `/coach` (critique), `/plan`, `/adjust` (+ `/adjust/batch`, `/adjust/subjects`, `/adjust/r/[id]`), `/gear`, `/account`, `/offline` (PWA fallback).
  - Note: README.md describes a `/plan`, `/critique`, `/gear`, `/conditions` module layout that doesn't fully match the actual routes (actual: `/coach` for critique, `/adjust` for the recipe/adjustment flow, no `/conditions` route exists). Trust the code in `src/app/`, not the README, for current routes.
- **API routes**: `src/app/api/` — `auth/{me,logout,test-login}`, `adjust/{batch,quota,recipe,recipe/[id],subject}`, `coach/{critique,recipe}`, `plan/day`, and `_diag` for diagnostics.
- **UI shell**: `src/app/_components/AppShell.jsx` renders a fixed desktop sidebar + mobile bottom nav across all pages (5 primary sections: coach, plan, adjust, gear, account), driven by `src/lib/i18n/LocaleProvider.jsx`.
- **State/data flow**: Mostly client components calling API routes with `fetch`; no global client state library (no Redux/Zustand). Auth state lives in `src/lib/auth/AuthProvider.jsx` (React Context, polls `/api/auth/me` on mount).
- **Database**: Neon Postgres via `@neondatabase/serverless` + Drizzle ORM (`drizzle-orm/neon-http`). Connection in `src/lib/db.js` — `getDb()` returns `null` if `DATABASE_URL`/`POSTGRES_URL` is unset, and callers are expected to handle that gracefully (see `getCurrentUser` degrading to a session-only user object).
  - Schema: `src/db/schema.js` — tables: `users`, `adjustment_recipes`, `subject_baselines`, `batch_jobs`, `engagement_examples`, `coach_recipes`.
  - Migrations: `src/db/migrations/` (SQL + drizzle meta snapshots).
- **AI**: Only Groq is actually wired up (`src/app/api/coach/critique/route.js`, presumably `coach/recipe` too) via `@ai-sdk/groq` + `ai`'s `generateObject` with Zod schemas (`src/lib/critique-schema.js`, `src/lib/recipe-schema.js`, `src/lib/plan-schema.js`, `src/lib/adjustment-schema.js`). When `GROQ_API_KEY` is absent, routes return a stub response (`source: "stub"`) instead of failing — a deliberate no-key dev-mode pattern.
- **Domain logic**: `src/lib/` — `sun.js`/`sun-day.js` (sun/moon calc via `suncalc`), `weather.js`, `gear-store.js`/`gear-validator.js`, `adjust-history.js`, `recipe-cache.js` (DB-backed AI recipe cache), `scene-guard.js`, `time-presets.js`.
- **Static domain data**: `src/data/` — camera/device profiles (`data/devices/iphone-profiles.js`, `data/gear/*`), subject presets (`data/subjects/*`).
- **Image handling**: `exifr` for EXIF parsing, `heic-to` for HEIC conversion, `src/lib/image-decode.js`.

## Auth Pattern

- Session-cookie auth via `iron-session` (`src/lib/auth/session.js`), cookie name `happy-lens-session`, 7-day maxAge, `httpOnly`/`sameSite=lax`/`secure` in production.
- `getSession()` / `getCurrentUser()` / `ensureUser(email)` are the core helpers; users are looked up/created by email only (no password) — this is a lightweight/email-only account model, not a full credentials system.
- **Test-login convention** (cross-app standard): `POST /api/auth/test-login` creates/logs in a user by email. Gated to `localhost`/`127.0.0.1` host or `VERCEL_ENV === "preview"` — returns 404 elsewhere (i.e., in production). See `src/app/api/auth/test-login/route.js`.
- Client-side: `src/lib/auth/AuthProvider.jsx` exposes `useAuth()` with `{ user, loading, refresh, signOut, testLogin }`.
- No premium/quota system: tiers, quotas and the `adjustment_quota` table were removed — everything is free/unlimited.

## Environment Variables

From `.env.example` (not all are actually read by current code — see notes):

- `DATABASE_URL` — Neon Postgres connection string. Required for accounts/persistence; app degrades gracefully without it (session-only, no persisted data).
- `SESSION_SECRET` — iron-session password, must be ≥32 chars.
- `NEXT_PUBLIC_APP_URL` — app base URL (example default is `:3011`, but this app actually runs on port `3014` — likely a stale copy-paste from another Happy Factory app).
- `GROQ_API_KEY`, `GROQ_MODEL`, `GROQ_VISION_MODEL` — **actually used** (not in `.env.example`, but referenced directly via `process.env` in code, e.g. critique route defaults `GROQ_VISION_MODEL` to `meta-llama/llama-4-scout-17b-16e-instruct`). Without `GROQ_API_KEY`, AI routes return stub/fallback responses instead of erroring.
- `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `COHERE_API_KEY`, `FAL_API_KEY` — listed in `.env.example` as "optional providers" but **not referenced anywhere in `src/`** at present. Aspirational/unused; only Groq is wired up.
- `OPENWEATHER_API_KEY` — listed for weather/sun-moon; check `src/lib/weather.js` before assuming it's live.
- `VERCEL_ENV`, `VERCEL_REGION`, `NODE_ENV` — read directly (platform-provided, not in `.env.example`).

## Code Conventions

- **JavaScript, not TypeScript** — `.js`/`.jsx` throughout, no `tsconfig.json` (uses `jsconfig.json` for the path alias only).
- **Path alias**: `@/*` → `src/*` (see `jsconfig.json`).
- **Styling**: Tailwind v4 (CSS-first config via `@theme` in `src/app/globals.css`) layered with a large set of custom utility classes (`.card`, `.btn`, `.btn-primary`, `.badge`, `.chip`, `.dropzone`, `.gear-card`, etc.) defined in `globals.css`. Design tokens (colors, fonts, radii, shadows) are CSS custom properties (`--bark`, `--leaf`, `--sun`, `--clay`, etc.) matching an earthy/nature brand palette, fonts `DM Sans` (body) + `Fraunces` (headings) + `Caveat` (accent).
  - **Use `.card-grid` for grid layouts — never inline `gridTemplateColumns`** (cross-app convention; inline grids break mobile responsiveness).
- **i18n**: Custom lightweight system, not next-intl/i18next — `src/lib/i18n/LocaleProvider.jsx` (React Context) + `src/lib/i18n/dictionaries.js`. Supports `en`/`es`, switched via `useLocale()`/`useT()` hooks. AI-generated content (critique text) is also localized by passing the target language into the LLM prompt.
- **Runtime**: API routes explicitly set `export const runtime = "nodejs"` (not edge) where DB/session access is needed.
- **Validation**: Zod schemas throughout for both API request/response shapes and structured LLM output (`generateObject`).

## Gotchas

- `getDb()` returns `null` (not a throw) when no `DATABASE_URL` is set — code paths that call it must null-check; several already do (e.g. `getCurrentUser` falls back to a synthetic `{ id, email, plan: "free" }` user from the session alone).
- AI routes fail soft: no `GROQ_API_KEY` → stub responses (HTTP 200, `source: "stub"`); a Groq call that throws → also HTTP 200 with `source: "fallback"` and the error message included. Don't assume a 200 response means real AI output — check `source`.
- `next.config.js` disables the PWA service worker in development (`disable: process.env.NODE_ENV === "development"`), so PWA/offline behavior only shows in production builds.
- `.env.example` documents several AI provider keys (Anthropic, Gemini, OpenAI, Cohere, FAL) that aren't actually consumed by any code yet — only `GROQ_API_KEY` is live. Don't assume adding those keys does anything until the corresponding integration is built.
- `NEXT_PUBLIC_APP_URL` default in `.env.example` (`:3011`) doesn't match this app's actual port (`3014`) — likely copied from a sibling Happy Factory app; update per-app `.env.local`.
- `docs/specs-happy-lens-ai/` and `docs/specs/` both hold spec docs for this app — two directories, not one; check both when looking for existing specs.
