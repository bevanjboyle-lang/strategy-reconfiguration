const { chromium } = require('@playwright/test');
const BSW = 'nhs-bath-and-north-east-somerset-swindon-and-wiltshire-icb';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 160)); });
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message.slice(0, 160)));
  await p.goto('http://127.0.0.1:4173/index.html?system=' + BSW + '&view=capacity', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.querySelector('.view') && document.querySelector('.view').innerText.includes('Implied theatre'), null, { timeout: 40000 });
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => {
    const cv = document.getElementById('occ');
    return {
      canvas: !!cv, canvasSize: cv ? cv.width + 'x' + cv.height : null,
      chart: !!(charts && charts.occ), dsets: charts && charts.occ ? charts.occ.data.datasets.length : null,
      pts: charts && charts.occ ? charts.occ.data.datasets.map(d => d.data.filter(x => x != null).length) : null,
      labels: charts && charts.occ ? charts.occ.data.labels : null,
      noteShown: !!document.querySelector('.view') && document.querySelector('.view').innerText.includes('single month'),
    };
  });
  console.log(JSON.stringify(st));
  console.log('errs:', JSON.stringify(errs.slice(0, 6)));
  await b.close();
})();
