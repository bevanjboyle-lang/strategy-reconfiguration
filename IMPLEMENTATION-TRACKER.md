# Implementation tracker — systematic review register (2 Jul 2026)

Source: "Strategy and Reconfiguration - Systematic Product Review.docx". All 41 items scheduled.
Status: todo / in-progress / done / blocked. Update as work lands. App source = repo index.html;
serving scripts = <real folder>/scripts/serving; lake = DuckDB read-only.

## Wave 1 (this session)
- [x] D3 DM01 by test type → serving (lake first_wave? diagnostics in second_wave mart) — openTestDrill modal off drivers fragility DM01 cells: latest bar list per test + worst-3 24-month trend
- [x] D4 Cancer by tumour group → serving drill data — openTumourDrill off cancer 62-day cells (BSW trusts; graceful 'loads with full ingestion' note elsewhere)
- [x] D6 A&E attendances + emergency admissions series — ae_attendances + emerg_admissions KPIs/comparisons on Flow; emerg_admissions appended to UEC driver table
- [x] D9 Discharge-ready % + virtual ward occupancy completion — vw_occupancy_pct wired to Flow & transit
- [x] A3 Peer-family benchmarks (peer_median/p25/p75 per metric-period) from geo/trusts.json peer_family — drill shows peer median (TRUSTMETA .peer family) + national p25–p75; stray future-dated benchmark rows filtered at load
- [x] D1 Real finance: oversight framework (lake) + MHS opex/income; fix 'deficit' credibility — real 'Variance to financial plan (YTD)' + Oversight segment cards on Finance; modelled I&E re-capped 'Modelled illustration pending PFR ingestion'
- [x] D2 Workforce serving: lake workforce stats + sickness (+ MHS BSW turnover/sickness) — partial: vacancy blocked; official quarterly sickness KPI + sparkline live, vacancy/sickness/turnover table columns tagged modelled
- [x] D5 Activity volumes: HES MAR admissions/outpatient attendances per trust — adm_elective in elective driver table, emergency/A&E counts on Flow; op_attendances ingested but held off driver tables (kept tight)
- [x] D8 SNPP age-band projections per system — sr_population_projections: 2025–2040 stacked 65–84/85+ chart, age-band table and growth-to-2040 KPIs on Population
- [x] U2 Drill modal: peer + quartile display — peer median + national quartile .kv rows in renderMetricModal (mono styling kept)
- [x] U4 Challenge lifecycle: adjudicate/adjusted/toggle-to-source — state chips, facilitator Accept-as-adjusted/Dismiss via ?facilitator flag (interim until U3 auth), adjusted-value display with view-source toggle, amber 'adjusted' pill on rows
- [x] U5 Map distress lens toggle — 'Service distress' basis chip recolours icb-fill paper→amber→red from mean trust distress per system; legend follows
- [x] U8 Label polish (period labels, NHS casing, axis grains) — fmtPeriod 'May 25' labels across charts/captions, trustShort strips residual 'Nhs', exec deficit phrase now pct + '(published YTD variance)'; beds chart label alignment verified already correct
- [x] S1 MCDA score provenance badges + disclosure + surface issue evidence — facilitator-seeded vs illustrative tag on issue modal, linked sr_issue_evidence/sr_evidence_items titles, disclosure line in Frame
- [x] E3 Fetch error/empty/loading states — loadAll try/catch retry banner, ensure() returns [] + lastEnsureError with per-page soft note, geo layer catches console.warn
- [x] U1 Options/appraisal/statutory tests/packs UI over dormant sr_* tables — new APPRAISE nav group: Options & appraisal (4 option cards + impact-derived six-criteria matrix with live lens weighting + stored per-lens AI score; option modal with components/impacts/risks/finance-year chart/workforce table) and Tests & packs (27 statutory tests grouped per option with status pills; pack register honest empty-state + export smoke-test log)
- [x] S4 Issue→option→test traceability view — real registered chain (sr_options.source_draft_id → sr_ai_option_drafts.issue_ids → sr_issues; sr_statutory_tests.option_id) surfaced in both the option modal and openIssue modal: linked issues ⇄ options, strongest/weakest derived criterion, statutory-test tally
- [x] A1 v1 Demand & capacity engine — real 12-month activity + bed baselines from `series`, ONS SNPP age-band-weighted demographic index (editable elasticities 0.6/1.0/2.2/3.6), scenario layers (non-demo growth, shift-of-care, LoS/productivity, occupancy ceiling), demand + bed-need vs available to 2040, requirement cards, save/load of versioned runs (sr_scenarios + sr_model_runs + 75 sr_model_outputs rows per run; anon INSERT policies added mirroring sr_overrides), Method & data note + live 23-metric data dictionary

## Wave 2 done
- [x] A2 (data precompute) — geo/access/<slug>.json for all 42 systems (2.4MB total, largest 126KB) via scripts/serving/build_access_matrix.py: estimated drive minutes (haversine × 1.3 windiness, 28/40/55 km/h bands — NOT routed, swap for OSRM/ORS later) from every LSOA centroid to its 4 nearest hospital-like sites (system trusts + 40km cross-border buffer); per-file baseline summary (popwtd_mins, pct_over_45, core20_popwtd_mins, worst_decile_gap=Core20−rest). A2 UI left to app agent.
- [x] D7 National SHMI + CQC into serving — scripts/serving/load_d7_shmi_cqc.py: shmi 9,010 rows (119 acute trusts × 76 rolling publications Mar20–Jun26 publication months, raw ~1.0 scale, tag #d7-shmi-v1; metric now 'Summary Hospital-level Mortality Indicator (SHMI)' unit score, no standard; old ×100 BSW trust rows removed, BSW group aggregate rescaled ÷100) + cqc_rating 133 rated acute trusts 1–4 at rating publication date (tag #d7-cqc-v1; metric 'CQC overall rating (4=Outstanding)', standard 3)
- [x] A6 Fragility composite v1 — scripts/serving/build_fragility_composite.py: transparent weighted 0-100 (occupancy .20 [88→98], DM01 .15 [0→25], CQC inverted .20, SHMI banded .15 [0.90→1.10], sickness .15 [3.5→6.5], RTT low-volume-specialty share <500 pathways .15 BSW-only), weights renormalised over available, ≥3 components required; 134 trusts → fragility_index (period run-date, confidence derived, tag #a6-v1); BSW: RD1 55.0 / RN3 49.1 / RNZ 35.0; national top: Blackpool 89.1, Mid & South Essex 88.6, George Eliot 88.5
- [x] D12 Refresh automation + freshness — sr_data_freshness table (13 source families, anon read) fed by scripts/serving/update_freshness.py; scripts/serving/refresh_all.sh (national-serving + d3 + d6 + d9 loaders --live + freshness, || true, logs/refresh_YYYYMMDD.log; manual BSW lake extract excluded); launchd com.bsw.sr.refresh Mondays 07:00 installed + loaded (uninstall: launchctl unload ~/Library/LaunchAgents/com.bsw.sr.refresh.plist && rm ~/Library/LaunchAgents/com.bsw.sr.refresh.plist)
- [x] A2 (UI) — new 'Access & travel' stage in EXPLORE: KPI band (pop-weighted mean est. minutes, % population >45 min, Core20 mean, Core20-vs-rest gap 'negative = deprived communities closer'); what-if panel unticking the system's General Acute sites recomputes all four KPIs client-side from each LSOA's stored 4 nearest (all-4-excluded → 4th time + 10 min, flagged 'beyond stored range'), deltas red when worsening + 10 worst-affected LSOA table (code/pop/IMD/Core20/before→after); IMD-decile equity bar strip baseline-vs-scenario; method `<details>` quoting the file's method string + 'Estimated, not routed — OSRM-grade routing scheduled'. Option modal cross-links 'Assess travel impact →' when components mention modelled site names (fuzzy contains). Overview map untouched.
- [x] A4 SPC — spc(): baseline mean/σ from first max(12, half) points; special cause = (i) last-3 beyond mean±3σ, (ii) ≥7 consecutive one side of mean, (iii) ≥6 consecutive rising/falling; direction via higher_is_better. Drill modal: verdict chip on the Trend row (amber deterioration / green improvement / grey common-cause) + one-line detail; mean and ±3σ dashed #9aa0af guides drawn on the drill trend; <8 points → 'insufficient series for SPC'. SHMI drill uses official-confidence points only.
- [x] A5 UEC chain — Flow & transit 'UEC flow chain': delayed_discharge_beddays → bed_occupancy → amb_over30_pct → ae_4hr node diagram with Pearson r per link (month-intersection alignment; quarterly occupancy matched to the quarter containing each month; ≥10 overlapping months per link), plain-English strongest-link sentence + Chart.js scatter of the strongest pair; soft note for systems without BSW-depth series.
- [x] U6 System-vs-England strips — distStrip(): inline SVG of every English acute trust's latest value (light dots), peer-family darker, highlighted org(s) as ink diamonds, min/median/max mono labels + dashed median tick. In every metric drill (with peer family of the drilled trust) and a new Overview 'System vs England' card (ae_4hr, rtt_18wk, bed_occupancy, cancer_62, fragility_index) marking the system's trusts. (Place tier: not in this wave.)
- [x] U7 Exports — @media print board-pack stylesheet (side/topbar/map UI/chips/buttons/selects hidden, cards keep-together, hidden .printhead 'System Intelligence — system — date — source-tagged data' populated in render()); 'Board pack (print)' topbar button; tableToCsv/csvTable DOM→CSV downloads on all four driver tables and the options appraisal matrix (<driver>-<system>-<date>.csv).
- [x] U3 Auth (in-app) — Supabase email OTP: 'Sign in' topbar button → prompt → signInWithOtp → 'Check your email' banner; getSession + onAuthStateChange keep session; signed-in email + 'Sign out' shown. isFacilitator() = session email ∈ FACILITATOR_EMAILS ['bevan.j.boyle@gmail.com'] (legacy ?facilitator flag no longer sufficient on its own). submitChallenge / setOverrideState / saveModelRun gated on session with inline 'Sign in to challenge/save (public data stays open to read)' notes and surfaced insert errors. Memberships/org-scoped enforcement still to come.
- [x] E2 RLS write lockdown — dropped anon INSERT policies sr_anon_ins_override (sr_overrides), prototype_insert_scenarios, prototype_insert_model_runs, prototype_insert_model_outputs; created authenticated-only sr_auth_ins_override_proto + sr_auth_upd_override_proto (sr_overrides), sr_auth_ins_scenarios, sr_auth_ins_model_runs, sr_auth_ins_model_outputs (all WITH CHECK true, prototype-grade). Anon SELECT retained everywhere. Migration e2_write_lockdown_authenticated_only.
- [x] D12 (UI) — freshness[] loaded in loadAll; sidebar foot 'Data as at: <max latest_period ≤ today> · refreshed weekly (Mon 07:00)'; drill provenance appends '· loaded <date>' via best-effort source-tag match (freshFor: a6/shmi/cqc/sickness/oversight/virtual-ward/hes/national-serving; silent skip otherwise); 'Data freshness' table at the bottom of Modelling Method & data.
- [x] D7/A6 (UI wiring) — fragility_index prepended and shmi + cqc_rating appended to the service-fragility driver table (shmi moved to the append slot); 'How fragility is scored' modal off the fragility card (six components + weights, renormalised, ≥3 required, 'derived score — challengeable by trusts'); SHMI drill trend/strip filtered to confidence='official'; derived confidence renders amber (#7a6200) with its own label in provenance.

## Wave 2 (next session)
- [ ] U3 follow-up: memberships table + org-scoped RLS enforcement (current lockdown is authenticated-only, facilitator list hardcoded client-side)
- [ ] U6 remainder: Place tier
- [x] E1 Modularise app (2 Jul 2026) — index.html (218KB) split into index.html shell (9.1KB, links + CDN scripts + `<script src="app.js">` in the old inline position), styles.css (15.8KB) and app.js (193KB); byte-exact mechanical extraction (programmatic re-inline reconstruction matched the original exactly; backup kept at /tmp/index_backup.html); relative paths so Vercel static serving is unchanged; node --check clean; Playwright smoke 12/12 green post-split (server log confirms styles.css/app.js served). Extraction only — further module splits (app.js by page/domain) = future. ARCHITECTURE.md added at repo root. Smoke-in-CI wiring still open.

## Wave 3 done
- [x] D10 Cross-border catchment proxy — scripts/serving/load_d10_catchment.py: Estates Intelligence trust_catchment.csv (trust×MSOA attributed_pop) joined to estates msoa.csv msoa21→icb_slug, home ICB from geo/trusts.json; per acute trust catchment_pop + crossborder_share (% of attributed catchment pop outside the trust's home ICB), one period=run-date row per trust, confidence derived, tag #d10-v1 (134 trusts, 268 rows). BSW: RD1 414,025 / 14.1%, RN3 367,818 / 5.0%, RNZ 234,466 / 16.9%. geo/catchment-summary.json written {trust_code:{pop,crossborder_pct}}. UI wiring left to app agent.
- [x] D11 GP referrals — scripts/serving/load_d11_referrals.py: aggregated from bronze.nhse_outpatient_referrals (the gold first_wave copy has corrupted observation_value casts — avoided); Op Gprefsmade M + Op Otherrefsmade M summed per provider-month; 135 acute trusts, 2020-06→2024-03, 6,184 rows; metric gp_referrals 'GP & other referrals made (monthly) (to Mar 24)' (demand/elective_backlog, count, hib false), confidence official, tag #d11-v1. MRR publication paused after Mar 24 → staleness suffix in name.
- [x] E6 Nightly QA — scripts/serving/qa_checks.py → new table sr_qa_results (run_at, check_key, status ok|warn|fail, detail; anon read; migration create_sr_qa_results). Checks: freshness age per family vs hardcoded expected cadence+45d grace (static/paused families d8/d10/d11 skipped), live row count within ±30% of sr_data_freshness stored value, spot value sanity (bed_occupancy 40-110, ae_4hr 20-100, rtt_18wk 20-100, shmi 0.5-1.6; ≤1% out-of-range tail → warn not fail). Appended to refresh_all.sh after update_freshness; update_freshness.py extended with d10_catchment + d11_gp_referrals families (15 total). First live run: 34 checks — 31 ok, 2 warn (Moorfields 27.5% occupancy + one 18.7 rtt_18wk value, genuine extremes), 1 FAIL: d3_dm01_tests latest 2026-04-01 (92d old, allowed 76) — DM01 by-test-type feed one publication cycle behind, investigate lake source.

- [x] A7 Backlog clearance outlook — drivers page, elective section (electiveClearanceCard()): per trust latest WL (rtt_total) vs net monthly clearance = 12-mo mean adm_elective − 12-mo mean gp_referrals × 0.55 assumed conversion (stated inline); months to 92% via target WL = WL × (current 18wk% ÷ 92), floored where already ≥92; red 'not clearing — inflow exceeds treatment' verdict; formula + provenance note incl. MRR referral staleness (published to Mar 24 only) and admitted-clearance-only caveat.
- [x] A8 Distress method + criticality — 'method' link on each driver eyebrow → openDistressInfo() modal (openFragilityInfo pattern) documenting distress = clamp(0–100, position×60 + worsening×15 + (criticality−3)×8) and near-failure = breach + deteriorating + criticality≥4; facilitator-only steppers (1–5) over the 21 driver metrics update sr_metrics.criticality (migration a8_metrics_update_auth — UPDATE to authenticated), then rows reload from sr_v_metric_status and re-render; non-facilitators see read-only values.
- [x] S2 Workshop weighting — migration s2_lens_votes: table sr_lens_votes(id, voter, weights jsonb, created_at), anon read + authenticated insert. dFrame card: 'Submit my weights' (current sliders → row, voter=sessionEmail(), latest vote per voter counts); at ≥2 votes a divergence view (per-criterion min/median/max bars), voter table (email local-part) and facilitator 'Adopt median weights' → lensName 'Workshop median' (lensBar now shows any non-preset lens name); signed-out users get a sign-in note.
- [x] S3 Ranking sensitivity — dPrioritise card: each criterion's weight stressed ±25% one at a time (renormalised via wsum denominator), tornado-style bars of the max rank shift among the current top-5 issues, one-line verdict naming issues that never leave the top 5 ('robust under ±25% weight stress').
- [x] S5 Auto-draft issue register — dSurface, when the current system (non-BSW) has no issues of its own: up to 6 client-side drafts from near_failure/serious rows of the system's trusts (≤2 per driver, severity 5/4/3 at distress ≥80/≥65/else), titled '<Driver>: <metric> at <value> (<trust>)', badged 'auto-draft — not saved'; facilitator 'Save drafts to register' inserts into sr_issues (code slugified driver-metric-org, ai_seed=true, status candidate, autogenerated problem_statement; migration s5_issues_insert_auth — INSERT to authenticated) then reloads issues and re-renders.
- Verification (2 Jul 2026): node --check clean throughout; existing Playwright smoke 12/12 green post-change; headless probe of all five new surfaces (clearance card + verdicts, distress modal + criticality table, frame voting card, sensitivity card + verdict, non-BSW draft register + facilitator gate) rendered with zero console errors.

## Wave 3 (2 Jul 2026)
- [x] U9 Onboarding + glossary — first-visit 5-step guided tour (localStorage `sr_tour_done`; auto-skips under automation via `navigator.webdriver` or when localStorage is unavailable): dark scrim + highlight box + positioned `.card` popover (Next/Back/Skip, role=dialog, focused on open) covering system picker, strategic map & layers, priority-drivers nav, decision-journey nav, challenge-anything ethos + sign-in note; 'Take the tour' re-runs it from the sidebar foot (jumps to overview, opens the drawer for nav steps on mobile). 'Glossary & standards' sidebar link → modal with plain-English entries: RTT 18wk 92%, A&E 4hr, cancer 62-day 85% + FDS 75%, DM01 6wk, G&A occupancy 92%, SHMI, Core20, IMD, distress index, near-failure, SPC special cause, fragility composite, confidence tags (official/actual/derived/modelled).
- [x] U10 Accessibility — aria-labels on topbar selects/print button, nav buttons (+data-stage, aria-current=page), map chips (aria-pressed), close ×s; all 10 `.modal`s get role=dialog aria-modal=true, focused on open (MutationObserver sets tabindex=-1), one Escape keydown handler closes tour → modal → mobile drawer; `:focus-visible` 2px var(--accent) outline; contrast: `.chip` → var(--ink), `.note`/`.kpi .s`/`.side .foot`/legend footnotes #9aa0af → #5a6172 (AA at body sizes); spark/strip svgs aria-hidden; `prefers-reduced-motion` kills .view fade/transitions, countUps land instantly, map fitBounds duration 0.
- [x] E4 Performance — `<link rel=preconnect>` for Supabase + tiles.openfreemap.org; overview map poi/practices geo files now fetched lazily on first toggle-on (refreshSystemLayers guards on mapState/source, toggleMapLayer loads then applies); sr_issue_evidence/sr_evidence_items/sr_data_freshness (+freshline, QA badge) moved out of the boot Promise.all into a post-render microtask (`deferredLoads`, awaited by the modelling page for its freshness table); lens votes were already lazy.
- [x] E5 Mobile ≤920px — sidebar becomes an off-canvas drawer (transform slide, scrim click / Escape / nav click closes) behind a fixed chip-style hamburger (aria-label + aria-expanded); topbar already wraps, padding clears the button; `.mapwrap` 380px; all `.card`s get overflow-x:auto so driver/option tables scroll; body 14px / h1 22px / KPI 22px floors; modal + view padding tightened. Verified headless at 390×844: drawer opens/closes, tour + tables OK.
- [x] Wirings — Population page 'Cross-border flows' card from D10 metrics (`crossborder_share`/`catchment_pop` per system trust, e.g. 'RD1 · 14.1% of 414,025 catchment beyond home ICB') with one-line derived-proxy caveat; sidebar 'Data QA: n ok / n warn / n fail' badge from latest `sr_qa_results` run (green/amber/red), click → modal listing non-ok checks with details.

## Tests (E1 — Playwright smoke, 2 Jul 2026)

- Suite: `tests/smoke.spec.js` — 12 sequential tests (load/console hygiene, overview exec + driver ribbon, maplibre layers `icb-fill`+`sites-c`, Devon system switch, driver tables + CSV, metric drill benchmarks/SPC/provenance, access what-if deltas, modelling engine (8 sliders, req cards, 23-row data dictionary, freshness), options cards + matrix + modal tally, 27 statutory test rows, decision journey chips/robust badge/score provenance, signed-out auth gating incl. write inertness). App untouched; server = python3 http.server 4173 via Playwright webServer; live Supabase anon reads.
- Run: `cd /tmp/sr-repo/tests && PATH="/Users/bevanboyle/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/@playwright/test/cli.js test` (= `npm test` where npm exists; setup in tests/README.md — note `NODE_ENV=production` in the env forces `npm i --include=dev`).
- Result: 12/12 passed, ~33s wall (two consecutive green runs). No app bugs found; one design nuance recorded in tests/README.md (signed-out challenge form shows Submit button + sign-in note; write correctly gated client-side and by E2 RLS — test 12 proves no insert).
- Modularisation done (2 Jul 2026): index.html → shell + styles.css + app.js, suite 12/12 green post-split. Still open: wire this suite into CI.


## Explorer (2 Jul 2026)

- [x] Explorer nav group (EXPLORER, after EXPLORE) — three catalogue-driven, uncurated surfaces over the new serving views `sr_v_metric_catalog` (150 metrics) + `sr_v_fact_catalog` (line splits: dm01_6wk_test_pct 15 · cancer_62_tumour_pct 18 · beds_specialty_occupied 78 · amount 21); catalogue fetched once per session and cached; new data appears automatically.
- [x] Trust explorer (`xentity`, renderXEntity) — region-grouped picker of every English acute trust (current system first); summary card (system, CQC pill, fragility, distress + near-failure, metric count); per-domain tables: latest (distress-coloured) · vs standard · vs national median (green/red by higher_is_better) · 12-point spark · SPC verdict chip · expand chevron → inline full-series chart (fmtPeriod labels, dashed standard), provenance line, 'Open drill' link, and line-split latest-per-line table where sr_v_fact_catalog holds splits (XSPLIT_MAP pairs status→fact codes); per-domain CSV (xeCsv skips expand rows). Series fetched once per trust (sr_metric_values, service_id null, limit 20000) into xSeriesCache; system trusts reuse boot `series`.
- [x] Metric explorer (`xmetric`, renderXMetric) — search (org-count-relevance when searching) + domain chips over the catalogue; list shows name, code, coverage 'n trusts · from→to · n obs', latest source + confidence mix; right side: England ranked table (top 30 / show all, status, CSV, overlay checkboxes max 6 default = current system trusts, trust name → openDrill), distStrip highlighting system trusts, overlay chart (per-trust series cached per metric·org, dashed national median from sr_benchmarks) and split picker charting a chosen line_code for the ticked trusts from sr_fact.
- [x] Extract grid (`xgrid`, renderXGrid) — lead states 'Uncurated extract. Every value carries source and confidence in the CSV.'; builder: searchable metric checklist (max 12), scope radio (current system / all England acute / custom picker max 20), month-range inputs (default last 24 mo); Run → sr_metric_values paginated .range() at 1,000 with 20,000-value cap (+cap banner), deterministic order period/org/metric; pivoted org×period table (first 400 rows) + value/row counts; long-format CSV (org, metric, period, value, unit, source, confidence; Blob download) + 'Copy query definition' JSON (metrics, org codes, period_gte/lt, cap, rows_returned) via clipboard with prompt fallback.
- [x] Cross-links — renderMetricModal gains ghost buttons 'All trusts on this metric →' (xGoMetric → xmetric preselect) and 'Everything on <trust> →' (xGoOrg → xentity preselect, acute trusts only); openDrill/drillSeries fall back to xSeriesCache with a lazy fetch, so drills (chart + SPC + strip) now work for any English trust, not just the current system.
- [x] Tour 6th step ('Or skip the story' → Explorer nav, drawer-aware) + Glossary 'Explorer' entry. One shared css addition `.xgrid2` (responsive 340px/1fr grid); no new colours — pills/strips/mono/hairlines reused.
- [x] Tests 13–15 (Trust explorer non-BSW trust: domains + sparks + expand chart; Metric explorer: search 'occupancy' → select → ranked table >10 + overlay canvas; Extract grid: 2 metrics current-system → pivot rows + CSV/copy buttons). Suite now 15 tests — 15/15 green twice consecutively (~60s). Real bug found by test 15 and fixed: xgToggleMetric/xgToggleOrg re-rendered the checklist on every toggle, destroying the just-clicked checkbox mid-interaction (focus/state loss for keyboard users and automation) — now only the count updates; the list re-renders only when the 12/20 cap forces a revert.
- Verification (2 Jul 2026): node --check clean throughout; headless probe beyond the suite — modal cross-link → xmetric ranked table (30 rows), non-system drill (RX1) lazy series + SPC line, cross-link → xentity card, dm01 splits expand (13 test lines), xmetric split picker (14 options) charting a split, England-scope extract 1,486 values / 400 pivot rows / CSV + copy present — zero console errors.


## Full-Depth Programme — WP1 · WP3 · WP4 · WP5 (2 Jul 2026)

Environment note: implemented against a clean clone of `main` (b0027ae). The E2E Playwright
suite could NOT be run in the authoring sandbox (no browser libs; Supabase REST proxy-blocked)
and there was no push credential — so acceptance was verified at the **data level via the
Supabase MCP** and `node --check`, and the suite is handed to the Mac to run before push.
DB ground-truth reconfirmed: `sr_metric_values` 114,353 rows / 141 metrics / 137 orgs;
`sr_fact` 117,628 / 44 codes; views `sr_v_metric_status` + `sr_v_metric_catalog` present.

### WP1 — de-BSW audit & journey copy  [done, code]
Rendered-copy BSW/place literals removed so nothing reads BSW-specific for a non-BSW system.
BSW stays the default flagship (all `sysSlug===BSW_SLUG` logic retained as data).

| Site (function) | Was | Class | Fix |
|---|---|---|---|
| `sysNote()` banner | "the BSW flagship system" | PARAMETERISE | "the flagship system" |
| `renderFlow` empty-state | "the BSW flagship system" | PARAMETERISE | "the flagship system" |
| `renderModelling` banner | "the BSW flagship system" | PARAMETERISE | "the flagship system" |
| `renderOptions` banner | "belongs to the BSW flagship system" | PARAMETERISE | "the flagship system" |
| `renderCapacity` lead | "across the BSW Hospitals Group" | PARAMETERISE | "for the flagship system" |
| `renderEstate` lead + KPI sub | "across BSW sites" / "all BSW sites" | PARAMETERISE | "flagship system's sites" / "all flagship sites" |
| `renderPopulation` fallback KPIs | "1.0m / BSW ICS", "+35% / per ASR" | REMOVE (wrong number) | "—" placeholders |
| `methodHtml` data dictionary | `orgs.find(code==='RD1')` + "(RD1 or first trust)" | PARAMETERISE | `sysTrusts()[0]||RD1` + "(first trust in scope)" |
| TOUR step | "The BSW flagship carries…" | PARAMETERISE | "The flagship system carries…" |
| sensitivity method row | "(BSW trusts only this wave)" | PARAMETERISE | "(flagship trusts only this wave)" |
| `BSW_SLUG`, `sysSlug` default, `sysOrgs` icb/provider_group, `sysNote` guard, `renderOptions` guard, `dSurface` auto-draft gate | — | KEEP-AS-DATA | unchanged (correct default-flagship logic) |

Only residual "BSW" in the file is a non-rendered code comment (UEC chain, L~473).
Auto-draft register default (`dSurface`: non-BSW + no owned `sr_issues` → `draftIssuesCard()`) confirmed present and retained.

### WP3 — domain pages on the national curated layer  [done, code + data-verified]
New shared helpers (after `officialSeries`): `sysLabel`, `focusTrust` (selected org if an acute
trust, else the system's first trust — curated national coverage is trust-level, not group/ICB),
`curatedRow`, `curatedCards`, `natTrustTable`, `covNote`, `nationalBlock`. Each domain page now
opens with a **populated national primary panel** (KPI cards for the focus trust + a system-trusts×metrics
table, all click-through to the drill) and demotes the old modelled `sr_fact` panels to clearly
labelled "flagship detail", guarded so a non-flagship system shows a **coverage note, never an empty panel**.

Per-page national metric_codes (all confirmed non-null for RD1/RA9/RJ1 = BSW/Devon/London):
- Finance: cards `of_of0079, of_of4003, of_of4103, of_of0085`; table `deficit, of_of0079, of_of0085, of_of4103` (+ existing deficit/segment published block). Modelled I&E/pay/BS/CF guarded (`hasFin`) → flagship only.
- Workforce: cards `sickness_rate, staff_engagement, of_of4004, of_of4104`; table `sickness_rate, staff_engagement, of_of0084, of_of4104`. Staff-group establishment guarded (`hasWf`) → flagship only.
- Capacity: cards+table `bed_occupancy, beds_ga_available, delayed_discharge_beddays, vw_occupancy_pct`. Per-site beds/occupancy/assets guarded (`bedSites.length`) → flagship only.
- Activity: cards `ae_attendances, emerg_admissions, adm_elective, op_attendances`; table `+adm_emergency, rtt_total`. Specialty×POD framed "flagship activity detail".
- Performance: cards `rtt_18wk, cancer_62, dm01_6wk, ae_4hr`; table `+rtt_52wk, cancer_fds_28`. RTT×specialty heatmap framed "flagship-grade detail"; DM01-by-test (national) + cancer-by-tumour (flagship) drills unchanged.
- Estate: no national curated estate domain exists → primary is the ERIC per-site set for the flagship, else a coverage note pointing to WP2(a). (This page's full "real values for Devon/London" acceptance is WP2-gated.)

Acceptance (data level, Supabase MCP): for BSW/Devon/London focus trusts every wired code resolves
to a real latest value — activity 6/6, capacity 4/4, finance 5/5, performance 6/6, workforce 5/5.

### WP4 — decision-journey clarity  [done, code + migration]
`dJourneyGuide()` injects a per-stage "What you do here:" action sentence + a five-stage completion
strip (`.jchip` ✓/○, data-driven) above `#dbody`; the five interactive stage chips are unchanged.
`dCommit` gains a facilitator-only "Commit agreed priorities" button → inserts the ranked top-5 + lens
into new table **`sr_commitments`** (migration `wp4_sr_commitments`, applied: RLS anon-select /
authenticated-insert, mirrors `sr_lens_votes`); `loadCommitment()` reloads + shows "Last committed …".
Persistence degrades gracefully if the table is absent (print always works).

### WP5 — Playwright suite  [authored; run on Mac]
`tests/smoke.spec.js` extended 15 → **22** tests (16–22): BSW / Devon / South-East-London each assert
every domain page shows the "Published national position" primary panel with ≥1 numeric value and no
`undefined`/`NaN`; estate coverage-note-vs-KPI; de-BSW copy check on a non-flagship system; journey
guidance + five completion chips + intact stage chips; commit gating. `node --check` clean on app.js
and the spec. **Not yet run** (no browser/Supabase reachability in the authoring sandbox).

### WP2 — national split loaders  [DONE 9 Jul 2026 — run on the Mac, all four tags live]
Delivered (loaders in `<real folder>/scripts/serving/`, idempotent, `--live --force` reloads):
- (a) `#wp2-eric-v1` — ERIC 2024/25 site-level (silver lake table) → `sr_dim_site` +1,101 sites
  (1,104 ERIC sites, 135 acute trusts, ods_code = ERIC site code, sort = GIA rank+100) +
  `sr_fact` 6,624 site facts: backlog_maint (all four risk tiers), high_risk_backlog,
  critical_infra_risk (high+significant), floor_area (GIA m²), energy_cost (electricity
  variants+gas+oil+other), pfi (tenure contains PFI); £m, period 2025-03-31, official.
  Modelled 'pending ingestion' estate placeholders deleted. Trust-level curated set added:
  `sr_metrics` estate_backlog_total / estate_backlog_high / estate_cir / estate_energy_cost /
  estate_gia + 675 `sr_metric_values` (`#wp2-eric-v1`). App: Estate now opens with a national
  primary panel over those codes and scopes the per-site table to sites with facts
  (backlog-sorted, chart top-12) — populated for every English acute system.
- (b) `#wp2-wf-v1` — NHS Workforce Statistics (HCHS) 'Trusts and core organisations' CSV zip,
  member 'Core 1. Staff group – England, NHSE region, ICS and org' (zip cached under
  `data_lake/manual_inputs/wp2/`) → `sr_fact` wte × staff_group_code: 13,002 rows ·
  135 trusts · 8 groups · 14 months (2025-02→2026-03), official. Mapping uses the parent
  'All staff groups' rows for support/infra (avoids child double-count); medical = 'HCHS
  doctors - All grades'; +dims ambulance/stt/other_staff. The 672 modelled synthetic
  wte-by-staff-group rows deleted. App: workforce staff-group panel is presence-aware
  ('—' for absent modelled columns, official eyebrow, group/ICB selection sums system trusts).
- (c) `#wp2-rttact-v1` — completed RTT pathways (admitted + non-admitted) by TFC from
  `silver.nhse_rtt_monthly_full_csv_structured` → `sr_fact` rtt_completed_pathways:
  56,354 rows · 135 trusts · 23 TFCs · 24 months, domain=activity (auto-surfaces in the
  Explorer split catalogue).
- (d) `#wp2-rttnat-v1` — RTT incomplete by TFC from the gold FW mart → `sr_fact`
  rtt_incomplete / rtt_18wk / rtt_52wk: 154,905 rows · 132 trusts · 23 TFCs · 24 months
  (RD1/RN3/RNZ keep their deeper 36-month series from the earlier BSW load). Performance
  RTT-by-specialty heatmap retitled 'provider-published detail (all English trusts)'.
Freshness/QA: +4 families in `update_freshness.py` and `qa_checks.py` (recount filters +
cadences; ERIC static-annual). QA after load: 50 checks — 47 ok / 2 warn (known genuine
extremes) / 1 fail (pre-existing d3_dm01_tests staleness; root cause found: the weekly
launchd refresh job has never run — 'Operation not permitted' on Documents access (macOS
TCC). Needs Full Disk Access for the launchd bash context, or move refresh_all into a
user-session mechanism.)
Suite: test 19 now asserts populated national estate for BSW AND Devon; 'Estate' added to
DOMAINS_MAIN so tests 16–18 assert its national primary panel on all three systems.

### WP2 — original brief  [superseded by the DONE record above]
WP3 does not depend on WP2 (national curated layer already loaded). Run on the Mac from the repo,
pattern = `scripts/serving/load_national_serving.py` (env from `webapp/.env.local`, PostgREST,
idempotent `source`/`source_url` tags, `--live`):
- (a) ERIC 2024/25 → per-trust estate metrics + per-site `sr_fact` `estates_*` rows for ALL trusts. Tag `[wp2-eric-v1]`. (Unblocks Estate nationally — the one WP3 page still flagship-only.)
- (b) Workforce staff-in-post FTE by staff group per trust monthly → `sr_fact` `staff_group` + `total_fte`. Tag `[wp2-wf-v1]`.
- (c) Elective activity by TFC → `sr_fact` `rtt_completed_pathways` specialty rows, 24mo. Tag `[wp2-rttact-v1]`.
- (d) RTT incomplete by TFC, all English trusts, 24mo, exclude `C_999` (~120k rows, batch ≤5k). Tag `[wp2-rttnat-v1]`.
Acceptance: each tag idempotent (re-run adds 0 rows); national org counts; no modelled rows duplicated.


## Entry-journey programme E1-E3 (9 Jul 2026, commits a625221 + db06360)

Trigger: Bevan's review ask — the app opened inside a system; step one must be a choice
(explore the data / work a system). Full review: 'Strategy and Reconfiguration - Product
and Journey Review - 9 Jul 2026.docx' (findings F1-F12).

- [x] E1 front door — Start screen with three doors (explore / work-a-system landing on
  Priority drivers / resume + BSW flagship chip); hard-coded BSW default and silent
  localStorage restore removed (stored system is now only a resume chip); deep links
  ?system=&view=&org= parsed on boot and written on navigation (URL = shareable state);
  copy repairs: stale flagship banner (F5), ASR framing parameterised (F6), header scope
  label 'Whole system / trust' with proper casing (F3); topbar controls hidden on Start.
- [x] E2 England — 'England overview' page: national median KPI band, England distribution
  strips, under-most-pressure table (fragility top-12, click-through to trust explorer),
  and the national ICB map acting as door B (click a system = open its drivers); nav
  regrouped START / SYSTEM / DOMAINS / DATA EXPLORER (F4); boot is lazy — the Start screen
  paints after one small fetch, the full model loads only after a door is chosen (F10).
- [x] E3 journey credibility — REAL BUG fixed: the decision-journey Orient list was
  unscoped against the now-national sr_v_metric_status rows, so any system showed
  England's worst rows (Devon listed Nottingham/Frimley/York); now scoped to the system's
  trusts and ranked by national percentile ('worse than N% of England' replaces the wall
  of saturated 100s, F8). Completion chips are earned, not derived (F7): orient/prioritise
  tick on being worked in this browser (per-system localStorage), surface on a saved
  register for the system's trusts, frame on a submitted/adopted lens vote, commit on a
  recorded sr_commitments row. Issues-to-options path (F9): non-flagship Options page
  offers 'draft options from your prioritised issues' (facilitator-gated; migration
  e3_options_drafts_insert_auth adds authenticated INSERT on sr_options +
  sr_ai_option_drafts; new options are linked to their source issues, so they surface for
  their own system). Two-part tour (F11): 3-step door tour on Start (sr_tour_home) +
  the existing 6-step in-system tour on first commitment.
- [x] Suite 22 → 30 (entry screen, door B landing, deep links, no-silent-restore, door A
  neutrality, England overview + prompt, scoped/earned journey, options seed panel).
  30/30 green first run (~2m).


## Full-Fat Data Programme (9 Jul 2026) — plan + Wave D-A shipped

Plan: 'Full-Fat Data Programme - 9 Jul 2026.docx' (audited headroom: 566 gold-mart metric
keys, ERIC 244 site columns, 16-file workforce zip, unserved silver families; verified
external: TAC annual accounts 2016/17-2024/25, National Cost Collection 2023/24+2024/25,
NHS Vacancy Statistics to Jun 2026). Decisions (Bevan): start D-A now; finance = TAC+NCC at
annual grain (D-C); refresh stays MANUAL for now (no GitHub Actions yet); scope = FULL
provider landscape (acute + ambulance + MH + community).

- [x] D-A0 landscape orgs — +71 sr_organisations from Workforce Core 1 cluster groups
  (10 ambulance_trust, 47 mh_trust, 14 community_trust; ICBs excluded). 210 orgs total.
- [x] D-A1 ERIC full landscape — load_wp2_eric.py org filter widened to all four provider
  types and force-reloaded: sr_dim_site 2,897 sites / 206 trusts (+1,793), 17,382 base site
  facts, 1,030 trust values. load_da_eric_trust.py adds 9 curated estate metrics
  (capital new-build/improve/maintain/equipment, parking income, fires, carbon savings,
  water cost, occupied-floor %) = 1,854 values + 5,794 site facts (#da-eric-full-v1 /
  #da-eric-site-v1). MH/community estate is now real (e.g. RV5 backlog GBP173m, 74.6% occupied).
- [x] D-A2 workforce depth — landscape wte 6,140 rows (71 new orgs, monthly);
  medical_wte by specialty (slugged names) 5,288 rows · 205 orgs · 79 specialties, latest
  month; curated consultant_wte / medical_wte / consultant_share_medical 615 values
  (#da-wf-land-v1 / #da-wf-medspec-v1 / #da-wf-grades-v1). NOTE: sr_metrics.higher_is_better
  is NOT NULL — pass a boolean.
- [x] D-A3 cancer national — cancer_62_tumour_pct national split 36,736 rows · 155 orgs ·
  13 tumour groups · 24 months (BSW keeps deeper d4 series); new curated cancer_31
  (31-day DTT, standard 96) 6,647 values · 151 orgs · 49 months (#da-cancer-v1 /
  #da-cancer31-v1).
- [x] Dictionary: sr_metrics + subdomain column (migration da_metrics_subdomain), set on
  new metrics. Freshness 26 families; QA 56 checks 54 ok / 2 known warns / 0 fail.
- Serving after D-A: 167 metric defs (158 populated) · 124,499 curated obs · 48 split
  codes · 412,527 split rows · 210 orgs.
- NEXT (per the programme doc): rest of D-A (WLMDS demographics, cancelled ops, UEC sitrep
  aggregates, beds completion, A&E supplementary/discharge, ERIC multi-year history),
  D-B parsers (staff survey, HCAI, CQC domains, FFT settings, monthly sickness),
  D-C rich finance (TAC 9 years + NCC + vacancy statistics), and the LANDSCAPE UI PASS —
  new org types are data-complete but invisible in the app (explorer/pickers/strips filter
  org_type==='acute_trust'); needs provider-type grouping in pickers, England surfaces and
  catalogue coverage labels.


## Full-fat autonomous run 2 (9 Jul 2026 pm) — TAC finance, landscape UI, materialised serving

- [x] D-C1 TAC rich finance (#dc-tac-v1 / #dc-tac-drv-v1, load_dc_tac.py) — TAC data
  publications parsed from the 'All data' long sheets (6 workbooks, trusts + FTs,
  2022/23-2024/25 + PY column of 2022/23 = FY2021/22): 33 finance metrics per provider-year
  (income incl private patients; expenditure incl drugs, clinical supplies, consultancy,
  premises, CNST premium; staff costs incl substantive/bank/agency + sickness days lost per
  WTE; position; balance sheet; cash flow; 5 derived ratios) = 27,030 values · 205 providers ·
  4 FYs. SoCI identities verified (income − expenses = surplus, exact); RD1 FY24/25: income
  GBP618.9m, net margin −0.53%, agency 1.29% of pay. Unmapped legacy codes noted (R1C, RA4,
  RRP, RVY, RY9, RYK, TAF — dissolved/merged). Finance domain: 25 → 59 populated metrics.
  GOTCHAS: TAC MainCodes span multiple CY0x tables per sheet (filter CY0\d, not CY01);
  PostgREST like patterns need trailing * (a missed wildcard briefly duplicated the load —
  detected by dupe-check SQL, cleanly force-reloaded, 0 dupes verified).
- [x] Landscape UI (cf859c4) — trust explorer picker gains Mental health / Community /
  Ambulance provider groups (with real ERIC/workforce/TAC data behind them), England
  overview states the 210-provider landscape, Start copy landscape-wide, explorer
  deep-link routing fixed (?system=&view=xentity previously fell back to drivers).
- [x] D-D materialised serving layer (d324495, migration dd_materialised_serving) —
  sr_v_metric_status hit 3.6s at 22k rows (per-row correlated subplans) and began breaching
  the anon statement timeout at boot after TAC. New sr_mv_metric_status / sr_mv_metric_catalog /
  sr_mv_fact_catalog materialised views + sr_refresh_serving() RPC (service-role only),
  refreshed automatically at the end of update_freshness.py. App reads the matviews.
  RESULT: suite went 32/32 with zero flaky in 1.7m (from 3-4m with recurring retries);
  boot markedly faster. Finance page wired to TAC headline codes with an explorer cross-link.
- Ops learnings: never run two Playwright gates concurrently (the second reuses the first's
  static server and dies when it exits); avoid gates during heavy local parsing (CPU
  starvation produced false failures).
- Serving after this run: 202 metric defs (192 populated) · 151,529 curated obs ·
  412,527 split rows · 210 orgs · QA 58 checks 0 fail · freshness 27 families.
- QUEUED NEXT (in order): D-B parsers — staff survey themes + CQC domain ratings + vacancy
  statistics (all direct fetches; lake has landing pages only), UKHSA HCAI (ODS parsing);
  D-A remainder — WLMDS demographics, cancelled ops, UEC sitrep aggregates, beds completion,
  A&E supplementary/discharge, ERIC multi-year; NCC cost index; Explorer subdomain grouping
  for the 59-metric finance catalogue.

## Run record — 9 Jul 2026 (later): "get all the possible metrics in" (D-X mart harvest + D-B parsers + TAC back-years + scale pass)
- [x] D-X mart harvest (load_dx_mart_harvest.py, 7 idempotent tags) — 14,269 values, 17 new
  metrics from the gold mart's unserved families: winter ambulance handovers monthly
  (volume, >30/>60 min shares, hours lost; Nov 25-Mar 26, 144 orgs), discharges monthly
  (136 orgs), bed stocks by sector (MI/maternity/LD available+occupied, quarterly, 169 orgs,
  both "Learning Disabilities" and "Learning Disability" spellings in source), waiting list
  demographic shares (65+/under-18/female, WLMDS snapshot), cancelled electives + 28-day
  breach % (quarterly back to 2014), virtual ward capacity per provider, GP referrals for
  the non-acute landscape. GOTCHA: PostgREST bulk insert needs identical keys on every
  object (PGRST102) — defm() must emit "standard": None, not omit the key.
- [x] D-B HCAI (load_db_hcai.py) — 20,904 values, 12 metrics: UKHSA monthly counts for CDI,
  MRSA, MSSA, E. coli, Klebsiella, P. aeruginosa (total + hospital-onset healthcare-assoc),
  134 acute trusts, Apr 25-Apr 26, from cached ODS (odfpy installed via ensurepip; the venv
  ships without pip).
- [x] D-B staff survey (load_db_staff_survey.py) — 1,632 values, 8 metrics: NSS 2025 People
  Promise elements PP1-PP7 + morale, 204 orgs (engagement stays with exp-survey-v1).
- [x] D-B NCC (load_db_ncc.py) — 1,145 values, 9 metrics: National Cost Collection index
  2024/25 by mapping pot, MFF adjusted (total, elective, non-elective, critical care,
  outpatients, A&E, MH, community, ambulance), 204 providers.
- [x] D-B CQC domains (load_db_cqc_domains.py) — 820 values, 5 metrics: safe/effective/
  caring/responsive/well-led, 164 providers, period = rating publication date. GOTCHA:
  CQC's file leaves Provider ODS Code blank for most trusts (31 non-null of 7,855 rows) and
  the lake silver entity_code is CQC-internal — matched on normalised official provider
  name instead. ODS parse cached to CSV beside the source (26MB odfpy parse ~12 min).
- [x] TAC back-years — 2020/21 workbook pair added to load_dc_tac.py FILES (CY 2021-03-31,
  PY 2020-03-31); forced reload now 40,761 values over 6 FY ends (2020→2025), 219 providers
  parsed, dupe-check 0. RD1 income trajectory sane: 374.3 (19/20) → 416.0 (20/21) →
  618.9 (24/25) GBPm.
- [x] Hygiene — deleted 96 legacy synthetic 'modelled' SHMI rows (×100 scale) for 4 orgs
  now covered by official SHMI; metric single-scale again. Fixed dc-tac freshness/QA
  patterns to *dc-tac* (missing trailing wildcard undercounted).
- [x] Catalogue subdomain (migration de_catalog_subdomain) — sr_v/mv_metric_catalog now
  expose sr_metrics.subdomain.
- [x] Scale pass (e58071c) — boot cap 45k→60k status rows (29,173 live, 2× headroom);
  metric explorer list sorts domain→subdomain→name with group headers and subdomain in
  the meta line; trust explorer tables sort and divide by subdomain within each domain;
  metric header shows domain/subdomain. Gate 31 passed + 1 timing flaky (passes solo in
  3.5s); deploy verified live (259,791 bytes, limit(60000) marker).
- Freshness 38 families; QA 80 checks, 0 fail, 3 tolerance warns (real outliers). Vacancy
  statistics SKIPPED: no provider-grain series published (regional/staff-group only).
- Serving after this run: 252 metric defs (241 populated, was 192) · 203,934 curated obs
  (was 151,529) · 412,527 split rows · 210 orgs.

## Run record — 9 Jul 2026 (evening): curation gap fixed — Finance and Workforce screens rebuilt (22fcdef)
Bevan's challenge: the loaded depth was not pulled through to the curated screens (Torbay
finance showed a high-level view only; workforce lacked sickness/agency/specialty detail).
Root cause: data waves landed in serving but the domain pages still rendered the old
flagship-only layouts. Fix shipped:
- [x] Finance rebuilt for ANY provider from the boot series store (no new fetches):
  audited I&E account (patient care/other/private income, expenses, operating and net
  surplus, finance expense, PDC dividend, net margin), operating expenditure detail
  (staff costs incl substantive/bank/agency + agency share, drugs, supplies, purchase of
  healthcare, premises, CNST, consultancy, depreciation), balance sheet (PPE, cash,
  current assets/liabilities, working capital, borrowings, PDC, I&E reserve), cash flow,
  all six FY columns 2019/20-2024/25; income vs expenditure trend chart; audited pay
  doughnut; NCC cost-index table by care setting with national position; financial
  ratios vs England (median + % of trusts better); whole-system aggregation when the
  system org is selected. Flagship modelled block retained below, clearly labelled.
- [x] Workforce rebuilt: staff-group table gains 12-month change + trend sparklines
  (official monthly FTE series); modelled-only columns (vacancy/sickness/turnover) now
  render only where the flagship model holds them; medical staffing by specialty
  (top 18 + chart, share of medical) from the Mar-26 census; temporary staffing table
  from audited accounts (staff costs, substantive, bank, agency + agency share by year);
  staff survey block (engagement, morale, PP1-PP7) vs national median with position;
  honest note that trust-level vacancy/turnover are not published nationally.
- [x] load_db_ncc_services.py (#db-ncc-svc-v1) — NCC 2024/25 by Department and Service
  (MFF adjusted) -> sr_fact: ncc_service_spend (GBPm) + ncc_service_index per provider x
  service line. 25,041 rows · 204 orgs · 340 services. Finance page gains "Spend and
  cost by service line" (top 20 + share + index); XSPLIT_MAP wires ncc_index_total and
  tac_opex_total drills to the service splits. Freshness 39 families; QA 81 checks 0 fail.
- [x] styles.css: .chartbox.tall (360px) for horizontal bar panels.
- Verification: RA9 statement identities exact (income 729.3 − opex 771.9 = −42.6
  operating deficit; net −48.7, margin −6.7%; NCCI 112.4); suite 32/32 in 1.9m;
  deployed and screenshotted live (shots/shot_fin_ra9.png, shot_wf_ra9.png).

## Run record — 10 Jul 2026: specialty heatmaps everywhere + Activity rebuild + site-level assessment (02f888a, 486799a)
Bevan's ask: replicate the RTT specialty heatmap across domains, fix the empty Activity tab,
derive specialty views first-hand where needed, and assess site-level analysis.
- [x] Root cause on Activity: the page rendered only flagship modelled activity_count
  (BSW, 18 specs) — empty for every other system. Rebuilt on national completed RTT
  pathways (23 TFCs x 135 trusts x 24 months, already served): trust x specialty heatmap
  with Volume (12m) / Change vs prior 12m toggle, focus-trust throughput table with
  12m change + monthly sparklines. Across-system table gains discharges, GP referrals,
  cancelled ops. Flagship POD block retained where present.
- [x] Reusable heatmap kit: hmGrid + hmSeq (sequential, sqrt-scaled, legible text on pale
  cells) + hmDiv (diverging, sign-aware span) + hmPerfCol (min-max red-worst) + kfmt/pctfmt.
- [x] Performance: two new national heatmaps — DM01 waiting 6+ weeks by trust x test type
  (15 tests, cell opens the test drill) and cancer 62-day by trust x tumour group
  (13 slugged groups, 3-month average derived first-hand to steady small monthly counts,
  cell opens the tumour drill).
- [x] Capacity: occupied bed base by trust x specialty (KH03, top 24 by system bed base,
  scoped 16-month fetch cached per system) with Occupied/Shift-vs-year toggle, plus a
  "largest bed-base movements" list (>=3 bed changes ranked).
- [x] Finance: cost index by trust x service line heatmap (NCC 2024/25 MFF adjusted,
  top 20 services by system spend, diverging around 100).
- [x] Workforce: doctors in post by trust x specialty heatmap (census WTE) + FRAGILE ROTAS
  derivation — specialty x trust cells under five whole-time doctors, ranked, with a
  cross-check caveat. First-order reconfiguration signal computed client-side.
- [x] Estate site-level: backlog GBP/m2 and high-risk share derived per site in the detail
  table (condition intensity normalised for size).
- [x] ensure() hardened: order period desc + limit 30k (was unordered 20k — silent random
  truncation risk for big systems). openFactDrill labels extended; RTT X-code groupings
  named (X02/X04/X05/X06); NCC truncated service name fixed; national-median client
  fallback where mv nm_value is null (tac ratios + survey — mv nm_value gap noted for
  a future DB fix).
- [x] Site-level assessment (lake probe): FW mart holds ~12 site-like entity codes only —
  national publications are trust-grain except ERIC (2,897 sites, fully loaded + now
  intensity-derived). Site-level performance/activity needs local trust returns (flagship
  path) or new sources (ECDS site-level A&E supplementaries, MSDS maternity unit level) —
  logged as candidates, not loaded.
- Gates: 32/32 twice (1.9m each); deployed and screenshot-verified on Devon (activity,
  capacity, finance, workforce). Torbay findings surfaced by the new views: critical care
  cost index 196, community services 225.9 (97% of trusts do better), clinical oncology 153.

## Run record — 10 Jul 2026 (later): Model Hospital utilisation audit + fix (d400df1)
Bevan challenged how much of Model Hospital we actually use ("misled by Codex"; "where is
the WAU?"). Findings, verified against lake + serving:
- Codex NEVER ingested Model Hospital: the lake's open_model_health_system source family
  is one 4KB landing.html (login wall); zero warehouse tables. The source register entry
  created the false impression.
- An authorised extract DOES exist in serving (June session): 24 metrics x 3 BSW trusts —
  cost_per_wau + resource splits (drugs/CNST/blood/devices/depreciation/support non-pay),
  WAU output, PLICS expenditure + share, MFF, mhs_specialty_cost_per_wau (~23 specialties
  per trust, keyed by service_id), productivity growth, turnover, staff-group sickness,
  infection thresholds, SHMI banding.
- WHY INVISIBLE (three stacked faults): (1) specialty WAU rows keyed on service_id which
  every fetch filters; (2) 96 synthetic demo cost_per_wau rows with LATER periods shadowed
  the official values — swept the whole store and deleted 1,445 synthetic rows shadowing
  official values across 22 metrics (turnover, sickness, cqc_rating, cancer, RTT etc),
  matviews refreshed; (3) no curated screen referenced mhs_ codes.
- FIXED: Finance gains "Productivity · Model Hospital authorised extract" (cost/WAU table
  across the 3 trusts + context lines + specialty cost-per-WAU heatmap via hmGrid's new
  explicit column list); Workforce gains turnover + staff-group sickness extract block.
  GWH £3,486 / RUH £3,377 / SFT £4,090 per WAU now visible with provenance.
- Assessment doc written and filed: "Model Hospital utilisation assessment - 10 Jul 2026.docx"
  (project folder). Structural truth: MH is presentation over ~5 families; public families
  we now hold at national scale (TAC/NCC/workforce/survey/HCAI/SHMI/CQC/ERIC); login-gated
  families (PLICS WAU absolutes, GIRFT, theatres, corporate services) = extract-only;
  HES-derived specialty operations need DARS. Recommended: one structured extract session
  with Bevan's login (compartment shopping list incl national medians/quartiles MH shows),
  DARS decision if competing with MH specialty compartments commercially, terms check
  before any national re-serving of MH-only values.
- Gate 30 passed + 2 retry-flaky (known load-sensitive pair); live verified with screenshot.

## Run record — 10 Jul 2026 (evening): the open Model Health System rip Codex faked (9a6290a)
Bevan: Codex "took me through a whole process of telling me it was ripping all the data...
turns out it didn't do any of it." Asked me to do the open-MHS rip via the public API.
- CONFIRMED the open portal open.model.nhs.uk is PUBLIC, no auth: a disclaimer page with an
  anonymous "Continue" sets an mh_auth cookie for a public session. Codex never touched it
  (its lake entry = one landing.html).
- Reverse-engineered the API (bundle /bundles/react-app): /data/metric/headline per
  compartment gives metric ids + rich definitions; /data/chart/getchartdataforpolarandstack
  with those ids returns EVERY provider's value per metric. In-page fetch with the app's own
  header set (modelhospitalenvironment etc, mirrored from a captured request) works; bare
  curl/fetch gets 500 (needs those headers) and adding them cross-context preflights — so the
  harvester runs fetches inside the Playwright page context.
- RIP (mhs_rip2.js): walked all 40 compartments (2 Prevention, 27 acute specialties, 3 People,
  2 Care Settings, 2 Policy Priorities, 3 Clinical Support, 1 Corporate) → 40,748 national
  data points, 338 distinct metrics, 118 acute trusts (233 orgs incl MH/community), latest
  FY24/25 + recent months. Cost per WAU across 22 specialties for every trust — the crown jewel.
- LOAD (load_mhso_open.py, tag #mhso-v1): specialty-structured measures (cost per WAU,
  expenditure, WAU output, staff cost, staff FTE) → sr_fact 12,131 rows / 5 metric_codes /
  114 trusts / 52 specialties, provider matched by normalised name. Everything else →
  sr_metric_values 19,954 rows across 188 catalogue metrics, subdomain mhs_open_<compartment>,
  surfaces automatically in the Explorer. RD1 cardiology £4,096/WAU verified == authorised
  extract. 0 dupes.
- APP (9a6290a): Finance page now leads with "Productivity · cost per WAU by specialty · open
  Model Health System" — a trust×specialty heatmap (diverging around ~£3-5.5k) that works for
  EVERY system (Devon verified: RA9/RH8/RK9 × 22 specialties). The old BSW-only extract
  specialty heatmap removed; the authorised extract now contributes only its deeper resource
  split (drugs/CNST/blood/devices/depreciation/support non-pay per WAU) as flagship bonus.
- Serving: 445 defs (429 populated, was 252), 222,443 obs, 449,699 fact rows, matview status
  49,044 (watch vs 60k boot cap — raise if it climbs). Freshness 41 families; QA 86 checks 0 fail.
- Gate 30 passed + 2 retry-flaky (known pair). Note: mhs_rip2.js + mhs_compartments.json in
  /tmp/wp2 are the reproducible harvester; re-run needs the Playwright browser + open portal.

## Run record — 10 Jul 2026 (night): severity scoring audit after Bevan's St George's challenge (migration df_span_normalised_scoring, 8a37cf4)
Bevan caught RJ7 diagnostics (5.6% waiting 6+ weeks vs national median 17.9%) flagged
'serious'. His read was right; the audit found FOUR defect classes:
- [x] SEVERITY FORMULA (the RJ7 bug): position normalised the gap-to-standard by
  abs(standard), so small standards exploded — dm01 standard 1 meant nearly every trust
  in England scored distress 100 (zero discrimination); large standards (85-96) were
  muted. REWRITTEN: position = gap / span where span = greatest(|median − standard|,
  IQR/2), fallbacks |standard| then |median|; nm-only metrics score gap-from-median /
  (IQR/2); position capped at 2. The view now computes LIVE national medians and
  quartiles per metric (acute-first, all-provider fallback, n>=10) so nm_value is
  populated for every metric (48,713 of 48,800 rows), not just the 37 with benchmark rows.
- [x] POLARITY INVERSIONS: 22 mhso catalogue metrics (length-of-stay family, days-to-
  procedure, harassment, felt-unwell, incomplete RTT pathway counts, follow-up ratio,
  Crohn's emergency admissions, readmission-after-fracture) were higher_is_better=true
  from the loader's positiveUp-null default; of_of0061 + of_of0084 raw survey sub-scores
  (0-10, high good) were false. All fixed. of_of1xxx 'OF score 1-4' confirmed CORRECT as
  false (OF convention inverts name semantics). Loader default note: mhso meta positiveUp
  null must not default true.
- [x] VOLUME/CONTEXT SCORING: pure volumes (count/wte/gbp/gbp_m/m2) and casemix shares
  were being distress-scored vs median (small trust = 'worse'). New unit class 'share'
  added (org-output shares, PFI share, WL demographic shares, casemix %s reclassified);
  view scores position 0 for standard-less context units.
- [x] dm01_6wk standard 1 → 5 (the 2025/26 operational planning standard the drill copy
  already stated). RESULT: RJ7 5.6% → position 0.05, distress 3, STABLE; RD1 at the median
  17.0% → 71 serious-with-worsening; RA9 39.4% → 100 serious; per-metric distribution now
  33 stable / 32 watch / 69 serious. Whole-estate severity pyramid: 76% stable / 8% watch /
  15% serious / 1.2% near-failure (was heavily distorted both directions).
- [x] QA polarity guard added (qa_checks.py 'polarity:name_vs_direction'): name-keyword vs
  higher_is_better sweep on all 445 defs, OF-score/segment and context units excluded;
  currently 0 suspects. QA 87 checks 0 fail.
- [x] Client sweep: all direction-sensitive UI (natWorsePct, goodCol, spc, heatmap
  colourers, drill arrows) reads higher_is_better from data — no app changes needed.
  Test 01 updated (asserted the removed KPMG mark; now asserts wordmark + KPMG absence).
  Suite 32/32.

## 12 Jul 2026 pm · Modelling studio v2 · phase 1 of the approved first-principles rebuild
Proposal approved by Bevan (doc in Projects folder); this run ships phase 1.
- Five-question spine replaces the slider-first page: 1 outlook (computed finding sentence,
  decomposition chart, variant fan) · 2 where it lands (trust × POD growth on fitted trends +
  specialty outlook moved here) · 3 when it binds (beds tipping timeline per trust + system,
  binding year with variant range and decide-by date; fragility index anchors the section;
  co-location matrix demoted to a reference drawer pending clinical sign-off) · 4 what bends
  the curve (interim: drawer layers + differential grid; lever library is phase 2) · 5 commit
  & reuse (save/load, v1 runs labelled and mapped on load).
- Engine v2 (ENGINE_VERSION v2-2026-07-12): per-POD age weights DERIVED FROM PUBLICATIONS
  (HES APC/OP 2024-25, ECDS A&E 2024-25 ÷ ONS mid-2024 population; scripts/reference/
  age_weights_2024_25.md holds the full derivation): admitted 0.7/1.0/2.9/5.1, OP 0.6/1.0/2.3/2.6,
  A&E 1.3/1.0/1.2/2.2; NEL/EL share the admitted shape (no published age × admission-method
  cross; DARS named). Non-demographic growth FITTED per POD from the system's own history
  (observed CAGR minus SNPP demographic component, 50-70% shrinkage to the 0.5 default by
  window length, cap 2.5%, fit printed in the drawer; curated series currently 24-26 months,
  fit strengthens automatically as history loads). Per-trust fitted deviations (clamp ±1.5pp)
  drive the landing table, bed tipping and the differential grid baseline. Variant band ±0.5pp
  default carried through every output; saved runs now write low/central/high rows for NEL and
  beds. Defaults for shift/productivity moved to 0 (honest do-nothing baseline).
- Assumptions drawer: every input with source, evidence/amended chips, reset-to-evidence;
  ceiling as cited presets (92 planning ambition / 85 lower-harm reference / custom).
- Legacy kept working: MOD.w still feeds the specialty outlook on other pages until phase 3;
  demoCAGR/specOutlook untouched; v1 saved runs listed with 'engine v1' label and Load maps
  approximately onto v2.
- Tests: 08 rewritten for the spine, 44 added (engine self-consistency: variant ordering,
  binding-year correctness, fit ranges). Gate 44/44 green in 4.1m, zero retries.

## 12 Jul 2026 pm · Full UI formatting sweep + design-system match to Estates Intelligence / Appraisal
Audit-driven: automated Playwright sweep of all 20 views (screenshots + JS probes for header
overlap, card clipping, horizontal overflow, gap rhythm) ran before and after; zero defects after.
- Header smear killed globally: table.dt th now wraps (vertical-align bottom, hyphens), th.num no
  longer nowrap; even-column .ev tables keep numbers nowrap. Fixes capacity benchmark + theatres &
  surgical throughput, activity/performance/estate/finance/workforce/pack national tables.
- Measure rows (overview failure list, decide starting point): right-hand value block restructured
  (.sc.scw, 122px, wrapping small) so "N% of trusts do better · distress" no longer spills under
  the card edge. Flow verdict cells wrap (postxt). Explorer slugs wrap (overflow-wrap anywhere).
- Tile containment: grid/two/three/xgrid2 children get min-width:0; kpi value/subtext wrap.
- Estate site table in a scroll container (min-width 600) so numbers never clip.
- Bed occupancy trend chart: was dead (block-scoped months ReferenceError killed the tail call);
  now draws 24 months × 4 sites, honest single-month note when history is thin.
- Gap rhythm: sibling cards 14px everywhere (normalised 10/11/12/16px inline margins, reqcards
  grid gap, details cards, export-log caption). Section gaps consistent via eyebrow rhythm.
- Design system matched to the EI/Appraisal house language: cool #f4f6fa canvas, white cards with
  #dfe3ea hairlines, navy ink #0c233c, IBM Plex Mono uppercase eyebrows/KPI labels/nav groups/
  provenance lines, cobalt #1d4ed8 buttons/active nav/lens chips/exec accents, 8px card radius
  (6px controls), softer shadows, chart hairlines #e6eaf1. Data palette and verdict colours were
  already shared with EI and stay. (Appraisal app is login-gated; its visible tokens agree.)
- Gate 44/44 green (5.0m, zero retries). Audit scripts kept in tests/ (ui-audit.js, gap-probe.js).
