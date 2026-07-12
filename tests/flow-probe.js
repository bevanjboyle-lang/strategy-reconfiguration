const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 140)));
  await p.goto('http://127.0.0.1:4173/index.html?system=nhs-bath-and-north-east-somerset-swindon-and-wiltshire-icb&view=flow', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(9000);
  const t = await p.evaluate(() => document.querySelector('.view').innerText);
  console.log('has discharge section:', /why discharges are late/i.test(t), '| community:', /community waits/i.test(t), '| est cost:', /estimated cost/i.test(t));
  console.log('errs:', JSON.stringify(errs));
  const tail = t.split('\n').slice(-14).join(' | ');
  console.log('tail:', tail.slice(0, 500));
  await b.close();
})();
