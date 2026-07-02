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
- `tests/` — Playwright smoke suite: smoke.spec.js (15 tests),
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

## Explorer (three uncurated surfaces)

EXPLORER nav group after EXPLORE; all three stages are catalogue-driven —
the UI reads `sr_v_metric_catalog` (150 metrics: coverage, unit, standard,
confidence mix, latest source) and `sr_v_fact_catalog` (line-level split
counts), so newly ingested metrics and splits appear automatically with no
app change:

- Trust explorer (`xentity`) — any English acute trust (region-grouped
  picker, current system first): summary strip (system, CQC, fragility,
  distress pills) + per-domain tables (latest · vs standard · vs national
  median · 12-point spark · SPC verdict chip), each row expandable to the
  full series chart, line-level splits and 'Open drill'. The trust's whole
  series is fetched once (`sr_metric_values`, service_id null) and cached
  in `xSeriesCache`; system trusts reuse the boot-time `series`.
- Metric explorer (`xmetric`) — search + domain chips over the catalogue;
  England ranked table (top 30 / show all, distress-coloured, CSV), the
  national distribution strip highlighting the current system, an overlay
  chart of up to 6 ticked trusts with the dashed national median from
  `sr_benchmarks`, and a line-split picker where the fact catalogue holds
  splits. `XSPLIT_MAP` pairs status codes to their sibling fact codes
  (dm01_6wk→dm01_6wk_test_pct, cancer_62→cancer_62_tumour_pct,
  bed metrics→beds_specialty_occupied); exact code match is the fallback.
- Extract grid (`xgrid`) — up to 12 metrics × scope (current system /
  all-England acute / ≤20 custom trusts) × month range → PostgREST reads
  paginated at 1,000 rows with a 20,000-value cap (deterministic order:
  period, organisation, metric), pivoted org × period table (first 400
  rows displayed), long-format CSV carrying source + confidence on every
  value, and a copyable JSON query definition for reproducibility.

Cross-links: the metric drill modal offers 'All trusts on this metric →'
(xmetric) and 'Everything on <trust> →' (xentity); `openDrill` lazily
fetches series for non-system trusts so drills work England-wide.

## Domain pages on the national curated layer (Full-Depth Programme, 2 Jul 2026)

The six EXPLORE domain pages (Activity, Performance, Capacity, Estate, Finance,
Workforce) previously read only the modelled `sr_fact` scheme (rich for the BSW
flagship, sparse elsewhere), so non-flagship systems saw half-empty pages. They
now open with a **national primary panel** built from the boot-loaded curated
layer — `rows` (`sr_v_metric_status`) for latest values and `series`
(`sr_metric_values`, `service_id` null) for trends — which is populated for every
English acute trust. Shared helpers (defined just after `officialSeries`):

- `focusTrust()` — the selected org if it is an acute trust, else the system's
  first trust (curated national coverage is trust-level; the BSW group/ICB orgs
  carry only ~30/19 curated metrics, so pages key off trusts).
- `curatedCards(codes)` / `natTrustTable(codes)` / `nationalBlock(cardCodes,tableCodes,note)` —
  KPI cards for the focus trust + a system-trusts × metrics table (click → `openDrill`).
- `covNote(msg)` — the "coverage note instead of an empty primary panel" primitive.

The legacy modelled panels remain as clearly labelled "flagship detail", each
guarded (`hasFin` / `hasWf` / `bedSites.length` / `hasEst`) so a non-flagship
system renders a coverage note rather than zero-valued cards/charts. `system()`
name / `sysLabel()` / `sysTrusts()[0]` replace former hard-coded BSW/RD1 literals.

`sr_commitments` (new serving table, RLS anon-select / authenticated-insert)
persists the Decision-journey Commit stage's agreed top-5 + lens per system.
