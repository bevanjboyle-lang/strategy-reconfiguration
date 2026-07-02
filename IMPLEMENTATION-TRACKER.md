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

## Wave 2 (next session)
- [ ] A2 Travel-time/access module (OSRM/ORS precompute per configuration; equity cut IMD/Core20)
- [ ] A6 Fragility composite v1 (low-volume specialties, single-site, vacancy, CQC, SHMI)
- [ ] U3 Authentication (Supabase magic link) + memberships enforcement; E2 finalise RLS write lockdown
- [ ] A4 SPC trend rules; A5 UEC chain diagnostics
- [ ] D12 Refresh automation (launchd) + freshness badges; D7 national SHMI+CQC into scoring
- [ ] U6 Place tier + system-vs-England compare; U7 exports/board pack
- [ ] E1 Modularise app + Playwright smoke in CI

## Wave 3 (backlog)
- [ ] A7 elective clearance model; A8 method note + criticality config
- [ ] D10 cross-border proxy; D11 GP referrals; S2 voting/divergence; S3 sensitivity tornado
- [ ] S5 auto-seed issues per system; U9 onboarding; U10 accessibility; E4 perf; E5 mobile; E6 nightly QA
