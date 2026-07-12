// Smoke suite for the System Intelligence single-file app (register item E1, test half).
// Tests only — the app (../index.html) is never modified by this suite.
// The app pulls live Supabase data (anon reads) and ./geo/* files, so waits are generous.
const { test, expect } = require('@playwright/test');

// Console noise that is not an app defect: maplibre tile aborts, basemap tile hiccups,
// favicon 404 from the bare static server.
const NOISE = /favicon|openfreemap|maplibre|tile|abort|err_aborted|signal is aborted|failed to fetch/i;

// Boot = navigate + wait for the Overview "System position" KPIs, which only render once
// loadAll() has pulled the full Supabase model — i.e. "the app is genuinely up".
const BSW_SLUG = 'nhs-bath-and-north-east-somerset-swindon-and-wiltshire-icb';
// E1: '/' now lands on the Start (entry-choice) screen, so committed-system tests enter
// via a deep link — which is itself part of the E1 contract under test.
async function boot(page) {
  await page.goto('/index.html?system=' + BSW_SLUG + '&view=overview');
  await expect(page.locator('.view .grid.kpis .card.kpi').first(), 'overview KPIs render once data loads').toBeVisible({ timeout: 25000 });
}

async function nav(page, label) {
  await page.locator('#nav button', { hasText: label }).click();
}

test.describe('System Intelligence — smoke (E1)', () => {

  test('01 loads: title, wordmark, no console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(((m.location() || {}).url || '') + ' :: ' + m.text());
    });
    await boot(page);
    await expect(page).toHaveTitle(/System Intelligence/);
    await expect(page.locator('aside.side .brand .prod')).toContainText('System Intelligence');
    await expect(page.locator('aside.side svg.kpmg')).toHaveCount(0); // KPMG mark removed by request
    expect(await page.title()).not.toMatch(/KPMG/);
    await page.waitForTimeout(3000); // let map/charts settle so late errors surface
    const real = errors.filter((t) => !NOISE.test(t));
    expect(real, 'unexpected console errors:\n' + real.join('\n')).toEqual([]);
  });

  test('02 overview: system position KPIs + four-driver ribbon', async ({ page }) => {
    await boot(page);
    await expect(page.locator('.view h1')).toContainText('System overview');
    await expect(page.locator('.view .grid.kpis .card.kpi').filter({ hasText: 'System distress' })).toHaveCount(1);
    const ribbon = page.locator('.card.kpi:has-text("open driver")');
    await expect(ribbon).toHaveCount(4);
    for (const name of ['Service fragility', 'Urgent & emergency care', 'Elective backlog', 'Cancer pathway']) {
      await expect(ribbon.filter({ hasText: name })).toHaveCount(1);
    }
  });

  test('03 map boots: canvas + icb-fill and sites-c layers', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#mlmap canvas').first()).toBeAttached({ timeout: 20000 });
    await page.waitForFunction(() => {
      try {
        const m = (typeof ml !== 'undefined' && ml) ? ml : window.ml;
        if (!m || !m.getStyle) return false;
        const ids = (m.getStyle().layers || []).map((l) => l.id);
        return ids.includes('icb-fill') && ids.includes('sites-c');
      } catch (e) { return false; }
    }, null, { timeout: 20000 });
  });

  test('04 system switch: Devon overview + org selector repopulates', async ({ page }) => {
    await boot(page);
    await page.selectOption('#syssel', 'nhs-devon-icb');
    await expect(page.locator('.view .lead')).toContainText('Torbay', { timeout: 25000 });
    await expect(page.locator('#orgsel option')).toHaveCount(3);
  });

  test('05 priority drivers: four tables with numeric cells + CSV links', async ({ page }) => {
    await boot(page);
    await nav(page, 'Priority drivers');
    await expect(page.locator('h1')).toContainText('four priority drivers');
    for (const d of ['service_fragility', 'uec', 'elective_backlog', 'cancer']) {
      const tbl = page.locator('#dtbl_' + d);
      await expect(tbl).toBeVisible();
      const nums = await tbl.locator('td.num').allInnerTexts();
      expect(nums.filter((t) => /\d/.test(t)).length, d + ' has numeric cells').toBeGreaterThan(0);
    }
    expect(await page.locator('a.csvlink').count(), 'CSV links').toBeGreaterThanOrEqual(4);
  });

  test('06 metric drill: benchmark rows + SPC chip + provenance', async ({ page }) => {
    await boot(page);
    await nav(page, 'Priority drivers');
    await page.locator('#dtbl_uec td.num[onclick^="openDrill"]').first().click();
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.kv', { hasText: 'Standard' })).toBeVisible();
    await expect(modal.locator('.kv', { hasText: 'National median' })).toBeVisible();
    await expect(modal.locator('.kv', { hasText: 'Peer median' })).toBeVisible();
    await expect(modal.locator('.kv', { hasText: 'Trend' }).locator('.pill'), 'SPC verdict chip').toBeVisible();
    await expect(modal).toContainText(/SPC:/);
    await expect(modal.locator('.prov')).toContainText('Source:');
  });

  test('07 access & travel: four KPIs + site what-if changes deltas', async ({ page }) => {
    await boot(page);
    await nav(page, 'Access & travel');
    const kpis = page.locator('.view .grid.kpis .card.kpi');
    await expect(kpis).toHaveCount(4, { timeout: 20000 });
    const before = (await kpis.allInnerTexts()).join(' | ');
    await page.locator('.view .card input[type="checkbox"]').first().uncheck();
    await expect(kpis.first()).toContainText('Δ', { timeout: 15000 });
    const after = (await kpis.allInnerTexts()).join(' | ');
    expect(after).toContain('baseline');
    expect(after).not.toEqual(before);
  });

  test('08 modelling studio: 8 sliders, requirement cards, dictionary + freshness', async ({ page }) => {
    await boot(page);
    await nav(page, 'Modelling studio');
    await expect(page.locator('#reqcards .card')).toHaveCount(6, { timeout: 25000 });
    await expect(page.locator('.view input[type="range"]')).toHaveCount(8);
    const details = page.locator('.view details', { hasText: 'Method & data' });
    await details.locator('summary').click();
    const dictRows = details.locator('table.dt').first().locator('tbody tr');
    await expect(dictRows.nth(15)).toBeAttached(); // > 15 rows in the data dictionary
    expect(await dictRows.count(), 'data dictionary rows').toBeGreaterThan(15);
    await expect(details).toContainText('Data freshness');
    await expect(details.locator('table.dt').nth(1)).toBeAttached(); // freshness table
  });

  test('09 options & appraisal: 4 cards + matrix + option modal tally', async ({ page }) => {
    await boot(page);
    await nav(page, 'Options & appraisal');
    const cards = page.locator('.view .card[onclick^="openOption"]');
    await expect(cards).toHaveCount(4, { timeout: 25000 });
    await expect(page.locator('#optmatrix')).toBeVisible();
    await expect(page.locator('#optmatrix tbody tr')).toHaveCount(4);
    await cards.first().click();
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Impact appraisal by domain');
    await expect(modal.locator('.pill').first()).toBeVisible();
    await expect(modal).toContainText(/tests:\s*\d+\/\d+\s*met/i); // statutory-test tally
  });

  test('10 tests & packs: statutory tests render (~27 rows)', async ({ page }) => {
    await boot(page);
    await nav(page, 'Tests & packs');
    await expect(page.locator('.view')).toContainText('statutory tests', { timeout: 25000 });
    const rows = page.locator('.view .list .row');
    await expect(rows.first()).toBeVisible();
    const n = await rows.count();
    expect(n, 'statutory test rows').toBeGreaterThanOrEqual(24);
    expect(n, 'statutory test rows').toBeLessThanOrEqual(30);
  });

  test('11 decision journey: 5 stage chips, ranked list + robust badge, issue provenance', async ({ page }) => {
    await boot(page);
    await nav(page, 'Decision journey');
    const chips = page.locator('.view .lenses').first().locator('.lensbtn');
    await expect(chips).toHaveCount(5);
    await expect(chips.nth(0)).toContainText('Orient');
    await expect(chips.nth(4)).toContainText('Commit');
    await chips.filter({ hasText: 'Prioritise' }).click();
    const ranks = page.locator('.view .rank');
    await expect(ranks.first()).toBeVisible();
    await expect(page.locator('.view .robust').first(), 'robustness badge').toBeVisible();
    await ranks.first().click();
    await expect(page.locator('.modal')).toContainText('Score provenance:'); // provenance tag line
  });

  test('12 auth gating: signed-out drill shows sign-in note; challenge write is inert', async ({ page }) => {
    await boot(page);
    await expect(page.locator('#authui')).toContainText('Sign in'); // no session
    // The challenge form only renders when "viewing as" the drilled trust itself.
    const trustId = await page.evaluate(() => {
      const t = orgs.find((o) => o.type === 'acute_trust' && TRUSTS.includes(o.code));
      return t ? t.id : null;
    });
    expect(trustId, 'system includes an acute trust org').toBeTruthy();
    await page.selectOption('#orgsel', trustId);
    await nav(page, 'Priority drivers');
    await page.locator(`#dtbl_uec td.num[onclick^="openDrill"][onclick*="${trustId}"]`).first().click();
    const modal = page.locator('.modal');
    await expect(modal).toContainText('Challenge this figure');
    const note = modal.locator('#chnote');
    await expect(note, 'signed-out sign-in note').toContainText('Sign in to challenge');
    // Gate check: submitting with a rationale must not create a challenge while signed out.
    const pre = await modal.locator('.ovr').count();
    if (await modal.locator('#cbtn').count()) {
      await modal.locator('#cwhy').fill('smoke-test rationale — must not submit while signed out');
      await modal.locator('#cbtn').click();
      await expect(note).toContainText('Sign in to challenge'); // still gated
      await page.waitForTimeout(800);
      expect(await modal.locator('.ovr').count(), 'no challenge row appears').toBe(pre);
    }
  });

  test('13 trust explorer: non-BSW trust renders domains, sparks + expand chart', async ({ page }) => {
    test.slow(); // lazy per-trust series fetch on top of boot
    await boot(page);
    await nav(page, 'Trust explorer');
    await expect(page.locator('#xorgsel')).toBeVisible({ timeout: 25000 });
    // Pick an acute trust outside the current (BSW) system that has status rows.
    const pick = await page.evaluate(() => {
      const t = orgs.find((o) => o.type === 'acute_trust' && !TRUSTS.includes(o.code) &&
        rows.some((r) => r.organisation_id === o.id && !r.service_id && r.value != null));
      return t ? { id: t.id, name: t.name } : null;
    });
    expect(pick, 'a non-BSW acute trust with data exists').toBeTruthy();
    await page.selectOption('#xorgsel', pick.id);
    await expect(page.locator('.view .card').first()).toContainText(pick.name, { timeout: 30000 });
    await expect(page.locator('.view .eyebrow').nth(2), 'at least three domain sections').toBeVisible();
    expect(await page.locator('.view table.dt tbody svg').count(), 'trend sparklines').toBeGreaterThan(5);
    // Expand the first metric row: inline chart + drill link appear.
    await page.locator('.view table.dt tbody tr[onclick^="xToggleRow"]').first().click();
    await expect(page.locator('.view tr.xex:visible').first()).toBeVisible();
    await expect(page.locator('.view tr.xex:visible a', { hasText: 'Open drill' }).first()).toBeVisible();
  });

  test('14 metric explorer: search → select → ranked table + overlay chart', async ({ page }) => {
    test.slow();
    await boot(page);
    await nav(page, 'Metric explorer');
    await expect(page.locator('#xmq')).toBeVisible({ timeout: 25000 });
    await page.locator('#xmq').fill('occupancy');
    const first = page.locator('#xmlist .row').first();
    await expect(first).toBeVisible();
    await first.click();
    await expect(page.locator('#xmrank tbody tr').first()).toBeVisible({ timeout: 25000 });
    expect(await page.locator('#xmrank tbody tr').count(), 'England ranked trusts').toBeGreaterThan(10);
    expect(await page.locator('#xmrank input[type="checkbox"]').count(), 'overlay checkboxes').toBeGreaterThan(10);
    await expect(page.locator('#xmchart'), 'overlay chart canvas').toBeAttached({ timeout: 25000 });
    await expect(page.locator('.view')).toContainText(/\d+ trusts ·/); // catalogue coverage line
  });

  test('15 extract grid: 2 metrics, current system → pivot table + CSV', async ({ page }) => {
    test.slow();
    await boot(page);
    await nav(page, 'Extract grid');
    await expect(page.locator('#xgq')).toBeVisible({ timeout: 25000 });
    await page.locator('#xgq').fill('ae_4hr');
    await page.locator('#xgmlist input[type="checkbox"]').first().check();
    await page.locator('#xgq').fill('rtt_18wk');
    await page.locator('#xgmlist input[type="checkbox"]:not(:checked)').first().check();
    await expect(page.locator('#xgcount')).toContainText('2 of 12');
    await page.locator('#xgrun').click();
    await expect(page.locator('#xgtable tbody tr').first()).toBeVisible({ timeout: 30000 });
    expect(await page.locator('#xgtable tbody tr').count(), 'pivot org × period rows').toBeGreaterThan(5);
    await expect(page.locator('#xgcsv'), 'CSV download').toBeVisible();
    await expect(page.locator('#xgcopy'), 'copy query definition').toBeVisible();
    await expect(page.locator('.view')).toContainText(/values/i);
  });

  // ===== WP3/WP4/WP1 · national domain pages, estate coverage, de-BSW, journey =====
  const DOMAINS_MAIN = ['Finance', 'Workforce', 'Capacity', 'Activity', 'Performance', 'Estate'];

  async function switchSystem(page, slug) {
    await page.selectOption('#syssel', slug);
    // setSystem() reloads series then re-renders; give the live fetch room.
    await page.waitForTimeout(2200);
  }

  async function assertDomainPopulated(page, label) {
    await nav(page, label);
    await expect(
      page.locator('.view .eyebrow').filter({ hasText: 'Published national position' }).first(),
      label + ' national primary panel header'
    ).toBeVisible({ timeout: 25000 });
    const kpiNums = await page.locator('.view .grid.kpis .card.kpi .v').allInnerTexts();
    const tblNums = await page.locator('.view table.dt td.num').allInnerTexts();
    const nums = kpiNums.concat(tblNums).filter((t) => /\d/.test(t));
    expect(nums.length, label + ' has numeric primary values').toBeGreaterThan(0);
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt), label + ' must not render undefined/NaN').toBeFalsy();
  }

  test('16 BSW · every domain page renders a populated national primary panel', async ({ page }) => {
    test.slow();
    await boot(page);
    for (const d of DOMAINS_MAIN) await assertDomainPopulated(page, d);
  });

  test('17 Devon · every domain page renders a populated national primary panel', async ({ page }) => {
    test.slow();
    await boot(page);
    await switchSystem(page, 'nhs-devon-icb');
    for (const d of DOMAINS_MAIN) await assertDomainPopulated(page, d);
  });

  test('18 South East London · every domain page renders a populated national primary panel', async ({ page }) => {
    test.slow();
    await boot(page);
    await switchSystem(page, 'nhs-south-east-london-icb');
    for (const d of DOMAINS_MAIN) await assertDomainPopulated(page, d);
  });

  test('19 Estate · flagship AND non-flagship systems show national ERIC KPIs + per-site detail (WP2a)', async ({ page }) => {
    test.slow();
    await boot(page);
    await nav(page, 'Estate');
    await expect(page.locator('.view .grid.kpis .card.kpi').first(), 'BSW estate KPIs').toBeVisible({ timeout: 25000 });
    const bswSiteRows = await page.locator('.view table.dt tbody tr').count();
    expect(bswSiteRows, 'BSW estate site rows').toBeGreaterThan(0);
    await switchSystem(page, 'nhs-devon-icb');
    await nav(page, 'Estate');
    await expect(page.locator('.view .grid.kpis .card.kpi').first(), 'Devon estate KPIs (national ERIC)').toBeVisible({ timeout: 25000 });
    const devonSiteRows = await page.locator('.view table.dt tbody tr').count();
    expect(devonSiteRows, 'Devon estate per-site rows (WP2a ERIC national)').toBeGreaterThan(0);
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt)).toBeFalsy();
  });

  test('20 de-BSW · a non-flagship system shows no BSW / place literal in domain copy', async ({ page }) => {
    test.slow();
    await boot(page);
    await switchSystem(page, 'nhs-devon-icb');
    for (const d of ['Finance', 'Capacity', 'Estate', 'Workforce']) {
      await nav(page, d);
      await expect(page.locator('.view h1')).toBeVisible({ timeout: 25000 });
      const txt = await page.locator('.view').innerText();
      expect(/\bBSW\b|Bath|Swindon|Wiltshire|Salisbury/.test(txt), d + ' leaks a BSW/place literal for Devon').toBeFalsy();
    }
  });

  test('21 decision journey · per-stage guidance + five completion chips + intact stage chips', async ({ page }) => {
    await boot(page);
    await nav(page, 'Decision journey');
    await expect(page.locator('.view')).toContainText('What you do here:');
    for (const s of ['Orient', 'Surface', 'Frame', 'Prioritise', 'Commit']) {
      await expect(page.locator('.view .jchip').filter({ hasText: s }).first()).toBeVisible();
    }
    const chips = page.locator('.view .lenses').first().locator('.lensbtn');
    await expect(chips).toHaveCount(5);
    await expect(chips.nth(0)).toContainText('Orient');
    await expect(chips.nth(4)).toContainText('Commit');
  });

  test('22 commit stage · export always available; commit gated to a signed-in facilitator', async ({ page }) => {
    await boot(page);
    await nav(page, 'Decision journey');
    await page.locator('.view .lenses').first().locator('.lensbtn').filter({ hasText: 'Commit' }).click();
    await expect(page.getByRole('button', { name: 'Export priority pack' })).toBeVisible();
    await expect(page.locator('.view'), 'signed-out commit gate').toContainText('Sign in as a facilitator to commit');
  });


  // ===== E1/E2/E3 · entry choice, deep links, England overview, journey credibility =====

  test('23 entry · a fresh open shows the Start screen, not a system', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('.homewrap h1')).toContainText('Where do you want to start?');
    await expect(page.locator('.door')).toHaveCount(3);
    await expect(page.locator('#syssel')).toBeHidden();
    expect(page.url()).not.toContain('system=');
    await expect(page.locator('.exec')).toHaveCount(0);
  });

  test('24 door B · pick a system and land on Priority drivers', async ({ page }) => {
    test.slow();
    await page.goto('/index.html');
    await page.selectOption('#homesys', 'nhs-devon-icb');
    await page.locator('#doorB button', { hasText: 'Open the system view' }).click();
    await expect(page.locator('.view h1'), 'drivers landing').toContainText('The four priority drivers', { timeout: 30000 });
    expect(page.url()).toContain('system=nhs-devon-icb');
    expect(page.url()).toContain('view=drivers');
  });

  test('25 deep link · ?system&view lands directly on the addressed page', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=nhs-devon-icb&view=estate');
    await expect(page.locator('.view .grid.kpis .card.kpi').first(), 'Devon estate via deep link').toBeVisible({ timeout: 30000 });
    expect(page.url()).toContain('system=nhs-devon-icb');
    expect(page.url()).toContain('view=estate');
  });

  test('26 no silent restore · a stored system becomes a resume chip, not a redirect', async ({ page }) => {
    await page.addInitScript(() => { try { localStorage.setItem('sr_system', 'nhs-devon-icb'); } catch (e) {} });
    await page.goto('/index.html');
    await expect(page.locator('.homewrap h1')).toContainText('Where do you want to start?');
    await expect(page.locator('#doorC .hres').first(), 'resume chip names the stored system').toContainText(/Devon/i);
    expect(page.url()).not.toContain('system=');
  });

  test('27 door A · explore the data enters the explorer with no system commitment', async ({ page }) => {
    test.slow();
    await page.goto('/index.html');
    await page.locator('#doorA button', { hasText: 'Open the data explorer' }).click();
    await expect(page.locator('.topbar .ttl'), 'metric explorer title').toContainText('Metric explorer', { timeout: 30000 });
    expect(page.url()).toContain('view=xmetric');
    expect(page.url()).not.toContain('system=');
  });

  test('28 England overview · national KPIs, pressure table, and the map as door B', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?view=england');
    await expect(page.locator('.view h1')).toContainText('England overview', { timeout: 30000 });
    await expect(page.locator('.view .grid.kpis .card.kpi').first()).toBeVisible();
    const pressureRows = await page.locator('.view table.dt tbody tr').count();
    expect(pressureRows, 'under-most-pressure rows').toBeGreaterThan(5);
    await page.locator('.view .card', { hasText: 'Work a system' }).click();
    await expect(page.locator('#promptsys'), 'system prompt opens').toBeVisible();
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt)).toBeFalsy();
  });

  test('29 journey credibility · orient is system-scoped, nationally ranked; chips are earned', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=nhs-devon-icb&view=decide');
    await expect(page.locator('.view')).toContainText('The agreed starting point', { timeout: 30000 });
    await expect(page.locator('.view .row .sc').first(), 'national percentile shown').toContainText('do better');
    const heads = await page.locator('.view .row .t1').allInnerTexts();
    for (const t of heads.slice(0, 4)) {
      expect(/RA9|RH8|RK9/.test(t), 'orient row belongs to a Devon trust: ' + t).toBeTruthy();
    }
    await expect(page.locator('.view .jchip').filter({ hasText: 'Orient' })).toContainText('✓');
    await expect(page.locator('.view .jchip').filter({ hasText: 'Frame' })).toContainText('○');
  });

  test('30 options · a non-flagship system gets the issues-to-options path, flagship set as reference', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=nhs-devon-icb&view=options');
    await expect(page.locator('.view'), 'seed panel or own options').toContainText(/Draft options from your prioritised issues|drafted from this system's issue register/, { timeout: 30000 });
    const cards = await page.locator('.view .card').count();
    expect(cards, 'reference option cards still render').toBeGreaterThan(2);
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt)).toBeFalsy();
  });


  test('31 landscape · explorer offers MH/community/ambulance providers with real data', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=nhs-devon-icb&view=xentity');
    await expect(page.locator('#xorgsel optgroup[label="Mental health trusts"]')).toBeAttached({ timeout: 35000 });
    const val = await page.locator('#xorgsel optgroup[label="Mental health trusts"] option', { hasText: 'Maudsley' }).first().getAttribute('value');
    await page.selectOption('#xorgsel', val);
    await expect(page.locator('.view'), 'MH provider metrics render').toContainText(/Backlog maintenance|Occupied share|estate/i, { timeout: 30000 });
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt)).toBeFalsy();
  });

  test('32 landscape · England overview states the provider landscape', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?view=england');
    await expect(page.locator('.view')).toContainText(/135 acute/, { timeout: 30000 });
    await expect(page.locator('.view')).toContainText(/mental health/);
  });

  test('33 cost & value · lenses quantify the gap to national median', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=' + BSW_SLUG + '&view=value');
    await expect(page.locator('.view h1'), 'page lands via deep link').toContainText('Cost & value', { timeout: 35000 });
    await expect(page.locator('.view .grid.kpis .card.kpi').first(), 'KPI strip renders').toBeVisible({ timeout: 30000 });
    await expect(page.locator('.view')).toContainText('The prize, sized', { timeout: 30000 });
    await expect(page.locator('.view')).toContainText('Specialty productivity');
    await expect(page.locator('.view')).toContainText('must not be added together'); // non-additivity warning is a contract
    await expect(page.locator('.view table.dt').first()).toBeVisible();
    await expect(page.locator('.view .hm').first(), 'trust x specialty opportunity heatmap (multi-trust system)').toBeVisible();
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt), 'no leaked NaN/undefined').toBeFalsy();
    await expect(page.locator('#nav button', { hasText: 'Cost & value' })).toBeVisible();
  });

  test('34 capacity · theatres section with stated-assumption requirement model', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=' + BSW_SLUG + '&view=capacity');
    await expect(page.locator('.view')).toContainText('Theatres & surgical throughput', { timeout: 35000 });
    await expect(page.locator('.view')).toContainText('Implied theatre requirement');
    await expect(page.locator('.view')).toContainText('stated-assumption model');
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt)).toBeFalsy();
  });

  test('35 modelling · specialty demand outlook + fragility index with methodology', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=' + BSW_SLUG + '&view=modelling');
    await expect(page.locator('.view')).toContainText('Specialty demand outlook', { timeout: 45000 });
    await expect(page.locator('.view')).toContainText('Specialty fragility index');
    await expect(page.locator('.view')).toContainText('How the fragility score is built');
    await expect(page.locator('.view')).toContainText('rota scale 30');
    await expect(page.locator('.view .hm').first()).toBeVisible();
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt)).toBeFalsy();
  });

  test('36 performance · board view table and national strips', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=' + BSW_SLUG + '&view=performance');
    await expect(page.locator('.view')).toContainText('The board view', { timeout: 35000 });
    await expect(page.locator('.view')).toContainText('Where these trusts sit nationally');
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt)).toBeFalsy();
  });

  test('37 access · interactive travel mapper: modes, sandbox controls, live KPIs', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=' + BSW_SLUG + '&view=access');
    await expect(page.locator('.view h1'), 'page renders').toContainText('Access', { timeout: 35000 });
    await expect(page.locator('#accKpis .card.kpi').first(), 'KPIs computed').toBeVisible({ timeout: 30000 });
    await expect(page.locator('#accmodes .chip')).toHaveCount(3);
    await expect(page.locator('#accacts')).toContainText('Add a site');
    await expect(page.locator('#accList input[type=checkbox]').first()).toBeVisible();
    // toggle a site from the list: KPI strip must show scenario deltas
    await page.locator('#accList input[type=checkbox]').first().uncheck();
    await expect(page.locator('#accKpis'), 'scenario deltas appear').toContainText('baseline', { timeout: 15000 });
    await page.locator('#accList input[type=checkbox]').first().check();
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt), 'no leaked NaN/undefined').toBeFalsy();
  });

  test('38 cost & value · opportunity dossiers triangulate with printed thresholds', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=' + BSW_SLUG + '&view=value');
    await expect(page.locator('.view')).toContainText('The prize, sized', { timeout: 45000 });
    await expect(page.locator('.view')).toContainText('Opportunity dossiers', { timeout: 30000 });
    await expect(page.locator('.view')).toContainText('Thresholds, printed so they can be challenged');
    await expect(page.locator('.view')).toContainText('How to read a dossier');
    await expect(page.locator('.view')).toContainText('First action:');
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt), 'no leaked NaN/undefined').toBeFalsy();
  });

  test('39 pack · case-for-change chapter composes from live data', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=' + BSW_SLUG + '&view=pack');
    await expect(page.locator('.view h1')).toContainText('Case for change', { timeout: 45000 });
    await expect(page.locator('.view')).toContainText('The system position', { timeout: 30000 });
    await expect(page.locator('.view')).toContainText('The demand ahead');
    await expect(page.locator('.view')).toContainText('Provenance and freshness');
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt), 'no leaked NaN/undefined').toBeFalsy();
  });

  test('40 options · hurdle screen derives from stored impacts and risks', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=' + BSW_SLUG + '&view=options');
    await expect(page.locator('.view')).toContainText('Hurdle screen', { timeout: 45000 });
    await expect(page.locator('.view')).toContainText('before any weighting');
    const txt = await page.locator('.view').innerText();
    expect(/clears screen|conditional|fails screen/i.test(txt), 'screen verdicts render').toBeTruthy();
    expect(/undefined|NaN/.test(txt)).toBeFalsy();
  });

  test('41 activity · outpatient efficiency block from HES MAR trust cut', async ({ page }) => {
    test.slow();
    await page.goto('/index.html?system=' + BSW_SLUG + '&view=activity');
    await expect(page.locator('.view')).toContainText('Outpatients & day-case efficiency', { timeout: 45000 });
    await expect(page.locator('.view')).toContainText('DNA');
    const txt = await page.locator('.view').innerText();
    expect(/undefined|NaN/.test(txt)).toBeFalsy();
  });

});
