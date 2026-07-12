const { chromium } = require('@playwright/test');
const fs = require('fs');
const OUT = '/Users/bevanboyle/Documents/Claude/Projects/Strategy and Reconfiguration/shots/ui-audit2/';
const BSW = 'nhs-bath-and-north-east-somerset-swindon-and-wiltshire-icb';
const BASE = 'http://127.0.0.1:4173/index.html';
const stages = ['overview','drivers','activity','flow','performance','capacity','estate','finance','value','workforce','population','access','modelling','options','assurance','decide','pack','xentity','xmetric','xgrid'];
const AUDIT = () => {
  const out = { hoverflow: [], clipped: [], thover: [], gaps: [] };
  const seen = new Set();
  const key = e => e.tagName + '.' + (e.className && e.className.split ? e.className.split(' ')[0] : '') + '|' + (e.textContent || '').trim().slice(0, 34);
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  document.querySelectorAll('.view *').forEach(e => {
    if (!vis(e) || e.closest('details:not([open])')) return;
    const cs = getComputedStyle(e);
    if (e.scrollWidth - e.clientWidth > 3 && cs.overflowX === 'visible' && !e.closest('[style*="overflow-x:auto"], [style*="overflow-x: auto"], .chartbox')) {
      const k = 'h|' + key(e); if (!seen.has(k) && out.hoverflow.length < 30) { seen.add(k); out.hoverflow.push({ k: key(e), sw: e.scrollWidth, cw: e.clientWidth }); }
    }
  });
  document.querySelectorAll('.view .card').forEach(card => {
    const cr = card.getBoundingClientRect();
    card.querySelectorAll('*').forEach(e => {
      if (!vis(e) || e.closest('details:not([open])')) return;
      if (e.closest('[style*="overflow-x:auto"], [style*="overflow-x: auto"]')) return;
      const r = e.getBoundingClientRect();
      if (r.right > cr.right + 3 || r.bottom > cr.bottom + 3) {
        const k = 'c|' + key(e); if (!seen.has(k) && out.clipped.length < 30) { seen.add(k); out.clipped.push({ k: key(e), dr: Math.round(r.right - cr.right), db: Math.round(r.bottom - cr.bottom) }); }
      }
    });
  });
  document.querySelectorAll('.view th').forEach(th => {
    if (!vis(th) || th.closest('details:not([open])')) return;
    if (th.scrollWidth - th.clientWidth > 3) {
      const k = 't|' + key(th); if (!seen.has(k) && out.thover.length < 30) { seen.add(k); out.thover.push({ k: key(th), sw: th.scrollWidth, cw: th.clientWidth, table: (th.closest('table') || {}).className || '' }); }
    }
  });
  // vertical gaps between sibling cards
  const parents = new Set();
  document.querySelectorAll('.view .card').forEach(c => parents.add(c.parentElement));
  parents.forEach(p => {
    const cards = [...p.children].filter(c => c.classList && c.classList.contains('card') && vis(c));
    for (let i = 1; i < cards.length; i++) {
      const a = cards[i - 1].getBoundingClientRect(), b = cards[i].getBoundingClientRect();
      if (b.top >= a.bottom - 1) { const g = Math.round(b.top - a.bottom); if (g >= 0 && g < 60) out.gaps.push(g); }
    }
  });
  out.gapSet = [...new Set(out.gaps)].sort((x, y) => x - y);
  delete out.gaps;
  return out;
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const report = {};
  for (const s of stages) {
    try {
      await p.goto(BASE + '?system=' + BSW + '&view=' + s, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await p.waitForFunction(() => { const v = document.querySelector('.view'); return v && !v.querySelector('.loading') && v.innerText.length > 200; }, null, { timeout: 40000 }).catch(() => {});
      await p.waitForTimeout(s === 'access' || s === 'overview' ? 3000 : 1600);
      report[s] = await p.evaluate(AUDIT);
      await p.screenshot({ path: OUT + s + '.png', fullPage: true });
      console.log(s, 'h:' + report[s].hoverflow.length, 'c:' + report[s].clipped.length, 't:' + report[s].thover.length, 'gaps:' + JSON.stringify(report[s].gapSet));
    } catch (e) { console.log(s, 'FAIL', e.message.slice(0, 70)); report[s] = { error: e.message.slice(0, 120) }; }
  }
  fs.writeFileSync(OUT + 'audit.json', JSON.stringify(report, null, 1));
  await b.close();
})();
