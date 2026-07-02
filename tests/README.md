# Smoke tests (register item E1 — test half)

Playwright smoke suite for the single-file app at `../index.html`. The suite never
modifies the app. It serves `/tmp/sr-repo` statically on port 4173 (started
automatically by the Playwright `webServer` config) and lets the app talk to live
Supabase (anon reads) and fetch `./geo/*` as it does in production.

## Run (one command)

```sh
cd /tmp/sr-repo/tests && PATH="/Users/bevanboyle/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/@playwright/test/cli.js test
```

Equivalent to `npm test` (the package.json script is `"test": "playwright test"`)
wherever an npm binary is available — note the codex node runtime ships bare `node`
only. 12 tests, sequential (1 worker), 30s timeout, 1 retry, list reporter.

## First-time setup

The environment exports `NODE_ENV=production`, which makes npm skip devDependencies —
hence `--include=dev`:

```sh
mkdir -p /tmp/npm-boot && curl -sL https://registry.npmjs.org/npm/-/npm-10.9.2.tgz | tar xz -C /tmp/npm-boot   # bootstrap npm (runtime has no npm)
cd /tmp/sr-repo/tests
PATH="/Users/bevanboyle/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node /tmp/npm-boot/package/bin/npm-cli.js i --include=dev
PATH="/Users/bevanboyle/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" node node_modules/@playwright/test/cli.js install chromium
```

If the chromium download is ever unavailable, run against system Chrome instead:
`PW_CHANNEL=chrome node node_modules/@playwright/test/cli.js test`.

## What is covered

1. App loads: title, KPMG mark, clean console (maplibre tile aborts + favicon 404 filtered)
2. Overview exec summary: distress index /100 + four-driver ribbon
3. Map boots: canvas + `icb-fill` and `sites-c` layers within 20s
4. System switch to Devon: exec summary text + org selector (3 trusts)
5. Priority drivers: 4 tables with numeric cells + CSV links
6. Metric drill modal: Standard / National median / Peer median rows, SPC chip, provenance
7. Access & travel: 4 KPIs; unticking a site produces baseline/Δ deltas
8. Modelling studio: 8 sliders, requirement cards, >15-row data dictionary, freshness table
9. Options & appraisal: 4 option cards, matrix, option modal with impacts + statutory tally
10. Tests & packs: ~27 statutory test rows
11. Decision journey: 5 stage chips, ranked list with robust badge, issue score provenance
12. Auth gating: signed-out drill shows the sign-in note and the challenge write is inert

Known design nuance (not a bug): when signed out the challenge form shows the
"Sign in to challenge" note *alongside* a Submit button — the write path is gated
in `submitChallenge()` and by RLS (E2), which test 12 verifies (no insert happens).
