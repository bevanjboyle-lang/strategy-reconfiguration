const { chromium } = require('@playwright/test');
const OUT = '/Users/bevanboyle/Documents/Claude/Projects/Strategy and Reconfiguration/shots/ui-ref/';
const targets = [
  ['ei-home', 'https://estates-intelligence.vercel.app/'],
  ['ei-overview', 'https://estates-intelligence.vercel.app/overview'],
  ['ei-benchmarking', 'https://estates-intelligence.vercel.app/benchmarking'],
  ['ei-money', 'https://estates-intelligence.vercel.app/money'],
  ['aas-home', 'https://appraisal-as-a-service.vercel.app/'],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [name, url] of targets) {
    try {
      await p.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await p.waitForTimeout(1500);
      await p.screenshot({ path: OUT + name + '.png', fullPage: true });
      console.log('shot', name);
    } catch (e) { console.log('FAIL', name, e.message.slice(0, 80)); }
  }
  // AAS inner links from the live DOM
  try {
    await p.goto('https://appraisal-as-a-service.vercel.app/', { waitUntil: 'networkidle', timeout: 45000 });
    const links = await p.evaluate(() => [...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href')).filter((v, i, s) => s.indexOf(v) === i).slice(0, 12));
    console.log('aas links', JSON.stringify(links));
    for (const l of links.slice(0, 3)) {
      if (l === '/') continue;
      await p.goto('https://appraisal-as-a-service.vercel.app' + l, { waitUntil: 'networkidle', timeout: 45000 });
      await p.waitForTimeout(1200);
      await p.screenshot({ path: OUT + 'aas' + l.replace(/\//g, '-') + '.png', fullPage: true });
      console.log('shot aas', l);
    }
  } catch (e) { console.log('AAS inner FAIL', e.message.slice(0, 80)); }
  await b.close();
})();
