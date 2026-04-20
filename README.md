# HappyLens AI

Photo-trip planner and shot coach. Part of the [Happy Factory](https://happyfactory.app) suite.

## Stack
Next.js 16 (App Router, JS) · React 19 · Tailwind v4 · PWA (`@ducanh2912/next-pwa`) · Vercel AI SDK.

## Develop
```bash
cp .env.example .env.local
npm install
npm run dev      # http://localhost:3011
```

## Modules (planned)
- `/plan` — pick subject + location + date → sun/moon/weather + AI shot list.
- `/critique` — drop a photo → EXIF parse + vision-model critique.
- `/gear` — gear profiles so plans adapt to the kit you own.
- `/conditions` — tonight's astro/light conditions at your location.

## Domain
`lens.happyfactory.app` · local port `3011`.
