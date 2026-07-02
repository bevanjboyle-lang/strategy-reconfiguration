# Architecture — System Intelligence (Acute Strategy & Reconfiguration)

Static single-page app: no build step, no framework. Split from a single
218KB index.html on 2 Jul 2026 (register item E1) as a mechanical,
byte-exact extraction — further module splits (app.js by page) = future.

## File map

- `index.html` — shell only (~9KB): head/meta/fonts, body markup,
  CDN `<script src>` tags, then `<script src="app.js">`.
- `styles.css` — full stylesheet (~16KB): briefing-room design language,
  print/board-pack styles, mobile drawer, accessibility focus rules.
- `app.js` — the entire application (~193KB, classic script): Supabase
  reads, rendering, MapLibre map, modelling studio, MCDA, auth gating.
- `geo/` — static reference data fetched at runtime: systems.json,
  trusts.json, sites.json, cqc.json, icbs-need.json,
  catchment-summary.json, plus lsoa/ msoa/ access/ poi/ practices/.
- `tests/` — Playwright smoke suite: smoke.spec.js (12 tests),
  playwright.config.js (serves repo root on 127.0.0.1:4173), README.md.

## Load order (do not change)

CDN scripts first — d3, topojson-client, chart.js, maplibre-gl,
supabase-js — then `app.js` last in `<body>`, in the exact position the
old inline script held. Keep `app.js` a classic (non-module) script:
body `onclick=` handlers resolve its top-level declarations. styles.css
and app.js are referenced by relative path, so serving works unchanged
on Vercel, python3 http.server (tests) and file://.

## Deploy

Push to GitHub `main` → Vercel auto-deploys (pure static serving).

## Data refresh

Weekly launchd job (Mon 07:00): pipeline refresh → serving loaders →
update_freshness.py → qa_checks.py ('Data QA' sidebar badge reads it).

## Serving database
Supabase, tables/views prefixed `sr_*` (sr_metrics, sr_issues, sr_overrides, sr_lens_votes, sr_data_freshness, sr_qa_results, sr_v_*); anon SELECT, authenticated-only writes (E2 RLS).
