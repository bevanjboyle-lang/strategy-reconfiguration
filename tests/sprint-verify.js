const { chromium } = require('@playwright/test');
const BSW='nhs-bath-and-north-east-somerset-swindon-and-wiltshire-icb';
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({viewport:{width:1440,height:900}});
  await p.goto('https://strategy-reconfiguration.vercel.app/?system='+BSW+'&view=modelling',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>{const e=document.getElementById('outFind');return e&&/%/.test(e.textContent);},null,{timeout:60000});
  const m = await p.evaluate(()=>({fitNel:MOD.fit&&MOD.fit.pod.nel,gnd:MOD.gndPod,find:document.getElementById('outFind').innerText.slice(0,200)}));
  console.log('ENGINE:',JSON.stringify(m.fitNel),JSON.stringify(m.gnd));
  console.log('FIND:',m.find);
  await p.goto('https://strategy-reconfiguration.vercel.app/?system='+BSW+'&view=performance',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>/waits texture/i.test(document.querySelector('.view').innerText),null,{timeout:60000});
  const t=await p.evaluate(()=>document.querySelector('.view').innerText);
  console.log('PERF: texture ok · over65:',/pathways past 65 weeks/.test(t),'· wlmds:',/Weekly early-warning/.test(t));
  await p.goto('https://strategy-reconfiguration.vercel.app/?system='+BSW+'&view=flow',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>/why discharges are late/i.test(document.querySelector('.view').innerText),null,{timeout:60000});
  const t2=await p.evaluate(()=>document.querySelector('.view').innerText);
  console.log('FLOW: reasons ok · community card:',/Community waits/.test(t2));
  await b.close();
})().catch(e=>{console.error('VERIFY FAIL',e.message.slice(0,140));process.exit(1);});
