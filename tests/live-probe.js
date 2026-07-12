const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('https://strategy-reconfiguration.vercel.app/?system=nhs-bath-and-north-east-somerset-swindon-and-wiltshire-icb&view=modelling', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => { const e = document.getElementById('outFind'); return e && /%/.test(e.textContent); }, null, { timeout: 60000 });
  const out = await p.evaluate(() => ({
    find: document.getElementById('outFind').innerText,
    tips: [...document.querySelectorAll('#tipwrap .tiprow')].slice(1).map(r => r.innerText.replace(/\n/g, ' | ')),
    spine: document.querySelectorAll('.spinenav a').length,
    gnd: MOD.gndPod,
    fitNel: MOD.fit && MOD.fit.pod && MOD.fit.pod.nel,
    bind: MOD.last && MOD.last.v2 && MOD.last.v2.bind.sys,
    avail: MOD.last && MOD.last.v2 && MOD.last.v2.availSum,
  }));
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.error('PROBE FAIL', e.message); process.exit(1); });
