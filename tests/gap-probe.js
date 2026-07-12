const { chromium } = require('@playwright/test');
const BSW = 'nhs-bath-and-north-east-somerset-swindon-and-wiltshire-icb';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  for (const s of ['modelling', 'assurance']) {
    await p.goto('http://127.0.0.1:4173/index.html?system=' + BSW + '&view=' + s, { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => { const v = document.querySelector('.view'); return v && !v.querySelector('.loading') && v.innerText.length > 200; }, null, { timeout: 40000 }).catch(() => {});
    await p.waitForTimeout(1800);
    const pairs = await p.evaluate(() => {
      const out = [];
      const parents = new Set();
      document.querySelectorAll('.view .card').forEach(c => parents.add(c.parentElement));
      parents.forEach(par => {
        const cards = [...par.children].filter(c => c.classList && c.classList.contains('card') && c.getBoundingClientRect().height > 0);
        for (let i = 1; i < cards.length; i++) {
          const a = cards[i - 1].getBoundingClientRect(), b2 = cards[i].getBoundingClientRect();
          if (b2.top >= a.bottom - 1) {
            const g = Math.round(b2.top - a.bottom);
            if (g >= 0 && g < 60 && g !== 14 && g < 38) out.push({ g, prev: cards[i - 1].innerText.slice(0, 40).replace(/\n/g, ' '), next: cards[i].innerText.slice(0, 40).replace(/\n/g, ' ') });
          }
        }
      });
      return out;
    });
    console.log(s, JSON.stringify(pairs, null, 1));
  }
  await b.close();
})();
