const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  for (const sys of ['nhs-bath-and-north-east-somerset-swindon-and-wiltshire-icb', 'nhs-lincolnshire-icb']) {
    await p.goto('http://127.0.0.1:4173/index.html?system=' + sys + '&view=overview', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.querySelector('.view') && document.querySelector('.view').innerText.length > 400, null, { timeout: 45000 });
    await p.waitForTimeout(2500);
    const out = await p.evaluate(() => {
      const eb = [...document.querySelectorAll('.eyebrow')].find(e => /moved since/i.test(e.textContent));
      if (!eb) return 'NO MOVERS PANEL';
      const tbl = eb.nextElementSibling.querySelector('table');
      return [...tbl.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim()).join(' | ')).join('\n');
    });
    console.log('=== ' + sys + ' ===\n' + out);
  }
  console.log('errs:', JSON.stringify(errs));
  await b.close();
})();
