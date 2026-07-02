
const SB_URL="https://ehkxzxjnhqcuarbcfchw.supabase.co";
const SB_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoa3h6eGpuaHFjdWFyYmNmY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0OTE2MzcsImV4cCI6MjA5ODA2NzYzN30.oLc_J8Y5pV4xzBkOQruRU5WqbwyA_Lsb6M4etRYNFWY";
const sb=window.supabase.createClient(SB_URL,SB_KEY);
const TOPO_URL="https://cdn.jsdelivr.net/npm/datamaps@0.5.10/src/js/data/gbr.topo.json";
const NAV=[["SYSTEM",[["overview","Overview"],["drivers","Priority drivers"]]],
["EXPLORE",[["activity","Activity"],["flow","Flow & transit"],["performance","Performance"],["capacity","Capacity"],["estate","Estate"],["finance","Finance"],["workforce","Workforce"],["population","Population & demand"],["access","Access & travel"]]],
["EXPLORER",[["xentity","Trust explorer"],["xmetric","Metric explorer"],["xgrid","Extract grid"]]],
["MODEL",[["modelling","Modelling studio"]]],
["APPRAISE",[["options","Options & appraisal"],["assurance","Tests & packs"]]],
["DECIDE",[["decide","Decision journey"]]]];
const DRIVERS=[["service_fragility","Service fragility"],["uec","Urgent & emergency care"],["elective_backlog","Elective backlog"],["cancer","Cancer pathway"]];
const DOMAINS=[["performance","Performance"],["activity","Activity & flow"],["capacity","Capacity & estate"],["workforce","Workforce"],["finance","Finance"],["quality","Quality & safety"],["patient_experience","Patient experience"],["demand","Demand & need"]];
let PLACE_SITE={}; /* dynamic per system */
const IMPACT={uec_flow:["Improved flow could release ~25-30 beds and cut 12-hour waits","Medium"],amb_handover:["Faster handovers free ambulance hours and ED capacity","Short"],cancer_62:["Pathway redesign to recover the 62-day standard","Short"],rtt_backlog:["Pooled lists and surgical hubs to clear long waits","Medium"],fragility:["Consolidating sub-scale services improves resilience","Long"],workforce:["Cut agency reliance and vacancy; stabilise rotas","Medium"],finance:["Productivity and configuration to address the deficit","Long"],diagnostics:["CDC and surgical hub to cut diagnostic waits","Short"],consolidation:["Site reconfiguration for clinical and financial sustainability","Long"],out_of_hospital:["Shift care to community; reduce length of stay","Medium"],
'uec-flow-capacity-pressure':["Recover flow: handover, discharge and occupancy bundle across the three sites","Short"],
'elective-backlog-structural-recovery':["Pooled waiting lists, surgical hubs and theatre productivity programme","Medium"],
'cancer-pathway-standard-risk':["FDS front-door redesign and 62-day backlog recovery taskforce","Short"],
'gwh-quality-fragility-watch':["Targeted quality support and fragile-service consolidation review at GWH","Medium"],
'financial-sustainability-reconfiguration-case':["Clinical services strategy and site reconfiguration to close the structural deficit","Long"]};
let TRUSTS=[],TRUSTCOL={}; /* dynamic per system */
let orgs=[],orgdist=[],rows=[],overrides=[],criteria=[],lenses=[],issues=[],iscores=[],series={},bench=[];
let issueEvidence=[],evidenceItems=[],lastEnsureError=null,showSourceValue=false,popProjCache={},sysDistressMap=null,freshness=[],deferredLoads=null;
let specs=[],pods=[],sgs=[],flines=[],sites=[];
let orgById={},distByOrg={},distByCode={},topo=null,fcache={};
let stage='overview',sel=null,driver=null,drill=null,lensName='Balanced',weights={},charts={};
let aSpec='110',aPod='NEL',perfMetric='rtt_18wk';
function color(d){if(d==null)return '#9aa0af';if(d>=70)return '#b3261e';if(d>=55)return '#b45309';if(d>=35)return '#7a6200';return '#166f4d';}
function slab(s){return {near_failure:'near-failure',serious:'serious',watch:'watch',stable:'stable'}[s]||s;}
function fmt(v,u){if(v==null||v==='')return '—';v=Number(v);if(u==='pct')return (Math.round(v*10)/10)+'%';if(u==='gbp_m')return (v<0?'−£':'£')+Math.abs(Math.round(v*10)/10).toLocaleString()+'m';if(u==='count'||u==='wte')return Math.round(v).toLocaleString();if(u==='days')return (Math.round(v*10)/10)+' days';if(u==='m2')return Math.round(v).toLocaleString()+' m²';if(u==='flag')return v?'Yes':'No';if(u==='score'||u==='ratio')return ''+(Math.round(v*10)/10);return ''+v;}
function esc(s){return (s==null?'':''+s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
const MONTHS_ABBR=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtPeriod(p){if(!p)return '';const s=''+p;const m=parseInt(s.slice(5,7),10);if(!m||m<1||m>12)return s.slice(2,7);return MONTHS_ABBR[m-1]+' '+s.slice(2,4);}
/* U3 · authentication: Supabase email OTP (magic link). Facilitator powers now require a
   signed-in session whose email is on FACILITATOR_EMAILS. The legacy ?facilitator URL flag
   is kept as an interim affordance but no longer grants anything on its own — it only ever
   worked in combination with being signed in as a facilitator (membership roles come later). */
const FACILITATOR_EMAILS=['bevan.j.boyle@gmail.com'];
const facFlag=new URLSearchParams(location.search).has('facilitator'); /* interim, non-sufficient */
let session=null;
function sessionEmail(){return session&&session.user?(session.user.email||'').toLowerCase():null;}
function isFacilitator(){const e=sessionEmail();return !!e&&FACILITATOR_EMAILS.indexOf(e)>=0;}
function renderAuth(){const el=document.getElementById('authui');if(!el)return;const e=sessionEmail();
  el.innerHTML=e?`<span class="sel" style="cursor:default" title="Signed in">${esc(e)}${isFacilitator()?' · facilitator':''}</span><button class="sel" onclick="signOut()">Sign out</button>`:`<button class="sel" onclick="signIn()">Sign in</button>`;}
async function signIn(){const email=prompt('Enter your email — we will send a sign-in link:');if(!email)return;
  try{const{error}=await sb.auth.signInWithOtp({email:email.trim()});authMsg(error?('Sign-in failed — '+error.message):'Check your email for the sign-in link.');}
  catch(e){authMsg('Sign-in failed — '+(e.message||'network'));}}
async function signOut(){try{await sb.auth.signOut()}catch(e){}session=null;renderAuth();if(drill)redrawDrill();}
function authMsg(m){let b=document.getElementById('authmsg');if(!b){b=document.createElement('div');b.id='authmsg';b.className='banner';b.style.cssText='position:fixed;top:56px;right:16px;z-index:300;max-width:340px;box-shadow:var(--shadow-lg);margin:0';document.body.appendChild(b);}b.textContent=m;clearTimeout(authMsg._t);authMsg._t=setTimeout(()=>{try{b.remove()}catch(e){}},9000);}
async function initAuth(){try{const{data}=await sb.auth.getSession();session=(data&&data.session)||null;}catch(e){session=null;}
  try{sb.auth.onAuthStateChange((_ev,s)=>{session=s;renderAuth();if(drill)redrawDrill();});}catch(e){}
  renderAuth();}
window.signIn=signIn;window.signOut=signOut;
const SEEDED_ISSUES=['uec-flow-capacity-pressure','elective-backlog-structural-recovery','cancer-pathway-standard-risk','gwh-quality-fragility-watch','financial-sustainability-reconfiguration-case'];
function adjustedOverride(mvId){return mvId?overrides.find(x=>x.metric_value_id===mvId&&x.state==='adjusted'&&x.proposed_value!=null):null;}
function orgRows(){return rows.filter(r=>r.organisation_id===sel);}
function killCharts(){Object.values(charts).forEach(c=>{try{c.destroy()}catch(e){}});charts={};}
function orgName(){return (orgById[sel]||{}).name||'';}
function specName(c){const s=specs.find(x=>x.code===c);return s?s.name:c;}

const BSW_SLUG='nhs-bath-and-north-east-somerset-swindon-and-wiltshire-icb';
let SYSTEMS=[],TRUSTMETA={},SITES=[],CQC={};
let sysSlug=(function(){try{return localStorage.getItem('sr_system')||BSW_SLUG}catch(e){return BSW_SLUG}})();
function system(){return SYSTEMS.find(s=>s.slug===sysSlug)||SYSTEMS[0];}
const PALETTE=['#1f3a78','#8a6a1e','#166f4d','#44639f','#b3261e','#7c93c4','#7c93c4'];
function trustShort(c){const t=TRUSTMETA[c];if(!t)return c;return t.name.replace(/Nhs Foundation Trust|Nhs Trust|Foundation Trust|Hospitals Nhs/gi,'').replace(/\bNhs\b/gi,'').replace(/\s+/g,' ').trim();}
function applySystem(){const s=system();TRUSTS=s?s.trusts.slice():[];PLACE_SITE={};TRUSTCOL={};TRUSTS.forEach((c,i)=>{PLACE_SITE[c]=trustShort(c);TRUSTCOL[c]=PALETTE[i%PALETTE.length];});}
function sysNote(){if(sysSlug===BSW_SLUG)return '';return `<div class="banner">Viewing ${esc(system()?system().name:'')}. Headline performance, benchmarking and the strategic map run on live national data; detailed activity, finance, workforce, estate and the issue register carry the full dataset for the flagship system in this working prototype.</div>`;}
function sysOrgs(){return orgs.filter(x=>TRUSTS.includes(x.code)||(sysSlug===BSW_SLUG&&['icb','provider_group'].includes(x.type)));}
function pickDefaultOrg(force){const so=sysOrgs();if(force||!sel||!so.find(x=>x.id===sel)){const g=so.find(x=>x.type==='provider_group');sel=g?g.id:(so[0]||{}).id;}}
async function loadSeries(){const ids=sysOrgs().map(x=>x.id);series={};if(!ids.length)return;
  const {data}=await sb.from('sr_metric_values').select('organisation_id,metric_id,period,value,source,confidence').is('service_id',null).in('organisation_id',ids).limit(20000);
  (data||[]).forEach(x=>{const k=x.organisation_id+'|'+x.metric_id;(series[k]=series[k]||[]).push(x);});
  Object.values(series).forEach(a=>a.sort((p,q)=>p.period<q.period?-1:1));}
function renderSystems(){const s=document.getElementById('syssel');if(!s)return;const groups={};SYSTEMS.forEach(x=>{(groups[x.region]=groups[x.region]||[]).push(x);});
  s.innerHTML=Object.keys(groups).sort().map(rg=>`<optgroup label="${esc(rg.replace(/-/g,' '))}">`+groups[rg].map(x=>`<option value="${x.slug}" ${x.slug===sysSlug?'selected':''}>${esc(x.name.replace('NHS ','').replace(' Integrated Care Board','').replace(' ICB',''))}</option>`).join('')+`</optgroup>`).join('');}
async function setSystem(slug){sysSlug=slug;try{localStorage.setItem('sr_system',slug)}catch(e){}
  applySystem();pickDefaultOrg(true);renderSystems();renderSelect();driver=null;
  await loadSeries();render();}
window.setSystem=setSystem;

async function loadAll(){
  try{
  const [gs,gt,gsite,gcqc]=await Promise.all([fetch('geo/systems.json'),fetch('geo/trusts.json'),fetch('geo/sites.json'),fetch('geo/cqc.json')]);
  SYSTEMS=await gs.json();TRUSTMETA=await gt.json();SITES=await gsite.json();CQC=await gcqc.json();
  if(!SYSTEMS.find(s=>s.slug===sysSlug))sysSlug=BSW_SLUG;
  const [o,d,r,ov,cr,ln,iss,isc,sp,pd,sg,fl,si,bm]=await Promise.all([
    sb.from('sr_organisations').select('*').limit(5000),sb.from('sr_v_org_distress').select('*').limit(5000),sb.from('sr_v_metric_status').select('*').limit(20000),
    sb.from('sr_overrides').select('*'),sb.from('sr_criteria').select('*').order('sort'),sb.from('sr_lenses').select('*').order('sort'),
    sb.from('sr_issues').select('*'),sb.from('sr_issue_scores').select('*'),
    sb.from('sr_dim_specialty').select('*').order('sort'),sb.from('sr_dim_pod').select('*').order('sort'),
    sb.from('sr_dim_staff_group').select('*').order('sort'),sb.from('sr_dim_finance_line').select('*').order('sort'),sb.from('sr_dim_site').select('*').order('sort'),
    sb.from('sr_benchmarks').select('*').limit(20000)]);
  orgs=o.data||[];orgdist=d.data||[];rows=r.data||[];overrides=ov.data||[];criteria=cr.data||[];lenses=ln.data||[];issues=iss.data||[];iscores=isc.data||[];bench=bm.data||[];
  const today=new Date().toISOString().slice(0,10);bench=bench.filter(b=>!b.period||b.period<=today); /* drop stray future-dated benchmark rows */
  specs=sp.data||[];pods=pd.data||[];sgs=sg.data||[];flines=fl.data||[];sites=si.data||[];
  orgById={};orgs.forEach(x=>orgById[x.id]=x);distByOrg={};orgdist.forEach(x=>distByOrg[x.organisation_id]=x);
  distByCode={};orgdist.forEach(x=>{if(x.org_code)distByCode[x.org_code]=x;});
  applySystem();pickDefaultOrg(false);
  const L=lenses.find(x=>x.name===lensName)||lenses[0];if(L){lensName=L.name;weights=Object.assign({},L.weights);}
  await loadSeries();
  }catch(e){
    console.error('loadAll failed',e);
    document.getElementById('view').innerHTML=`<div class="banner">Could not load the system model (network). <button class="btn ghost" style="margin-left:8px;font-size:11.5px;padding:5px 12px" onclick="location.reload()">Retry</button></div>`;
    return;
  }
  renderSystems();renderNav();renderSelect();render();
  /* E4 · non-critical loads (evidence, freshness, QA) deferred past first paint */
  deferredLoads=Promise.resolve().then(async()=>{try{
    const [iev,evi,dfr]=await Promise.all([sb.from('sr_issue_evidence').select('*'),sb.from('sr_evidence_items').select('*'),sb.from('sr_data_freshness').select('*')]);
    issueEvidence=iev.data||[];evidenceItems=evi.data||[];freshness=(dfr&&dfr.data)||[];
    /* D12 · sidebar freshness line (population projections run to 2040, so cap at today) */
    const fl2=document.getElementById('freshline');const today2=new Date().toISOString().slice(0,10);
    const mx=freshness.filter(x=>x.latest_period&&(''+x.latest_period).slice(0,10)<=today2).reduce((m,x)=>(''+x.latest_period).slice(0,10)>m?(''+x.latest_period).slice(0,10):m,'');
    if(fl2&&mx)fl2.textContent='Data as at: '+fmtPeriod(mx)+' · refreshed weekly (Mon 07:00)';
  }catch(e){console.warn('deferred loads failed',e);}
  loadQaBadge();});
  maybeStartTour();
}

async function ensure(domain){const key=domain+'|'+sysSlug;if(fcache[key])return fcache[key];
  /* Scoped to the selected system's organisations: line-level facts (DM01 by test) now span all trusts nationally. */
  try{const{data,error}=await sb.from('sr_fact').select('*').eq('domain',domain).in('organisation_id',sysOrgs().map(x=>x.id)).limit(20000);if(error)throw error;fcache[key]=data||[];lastEnsureError=null;return fcache[key];}
  catch(e){console.warn('sr_fact fetch failed for '+domain,e);lastEnsureError=domain;return [];}}
function ensureNote(domain){return lastEnsureError===domain?`<div class="banner">Detail data for this page could not be loaded (network) — showing what is available. <a href="#" onclick="location.reload();return false">Retry</a></div>`:'';}
function renderNav(){document.getElementById('nav').innerHTML=NAV.map(g=>`<div class="navgrp"><div class="lab">${g[0]}</div><div class="nav" role="navigation" aria-label="${esc(g[0].toLowerCase())} pages">`+g[1].map(s=>`<button class="${stage===s[0]?'on':''}" data-stage="${s[0]}" aria-label="${esc(s[1])}"${stage===s[0]?' aria-current="page"':''} onclick="setStage('${s[0]}')"><span class="ic"></span><span>${s[1]}</span></button>`).join('')+`</div></div>`).join('');}
function renderSelect(){const s=sysOrgs();document.getElementById('orgsel').innerHTML=s.map(x=>`<option value="${x.id}" ${x.id===sel?'selected':''}>${esc(x.name)}</option>`).join('');}
document.getElementById('orgsel').addEventListener('change',e=>{sel=e.target.value;driver=null;render();});
document.getElementById('syssel').addEventListener('change',e=>{setSystem(e.target.value);});
function setStage(s){stage=s;driver=null;renderNav();render();toggleSide(false);window.scrollTo({top:0,behavior:reducedMotion()?'auto':'smooth'});}
/* U10/E5 · shared helpers: reduced-motion query + off-canvas drawer toggle */
function reducedMotion(){try{return window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}}
function toggleSide(force){const s=document.querySelector('.side'),sc=document.getElementById('sidescrim'),b=document.getElementById('menubtn');if(!s)return;
  const open=typeof force==='boolean'?force:!s.classList.contains('open');
  s.classList.toggle('open',open);if(sc)sc.classList.toggle('on',open);if(b)b.setAttribute('aria-expanded',open?'true':'false');}
window.toggleSide=toggleSide;
function selectCode(c){const t=orgs.find(o=>o.code===c);if(t){sel=t.id;driver=null;renderSelect();render();}}
function setDriver(d){driver=driver===d?null:d;render();}
function setLens(n){const L=lenses.find(x=>x.name===n);if(L){lensName=n;weights=Object.assign({},L.weights);}render();}
function setWeight(c,v){weights[c]=v/100;lensName='Custom';render();}
window.setStage=setStage;window.selectCode=selectCode;window.setDriver=setDriver;window.setLens=setLens;window.setWeight=setWeight;
const TITLES={overview:'System overview',drivers:'Priority drivers',activity:'Activity',flow:'Flow & transit',performance:'Performance',capacity:'Capacity',estate:'Estate (ERIC)',finance:'Finance',workforce:'Workforce',population:'Population & demand',access:'Access & travel',xentity:'Trust explorer',xmetric:'Metric explorer',xgrid:'Extract grid',modelling:'Modelling studio',options:'Options & appraisal',assurance:'Tests & packs',decide:'Decision journey'};
function render(){killCharts();const o=orgById[sel]||{};
  document.getElementById('topttl').innerHTML=`${esc(TITLES[stage]||'')}<small>${esc(o.name||'')}</small>`;
  const ph=document.getElementById('printhead');if(ph)ph.innerHTML=`System Intelligence — ${esc(system()?system().name:'')}<small>${esc(TITLES[stage]||'')} · ${esc(o.name||'')} · ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · source-tagged data — modelled and estimated figures are labelled</small>`;
  const lc=document.getElementById('lenschip');if(stage==='decide'||stage==='options'){lc.style.display='';lc.textContent='Lens: '+lensName;}else lc.style.display='none';
  const v=document.getElementById('view');
  const fn={overview:renderOverview,drivers:renderDrivers,activity:renderActivity,flow:renderFlow,performance:renderPerformance,capacity:renderCapacity,estate:renderEstate,finance:renderFinance,workforce:renderWorkforce,population:renderPopulation,access:renderAccess,xentity:renderXEntity,xmetric:renderXMetric,xgrid:renderXGrid,modelling:renderModelling,options:renderOptions,assurance:renderAssurance,decide:renderDecide}[stage];
  fn(v);
}
const tip=document.getElementById('tip');
function showTip(h,e){tip.innerHTML=h;tip.style.opacity=1;moveTip(e);}
function moveTip(e){let x=e.clientX+14,y=e.clientY+14;if(x+260>innerWidth)x=e.clientX-260;tip.style.left=x+'px';tip.style.top=y+'px';}
function hideTip(){tip.style.opacity=0;}
window.moveTip=moveTip;window.hideTip=hideTip;window.showTip=showTip;
function spark(arr,col){if(!arr||arr.length<2)return '';const v=arr.map(a=>Number(a.value));const mn=Math.min(...v),mx=Math.max(...v),w=150,h=28,r=(mx-mn)||1;const p=v.map((x,i)=>[i/(v.length-1)*w,h-((x-mn)/r)*(h-4)-2]);return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true" style="width:100%;height:100%"><path d="M0 ${h} ${p.map(q=>'L'+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ')} L${w} ${h} Z" fill="${col}22"/><path d="${p.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' ')}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/></svg>`;}
function seriesFor(o,m){return series[o+'|'+m]||[];}
function officialSeries(o,m){const s=seriesFor(o,m);const off=s.filter(x=>x.confidence==='official');return off.length?off:s;}
/* WP3 · national-curated helpers — read the boot-loaded curated layer (rows=sr_v_metric_status,
   series=sr_metric_values service_id null). Curated national coverage is trust-level, so these key
   off the current system's acute trusts and guarantee every system a populated primary panel. */
function sysLabel(){const x=system();return x?x.name.replace('NHS ','').replace(' Integrated Care Board','').replace(' ICB',''):'the system';}
function focusTrust(){const o=orgById[sel];if(o&&o.type==='acute_trust')return sel;const t=sysTrusts()[0];return t?t.id:sel;}
function curatedRow(oid,code){return rows.find(x=>x.organisation_id===oid&&x.metric_code===code&&!x.service_id&&x.value!=null);}
function covNote(msg){return `<div class="note" style="margin:9px 2px 2px">${esc(msg)}</div>`;}
function curatedCards(codes){const oid=focusTrust();return codes.map(c=>{const r=curatedRow(oid,c);if(!r)return '';const ser=officialSeries(oid,r.metric_id);const sub=(r.standard!=null&&r.standard!==''?'standard '+fmt(r.standard,r.unit)+' · ':'')+fmtPeriod(r.period)+(r.confidence?' · '+r.confidence:'');return kpi(r.metric_name,fmt(r.value,r.unit),'',sub,ser,color(r.distress));}).join('');}
function curatedCount(codes){const oid=focusTrust();return codes.filter(c=>curatedRow(oid,c)).length;}
function natTrustTable(codes){const trs=sysTrusts();if(!trs.length)return '';const cats=codes.map(c=>{const any=rows.find(r=>r.metric_code===c);return {code:c,name:any?any.metric_name:c,unit:any?any.unit:''};});
  let h=`<div class="card" style="overflow-x:auto;padding:4px 0"><table class="dt"><thead><tr><th>Trust</th>`+cats.map(c=>`<th class="num">${esc(c.name)}</th>`).join('')+`</tr></thead><tbody>`;
  trs.forEach(o=>{h+=`<tr><td>${esc(trustShort(o.code))}</td>`+cats.map(c=>{const r=curatedRow(o.id,c.code);if(!r)return `<td class="num muted">—</td>`;return `<td class="num" style="cursor:pointer;color:${color(r.distress)}" onclick="openDrill('${o.id}','${c.code}')">${fmt(r.value,r.unit)}</td>`;}).join('')+`</tr>`;});
  return h+`</tbody></table></div>`;}
function nationalBlock(cardCodes,tableCodes,note){const oid=focusTrust();const fo=orgById[oid]||{};const cards=curatedCards(cardCodes);
  let h=`<div class="eyebrow">Published national position · ${esc(trustShort(fo.code)||fo.name||'')}</div>`;
  if(cards)h+=`<div class="grid kpis">`+cards+`</div>`; else h+=covNote('No published national metric is available for this organisation in this domain.');
  h+=`<div class="eyebrow" style="margin-top:6px">Across ${esc(sysLabel())} · every acute trust, benchmarked live nationally</div>`+natTrustTable(tableCodes);
  if(note)h+=covNote(note);
  return h;}
/* A4 · SPC trend rules: baseline mean/σ from the first max(12, half) points; special cause =
   (i) any of the last 3 points beyond mean±3σ, (ii) ≥7 consecutive points one side of the mean,
   (iii) ≥6 consecutive rising/falling points. Direction is read with higher_is_better. */
function spc(vals,higherBetter){
  if(!vals||vals.length<8)return null;
  const n=vals.length,bn=Math.min(n,Math.max(12,Math.floor(n/2)));
  const bl=vals.slice(0,bn),mean=bl.reduce((a,b)=>a+b,0)/bn;
  const sd=Math.sqrt(bl.reduce((a,b)=>a+(b-mean)*(b-mean),0)/bn);
  const dir=side=>((side>0)===(higherBetter!==false))?'improvement':'deterioration';
  let hit=null;
  if(sd>0)for(let i=n-3;i<n;i++){if(vals[i]>mean+3*sd)hit={rule:'point beyond mean+3σ in the last three',side:1};else if(vals[i]<mean-3*sd)hit={rule:'point beyond mean−3σ in the last three',side:-1};}
  if(!hit){let run=0,side=0,best=null;for(let i=0;i<n;i++){const s=vals[i]>mean?1:vals[i]<mean?-1:0;run=(s!==0&&s===side)?run+1:(s?1:0);side=s;if(run>=7)best={rule:run+' consecutive points '+(s>0?'above':'below')+' the mean',side:s};}if(best)hit=best;}
  if(!hit){let run=1,d=0,best=null;for(let i=1;i<n;i++){const s=vals[i]>vals[i-1]?1:vals[i]<vals[i-1]?-1:0;run=(s!==0&&s===d)?run+1:(s?2:1);d=s;if(d!==0&&run>=6)best={rule:run+' consecutive '+(d>0?'rising':'falling')+' points',side:d};}if(best)hit=best;}
  if(!hit)return{verdict:'common-cause variation',detail:'no special-cause rule fired against the first-'+bn+'-point baseline',mean,sd};
  return{verdict:'special-cause '+dir(hit.side),detail:hit.rule+' · baseline = first '+bn+' points',mean,sd};
}
/* U6 · system-vs-England distribution strip: every English acute trust's latest value as a dot,
   highlighted orgs as ink diamonds, peer-family members slightly darker. */
function distStrip(code,hlIds,fam){
  let all=rows.filter(r=>r.metric_code===code&&r.org_type==='acute_trust'&&!r.service_id&&r.value!=null);
  if(code==='shmi')all=all.filter(r=>r.confidence==='official');
  if(all.length<10)return '';
  const hl=hlIds||[],vals=all.map(r=>Number(r.value)).sort((a,b)=>a-b);
  const mn=vals[0],mx=vals[vals.length-1],md=vals[Math.floor(vals.length/2)],u=all[0].unit;
  const W=240,X=v=>10+((v-mn)/((mx-mn)||1))*(W-20);
  let s=`<line x1="${X(md).toFixed(1)}" y1="3" x2="${X(md).toFixed(1)}" y2="17" stroke="#9aa0af" stroke-width="1" stroke-dasharray="2 2"/>`;
  all.forEach(r=>{if(hl.indexOf(r.organisation_id)>=0)return;const pf=fam&&(TRUSTMETA[r.org_code]||{}).peer===fam;
    s+=`<circle cx="${X(Number(r.value)).toFixed(1)}" cy="10" r="${pf?3:2.1}" fill="${pf?'#7c93c4':'#dcd9d0'}"/>`;});
  hl.forEach(id=>{const r=all.find(a=>a.organisation_id===id);if(!r)return;const cx=X(Number(r.value));
    s+=`<path d="M ${cx.toFixed(1)} 3.5 L ${(cx+5).toFixed(1)} 10 L ${cx.toFixed(1)} 16.5 L ${(cx-5).toFixed(1)} 10 Z" fill="#191f2b"/>`;});
  return `<svg viewBox="0 0 ${W} 28" aria-hidden="true" style="width:100%;height:30px;display:block">${s}<text x="10" y="26.5" font-size="7.5" fill="#9aa0af" font-family="IBM Plex Mono,monospace">${fmt(mn,u)}</text><text x="${W/2}" y="26.5" font-size="7.5" fill="#9aa0af" text-anchor="middle" font-family="IBM Plex Mono,monospace">median ${fmt(md,u)}</text><text x="${W-10}" y="26.5" font-size="7.5" fill="#9aa0af" text-anchor="end" font-family="IBM Plex Mono,monospace">${fmt(mx,u)}</text></svg>`;}
/* D12 · best-effort match from a metric row's source/tag to a freshness family (skip silently on no match) */
function freshFor(r){if(!freshness.length||!r)return null;const t=((r.source_url||'')+' '+(r.source||'')).toLowerCase();
  const M=[[/a6-v1|fragility/,'a6_fragility_composite'],[/shmi/,'d7_shmi'],[/cqc/,'d7_cqc'],[/sickness/,'d2_workforce_sickness'],[/oversight/,'d1_finance_oversight'],[/virtual.?ward/,'d9_virtual_ward'],[/\bhes\b/,'d5_hes_activity'],[/national-serving/,'national_serving'],[/nhse|nhs england/,'bsw_serving']];
  const hit=M.find(p=>p[0].test(t));return hit?(freshness.find(f=>f.source_key===hit[1])||null):null;}
function lineChart(id,labels,datasets,opt){const cv=document.getElementById(id);if(!cv||!window.Chart)return;charts[id]=new Chart(cv.getContext('2d'),{type:'line',data:{labels,datasets},options:Object.assign({plugins:{legend:{display:datasets.length>1,position:'bottom',labels:{boxWidth:9,font:{size:10},color:'#6a7183'}}},scales:{x:{ticks:{maxTicksLimit:8,font:{size:9},color:'#9aa0af'},grid:{display:false}},y:{ticks:{font:{size:9},color:'#9aa0af'},grid:{color:'#e8e5dc'}}},responsive:true,maintainAspectRatio:false},opt||{})});}
function barChart(id,labels,data,colors,opt){const cv=document.getElementById(id);if(!cv||!window.Chart)return;charts[id]=new Chart(cv.getContext('2d'),{type:'bar',data:{labels,datasets:[{data,backgroundColor:colors,borderRadius:5,maxBarThickness:46}]},options:Object.assign({plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:10},color:'#6a7183'},grid:{display:false}},y:{ticks:{font:{size:9},color:'#9aa0af'},grid:{color:'#e8e5dc'}}},responsive:true,maintainAspectRatio:false},opt||{})});}
function latestPeriod(fr){return fr.reduce((m,x)=>x.period>m?x.period:m,'');}
/* U7 · CSV export: walk a rendered table's DOM into a data-URI download */
function tableToCsv(el){if(!el)return '';return [...el.querySelectorAll('tr')].map(tr=>[...tr.children].map(c=>{let s=(c.innerText||'').replace(/\s+/g,' ').trim();return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n');}
function csvTable(tid,fname){const csv=tableToCsv(document.getElementById(tid));if(!csv)return;const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent('﻿'+csv);a.download=fname;document.body.appendChild(a);a.click();a.remove();}
window.csvTable=csvTable;

/* ===== OVERVIEW ===== */
function renderOverview(v){
  const o=orgById[sel]||{},od=distByOrg[sel];const gm=c=>orgRows().find(r=>r.metric_code===c);
  const deficit=gm('deficit'),ae=gm('ae_4hr'),rtt=gm('rtt_18wk'),occ=gm('bed_occupancy'),ca=gm('cancer_62');
  const wd=DRIVERS.map(dv=>{const rs=orgRows().filter(r=>r.driver===dv[0]);return{n:dv[1],a:rs.length?rs.reduce((s,r)=>s+r.distress,0)/rs.length:0};}).sort((a,b)=>b.a-a.a);
  const tnames=TRUSTS.map(c=>trustShort(c));
  const tlist=tnames.length>1?tnames.slice(0,-1).join(', ')+' and '+tnames[tnames.length-1]:(tnames[0]||'');
  const closest=rows.filter(r=>r.org_type==='acute_trust'&&TRUSTS.includes(r.org_code)&&(r.status==='near_failure'||r.status==='serious')).sort((a,b)=>b.distress-a.distress).slice(0,7);
  let h=`<div class="exec"><div class="e1">Acute system intelligence · ${esc(system()?system().name:'')}</div><p>One agreed picture of the acute system across <span class="hl">${esc(tlist)}</span>, built from live published NHS data and benchmarked against every English trust. ${od?`Distress index <span class="hl">${od.distress_index}/100</span> with <span class="${od.near_failure_count?'crit':'hl'}">${od.near_failure_count} near-failure flags</span>. `:''}Greatest pressure in <span class="hl">${esc(wd[0].n.toLowerCase())}</span> and <span class="hl">${esc(wd[1].n.toLowerCase())}</span>${deficit?`; financial position <span class="${deficit.value<0?'crit':'hl'}">${fmt(deficit.value,deficit.unit)}</span> vs plan (published YTD variance)`:''}. Interrogate the geography below, open the <a href="#" onclick="setStage('drivers');return false">priority drivers</a>, or take the evidence into the <a href="#" onclick="setStage('decide');return false">decision journey</a>.</p></div>`;
  h+=`<div class="mapwrap"><div id="mlmap"></div><div class="mapui"><div class="chips" id="basischips"></div><div class="chips" id="needchips"></div><div class="chips" id="layerchips"></div></div><div class="maplegend" id="mlegend"></div></div>`;
  h+=`<div class="eyebrow">System position</div><div class="grid kpis">`+
   kpi('System distress',od?od.distress_index:'—','/100',esc(o.name||''),null,color(od&&od.distress_index))+
   kpi('Near-failure flags',od?od.near_failure_count:'—','','breaching · deteriorating',null,od&&od.near_failure_count?'#b3261e':'#191f2b')+
   (ae?kpi('A&E 4-hour',fmt(ae.value,'pct'),'','vs national median '+(ae.nm_value!=null?fmt(ae.nm_value,'pct'):'—'),seriesFor(sel,ae.metric_id),color(ae.distress)):'')+
   (rtt?kpi('RTT within 18 weeks',fmt(rtt.value,'pct'),'','standard 92%',seriesFor(sel,rtt.metric_id),color(rtt.distress)):'')+
   (occ?kpi('Bed occupancy',fmt(occ.value,'pct'),'','safe operating 92%',seriesFor(sel,occ.metric_id),color(occ.distress)):'')+
   (ca?kpi('Cancer 62-day',fmt(ca.value,'pct'),'','standard 85%',seriesFor(sel,ca.metric_id),color(ca.distress)):'')+`</div>`;
  h+=`<div class="eyebrow">The four priority drivers</div><div class="grid kpis">`+DRIVERS.map(dv=>{
    const codes=DRIVER_METRICS[dv[0]]||[];
    const avg=Math.round(TRUSTS.reduce((s,tc)=>{const oid=(orgs.find(x=>x.code===tc)||{}).id;const rs=codes.map(c=>rows.find(x=>x.organisation_id===oid&&x.metric_code===c)).filter(Boolean);return s+(rs.length?rs.reduce((a,r)=>a+r.distress,0)/rs.length:0);},0)/(TRUSTS.length||1));
    return `<div class="card kpi" style="cursor:pointer" onclick="setStage('drivers')"><div class="l">${esc(dv[1])}</div><div class="v" style="color:${color(avg)}">${avg}<small>/100</small></div><div class="s">system pressure · open driver →</div></div>`;}).join('')+`</div>`;
  /* U6 · system-vs-England distribution strips */
  const sysIds=TRUSTS.map(tc=>(orgs.find(x=>x.code===tc)||{}).id).filter(Boolean);
  const strips=['ae_4hr','rtt_18wk','bed_occupancy','cancer_62','fragility_index'].map(code=>{const any=rows.find(r=>r.metric_code===code);const st=distStrip(code,sysIds,null);if(!st)return '';
    return `<div style="display:flex;align-items:center;gap:12px;padding:5px 0;border-bottom:1px solid var(--line2)"><span style="width:190px;flex:none;font-size:11.5px;color:var(--ink2)">${esc(any?any.metric_name:code)}</span><div style="flex:1;min-width:0">${st}</div></div>`;}).filter(Boolean).join('');
  if(strips)h+=`<div class="eyebrow">System vs England</div><div class="card"><div class="cap" style="margin-bottom:6px">Every English acute trust's latest value (dots) · this system's trusts (diamonds) · dashed line = national median</div>${strips}</div>`;
  h+=`<div class="eyebrow">Closest to failure</div><div class="two"><div class="list">`+(closest.length?closest.map(rrow).join(''):'<div class="row"><div class="m"><div class="t1">No serious or near-failure flags</div><div class="t2">across this system’s published headline measures</div></div></div>')+`</div>`;
  h+=`<div class="card"><div class="h3">Distress by domain</div><div class="cap">${esc(o.name||'')}</div><div class="chartbox sm"><canvas id="radar"></canvas></div>
   <div class="h3" style="margin-top:14px">Trusts in this system</div><table class="dt"><thead><tr><th>Trust</th><th>CQC</th><th class="num">Distress</th></tr></thead><tbody>`+
   TRUSTS.map(tc=>{const t=orgs.find(x=>x.code===tc);const d=t?distByOrg[t.id]:null;const cq=(CQC[tc]||[])[0]||'—';return `<tr style="cursor:pointer" onclick="selectCode('${tc}')"><td>${esc(trustShort(tc))}</td><td>${esc(cq)}</td><td class="num" style="font-weight:600;color:${color(d&&d.distress_index)}">${d?d.distress_index:'—'}</td></tr>`;}).join('')+`</tbody></table></div></div>`;
  v.innerHTML=h;initMap();drawRadar();countUps();
}
/* ===== MAPLIBRE STRATEGIC MAP ===== */
let ml=null,geoCache={},mapState={metric:'need',basis:'need',sites:true,poi:false,practices:false};
const NEED_METRICS=[['need','Need'],['n1','Deprivation'],['n2','Health dep'],['n3','Disease'],['n4','Access'],['n5','Outcomes'],['imd','IMD'],['c20','Core20']];
const NEED_LEGEND={need:'Composite need score',n1:'Deprivation (IMD-based)',n2:'Health deprivation & disability',n3:'Disease burden',n4:'Access barriers',n5:'Outcomes gap',imd:'IMD decile (1 = most deprived)',c20:'Core20: most deprived 20% of England'};
const RAMP=['#efece1','#d8dfec','#b7c4de','#7c93c4','#44639f','#1f3a78'];
const CQC_COL={'Outstanding':'#166f4d','Good':'#4d8a6a','Requires improvement':'#b45309','Inadequate':'#b3261e'};
async function geo(p){if(geoCache[p])return geoCache[p];const r=await fetch('geo/'+p);geoCache[p]=await r.json();return geoCache[p];}
function sysBBox(icbs){const f=icbs.features.find(x=>x.properties.slug===sysSlug);if(!f)return [[-6.5,49.75],[1.95,55.95]];let mnx=180,mny=90,mxx=-180,mxy=-90;const walk=c=>{if(typeof c[0]==='number'){mnx=Math.min(mnx,c[0]);mxx=Math.max(mxx,c[0]);mny=Math.min(mny,c[1]);mxy=Math.max(mxy,c[1]);}else c.forEach(walk);};walk(f.geometry.coordinates);return [[mnx,mny],[mxx,mxy]];}
function needExpr(){const m=mapState.metric;
  if(m==='c20')return ['case',['==',['get','c20'],1],'#1f3a78','#efece1'];
  if(m==='imd')return ['interpolate',['linear'],['coalesce',['get','imd'],5],1,'#1f3a78',4,'#7c93c4',7,'#d8dfec',10,'#efece1'];
  return ['interpolate',['linear'],['coalesce',['get',m],0],0,RAMP[0],20,RAMP[1],40,RAMP[2],60,RAMP[3],80,RAMP[4],100,RAMP[5]];}
/* U5 · service-distress basis for the ICB fill: paper → amber → red */
function distressRampColor(v){const L=(a,b,t)=>'rgb('+a.map((x,i)=>Math.round(x+(b[i]-x)*t)).join(',')+')';const P=[239,236,225],A=[180,83,9],R=[179,38,30];v=Math.max(0,Math.min(100,Number(v)||0));return v<=55?L(P,A,v/55):L(A,R,(v-55)/45);}
function systemDistress(){if(sysDistressMap)return sysDistressMap;sysDistressMap={};SYSTEMS.forEach(s=>{const vals=(s.trusts||[]).map(c=>distByCode[c]).filter(Boolean).map(d=>Number(d.distress_index)).filter(x=>!isNaN(x));if(vals.length)sysDistressMap[s.slug]=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);});return sysDistressMap;}
function icbFillExpr(){
  if(mapState.basis==='distress'){const m=systemDistress();const expr=['match',['get','slug']];Object.keys(m).forEach(slug=>{expr.push(slug,distressRampColor(m[slug]));});expr.push('#efece1');return Object.keys(m).length?expr:'#efece1';}
  return ['interpolate',['linear'],['get','need'],20,RAMP[1],40,RAMP[2],55,RAMP[3],70,RAMP[4]];}
let initMapSeq=0;
async function initMap(){
  const el=document.getElementById('mlmap');if(!el||!window.maplibregl)return;
  const runId=++initMapSeq;
  if(ml){try{ml.remove()}catch(e){}ml=null;}
  const m=new maplibregl.Map({container:'mlmap',style:'https://tiles.openfreemap.org/styles/positron',bounds:[[-6.5,49.75],[1.95,55.95]],fitBoundsOptions:{padding:34},attributionControl:{compact:true}});
  ml=m;
  m.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
  let bootDone=false;
  const boot=async()=>{try{
    if(bootDone||runId!==initMapSeq||ml!==m)return;
    const icbs=await geo('icbs-need.json');
    if(bootDone||runId!==initMapSeq||ml!==m)return;
    try{if(!m.getSource('icbs'))m.addSource('icbs',{type:'geojson',data:icbs});}
    catch(err){setTimeout(boot,250);return;}
    bootDone=true;
    if(!m.getLayer('icb-fill'))m.addLayer({id:'icb-fill',type:'fill',source:'icbs',paint:{'fill-color':icbFillExpr(),'fill-opacity':mapState.basis==='distress'?0.55:0.28}});
    if(!m.getLayer('icb-line'))m.addLayer({id:'icb-line',type:'line',source:'icbs',paint:{'line-color':'#6a7183','line-width':0.7}});
    if(!m.getLayer('icb-sel'))m.addLayer({id:'icb-sel',type:'line',source:'icbs',filter:['==',['get','slug'],sysSlug],paint:{'line-color':'#191f2b','line-width':2.2}});
    m.on('click','icb-fill',e=>{const p=e.features[0].properties;if(p.slug!==sysSlug){document.getElementById('syssel').value=p.slug;setSystem(p.slug);}});
    m.on('mousemove','icb-fill',e=>{ml.getCanvas().style.cursor='pointer';});
    m.on('mouseleave','icb-fill',()=>{ml.getCanvas().style.cursor='';});
    await refreshSystemLayers();
    renderChips();
  }catch(e){console.error('map init failed',e);}};
  m.on('style.load',boot);setTimeout(boot,120);
}
async function refreshSystemLayers(){
  if(!ml)return;
  const lsoa=await geo('lsoa/'+sysSlug+'.json').catch(e=>{console.warn('lsoa layer failed',e);return null;});
  if(ml.getSource('lsoa')){ml.getSource('lsoa').setData(lsoa||{type:'FeatureCollection',features:[]});}
  else if(lsoa){
    ml.addSource('lsoa',{type:'geojson',data:lsoa});
    ml.addLayer({id:'lsoa-fill',type:'fill',source:'lsoa',paint:{'fill-color':needExpr(),'fill-opacity':0.66,'fill-outline-color':'rgba(255,255,255,.25)'}},ml.getLayer('icb-line')?'icb-line':undefined);
    ml.on('click','lsoa-fill',e=>{const p=e.features[0].properties;new maplibregl.Popup({closeButton:false}).setLngLat(e.lngLat).setHTML(`<b>Neighbourhood ${esc(p.c)}</b><div class="r"><span>Population</span><span>${Number(p.pop).toLocaleString()}</span></div><div class="r"><span>Composite need</span><span>${p.need}</span></div><div class="r"><span>IMD decile</span><span>${p.imd}</span></div><div class="r"><span>Core20</span><span>${p.c20?'Yes':'No'}</span></div><div class="r"><span>Deprivation</span><span>${p.n1}</span></div><div class="r"><span>Health dep</span><span>${p.n2}</span></div><div class="r"><span>Disease</span><span>${p.n3}</span></div><div class="r"><span>Access</span><span>${p.n4}</span></div><div class="r"><span>Outcomes</span><span>${p.n5}</span></div>`).addTo(ml);});
  }
  // sites for this system's trusts
  const sfc={type:'FeatureCollection',features:SITES.filter(s=>TRUSTS.includes(s[0])).map(s=>({type:'Feature',geometry:{type:'Point',coordinates:[s[3],s[2]]},properties:{trust:s[0],code:s[1],name:s[4],stype:s[5],pfi:s[6],cqc:(CQC[s[0]]||[])[0]||''}}))};
  if(ml.getSource('sites'))ml.getSource('sites').setData(sfc);
  else{
    ml.addSource('sites',{type:'geojson',data:sfc});
    ml.addLayer({id:'sites-c',type:'circle',source:'sites',paint:{'circle-radius':['case',['in','Hospital',['get','stype']],7,4.5],'circle-color':['match',['get','cqc'],'Outstanding','#166f4d','Good','#4d8a6a','Requires improvement','#b45309','Inadequate','#b3261e','#6a7183'],'circle-stroke-color':'#fffefb','circle-stroke-width':1.4,'circle-opacity':0.94}});
    ml.on('click','sites-c',e=>{const p=e.features[0].properties;new maplibregl.Popup({closeButton:false}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.name)}</b><div class="r"><span>Trust</span><span>${esc(trustShort(p.trust))}</span></div><div class="r"><span>Type</span><span>${esc(p.stype||'—')}</span></div><div class="r"><span>CQC overall</span><span>${esc(p.cqc||'Not rated')}</span></div><div class="r"><span>PFI</span><span>${p.pfi==1?'Yes':'No'}</span></div><div style="margin-top:7px"><a href="#" onclick="selectCode('${p.trust}');return false">Open trust view →</a></div>`).addTo(ml);});
    ml.on('mousemove','sites-c',()=>{ml.getCanvas().style.cursor='pointer';});
    ml.on('mouseleave','sites-c',()=>{ml.getCanvas().style.cursor='';});
  }
  // E4 · lazy layers: the CQC-care and GP-practice files are only fetched once their toggle
  // has first been switched on (or the source already exists from an earlier system).
  if(mapState.poi||ml.getSource('poi'))await loadPoiLayer();
  if(mapState.practices||ml.getSource('gp'))await loadGpLayer();
  applyMapState();
  const icbs=await geo('icbs-need.json');
  if(ml.getLayer('icb-sel'))ml.setFilter('icb-sel',['==',['get','slug'],sysSlug]);
  ml.fitBounds(sysBBox(icbs),{padding:34,duration:reducedMotion()?0:900});
}
/* E4 · CQC-rated care POIs — fetched lazily on first toggle */
async function loadPoiLayer(){if(!ml)return;
  const poi=await geo('poi/'+sysSlug+'.json').catch(e=>{console.warn('poi layer failed',e);return [];});
  if(!ml)return;
  const pfc={type:'FeatureCollection',features:(poi||[]).map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p[2],p[1]]},properties:{kind:p[0],name:p[3],rating:p[4]||''}}))};
  if(ml.getSource('poi'))ml.getSource('poi').setData(pfc);
  else{
    ml.addSource('poi',{type:'geojson',data:pfc});
    ml.addLayer({id:'poi-c',type:'circle',source:'poi',paint:{'circle-radius':2.6,'circle-color':['match',['get','rating'],'Outstanding','#166f4d','Good','#4d8a6a','Requires improvement','#b45309','Inadequate','#b3261e','#9aa0af'],'circle-opacity':0.85}});
    ml.on('click','poi-c',e=>{const p=e.features[0].properties;new maplibregl.Popup({closeButton:false}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.name)}</b><div class="r"><span>Kind</span><span>${esc(p.kind.replace(/_/g,' '))}</span></div><div class="r"><span>CQC</span><span>${esc(p.rating||'Not rated')}</span></div>`).addTo(ml);});
  }
}
/* E4 · GP practices with prevalence — fetched lazily on first toggle */
async function loadGpLayer(){if(!ml)return;
  const pr=await geo('practices/'+sysSlug+'.json').catch(e=>{console.warn('practices layer failed',e);return [];});
  if(!ml)return;
  const gfc={type:'FeatureCollection',features:(pr||[]).map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lng,p.lat]},properties:{name:p.name,list:p.list,fte:p.gp_fte,rating:p.rating||'',prev:JSON.stringify(p.prev||{})}}))};
  if(ml.getSource('gp'))ml.getSource('gp').setData(gfc);
  else{
    ml.addSource('gp',{type:'geojson',data:gfc});
    ml.addLayer({id:'gp-c',type:'circle',source:'gp',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','list'],4000],2000,2.5,20000,7],'circle-color':'#44639f','circle-stroke-color':'#fffefb','circle-stroke-width':0.8,'circle-opacity':0.85}});
    ml.on('click','gp-c',e=>{const p=e.features[0].properties;const prev=JSON.parse(p.prev||'{}');const rows2=Object.entries(prev).slice(0,6).map(([k,v])=>`<div class="r"><span>${esc(k.replace(/_/g,' '))}</span><span>${v}%</span></div>`).join('');new maplibregl.Popup({closeButton:false}).setLngLat(e.lngLat).setHTML(`<b>${esc(p.name)}</b><div class="r"><span>List size</span><span>${Number(p.list).toLocaleString()}</span></div><div class="r"><span>GP FTE</span><span>${Number(p.fte).toFixed(1)}</span></div><div class="r"><span>CQC</span><span>${esc(p.rating||'—')}</span></div><div style="margin-top:6px;font-weight:700;font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:#6a7183">Condition prevalence</div>${rows2}`).addTo(ml);});
  }
}
function applyMapState(){if(!ml)return;
  if(ml.getLayer('icb-fill')){ml.setPaintProperty('icb-fill','fill-color',icbFillExpr());ml.setPaintProperty('icb-fill','fill-opacity',mapState.basis==='distress'?0.55:0.28);}
  if(ml.getLayer('lsoa-fill')){ml.setPaintProperty('lsoa-fill','fill-color',needExpr());ml.setLayoutProperty('lsoa-fill','visibility',mapState.metric==='off'||mapState.basis==='distress'?'none':'visible');}
  if(ml.getLayer('sites-c'))ml.setLayoutProperty('sites-c','visibility',mapState.sites?'visible':'none');
  if(ml.getLayer('poi-c'))ml.setLayoutProperty('poi-c','visibility',mapState.poi?'visible':'none');
  if(ml.getLayer('gp-c'))ml.setLayoutProperty('gp-c','visibility',mapState.practices?'visible':'none');
  renderLegend();}
function renderChips(){
  const bc=document.getElementById('basischips'),nc=document.getElementById('needchips'),lc=document.getElementById('layerchips');if(!nc)return;
  if(bc)bc.innerHTML=`<button class="chip ${mapState.basis!=='distress'?'on':''}" aria-pressed="${mapState.basis!=='distress'}" aria-label="Colour map by population need" onclick="setMapBasis('need')">Population need</button><button class="chip ${mapState.basis==='distress'?'on':''}" aria-pressed="${mapState.basis==='distress'}" aria-label="Colour map by service distress" onclick="setMapBasis('distress')">Service distress</button>`;
  nc.innerHTML=mapState.basis==='distress'?'':NEED_METRICS.map(m=>`<button class="chip ${mapState.metric===m[0]?'on':''}" aria-pressed="${mapState.metric===m[0]}" aria-label="Need layer: ${esc(NEED_LEGEND[m[0]]||m[1])}" onclick="setMapMetric('${m[0]}')">${m[1]}</button>`).join('')+`<button class="chip ${mapState.metric==='off'?'on':''}" aria-pressed="${mapState.metric==='off'}" aria-label="Turn the need layer off" onclick="setMapMetric('off')">Off</button>`;
  lc.innerHTML=`<button class="chip ${mapState.sites?'on':''}" aria-pressed="${!!mapState.sites}" aria-label="Toggle NHS sites layer" onclick="toggleMapLayer('sites')">NHS sites</button><button class="chip ${mapState.poi?'on':''}" aria-pressed="${!!mapState.poi}" aria-label="Toggle CQC-rated care layer" onclick="toggleMapLayer('poi')">CQC care</button><button class="chip ${mapState.practices?'on':''}" aria-pressed="${!!mapState.practices}" aria-label="Toggle GP practices layer" onclick="toggleMapLayer('practices')">GP practices</button>`;}
function setMapMetric(m){mapState.metric=m;renderChips();applyMapState();}
function setMapBasis(b){mapState.basis=b;renderChips();applyMapState();}
function toggleMapLayer(k){mapState[k]=!mapState[k];renderChips();
  /* E4 · first switch-on fetches the layer's file lazily */
  if(ml&&((k==='poi'&&mapState.poi&&!ml.getSource('poi'))||(k==='practices'&&mapState.practices&&!ml.getSource('gp')))){
    (k==='poi'?loadPoiLayer():loadGpLayer()).then(applyMapState).catch(e=>console.warn('lazy layer load failed',e));return;}
  applyMapState();}
window.setMapMetric=setMapMetric;window.setMapBasis=setMapBasis;window.toggleMapLayer=toggleMapLayer;
function renderLegend(){const el=document.getElementById('mlegend');if(!el)return;
  if(mapState.basis==='distress'){el.style.display='';
    el.innerHTML=`<div class="ttl2">Service distress · mean trust index per ICB</div>`+[[15,'15'],[35,'35'],[55,'55 · amber'],[75,'75+ · red']].map(v=>`<div class="lgrow"><span class="sw" style="background:${distressRampColor(v[0])};${v[0]<=15?'border:1px solid #dcd9d0':''}"></span>${v[1]}</div>`).join('')+`<div class="lgrow" style="margin-top:6px;color:#5a6172">Sites coloured by trust CQC rating</div>`;return;}
  if(mapState.metric==='off'){el.style.display='none';return;}el.style.display='';
  let rows2='';
  if(mapState.metric==='c20')rows2=`<div class="lgrow"><span class="sw" style="background:#1f3a78"></span>Core20 neighbourhood</div><div class="lgrow"><span class="sw" style="background:#efece1;border:1px solid #dcd9d0"></span>Other</div>`;
  else if(mapState.metric==='imd')rows2=`<div class="lgrow"><span class="sw" style="background:#1f3a78"></span>Decile 1 · most deprived</div><div class="lgrow"><span class="sw" style="background:#7c93c4"></span>Decile 4</div><div class="lgrow"><span class="sw" style="background:#efece1;border:1px solid #dcd9d0"></span>Decile 10 · least deprived</div>`;
  else rows2=[0,20,40,60,80,100].map((v,i)=>`<div class="lgrow"><span class="sw" style="background:${RAMP[i]};${i===0?'border:1px solid #dcd9d0':''}"></span>${v}${i===5?' · highest':''}</div>`).join('');
  el.innerHTML=`<div class="ttl2">${NEED_LEGEND[mapState.metric]||''}</div>${rows2}<div class="lgrow" style="margin-top:6px;color:#5a6172">Sites coloured by trust CQC rating</div>`;}

function kpi(l,val,suf,sub,ser,col){if(typeof ser==='string'){col=col||ser;ser=null;}const sp=Array.isArray(ser)&&ser.length>1?`<div class="spark">${spark(ser.slice(-12),col)}</div>`:'';const num=(typeof val==='number')?`<span class="cu" data-target="${val}">0</span>`:esc(val);return `<div class="card kpi"><div class="l">${l}</div><div class="v" style="color:${col}">${num}${suf?`<small>${suf}</small>`:''}</div><div class="s">${esc(sub)}</div>${sp}</div>`;}
function rrow(r){const adj=adjustedOverride(r.metric_value_id);return `<div class="row" onclick="openDrill('${r.organisation_id}','${r.metric_code}')"><span class="tag" style="background:${color(r.distress)}"></span><div class="m"><div class="t1">${esc(r.metric_name)}${r.org_code?' · '+r.org_code:''}${adj?' <span class="pill" style="background:#b45309;font-size:8.5px;padding:2px 6px;vertical-align:2px">adjusted</span>':''}</div><div class="t2">${fmt(r.value,r.unit)} · ${slab(r.status)}</div></div><span class="sc" style="color:${color(r.distress)}">${r.distress}</span></div>`;}
function countUps(){const rm=reducedMotion();document.querySelectorAll('.cu').forEach(el=>{const t=Number(el.dataset.target);if(isNaN(t))return;if(rm){el.textContent=Math.round(t);return;}const st=performance.now();(function f(n){const p=Math.min(1,(n-st)/650);el.textContent=Math.round(t*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f);})(st);});}
function drawRadar(){const cv=document.getElementById('radar');if(!cv)return;const data=DOMAINS.map(d=>{const rs=orgRows().filter(r=>r.domain===d[0]);return rs.length?Math.round(rs.reduce((s,r)=>s+r.distress,0)/rs.length):0;});charts.radar=new Chart(cv.getContext('2d'),{type:'radar',data:{labels:DOMAINS.map(d=>d[1]),datasets:[{data,fill:true,backgroundColor:'rgba(31,58,120,.16)',borderColor:'#1f3a78',borderWidth:2,pointRadius:2}]},options:{plugins:{legend:{display:false}},scales:{r:{suggestedMin:0,suggestedMax:100,ticks:{stepSize:25,font:{size:8},backdropColor:'transparent',color:'#9aa0af'},grid:{color:'#e7ecf2'},angleLines:{color:'#e7ecf2'},pointLabels:{font:{size:9.5},color:'#3c4354'}}},responsive:true,maintainAspectRatio:false}});}

/* ===== PRIORITY DRIVERS (ASR) ===== */
const DRIVER_METRICS={service_fragility:['fragility_index','bed_occupancy','beds_ga_available','dm01_6wk','sickness_rate','deficit','shmi','cqc_rating'],uec:['ae_4hr','amb_over30_pct','amb_handover_60','delayed_discharge_beddays','emerg_admissions'],elective_backlog:['rtt_total','rtt_18wk','rtt_52wk','cancelled_ops','adm_elective'],cancer:['cancer_62','cancer_fds_28','cancer_31']};
const DRIVER_HEADLINE={service_fragility:'bed_occupancy',uec:'ae_4hr',elective_backlog:'rtt_18wk',cancer:'cancer_62'};
const DRIVER_BLURB={service_fragility:'Occupancy, diagnostics and mortality signals that show where services are running closest to the edge.',uec:'The urgent and emergency pathway under strain: front door, ambulance handovers and delayed discharges.',elective_backlog:'The waiting list a decade in the making: size, waits over 18 and 52 weeks, and lost theatre activity.',cancer:'Cancer access against the 62-day, faster-diagnosis and 31-day standards.'};
function benchSeries(mid,type){return bench.filter(b=>b.metric_id===mid&&b.type===type).sort((a,b)=>a.period<b.period?-1:1);}
function renderDrivers(v){
  let h=`<h1 class="serif">The four priority drivers</h1><div class="lead">The pressures driving the Acute Services Review, shown with live published NHS data for ${esc(TRUSTS.map(c=>trustShort(c)).join(', '))}, benchmarked against every English acute trust. Click any figure to interrogate it — trend, standard, national position, provenance.</div>`;
  DRIVERS.forEach(dv=>{
    const codes=DRIVER_METRICS[dv[0]]||[];const hcode=DRIVER_HEADLINE[dv[0]];
    const avg=Math.round(TRUSTS.reduce((s,tc)=>{const oid=(orgs.find(o=>o.code===tc)||{}).id;const rs=codes.map(c=>rows.find(x=>x.organisation_id===oid&&x.metric_code===c)).filter(Boolean);return s+(rs.length?rs.reduce((a,r)=>a+r.distress,0)/rs.length:0);},0)/TRUSTS.length);
    h+=`<div class="eyebrow">${esc(dv[1])} · pressure ${avg}/100 · <a href="#" onclick="openDistressInfo();return false" title="How distress is scored">method</a></div><div class="two">`;
    h+=`<div class="card" style="overflow-x:auto"><a class="csvlink" href="#" onclick="csvTable('dtbl_${dv[0]}','${dv[0]}-${sysSlug}-${new Date().toISOString().slice(0,10)}.csv');return false">CSV</a><div class="h3">${esc(dv[1])}</div><div class="cap">${esc(DRIVER_BLURB[dv[0]])}</div><table class="dt" id="dtbl_${dv[0]}"><thead><tr><th>Measure</th>`+TRUSTS.map(tc=>`<th class="num">${PLACE_SITE[tc]}</th>`).join('')+`</tr></thead><tbody>`;
    codes.forEach(c=>{const any=rows.find(x=>x.metric_code===c);if(!any)return;h+=`<tr><td>${esc(any.metric_name)}${c==='dm01_6wk'?' <span class="muted" style="font-size:10px">· by test →</span>':c==='cancer_62'?' <span class="muted" style="font-size:10px">· by tumour →</span>':''}</td>`+TRUSTS.map(tc=>{const oid=(orgs.find(o=>o.code===tc)||{}).id;const r=rows.find(x=>x.organisation_id===oid&&x.metric_code===c);const click=c==='dm01_6wk'?`openTestDrill('${oid}')`:c==='cancer_62'?`openTumourDrill('${oid}')`:`openDrill('${oid}','${c}')`;return r?`<td class="num" style="cursor:pointer;font-weight:600;color:${color(r.distress)}" onclick="${click}">${fmt(r.value,r.unit)}</td>`:'<td class="num">—</td>';}).join('')+`</tr>`;});
    h+=`</tbody></table>${dv[0]==='service_fragility'?`<div class="note" style="margin:8px 2px 2px"><a href="#" onclick="openFragilityInfo();return false">How fragility is scored</a> — derived composite, challengeable by trusts</div>`:''}</div>`;
    h+=`<div class="card"><div class="h3">${esc((rows.find(x=>x.metric_code===hcode)||{}).metric_name||'')}</div><div class="cap">Three trusts vs national median (dashed) · published series</div><div class="chartbox"><canvas id="drv_${dv[0]}"></canvas></div></div></div>`;
    if(dv[0]==='elective_backlog')h+=electiveClearanceCard();
  });
  h+=`<div class="note" style="margin-top:14px">Every figure is drawn live from the serving database with source and confidence attached. Figures in red sit furthest from standard; click through for the full benchmark set.</div>`;
  v.innerHTML=h;
  DRIVERS.forEach(dv=>{
    const hcode=DRIVER_HEADLINE[dv[0]];const anyR=rows.find(x=>x.metric_code===hcode);if(!anyR)return;
    const mid=anyR.metric_id;const nm=benchSeries(mid,'national_median').slice(-24);
    const t0=(orgs.find(o=>o.code===TRUSTS[0])||{}).id;const labels=(seriesFor(t0,mid)||[]).slice(-24).map(x=>fmtPeriod(x.period));
    const ds=TRUSTS.map(tc=>{const oid=(orgs.find(o=>o.code===tc)||{}).id;const s=seriesFor(oid,mid).slice(-24);return{label:PLACE_SITE[tc],data:s.map(x=>Number(x.value)),borderColor:TRUSTCOL[tc],backgroundColor:'transparent',tension:.3,pointRadius:0,borderWidth:2};});
    if(nm.length)ds.push({label:'National median',data:labels.map((l,i)=>{const p=(seriesFor(t0,mid).slice(-24)[i]||{}).period;const b=nm.find(x=>x.period===p);return b?Number(b.value):null;}),borderColor:'#9aa0af',borderDash:[5,4],pointRadius:0,borderWidth:1.5,backgroundColor:'transparent'});
    lineChart('drv_'+dv[0],labels,ds,{plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:9,font:{size:9},color:'#6a7183'}}}});
  });
}
/* A7 · elective backlog clearance outlook — months to the 92% 18-week standard under current flow */
function electiveClearanceCard(){
  const CONV=0.55; /* assumed conversion of referrals made → consultant-led RTT clock starts */
  let refTo='';
  const trs=TRUSTS.map(tc=>{
    const oid=(orgs.find(o=>o.code===tc)||{}).id;
    const wl=oid?latestOf(oid,'rtt_total'):null;
    const tr=oid?last12(oid,'adm_elective'):null;
    const gp=oid?last12(oid,'gp_referrals'):null;
    if(gp&&gp.to&&gp.to>refTo)refTo=gp.to;
    const p18r=oid?mrow(oid,'rtt_18wk'):null;
    const pct=p18r&&p18r.value!=null?Number(p18r.value):null;
    if(!wl||!tr||!tr.months)return `<tr><td>${PLACE_SITE[tc]}</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num muted">insufficient series</td></tr>`;
    const rate=tr.sum/tr.months;
    const inflow=(gp&&gp.months)?(gp.sum/gp.months)*CONV:null;
    const net=inflow==null?null:rate-inflow;
    const target=(pct==null||pct>=92)?wl.v:wl.v*(pct/92);
    let verdict;
    if(pct!=null&&pct>=92)verdict=`<span style="color:#166f4d;font-weight:600">standard already met</span>`;
    else if(net==null)verdict=`<span class="muted">no referral series</span>`;
    else if(net<=0)verdict=`<span style="color:#b3261e;font-weight:600">not clearing — inflow exceeds treatment</span>`;
    else{const m=(wl.v-target)/net;verdict=`<b>${m<1?'&lt;1':Math.round(m).toLocaleString()}</b> months`;}
    return `<tr><td>${PLACE_SITE[tc]}</td><td class="num" style="cursor:pointer;font-weight:600" onclick="openDrill('${oid}','rtt_total')">${fmt(wl.v,'count')}</td><td class="num">${pct==null?'—':fmt(pct,'pct')}</td><td class="num">${fmt(rate,'count')}</td><td class="num">${inflow==null?'—':fmt(inflow,'count')}</td><td class="num" style="font-weight:600;color:${net==null?'#9aa0af':net<=0?'#b3261e':'#166f4d'}">${net==null?'—':(net>0?'+':'−')+Math.abs(Math.round(net)).toLocaleString()}</td><td class="num">${verdict}</td></tr>`;
  }).join('');
  return `<div class="card" style="margin-top:14px"><div class="h3">Backlog clearance outlook</div><div class="cap">Months to the 92% 18-week standard under current flow · derived steady-state approximation, not a forecast</div>
   <div style="overflow-x:auto"><table class="dt"><thead><tr><th>Trust</th><th class="num">Waiting list (WL)</th><th class="num">Within 18 wks</th><th class="num">Treatments / mo</th><th class="num">Converted inflow / mo</th><th class="num">Net clearance / mo</th><th class="num">Months to 92%</th></tr></thead><tbody>${trs}</tbody></table></div>
   <div class="note" style="margin-top:9px"><b>Formula.</b> months ≈ (WL − target WL) ÷ (treatment rate − converted inflow), where target WL = WL × (current within-18-weeks % ÷ 92): the ≤18-week cohort is held fixed and only the over-18-week tail shrinks, floored at the current list where performance is already ≥92%. Treatment rate = 12-month mean elective admissions incl. day case; converted inflow = 12-month mean GP &amp; other referrals made × ${CONV} <b>assumed</b> conversion to consultant-led RTT pathways.</div>
   <div class="note" style="margin-top:5px">Provenance: waiting list and 18-week position from the latest published RTT; treatment rate from published monthly activity; the referrals series (MRR) is published only to ${refTo?fmtPeriod(refTo):'Mar 24'} — publication paused, so inflow is a <b style="color:#7a6200">stale proxy</b>. Admitted clearance only (outpatient-led clock stops excluded), which understates treatment — read the verdict as a pressure signal, not a plan.</div></div>`;
}

/* ===== ACTIVITY ===== */
async function renderActivity(v){v.innerHTML='<div class="loading">Loading activity…</div>';const f=await ensure('activity');
  const rttSpecs=specs.filter(s=>s.is_rtt);
  const lp=latestPeriod(f);
  const o=orgById[sel];
  const specSel=`<select class="sel" id="aspec" onchange="aSpec=this.value;render()">`+rttSpecs.map(s=>`<option value="${s.code}" ${s.code===aSpec?'selected':''}>${esc(s.code+' '+s.name)}</option>`).join('')+`</select>`;
  const podSel=`<select class="sel" id="apod" onchange="aPod=this.value;render()">`+pods.map(p=>`<option value="${p.code}" ${p.code===aPod?'selected':''}>${esc(p.name)}</option>`).join('')+`</select>`;
  // comparison across trusts for aSpec/aPod latest
  const comp=TRUSTS.map(c=>{const oid=(orgs.find(o=>o.code===c)||{}).id;const r=f.find(x=>x.organisation_id===oid&&x.specialty_code===aSpec&&x.pod_code===aPod&&x.period===lp);return{c,v:r?Number(r.value):0};});
  // trend for selected org
  const trend=f.filter(x=>x.organisation_id===sel&&x.specialty_code===aSpec&&x.pod_code===aPod).sort((a,b)=>a.period<b.period?-1:1);
  // table: specialties by total activity (all PODs) for selected org latest
  const tbl=rttSpecs.map(s=>{let tot=0;pods.forEach(p=>{const r=f.find(x=>x.organisation_id===sel&&x.specialty_code===s.code&&x.pod_code===p.code&&x.period===lp);if(r)tot+=Number(r.value);});return{s,tot};}).sort((a,b)=>b.tot-a.tot);
  let h=sysNote()+ensureNote('activity')+`<h1 class="serif">Activity</h1><div class="lead">Admissions, day case and outpatient activity across the system's acute trusts — published national flow, then flagship specialty detail.</div>`;
  h+=nationalBlock(['ae_attendances','emerg_admissions','adm_elective','op_attendances'],['ae_attendances','adm_emergency','adm_elective','op_attendances','rtt_total'],'');
  h+=`<div class="eyebrow" style="margin-top:14px">Flagship activity detail · by specialty &amp; point of delivery</div><div class="filters">Specialty ${specSel} Point of delivery ${podSel}</div>`;
  h+=`<div class="two"><div class="card"><div class="h3">${esc(specName(aSpec))} · ${esc((pods.find(p=>p.code===aPod)||{}).name)}</div><div class="cap">Monthly activity by trust (latest ${fmtPeriod(lp)})</div><div class="chartbox"><canvas id="acomp"></canvas></div></div>
   <div class="card"><div class="h3">Trend · ${esc(orgName())}</div><div class="cap">24-month activity</div><div class="chartbox"><canvas id="atrend"></canvas></div></div></div>`;
  h+=`<div class="eyebrow">Specialties by volume — ${esc(orgName())}</div><div class="card" style="padding:4px 0"><table class="dt"><thead><tr><th>Specialty</th><th class="num">Total / month</th><th class="num">Non-elective</th><th class="num">Elective + day case</th><th class="num">Outpatients</th></tr></thead><tbody>`;
  tbl.forEach(t=>{const g=(pod)=>{const r=f.find(x=>x.organisation_id===sel&&x.specialty_code===t.s.code&&x.pod_code===pod&&x.period===lp);return r?Number(r.value):0;};const elc=g('EL')+g('DC');const op=g('OPF')+g('OPFU');
    h+=`<tr style="cursor:pointer" onclick="aSpec='${t.s.code}';render()"><td>${esc(t.s.code+' '+t.s.name)}</td><td class="num">${Math.round(t.tot).toLocaleString()}</td><td class="num">${Math.round(g('NEL')).toLocaleString()}</td><td class="num">${Math.round(elc).toLocaleString()}</td><td class="num">${Math.round(op).toLocaleString()}</td></tr>`;});
  h+=`</tbody></table></div>`;
  v.innerHTML=h;
  barChart('acomp',comp.map(x=>PLACE_SITE[x.c]),comp.map(x=>x.v),comp.map(x=>TRUSTCOL[x.c]));
  lineChart('atrend',trend.map(x=>fmtPeriod(x.period)),[{data:trend.map(x=>Number(x.value)),borderColor:'#1f3a78',backgroundColor:'rgba(31,58,120,.1)',fill:true,tension:.3,pointRadius:0,borderWidth:2}]);
}

/* ===== FLOW ===== */
/* A5 · UEC flow chain diagnostics: Pearson r along the pathway for the selected org.
   Occupancy is quarterly — each month is matched to the occupancy value of the quarter
   containing it. Each link needs ≥10 overlapping months (BSW-quality series). */
const UEC_CHAIN=[['delayed_discharge_beddays','Delayed discharge bed-days'],['bed_occupancy','G&A bed occupancy'],['amb_over30_pct','Handover >30 min'],['ae_4hr','A&E 4-hour']];
function pearson(xs,ys){const n=xs.length;if(n<2)return null;const mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n;let sxy=0,sx=0,sy=0;for(let i=0;i<n;i++){const dx=xs[i]-mx,dy=ys[i]-my;sxy+=dx*dy;sx+=dx*dx;sy+=dy*dy;}return(sx&&sy)?sxy/Math.sqrt(sx*sy):null;}
function uecPairs(orgId){
  const S={};UEC_CHAIN.forEach(d=>{const r=rows.find(x=>x.organisation_id===orgId&&x.metric_code===d[0]&&!x.service_id);S[d[0]]=r?seriesFor(orgId,r.metric_id):[];});
  const mk=p=>(''+p).slice(0,7);
  const occQ={};S.bed_occupancy.forEach(p=>{const s=''+p.period,m=parseInt(s.slice(5,7),10);occQ[s.slice(0,4)+'Q'+Math.floor((m-1)/3)]=Number(p.value);});
  const maps={};UEC_CHAIN.forEach(d=>{if(d[0]==='bed_occupancy')return;const m={};S[d[0]].forEach(p=>{m[mk(p.period)]=Number(p.value);});maps[d[0]]=m;});
  const val=(code,k)=>{if(code==='bed_occupancy'){const m=parseInt(k.slice(5,7),10);return occQ[k.slice(0,4)+'Q'+Math.floor((m-1)/3)];}return maps[code][k];};
  const allMonths=[...new Set([].concat(...Object.values(maps).map(m=>Object.keys(m))))].sort();
  const pairData=(a,b)=>{const xs=[],ys=[];allMonths.forEach(k=>{const x=val(a,k),y=val(b,k);if(x!=null&&y!=null&&!isNaN(x)&&!isNaN(y)){xs.push(x);ys.push(y);}});return{xs,ys,n:xs.length,r:xs.length>=10?pearson(xs,ys):null};};
  const pairs=[];for(let i=0;i<3;i++)pairs.push(Object.assign({a:i,b:i+1},pairData(UEC_CHAIN[i][0],UEC_CHAIN[i+1][0])));
  return pairs;
}
function uecChain(){
  let orgId=sel,fell=false;let pairs=uecPairs(orgId);
  /* the group/ICB view often lacks trust-level monthly series — fall back to the first trust with data */
  if(!pairs.some(p=>p.r!=null)){for(const tc of TRUSTS){const t=orgs.find(o=>o.code===tc);if(!t)continue;const p2=uecPairs(t.id);if(p2.some(p=>p.r!=null)){orgId=t.id;pairs=p2;fell=true;break;}}}
  const oname=(orgById[orgId]||{}).name||'';
  const latest=code=>{const r=rows.find(x=>x.organisation_id===orgId&&x.metric_code===code&&!x.service_id);return r?fmt(r.value,r.unit):'—';};
  let html=`<div class="eyebrow">UEC flow chain</div>`;
  if(!pairs.some(p=>p.r!=null)){html+=`<div class="card"><div class="cap" style="margin:0">The chain diagnostic needs at least 10 overlapping months of delayed-discharge, occupancy, handover and A&amp;E series — detailed series carry the full dataset for the flagship system in this working prototype.</div></div>`;return{html,best:null};}
  html+=`<div class="card"><div class="cap">How pressure transmits along the urgent-care pathway at ${esc(oname)}${fell?' — the selected organisation lacks the monthly series, showing its first trust with data':''} · Pearson r on overlapping months (occupancy is quarterly, matched to the containing quarter)</div><div style="display:flex;align-items:stretch;flex-wrap:wrap;gap:2px">`;
  for(let i=0;i<4;i++){
    html+=`<div style="flex:1;min-width:118px;border:1px solid var(--line);border-radius:var(--r);background:var(--surface2);padding:9px 10px;text-align:center"><div style="font-size:10.5px;font-weight:600;color:var(--ink2)">${UEC_CHAIN[i][1]}</div><div class="mono" style="font-size:14px;font-weight:600;margin-top:2px">${latest(UEC_CHAIN[i][0])}</div></div>`;
    if(i<3){const p=pairs[i];const col=p.r==null?'#9aa0af':Math.abs(p.r)>=0.6?'#191f2b':'#6a7183';
      html+=`<div style="flex:none;display:flex;flex-direction:column;justify-content:center;padding:0 7px;text-align:center"><div style="color:${col};font-weight:700;font-size:14px;line-height:1">→</div><div class="mono" style="font-size:10px;color:${col};margin-top:2px">${p.r==null?`r — (${p.n} mo)`:'r='+p.r.toFixed(2)}</div></div>`;}}
  html+=`</div>`;
  const best=pairs.filter(p=>p.r!=null).sort((a,b)=>Math.abs(b.r)-Math.abs(a.r))[0];
  if(best){const nA=UEC_CHAIN[best.a][1],nB=UEC_CHAIN[best.b][1];const r=best.r;
    const m=best.a===0?(r>0?'months with more delayed-discharge bed-days run hotter bed occupancy':'more delayed discharges coincide with lower occupancy here — against the expected direction'):best.a===1?(r>0?'fuller months hold ambulances longer at the door':'occupancy and handover delay move in opposite directions here — against the expected direction'):(r<0?'months when handovers back up see A&amp;E four-hour performance fall':'handover delays and four-hour performance rise together here — against the expected direction');
    html+=`<div style="font-size:13px;color:var(--ink2);margin-top:12px">The strongest link in this chain is <b>${nA} ↔ ${nB}</b> (r=${r.toFixed(2)} over ${best.n} overlapping months): ${m}.</div>
     <div class="two" style="margin-top:10px"><div><div class="cap" style="margin-bottom:4px">Strongest pair · each dot is a month</div><div class="chartbox sm"><canvas id="uecscat"></canvas></div></div>
     <div class="note" style="margin:0;align-self:center">Correlation is association, not cause — but the chain direction (discharge → occupancy → handover → front door) is the review's working hypothesis for UEC pressure. Links with fewer than 10 overlapping months show r —.</div></div>`;
    best.nA=nA;best.nB=nB;}
  html+=`</div>`;
  return{html,best};
}
function uecScatter(best){const cv=document.getElementById('uecscat');if(!cv||!window.Chart)return;
  charts.uecscat=new Chart(cv.getContext('2d'),{type:'scatter',data:{datasets:[{data:best.xs.map((x,i)=>({x,y:best.ys[i]})),backgroundColor:'rgba(31,58,120,.65)',pointRadius:3.5,pointHoverRadius:5}]},options:{plugins:{legend:{display:false}},scales:{x:{title:{display:true,text:best.nA,font:{size:9.5},color:'#6a7183'},ticks:{font:{size:9},color:'#9aa0af'},grid:{color:'#e8e5dc'}},y:{title:{display:true,text:best.nB,font:{size:9.5},color:'#6a7183'},ticks:{font:{size:9},color:'#9aa0af'},grid:{color:'#e8e5dc'}}},responsive:true,maintainAspectRatio:false}});}
function renderFlow(v){
  const codes=['ae_attendances','ae_4hr','emerg_admissions','amb_over30_pct','amb_handover_60','bed_occupancy','vw_occupancy_pct','delayed_discharge_beddays','discharged_total','los_emergency','readmission_28d'];
  const labels={ae_attendances:'A&E attendances / month',ae_4hr:'A&E 4-hour',emerg_admissions:'Emergency admissions / month',amb_over30_pct:'Handover >30 min',amb_handover_60:'Handover >60 min',bed_occupancy:'G&A bed occupancy',vw_occupancy_pct:'Virtual ward occupancy',delayed_discharge_beddays:'Delayed discharge bed days',discharged_total:'Patients discharged / month',los_emergency:'Avg LoS (emergency)',readmission_28d:'28-day readmissions'};
  let h=`<h1 class="serif">Flow & transit</h1><div class="lead">How patients move through the system: length of stay, A&E performance, ambulance handovers, bed occupancy and readmissions, compared across the three trusts.</div>`;
  h+=`<div class="grid kpis">`+codes.map(c=>{const r=orgRows().find(x=>x.metric_code===c);return r?kpi(labels[c],fmt(r.value,r.unit),'',slab(r.status),seriesFor(sel,r.metric_id),color(r.distress)):'';}).join('')+`</div>`;
  const chain=uecChain();h+=chain.html;
  h+=`<div class="eyebrow">Trust comparison (latest)</div><div class="grid three">`;
  codes.forEach((c,i)=>{h+=`<div class="card"><div class="h3" style="font-size:13px">${labels[c]}</div><div class="chartbox sm"><canvas id="fl${i}"></canvas></div></div>`;});
  h+=`</div>`;v.innerHTML=h;countUps();
  codes.forEach((c,i)=>{const comp=TRUSTS.map(tc=>{const oid=(orgs.find(o=>o.code===tc)||{}).id;const r=rows.find(x=>x.organisation_id===oid&&x.metric_code===c);return{tc,v:r?Number(r.value):0,col:color(r?r.distress:null)};});barChart('fl'+i,comp.map(x=>x.tc),comp.map(x=>x.v),comp.map(x=>x.col));});
  if(chain.best)uecScatter(chain.best);
}

/* ===== PERFORMANCE ===== */
async function renderPerformance(v){v.innerHTML='<div class="loading">Loading performance…</div>';const f=await ensure('performance');
  const rttSpecs=specs.filter(s=>s.is_rtt);const lp=latestPeriod(f);
  const metricSel=`<select class="sel" id="pm" onchange="perfMetric=this.value;render()">`+[['rtt_18wk','RTT 18-week %'],['rtt_incomplete','Waiting list size'],['rtt_52wk','52-week breaches']].map(m=>`<option value="${m[0]}" ${m[0]===perfMetric?'selected':''}>${m[1]}</option>`).join('')+`</select>`;
  // heatmap trust x specialty for perfMetric latest
  const cell=(tc,sc)=>{const oid=(orgs.find(o=>o.code===tc)||{}).id;const r=f.find(x=>x.organisation_id===oid&&x.specialty_code===sc&&x.metric_code===perfMetric&&x.period===lp);return r?Number(r.value):null;};
  const allvals=[];rttSpecs.forEach(s=>TRUSTS.forEach(tc=>{const c=cell(tc,s.code);if(c!=null)allvals.push(c);}));
  const mn=Math.min(...allvals),mx=Math.max(...allvals);
  const hcol=(val)=>{if(val==null)return '#e7ecf2';let t=(val-mn)/((mx-mn)||1);if(perfMetric==='rtt_18wk')t=1-t;return d3.interpolateRgb('#166f4d', '#b3261e')(t);};
  let h=sysNote()+ensureNote('performance')+`<h1 class="serif">Performance</h1><div class="lead">The published constitutional standards across the system's acute trusts — RTT, cancer, diagnostics and A&amp;E — then the flagship RTT-by-specialty detail.</div>`;
  h+=nationalBlock(['rtt_18wk','cancer_62','dm01_6wk','ae_4hr'],['rtt_18wk','rtt_52wk','cancer_62','dm01_6wk','cancer_fds_28','ae_4hr'],'Drill a red cell or list row below — DM01 splits by diagnostic test nationally; cancer 62-day splits by tumour for the flagship.');
  h+=`<div class="eyebrow" style="margin-top:14px">RTT by specialty · flagship-grade detail</div><div class="filters">Metric ${metricSel}</div>`;
  h+=`<div class="card" style="overflow-x:auto"><div class="h3">${perfMetric==='rtt_18wk'?'RTT 18-week compliance':perfMetric==='rtt_incomplete'?'Incomplete waiting list':'52-week breaches'} by trust × specialty</div><div class="cap">Latest period ${fmtPeriod(lp)} · ${perfMetric==='rtt_18wk'?'red = below standard':'red = highest'}</div>`;
  h+=`<table class="hm"><thead><tr><th></th>`+TRUSTS.map(tc=>`<th>${tc}</th>`).join('')+`</tr></thead><tbody>`;
  rttSpecs.forEach(s=>{h+=`<tr><td class="rl">${esc(s.code+' '+s.name)}</td>`+TRUSTS.map(tc=>{const c=cell(tc,s.code);const oid=(orgs.find(o=>o.code===tc)||{}).id;return `<td><div class="cell" style="background:${hcol(c)}" onclick="openFactDrill('performance','${oid}','${s.code}','${perfMetric}')">${c==null?'':perfMetric==='rtt_18wk'?Math.round(c):Math.round(c).toLocaleString()}</div></td>`;}).join('')+`</tr>`;});
  h+=`</tbody></table></div>`;
  // worst pain points
  const pain=[];rttSpecs.forEach(s=>TRUSTS.forEach(tc=>{const c=cell(tc,s.code);if(c!=null)pain.push({tc,s,v:c});}));
  pain.sort((a,b)=>perfMetric==='rtt_18wk'?a.v-b.v:b.v-a.v);
  h+=`<div class="eyebrow">Sharpest pain points</div><div class="list">`+pain.slice(0,8).map(p=>`<div class="row" onclick="openFactDrill('performance','${(orgs.find(o=>o.code===p.tc)||{}).id}','${p.s.code}','${perfMetric}')"><span class="tag" style="background:${hcol(p.v)}"></span><div class="m"><div class="t1">${esc(p.s.name)} · ${p.tc}</div><div class="t2">${perfMetric==='rtt_18wk'?fmt(p.v,'pct')+' within 18 weeks':Math.round(p.v).toLocaleString()+(perfMetric==='rtt_52wk'?' over 52 weeks':' waiting')}</div></div></div>`).join('')+`</div>`;
  v.innerHTML=h;
}

/* ===== CAPACITY ===== */
async function renderCapacity(v){v.innerHTML='<div class="loading">Loading capacity…</div>';const f=await ensure('capacity');const lp=latestPeriod(f.filter(x=>x.metric_code==='ga_beds'));
  const siteName=id=>(sites.find(s=>s.id===id)||{}).name||'';
  const bedSites=sites.filter(s=>f.some(x=>x.site_id===s.id&&x.metric_code==='ga_beds'));
  let h=sysNote()+ensureNote('capacity')+`<h1 class="serif">Capacity</h1><div class="lead">Beds, occupancy and delayed discharges across the system's acute trusts, then per-site theatre, outpatient and diagnostic assets for the flagship system.</div>`;
  h+=nationalBlock(['bed_occupancy','beds_ga_available','delayed_discharge_beddays','vw_occupancy_pct'],['bed_occupancy','beds_ga_available','delayed_discharge_beddays','vw_occupancy_pct'],'');
  if(bedSites.length){
  h+=`<div class="eyebrow">Beds & occupancy by site (latest ${fmtPeriod(lp)}) · flagship detail</div><div class="card" style="padding:4px 0"><table class="dt"><thead><tr><th>Site</th><th class="num">G&A beds</th><th class="num">Occupancy</th></tr></thead><tbody>`;
  bedSites.forEach(s=>{const beds=f.find(x=>x.site_id===s.id&&x.metric_code==='ga_beds'&&x.period===lp);const occ=f.find(x=>x.site_id===s.id&&x.metric_code==='occupancy_pct'&&x.period===lp);const ov=occ?Number(occ.value):0;h+=`<tr><td>${esc(s.name)}</td><td class="num">${beds?Math.round(beds.value):'—'}</td><td class="num" style="color:${ov>=95?'#b3261e':ov>=92?'#b45309':'#166f4d'};font-weight:600">${occ?fmt(occ.value,'pct'):'—'}</td></tr>`;});
  h+=`</tbody></table></div>`;
  h+=`<div class="two"><div class="card"><div class="h3">Bed occupancy trend</div><div class="cap">By main acute site</div><div class="chartbox"><canvas id="occ"></canvas></div></div>`;
  h+=`<div class="card"><div class="h3">Theatre, outpatient & diagnostic assets</div><div class="cap">Latest position by site</div><table class="dt"><thead><tr><th>Site</th><th class="num">Theatres</th><th class="num">OP rooms</th><th class="num">CT</th><th class="num">MRI</th><th class="num">Endo</th></tr></thead><tbody>`;
  sites.forEach(s=>{const g=m=>{const r=f.find(x=>x.site_id===s.id&&x.metric_code===m);return r?Math.round(r.value):0;};h+=`<tr><td>${esc(s.name)}</td><td class="num">${g('theatres')}</td><td class="num">${g('op_rooms')}</td><td class="num">${g('ct_scanners')}</td><td class="num">${g('mri_scanners')}</td><td class="num">${g('endoscopy_rooms')}</td></tr>`;});
  h+=`</tbody></table></div></div>`;
  }else{h+=covNote('Per-site bed, occupancy and theatre/diagnostic asset detail is loaded for the flagship system; national site-level ingestion is scheduled (WP2).');}
  v.innerHTML=h;
  const cols={};bedSites.forEach((s,i)=>cols[s.id]=['#1f3a78','#44639f','#7c93c4','#b45309'][i%4]);
  const months=[...new Set(f.filter(x=>x.metric_code==='occupancy_pct').map(x=>x.period))].sort();
  lineChart('occ',months.map(m=>fmtPeriod(m)),bedSites.map(s=>({label:s.name.split(',')[0],data:months.map(m=>{const r=f.find(x=>x.site_id===s.id&&x.metric_code==='occupancy_pct'&&x.period===m);return r?Number(r.value):null;}),borderColor:cols[s.id],backgroundColor:'transparent',tension:.3,pointRadius:0,borderWidth:2})),{plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:9,font:{size:9},color:'#6a7183'}}}});
}

/* ===== ESTATE ===== */
async function renderEstate(v){v.innerHTML='<div class="loading">Loading estate…</div>';const f=await ensure('estate');
  const g=(sid,m)=>{const r=f.find(x=>x.site_id===sid&&x.metric_code===m);return r?Number(r.value):0;};
  const totBacklog=sites.reduce((s,si)=>s+g(si.id,'backlog_maint'),0);const totHigh=sites.reduce((s,si)=>s+g(si.id,'high_risk_backlog'),0);const totCrit=sites.reduce((s,si)=>s+g(si.id,'critical_infra_risk'),0);const totArea=sites.reduce((s,si)=>s+g(si.id,'floor_area'),0);
  let h=sysNote()+ensureNote('estate')+`<h1 class="serif">Estate</h1><div class="lead">Estate condition across the flagship system's sites from the ERIC field set: backlog maintenance, high-risk and critical-infrastructure risk, floor area, energy and PFI status.</div>`;
  const hasEst=sites.some(s=>f.some(x=>x.site_id===s.id));
  if(hasEst){
  h+=`<div class="grid kpis">`+kpi('Total backlog maintenance',fmt(totBacklog,'gbp_m'),'','across all flagship sites','#191f2b')+kpi('High-risk backlog',fmt(totHigh,'gbp_m'),'','urgent remediation','#b45309')+kpi('Critical infrastructure risk',fmt(totCrit,'gbp_m'),'','immediate risk','#b3261e')+kpi('Total floor area',fmt(totArea,'m2'),'','occupied estate','#191f2b')+`</div>`;
  h+=`<div class="two"><div class="card"><div class="h3">Backlog maintenance by site</div><div class="cap">£m</div><div class="chartbox"><canvas id="estbar"></canvas></div></div>
   <div class="card"><div class="h3">Estate detail by site</div><div class="cap">ERIC field set</div><table class="dt"><thead><tr><th>Site</th><th class="num">Backlog</th><th class="num">High-risk</th><th class="num">Floor m²</th><th class="num">Energy</th><th>PFI</th></tr></thead><tbody>`;
  sites.forEach(s=>{h+=`<tr><td>${esc(s.name)}</td><td class="num">${fmt(g(s.id,'backlog_maint'),'gbp_m')}</td><td class="num">${fmt(g(s.id,'high_risk_backlog'),'gbp_m')}</td><td class="num">${Math.round(g(s.id,'floor_area')).toLocaleString()}</td><td class="num">${fmt(g(s.id,'energy_cost'),'gbp_m')}</td><td>${g(s.id,'pfi')?'Yes':'No'}</td></tr>`;});
  h+=`</tbody></table></div></div>`;}else{h+=covNote('National ERIC 2024/25 estate ingestion is scheduled (WP2). Per-site estate condition — backlog, high-risk, floor area, energy and PFI — is currently loaded for the flagship system only.');}v.innerHTML=h;countUps();
  barChart('estbar',sites.map(s=>s.name.split(',')[0].replace(' Hospital','')),sites.map(s=>g(s.id,'backlog_maint')),sites.map(()=>'#b45309'));
}

/* ===== FINANCE ===== */
async function renderFinance(v){v.innerHTML='<div class="loading">Loading finance…</div>';const f=await ensure('finance');const lp=latestPeriod(f);
  const g=(line)=>{const r=f.find(x=>x.organisation_id===sel&&x.line_code===line&&x.period===lp);return r?Number(r.value):0;};
  const income=g('inc_clinical')+g('inc_other');const pay=g('pay_substantive')+g('pay_bank')+g('pay_agency');const nonpay=g('np_drugs')+g('np_clin_supplies')+g('np_nonclin')+g('np_premises')+g('np_deprec')+g('np_other');
  const agencyPct=pay?100*g('pay_agency')/pay:0;
  let h=sysNote()+ensureNote('finance')+`<h1 class="serif">Finance</h1><div class="lead">The published financial position across the system's acute trusts — variance to plan, Oversight-Framework finance scores and segment — then the full modelled I&E for the flagship.</div>`;
  h+=nationalBlock(['of_of0079','of_of4003','of_of4103','of_of0085'],['deficit','of_of0079','of_of0085','of_of4103'],'');
  const varr=orgRows().find(r=>r.metric_code==='deficit'),seg=orgRows().find(r=>r.metric_code==='oversight_segment');
  const vSer=varr?officialSeries(sel,varr.metric_id):[];const vLast=vSer.length?vSer[vSer.length-1]:null;const vVal=vLast?Number(vLast.value):(varr?varr.value:null);
  if(varr||seg)h+=`<div class="eyebrow">Published position</div><div class="grid kpis">`+
    (varr?kpi('Variance to financial plan (YTD)',fmt(vVal,varr.unit),'','published quarterly · '+fmtPeriod((vLast||varr).period),vSer,color(varr.distress)):'')+
    (seg?kpi('Oversight segment',fmt(seg.value,'score'),'/4','NHS Oversight Framework · 4 = most support',null,Number(seg.value)>=4?'#b3261e':Number(seg.value)>=3?'#b45309':'#191f2b'):'')+`</div>`;
  const hasFin=f.some(x=>x.organisation_id===sel&&x.line_code!=null);
  if(hasFin){
  h+=`<div class="eyebrow">Flagship modelled detail (illustrative · pending PFR ingestion)</div><div class="grid kpis">`+kpi('Income',fmt(income,'gbp_m'),'','clinical + other','#191f2b')+kpi('I&E surplus/(deficit)',fmt(g('res_surplus'),'gbp_m'),'','vs plan',g('res_surplus')<0?'#b3261e':'#166f4d')+kpi('Pay bill',fmt(pay,'gbp_m'),'',Math.round(100*pay/(pay+nonpay))+'% of spend','#191f2b')+kpi('Agency reliance',fmt(agencyPct,'pct'),'','of pay bill',agencyPct>5?'#b45309':'#166f4d')+`</div>`;
  h+=`<div class="two"><div class="card"><div class="h3">Expenditure breakdown</div><div class="cap">Pay vs non-pay (£m)</div><div class="chartbox"><canvas id="finexp"></canvas></div></div>
   <div class="card"><div class="h3">Pay composition</div><div class="cap">Substantive · bank · agency</div><div class="chartbox"><canvas id="finpay"></canvas></div></div></div>`;
  h+=`<div class="eyebrow">Income & expenditure</div><div class="card" style="padding:4px 0"><div class="cap" style="padding:10px 14px 0">Modelled illustration pending PFR ingestion — tagged modelled</div><table class="dt"><tbody>`+
   [['inc_clinical','NHS clinical income'],['inc_other','Other income'],['pay_substantive','Substantive pay'],['pay_bank','Bank staff'],['pay_agency','Agency staff'],['np_drugs','Drugs'],['np_clin_supplies','Clinical supplies'],['np_nonclin','Non-clinical supplies'],['np_premises','Premises'],['np_deprec','Depreciation'],['np_other','Other non-pay'],['res_ebitda','EBITDA'],['res_surplus','I&E surplus/(deficit)']].map(l=>`<tr><td>${l[1]}</td><td class="num" style="${l[0].startsWith('res')?'font-weight:700':''};color:${g(l[0])<0?'#b3261e':'#191f2b'}">${fmt(g(l[0]),'gbp_m')}</td></tr>`).join('')+`</tbody></table></div>`;
  h+=`<div class="two"><div class="card"><div class="h3">Balance sheet</div><table class="dt"><tbody>`+[['bs_ppe','Property, plant & equipment'],['bs_curr_assets','Current assets'],['bs_cash','Cash & equivalents'],['bs_curr_liab','Current liabilities'],['bs_net_assets','Net assets']].map(l=>`<tr><td>${l[1]}</td><td class="num">${fmt(g(l[0]),'gbp_m')}</td></tr>`).join('')+`</tbody></table></div>
   <div class="card"><div class="h3">Cash flow</div><table class="dt"><tbody>`+[['cf_ops','Net cash from operations'],['cf_capex','Capital expenditure'],['cf_close','Closing cash']].map(l=>`<tr><td>${l[1]}</td><td class="num">${fmt(g(l[0]),'gbp_m')}</td></tr>`).join('')+`</tbody></table></div></div>`;
  }else{h+=covNote('Income & expenditure, pay, balance-sheet and cash-flow detail carry the full modelled dataset for the flagship system.');}
  v.innerHTML=h;countUps();
  barChart('finexp',['Substantive','Bank','Agency','Drugs','Clin supplies','Non-clin','Premises','Deprec','Other'],[g('pay_substantive'),g('pay_bank'),g('pay_agency'),g('np_drugs'),g('np_clin_supplies'),g('np_nonclin'),g('np_premises'),g('np_deprec'),g('np_other')],['#1f3a78','#44639f','#7c93c4','#44639f','#b7c4de','#d8dfec','#7c93c4','#8a6a1e','#cfd8d0']);
  charts.finpay=document.getElementById('finpay')&&new Chart(document.getElementById('finpay').getContext('2d'),{type:'doughnut',data:{labels:['Substantive','Bank','Agency'],datasets:[{data:[g('pay_substantive'),g('pay_bank'),g('pay_agency')],backgroundColor:['#1f3a78','#44639f','#b45309'],borderWidth:0}]},options:{cutout:'62%',plugins:{legend:{position:'bottom',labels:{boxWidth:9,font:{size:10},color:'#6a7183'}}},responsive:true,maintainAspectRatio:false}});
}

/* ===== WORKFORCE ===== */
async function renderWorkforce(v){v.innerHTML='<div class="loading">Loading workforce…</div>';const f=await ensure('workforce');const lp=latestPeriod(f);
  const g=(sgc,m)=>{const r=f.find(x=>x.organisation_id===sel&&x.staff_group_code===sgc&&x.metric_code===m&&x.period===lp);return r?Number(r.value):0;};
  const totW=sgs.reduce((s,sg)=>s+g(sg.code,'wte'),0);const totA=sgs.reduce((s,sg)=>s+g(sg.code,'agency_wte'),0);
  let h=sysNote()+ensureNote('workforce')+`<h1 class="serif">Workforce</h1><div class="lead">Published workforce position across the system's acute trusts — sickness, engagement and the Oversight-Framework people scores — then the flagship establishment by staff group.</div>`;
  h+=nationalBlock(['sickness_rate','staff_engagement','of_of4004','of_of4104'],['sickness_rate','staff_engagement','of_of0084','of_of4104'],'');
  const sick=orgRows().find(r=>r.metric_code==='sickness_rate');
  const sSer=sick?officialSeries(sel,sick.metric_id):[];const sLast=sSer.length?sSer[sSer.length-1]:null;const sVal=sLast?Number(sLast.value):(sick?sick.value:null);
  const hasWf=f.some(x=>x.organisation_id===sel&&x.staff_group_code!=null);
  if(hasWf){
  h+=`<div class="eyebrow">Flagship modelled establishment (illustrative)</div><div class="grid kpis">`+kpi('Total workforce',fmt(totW,'wte'),'WTE','substantive establishment · modelled','#191f2b')+kpi('Agency WTE',fmt(totA,'wte'),'WTE',Math.round(100*totA/(totW||1))+'% of workforce · modelled',totA/totW>0.05?'#b45309':'#166f4d')+kpi('Nursing vacancy',fmt(g('nursing','vacancy_pct'),'pct'),'','registered nursing · modelled',g('nursing','vacancy_pct')>10?'#b45309':'#166f4d')+kpi('Medical vacancy',fmt(g('medical','vacancy_pct'),'pct'),'','medical & dental · modelled','#191f2b')+`</div>`;
  h+=`<div class="two"><div class="card"><div class="h3">Establishment by staff group</div><div class="cap">WTE</div><div class="chartbox"><canvas id="wfbar"></canvas></div></div>
   <div class="card"><div class="h3">Vacancy by staff group</div><div class="cap">%</div><div class="chartbox"><canvas id="wfvac"></canvas></div></div></div>`;
  h+=`<div class="eyebrow">Workforce detail</div><div class="card" style="padding:4px 0"><table class="dt"><thead><tr><th>Staff group</th><th class="num">WTE</th><th class="num">Vacancy (modelled)</th><th class="num">Sickness (modelled)</th><th class="num">Turnover (modelled)</th><th class="num">Agency WTE</th></tr></thead><tbody>`;
  sgs.forEach(sg=>{h+=`<tr><td>${esc(sg.name)}</td><td class="num">${Math.round(g(sg.code,'wte')).toLocaleString()}</td><td class="num">${fmt(g(sg.code,'vacancy_pct'),'pct')}</td><td class="num">${fmt(g(sg.code,'sickness_pct'),'pct')}</td><td class="num">${fmt(g(sg.code,'turnover_pct'),'pct')}</td><td class="num">${Math.round(g(sg.code,'agency_wte')).toLocaleString()}</td></tr>`;});
  h+=`</tbody></table></div>`;}else{h+=covNote('Establishment, vacancy, sickness, turnover and agency detail by staff group carry the full modelled dataset for the flagship system.');}
  v.innerHTML=h;countUps();
  barChart('wfbar',sgs.map(s=>s.name.split(' ')[0]),sgs.map(s=>g(s.code,'wte')),sgs.map(()=>'#1f3a78'));
  barChart('wfvac',sgs.map(s=>s.name.split(' ')[0]),sgs.map(s=>g(s.code,'vacancy_pct')),sgs.map(s=>g(s.code,'vacancy_pct')>10?'#b45309':'#44639f'));
}

/* ===== POPULATION ===== */
async function renderPopulation(v){
  const gm=c=>orgRows().find(r=>r.metric_code===c);const imd=gm('imd_score'),pg=gm('pop_growth_65');
  if(popProjCache[sysSlug]===undefined){v.innerHTML='<div class="loading">Loading population projections…</div>';
    try{const{data,error}=await sb.from('sr_population_projections').select('*').eq('system_slug',sysSlug);if(error)throw error;popProjCache[sysSlug]=data||[];}
    catch(e){console.warn('projections fetch failed',e);popProjCache[sysSlug]=[];}}
  const proj=(popProjCache[sysSlug]||[]).filter(p=>p.year>=2025&&p.year<=2040);
  const years=[...new Set(proj.map(p=>p.year))].sort((a,b)=>a-b);
  const bandAt=(b,y)=>proj.filter(p=>p.age_band===b&&p.year===y).reduce((s,p)=>s+Number(p.population),0);
  const growth=b=>{if(!years.length)return null;const v0=bandAt(b,years[0]),v1=bandAt(b,2040);return v0?Math.round(100*(v1-v0)/v0):null;};
  const g65=growth('65-84'),g85=growth('85+');
  let h=`<h1 class="serif">Population & demand</h1><div class="lead">The population this system serves and the demand pressure ahead: deprivation, ageing and the demographic driver behind rising acute demand.</div>`;
  h+=`<div class="grid kpis">`+kpi('Deprivation (IMD)',imd?fmt(imd.value,'score'):'—','','average score','#191f2b')+kpi('Over-65 growth',pg?fmt(pg.value,'pct'):'—','/yr','demographic pressure','#b45309')+
   (g65!=null?kpi('65–84 growth to 2040',(g65>0?'+':'')+g65+'%','','ONS SNPP 2022-based','#b45309'):kpi('Population','—','','projection pending','#191f2b'))+
   (g85!=null?kpi('85+ growth to 2040',(g85>0?'+':'')+g85+'%','','ONS SNPP 2022-based','#b45309'):kpi('Older-population growth','—','','projection pending','#b45309'))+`</div>`;
  if(years.length){h+=`<div class="eyebrow">Ageing projection · ONS SNPP</div><div class="two"><div class="card"><div class="h3">Older population to 2040</div><div class="cap">${esc(system()?system().name:'')} · 65–84 and 85+ · stacked</div><div class="chartbox"><canvas id="popproj"></canvas></div></div>
   <div class="card"><div class="h3">Population by age band</div><div class="cap">${years[0]} → 2040</div><table class="dt"><thead><tr><th>Age band</th><th class="num">${years[0]}</th><th class="num">2040</th><th class="num">Change</th></tr></thead><tbody>`+
   ['0-15','16-64','65-84','85+'].map(b=>{const v0=bandAt(b,years[0]),v1=bandAt(b,2040);const ch=v0?Math.round(100*(v1-v0)/v0):null;return `<tr><td>${b}</td><td class="num">${Math.round(v0).toLocaleString()}</td><td class="num">${Math.round(v1).toLocaleString()}</td><td class="num" style="font-weight:600;color:${ch!=null&&ch>25?'#b45309':ch!=null&&ch<0?'#166f4d':'#191f2b'}">${ch==null?'—':(ch>0?'+':'')+ch+'%'}</td></tr>`;}).join('')+
   `</tbody></table><div class="note">${esc((proj[0]||{}).source||'')}</div></div></div>`;}
  /* Wiring · D10 cross-border catchment proxy (crossborder_share / catchment_pop) */
  const xb=TRUSTS.map(tc=>{const oid=(orgs.find(x=>x.code===tc)||{}).id;if(!oid)return null;
    const s=rows.find(r=>r.organisation_id===oid&&r.metric_code==='crossborder_share');
    const c=rows.find(r=>r.organisation_id===oid&&r.metric_code==='catchment_pop');
    return (s||c)?{tc,s,c}:null;}).filter(Boolean);
  if(xb.length){h+=`<div class="eyebrow">Cross-border flows</div><div class="card"><div class="h3">Catchment beyond the home ICB</div><div class="cap">How much of each trust's catchment population lives outside ${esc(system()?system().name:'the home ICB')} — reconfiguration moves activity across ICB borders, not just within them</div>`+
    xb.map(x=>`<div class="kv"><span class="k">${esc(trustShort(x.tc))} · ${x.tc}</span><b>${x.s?fmt(x.s.value,'pct'):'—'} of ${x.c?fmt(x.c.value,'count'):'—'} catchment beyond home ICB</b></div>`).join('')+
    `<div class="note">Derived proxy from the Estates Intelligence trust catchment model (attributed population by MSOA) — indicative of flow direction, not a patient-level flow count.</div></div>`;}
  h+=`<div class="eyebrow">Demand & capacity outlook</div><div class="card" style="cursor:pointer" onclick="setStage('modelling')"><div class="h3">Open the modelling studio →</div><div class="cap">The demand &amp; capacity engine runs on the live activity baseline with this ONS demographic driver — demand and bed-need projections to 2040, with saved scenario runs.</div></div>`;v.innerHTML=h;countUps();
  if(years.length)lineChart('popproj',years.map(String),[
    {label:'65–84',data:years.map(y=>bandAt('65-84',y)),borderColor:'#1f3a78',backgroundColor:'rgba(31,58,120,.30)',fill:'origin',tension:.25,pointRadius:0,borderWidth:2},
    {label:'85+',data:years.map(y=>bandAt('85+',y)),borderColor:'#8a6a1e',backgroundColor:'rgba(138,106,30,.35)',fill:'-1',tension:.25,pointRadius:0,borderWidth:2}],
    {plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:9,font:{size:10},color:'#6a7183'}}},scales:{y:{stacked:true,ticks:{font:{size:9},color:'#9aa0af',callback:v=>Math.round(v/1000)+'k'},grid:{color:'#e8e5dc'}},x:{ticks:{maxTicksLimit:8,font:{size:9},color:'#9aa0af'},grid:{display:false}}}});
}
/* ===== A2 · ACCESS & TRAVEL =====
   Precomputed estimated drive-time matrix per system (geo/access/<slug>.json): every LSOA
   centroid → its 4 nearest hospital-like sites (system trusts + 40 km cross-border buffer).
   Minutes are ESTIMATES (haversine × 1.3 windiness, banded speeds — method string in file);
   always labelled 'estimated drive time'. The what-if panel recomputes all KPIs client-side
   from each LSOA's stored 4-candidate list when General Acute sites are excluded; if all four
   candidates are excluded the LSOA is scored 4th-nearest + 10 min and flagged 'beyond stored range'. */
let accessExcl={}; /* sysSlug → Set of excluded site codes (session only) */
async function accessFile(){try{return await geo('access/'+sysSlug+'.json');}catch(e){console.warn('access matrix failed',e);return null;}}
function accessCompute(A,exIdx){
  let tp=0,tw=0,o45=0,cp=0,cw=0,rp=0,rw=0,beyond=0;const per=[],decP={},decW={};
  A.lsoa.forEach(L=>{const pop=Number(L[1])||0,imd=L[2],c20=L[3],opts=L[4]||[];if(!opts.length)return;
    let mins=null;for(let i=0;i<opts.length;i++){if(!exIdx.has(opts[i][0])){mins=opts[i][1];break;}}
    let fb=false;if(mins==null){mins=opts[opts.length-1][1]+10;fb=true;beyond++;}
    tp+=pop;tw+=pop*mins;if(mins>45)o45+=pop;
    if(c20){cp+=pop;cw+=pop*mins;}else{rp+=pop;rw+=pop*mins;}
    if(imd!=null){decP[imd]=(decP[imd]||0)+pop;decW[imd]=(decW[imd]||0)+pop*mins;}
    per.push({code:L[0],pop,imd,c20,before:opts[0][1],after:mins,fb});});
  const mean=tp?tw/tp:0,c20m=cp?cw/cp:null,restm=rp?rw/rp:null;
  return{mean,over45:tp?100*o45/tp:0,c20m,gap:(c20m!=null&&restm!=null)?c20m-restm:null,beyond,per,
    byDecile:Object.keys(decP).map(Number).sort((a,b)=>a-b).map(d=>({d,mean:decW[d]/decP[d]}))};}
async function renderAccess(v){
  v.innerHTML='<div class="loading">Loading access &amp; travel…</div>';
  const A=await accessFile();if(stage!=='access')return;
  if(!A||!A.lsoa||!A.lsoa.length){v.innerHTML=`<h1 class="serif">Access &amp; travel</h1><div class="banner">No access matrix is available for this system yet.</div>`;return;}
  const exCodes=accessExcl[sysSlug]||(accessExcl[sysSlug]=new Set());
  const gaSites=A.sites.map((s,i)=>({i,code:s[0],trust:s[1],name:s[2],stype:s[5]||''})).filter(s=>TRUSTS.includes(s.trust)&&s.stype.indexOf('General Acute')>=0);
  const toIdx=codes=>{const st=new Set();A.sites.forEach((s,i)=>{if(codes.has(s[0]))st.add(i);});return st;};
  const base=accessCompute(A,new Set());
  const on=exCodes.size>0;const cur=on?accessCompute(A,toIdx(exCodes)):base;
  const accK=(label,val,base2,suf,worseIfUp,sub)=>{if(val==null)return '';const d=val-(base2==null?val:base2);const col=!on||Math.abs(d)<0.05?'#191f2b':((d>0)===worseIfUp?'#b3261e':'#166f4d');
    return `<div class="card kpi"><div class="l">${label}</div><div class="v" style="color:${col}">${val.toFixed(1)}<small>${suf}</small></div><div class="s">${esc(sub||'')}${on?` · baseline ${base2.toFixed(1)}${suf} · Δ ${d>=0?'+':'−'}${Math.abs(d).toFixed(1)}`:''}</div></div>`;};
  let h=`<h1 class="serif">Access &amp; travel</h1><div class="lead">How long this population travels to acute care — estimated drive time from every neighbourhood (LSOA) to its nearest hospital site, population-weighted, with a Core20 equity cut. Untick a site below to test a reconfiguration.</div>`;
  h+=`<div class="grid kpis">`+
    accK('Mean travel time (est.)',cur.mean,base.mean,' min',true,'population-weighted · all neighbourhoods')+
    accK('Population beyond 45 min',cur.over45,base.over45,'%',true,'of resident population')+
    accK('Core20 mean (est.)',cur.c20m,base.c20m,' min',true,'most deprived 20% of neighbourhoods')+
    accK('Core20 vs rest gap',cur.gap,base.gap,' min',true,'negative = deprived communities closer')+`</div>`;
  h+=`<div class="two" style="margin-top:14px"><div class="card"><div class="h3">What if a site changed?</div><div class="cap">This system's General Acute sites — untick to remove one and re-route every neighbourhood to its next-nearest remaining site (community and cross-border sites stay available)</div>`
   +(gaSites.length?gaSites.map(s=>`<label style="display:flex;gap:9px;align-items:center;font-size:12.5px;padding:6px 0;cursor:pointer;border-bottom:1px solid var(--line2)"><input type="checkbox" ${exCodes.has(s.code)?'':'checked'} onchange="toggleAccessSite('${esc(s.code)}')"><span>${esc(s.name)} <span class="muted" style="font-size:11px">· ${esc(trustShort(s.trust))}</span></span></label>`).join(''):'<div class="note">No General Acute sites listed for this system’s trusts in the access matrix.</div>')
   +(cur.beyond?`<div class="note" style="margin-top:9px">${cur.beyond} neighbourhood${cur.beyond>1?'s':''} exhausted all four stored candidate sites — scored as 4th-nearest time + 10 min and flagged “beyond stored range”.</div>`:'')+`</div>`;
  h+=`<div class="card"><div class="h3">Equity strip · mean minutes by deprivation decile</div><div class="cap">IMD decile 1 = most deprived · population-weighted estimated drive time${on?' · baseline vs scenario':''}</div><div class="chartbox"><canvas id="accEquity"></canvas></div></div></div>`;
  if(on){const worst=cur.per.filter(p=>p.after>p.before).sort((a,b)=>(b.after-b.before)-(a.after-a.before)).slice(0,10);
    h+=`<div class="eyebrow">Ten worst-affected neighbourhoods</div><div class="card" style="padding:4px 0;overflow-x:auto"><table class="dt"><thead><tr><th>LSOA</th><th class="num">Population</th><th class="num">IMD decile</th><th>Core20</th><th class="num">Before → after (est. min)</th></tr></thead><tbody>`+
    (worst.length?worst.map(p=>`<tr><td class="mono" style="font-size:11px">${esc(p.code)}</td><td class="num">${p.pop.toLocaleString()}</td><td class="num">${p.imd!=null?p.imd:'—'}</td><td>${p.c20?'Yes':'—'}</td><td class="num" style="font-weight:600;color:#b3261e">${p.before.toFixed(1)} → ${p.after.toFixed(1)}${p.fb?' <span class="muted" style="font-size:10px">beyond stored range</span>':''}</td></tr>`).join(''):'<tr><td colspan="5" class="muted" style="padding:10px 14px">No neighbourhood is worse off under this scenario.</td></tr>')+`</tbody></table></div>`;}
  h+=`<details class="card" style="margin-top:16px"><summary style="cursor:pointer;font-family:'Source Serif 4',Georgia,serif;font-weight:600;font-size:15px">Method — estimated drive time</summary><div style="font-size:12.5px;color:var(--ink2);margin-top:10px;max-width:860px">${esc(A.method||'')}</div><div class="note">Estimated, not routed — OSRM-grade routing is scheduled. Scenario re-routing uses each neighbourhood's four stored nearest sites${A.generated?` · matrix generated ${esc((''+A.generated).slice(0,10))}`:''}.</div></details>`;
  v.innerHTML=h;
  const cv=document.getElementById('accEquity');
  if(cv&&window.Chart&&base.byDecile.length){const ds=[{label:'Baseline',data:base.byDecile.map(x=>+x.mean.toFixed(1)),backgroundColor:on?'#b7c4de':'#1f3a78',borderRadius:3,maxBarThickness:26}];
    if(on)ds.push({label:'Scenario',data:cur.byDecile.map(x=>+x.mean.toFixed(1)),backgroundColor:'#b45309',borderRadius:3,maxBarThickness:26});
    charts.accEquity=new Chart(cv.getContext('2d'),{type:'bar',data:{labels:base.byDecile.map(x=>'D'+x.d),datasets:ds},options:{plugins:{legend:{display:ds.length>1,position:'bottom',labels:{boxWidth:9,font:{size:10},color:'#6a7183'}}},scales:{x:{ticks:{font:{size:10},color:'#6a7183'},grid:{display:false}},y:{ticks:{font:{size:9},color:'#9aa0af'},grid:{color:'#e8e5dc'}}},responsive:true,maintainAspectRatio:false}});}
}
function toggleAccessSite(code){const s=accessExcl[sysSlug]||(accessExcl[sysSlug]=new Set());if(s.has(code))s.delete(code);else s.add(code);render();}
window.toggleAccessSite=toggleAccessSite;

/* ===== MODELLING · A1 v1 demand & capacity engine (2026-07-02) =====
   Replaces the illustrative hardcoded projection with a reproducible engine on live data.
   METHOD (mirrored in the on-page 'Method & data' note):
   1. BASELINE — latest-12-month sums (shorter series annualised and flagged) of monthly
      adm_emergency, adm_elective, op_attendances (+ ae_attendances) across the system's
      acute trusts, from the official series already loaded in `series`. Bed baseline =
      latest average-daily beds_ga_available / beds_ga_occupied per trust (occupied falls
      back to available × bed_occupancy% where a trust lacks an occupied series).
   2. DEMOGRAPHIC DRIVER — ONS SNPP 2022-based projections by age band from
      sr_population_projections [d8-v1]. Each band b carries an editable relative activity
      weight w_b (defaults 0-15: 0.6, 16-64: 1.0, 65-84: 2.2, 85+: 3.6 — acute activity per
      head rises steeply with age). Weighted population W(y) = Σ_b pop_b(y)·w_b.
      Demographic demand index D(y) = W(y) / W(y0): normalising to the baseline-year mix
      isolates the joint effect of population growth AND ageing on acute demand.
   3. SCENARIO LAYERS — with t = y − y0, all compounding annually:
        demand index    I(y) = D(y) · (1+gND)^t · (1−shift)^t
          gND   = non-demographic growth %/yr (technology, thresholds, expectations)
          shift = shift-of-care / prevention offset %/yr (demand removed from acute)
        bed requirement B(y) = bedsOccupied₀ · I(y) · (1−prod)^t ÷ ceiling
          prod  = LoS/productivity improvement %/yr (bed-need only); ceiling = planning
          occupancy ceiling (default 92%) → staffed beds needed to run AT the ceiling.
   4. OUTPUTS — projected NEL/elective/OP demand vs today, B(y) vs available beds, and
      additional-bed requirements at 2031/2036/2040 plus theatre/diagnostic growth proxies.
   Saved runs persist every slider + the baseline + per-year outputs to sr_scenarios,
   sr_model_runs and sr_model_outputs, so every figure is versioned and reproducible. */
const ENGINE_VERSION='v1-2026-07-02';
const MOD_BANDS=['0-15','16-64','65-84','85+'];
const ENGINE_INPUTS=['adm_emergency','adm_elective','op_attendances','ae_attendances','beds_ga_available','beds_ga_occupied','bed_occupancy'];
let MOD={w:{'0-15':0.6,'16-64':1.0,'65-84':2.2,'85+':3.6},gnd:0.5,shift:0.5,prod:0.5,ceil:92,runsCache:null,last:null};
function sysTrusts(){return orgs.filter(x=>TRUSTS.includes(x.code));}
function mrow(orgId,code){return rows.find(x=>x.organisation_id===orgId&&x.metric_code===code);}
function last12(orgId,code){const r=mrow(orgId,code);if(!r)return null;const s=officialSeries(orgId,r.metric_id);if(!s.length)return null;const a=s.slice(-12);return{sum:a.reduce((t,x)=>t+Number(x.value),0),months:a.length,to:a[a.length-1].period};}
function latestOf(orgId,code){const r=mrow(orgId,code);if(!r)return null;const s=officialSeries(orgId,r.metric_id);if(s.length)return{v:Number(s[s.length-1].value),period:s[s.length-1].period};return r.value!=null?{v:Number(r.value),period:r.period}:null;}
function modelBaseline(){const ts=sysTrusts();
  const agg=code=>{let ann=0,n=0,months=12,to='';ts.forEach(t=>{const x=last12(t.id,code);if(x&&x.months){ann+=x.sum/x.months*12;months=Math.min(months,x.months);if(x.to>to)to=x.to;n++;}});return n?{annual:Math.round(ann),orgs:n,months,to}:null;};
  const nel=agg('adm_emergency'),el=agg('adm_elective'),op=agg('op_attendances'),ae=agg('ae_attendances');
  let bedsAvail=0,bedsOcc=0,occs=[],bp='';ts.forEach(t=>{const a=latestOf(t.id,'beds_ga_available'),o=latestOf(t.id,'beds_ga_occupied'),pc=latestOf(t.id,'bed_occupancy');if(pc)occs.push(pc.v);if(a){bedsAvail+=a.v;if(a.period>bp)bp=a.period;bedsOcc+=o?o.v:(pc?a.v*pc.v/100:a.v*0.92);}});
  return{nel,el,op,ae,bedsAvail:Math.round(bedsAvail),bedsOcc:Math.round(bedsOcc),occ:occs.length?occs.reduce((a,b)=>a+b,0)/occs.length:null,bedsPeriod:bp,trusts:ts.length};}
async function renderModelling(v){
  v.innerHTML='<div class="loading">Loading demand &amp; capacity engine…</div>';
  if(deferredLoads)await deferredLoads; /* E4 · freshness table depends on the deferred load */
  if(popProjCache[sysSlug]===undefined){try{const{data,error}=await sb.from('sr_population_projections').select('*').eq('system_slug',sysSlug);if(error)throw error;popProjCache[sysSlug]=data||[];}catch(e){console.warn('projections fetch failed',e);popProjCache[sysSlug]=[];}}
  const BL=modelBaseline();const proj=popProjCache[sysSlug]||[];
  let h=`<h1 class="serif">Modelling studio</h1><div class="lead">A transparent, reproducible demand &amp; capacity engine: live activity baseline, ONS demographic projections weighted by age-band activity, and editable scenario layers — every run saveable and re-loadable.</div>`;
  const missing=[!BL.nel&&'adm_emergency',!BL.el&&'adm_elective',!BL.op&&'op_attendances',!BL.bedsAvail&&'beds_ga_available',!proj.length&&'sr_population_projections'].filter(Boolean);
  if(missing.length){h+=`<div class="banner">The engine needs its full baseline — missing for this system: ${missing.join(', ')}. Detailed activity series carry the full dataset for the flagship system in this working prototype.</div>`;v.innerHTML=h;return;}
  h+=`<div class="grid kpis">`+
    kpi('Non-elective admissions',fmt(BL.nel.annual,'count'),'/yr',`12-mo sum to ${fmtPeriod(BL.nel.to)} · ${BL.nel.orgs} trusts`,'#191f2b')+
    kpi('Elective admissions',fmt(BL.el.annual,'count'),'/yr',`incl. day case · to ${fmtPeriod(BL.el.to)}`,'#191f2b')+
    kpi('Outpatient attendances',fmt(BL.op.annual,'count'),'/yr',`12-mo sum to ${fmtPeriod(BL.op.to)}`,'#191f2b')+
    kpi('G&A beds available',fmt(BL.bedsAvail,'count'),'',`${fmt(BL.bedsOcc,'count')} occupied · ${BL.occ?fmt(BL.occ,'pct'):'—'} occupancy · ${fmtPeriod(BL.bedsPeriod)}`,'#b45309')+`</div>`;
  h+=`<div class="two" style="margin-top:14px"><div class="card"><div class="h3">Assumptions</div><div class="cap">Age-band activity weights (relative acute activity per head) and scenario layers — all editable, all persisted with a saved run</div>`
   +MOD_BANDS.map((b,i)=>`<div class="slabel"${i?' style="margin-top:8px"':''}><span>Activity weight · ${b}</span><b id="mwv${i}">${MOD.w[b].toFixed(1)}×</b></div><input id="mw${i}" type="range" min="0" max="5" step="0.1" value="${MOD.w[b]}" oninput="computeModel()">`).join('')
   +`<div style="border-top:1px solid var(--line2);margin:12px 0 10px"></div>`
   +`<div class="slabel"><span>Non-demographic growth</span><b id="mgndv">${MOD.gnd.toFixed(1)}%/yr</b></div><input id="mgnd" type="range" min="0" max="3" step="0.1" value="${MOD.gnd}" oninput="computeModel()">`
   +`<div class="slabel" style="margin-top:8px"><span>Shift-of-care / prevention offset</span><b id="mshiftv">${MOD.shift.toFixed(1)}%/yr</b></div><input id="mshift" type="range" min="0" max="3" step="0.1" value="${MOD.shift}" oninput="computeModel()">`
   +`<div class="slabel" style="margin-top:8px"><span>LoS / productivity improvement (beds only)</span><b id="mprodv">${MOD.prod.toFixed(1)}%/yr</b></div><input id="mprod" type="range" min="0" max="3" step="0.1" value="${MOD.prod}" oninput="computeModel()">`
   +`<div class="slabel" style="margin-top:8px"><span>Occupancy ceiling</span><b id="mceilv">${MOD.ceil}%</b></div><input id="mceil" type="range" min="85" max="100" step="0.5" value="${MOD.ceil}" oninput="computeModel()">`
   +`<div class="note" id="mnote"></div></div>`
   +`<div class="card"><div class="h3">Projected demand to 2040</div><div class="cap" id="mdcap"></div><div class="chartbox"><canvas id="a1demand"></canvas></div></div></div>`;
  h+=`<div class="two" style="margin-top:14px"><div class="card"><div class="h3">Bed requirement vs available beds</div><div class="cap">Future bed need = occupied beds × demand index × (1−productivity)^t ÷ occupancy ceiling</div><div class="chartbox"><canvas id="a1beds"></canvas></div></div>
   <div class="card"><div class="h3">Save this scenario run</div><div class="cap">Persists every assumption, the baseline and per-year outputs to sr_scenarios / sr_model_runs / sr_model_outputs — versioned and reproducible</div><div class="note" id="mrunname" style="margin:0 0 10px"></div><button class="btn" id="msave" onclick="saveModelRun()">Save scenario run</button><div class="note" id="msavenote"></div><div class="cap" style="margin-top:16px;margin-bottom:4px">Previous runs · this database</div><div id="mrunlist"><div class="note">Loading…</div></div></div></div>`;
  h+=`<div class="eyebrow">Future capacity requirements</div><div class="grid three" id="reqcards"></div>`;
  h+=`<div class="prov" id="mprov"></div>`;
  h+=methodHtml();
  v.innerHTML=h;computeModel();loadSavedRuns();
}
function computeModel(){
  const BL=modelBaseline();const proj=(popProjCache[sysSlug]||[]).filter(p=>p.year>=2025&&p.year<=2040);
  if(!proj.length||!BL.nel||!BL.el||!BL.op)return;
  MOD_BANDS.forEach((b,i)=>{const e=document.getElementById('mw'+i);if(e)MOD.w[b]=parseFloat(e.value);const l=document.getElementById('mwv'+i);if(l)l.textContent=MOD.w[b].toFixed(1)+'×';});
  ['gnd','shift','prod','ceil'].forEach(k=>{const e=document.getElementById('m'+k);if(e)MOD[k]=parseFloat(e.value);const l=document.getElementById('m'+k+'v');if(l)l.textContent=k==='ceil'?MOD.ceil+'%':MOD[k].toFixed(1)+'%/yr';});
  const years=[...new Set(proj.map(p=>p.year))].sort((a,b)=>a-b);const y0=years.includes(2026)?2026:years[0];
  const yrs=years.filter(y=>y>=y0);if(!yrs.length)return;
  const popB=(b,y)=>proj.filter(p=>p.age_band===b&&p.year===y).reduce((s,p)=>s+Number(p.population),0);
  const W=y=>MOD_BANDS.reduce((s,b)=>s+popB(b,y)*MOD.w[b],0);const W0=W(y0)||1;
  /* I(y) = D(y)·(1+gND)^t·(1−shift)^t where D(y)=W(y)/W(y0) — see method block above */
  const idx=yrs.map(y=>{const t=y-y0;return W(y)/W0*Math.pow(1+MOD.gnd/100,t)*Math.pow(1-MOD.shift/100,t);});
  const nel=idx.map(i=>Math.round(BL.nel.annual*i)),el=idx.map(i=>Math.round(BL.el.annual*i)),op=idx.map(i=>Math.round(BL.op.annual*i));
  /* B(y) = bedsOccupied₀·I(y)·(1−prod)^t ÷ ceiling */
  const bedNeed=yrs.map((y,k)=>{const t=y-y0;return Math.round(BL.bedsOcc*idx[k]*Math.pow(1-MOD.prod/100,t)/(MOD.ceil/100));});
  MOD.last={yrs,y0,idx,nel,el,op,bedNeed,BL};
  const at=y=>{const k=yrs.indexOf(y);return k<0?null:k;};
  const k31=at(2031),k36=at(2036);const k40=at(2040)!=null?at(2040):yrs.length-1;
  ['a1demand','a1beds'].forEach(id=>{if(charts[id]){try{charts[id].destroy()}catch(e){}delete charts[id];}});
  lineChart('a1demand',yrs.map(String),[
    {label:'Non-elective admissions',data:nel,borderColor:'#1f3a78',backgroundColor:'rgba(31,58,120,.08)',fill:true,tension:.25,pointRadius:0,borderWidth:2},
    {label:'Elective admissions',data:el,borderColor:'#8a6a1e',backgroundColor:'transparent',tension:.25,pointRadius:0,borderWidth:2},
    {label:'Today (NEL)',data:yrs.map(()=>BL.nel.annual),borderColor:'#9aa0af',borderDash:[5,4],pointRadius:0,borderWidth:1.2}]);
  lineChart('a1beds',yrs.map(String),[
    {label:'Beds required',data:bedNeed,borderColor:'#b45309',backgroundColor:'rgba(180,83,9,.08)',fill:true,tension:.25,pointRadius:0,borderWidth:2},
    {label:'Beds available today',data:yrs.map(()=>BL.bedsAvail),borderColor:'#6a7183',borderDash:[5,4],pointRadius:0,borderWidth:1.5}]);
  const dd=Math.round((W(yrs[k40])/W0-1)*100),dg=Math.round((idx[k40]-1)*100);
  const mn=document.getElementById('mnote');if(mn)mn.textContent=`Demographic index ${dd>=0?'+':''}${dd}% by ${yrs[k40]}; with the growth and shift layers the demand index is ${idx[k40].toFixed(2)} (${dg>=0?'+':''}${dg}%).`;
  const mc=document.getElementById('mdcap');if(mc)mc.textContent=`Annualised activity vs the ${y0} baseline · demographic driver + scenario layers`;
  const addBeds=k=>k==null?null:bedNeed[k]-BL.bedsAvail;
  const rc=document.getElementById('reqcards');if(rc)rc.innerHTML=
    reqCard('Additional beds by 2031',addBeds(k31),'vs '+fmt(BL.bedsAvail,'count')+' available · at '+MOD.ceil+'% ceiling')+
    reqCard('Additional beds by 2036',addBeds(k36),'occupied-bed baseline '+fmt(BL.bedsOcc,'count'))+
    reqCard('Additional beds by 2040',addBeds(k40),'requirement '+fmt(bedNeed[k40],'count')+' beds')+
    reqCard('Elective demand by 2040',el[k40]-BL.el.annual,'theatres proxy · +'+Math.round((el[k40]/BL.el.annual-1)*100)+'% — theatre count baseline pending estates link')+
    reqCard('Outpatient demand by 2040',op[k40]-BL.op.annual,'diagnostics proxy · +'+Math.round((op[k40]/BL.op.annual-1)*100)+'% on '+fmt(BL.op.annual,'count')+'/yr')+
    reqCard('A&E attendances by 2040',BL.ae?Math.round(BL.ae.annual*idx[k40])-BL.ae.annual:null,'front-door proxy on '+(BL.ae?fmt(BL.ae.annual,'count'):'—')+'/yr');
  const rn=document.getElementById('mrunname');if(rn)rn.textContent='Run name: '+runName();
  const pv=document.getElementById('mprov');if(pv)pv.textContent=`Inputs: adm_emergency, adm_elective, op_attendances${BL.ae?', ae_attendances':''} (latest-12-month sums${BL.nel.months<12?', '+BL.nel.months+'-month series annualised':''}, to ${fmtPeriod(BL.nel.to)}) · beds_ga_available, beds_ga_occupied, bed_occupancy (latest month, ${fmtPeriod(BL.bedsPeriod)}) · ONS SNPP 2022 via sr_population_projections [d8-v1] · engine ${ENGINE_VERSION}. Bed-need formula: occupied × demand index × (1−productivity)^t ÷ occupancy ceiling.`;
}
function reqCard(t,n,s){return `<div class="card"><div class="kpi"><div class="l">${t}</div><div class="v" style="color:#b45309">${n==null?'—':(n>=0?'+':'−')+Math.abs(Math.round(n)).toLocaleString()}</div><div class="s">${s}</div></div></div>`;}
function runName(){const d=new Date().toISOString().slice(0,10);return `${sysSlug} — ${d} — nd${MOD.gnd}/shift${MOD.shift}/prod${MOD.prod}/occ${MOD.ceil}/w${MOD_BANDS.map(b=>MOD.w[b]).join('·')}`;}
async function saveModelRun(){const L=MOD.last;if(!L)return;const btn=document.getElementById('msave'),note=document.getElementById('msavenote');
  /* U3 · writes require a session (anon INSERT revoked in E2) */
  if(!session){if(note)note.textContent='Sign in to save (public data stays open to read).';return;}
  if(btn)btn.disabled=true;if(note)note.textContent='Saving…';
  const params={engine:ENGINE_VERSION,system:sysSlug,age_band_weights:Object.assign({},MOD.w),non_demographic_growth_pct:MOD.gnd,shift_of_care_offset_pct:MOD.shift,productivity_pct:MOD.prod,occupancy_ceiling_pct:MOD.ceil,
    baseline:{year:L.y0,nel_annual:L.BL.nel.annual,el_annual:L.BL.el.annual,op_annual:L.BL.op.annual,ae_annual:L.BL.ae?L.BL.ae.annual:null,beds_available:L.BL.bedsAvail,beds_occupied:L.BL.bedsOcc,occupancy_pct:L.BL.occ,activity_to:L.BL.nel.to,beds_period:L.BL.bedsPeriod,trusts:TRUSTS.slice()}};
  try{
    const{data:sc,error:e1}=await sb.from('sr_scenarios').insert({name:runName(),params,version:1,notes:'A1 v1 in-app engine — saved from the modelling studio'}).select('id').single();if(e1)throw e1;
    const k40=L.yrs.indexOf(2040)>=0?L.yrs.indexOf(2040):L.yrs.length-1;
    const summary={engine:ENGINE_VERSION,headline:{demand_index_2040:+L.idx[k40].toFixed(3),nel_2040:L.nel[k40],el_2040:L.el[k40],op_2040:L.op[k40],beds_required_2040:L.bedNeed[k40],beds_available:L.BL.bedsAvail,beds_gap_2040:L.bedNeed[k40]-L.BL.bedsAvail}};
    const{data:run,error:e2}=await sb.from('sr_model_runs').insert({name:runName(),scenario_type:'demand_capacity',assumptions:params,status:'completed',notes:'A1 v1 engine run — per-year outputs in sr_model_outputs (variant central)',scenario_id:sc.id,baseline_year:L.y0,horizon_years:L.yrs[L.yrs.length-1]-L.y0,summary}).select('id').single();if(e2)throw e2;
    const outs=[];L.yrs.forEach((y,k)=>{outs.push(
      {model_run_id:run.id,year:y,metric:'projected_demand_nel',value:L.nel[k],unit:'admissions',variant:'central'},
      {model_run_id:run.id,year:y,metric:'projected_demand_el',value:L.el[k],unit:'admissions',variant:'central'},
      {model_run_id:run.id,year:y,metric:'projected_demand_op',value:L.op[k],unit:'attendances',variant:'central'},
      {model_run_id:run.id,year:y,metric:'beds_required',value:L.bedNeed[k],unit:'beds',variant:'central'},
      {model_run_id:run.id,year:y,metric:'beds_gap',value:L.bedNeed[k]-L.BL.bedsAvail,unit:'beds',variant:'central'});});
    const{error:e3}=await sb.from('sr_model_outputs').insert(outs);if(e3)throw e3;
    if(note)note.textContent='Saved — '+outs.length+' output rows · run '+run.id.slice(0,8)+'…';
    MOD.runsCache=null;loadSavedRuns();
  }catch(e){console.warn('save run failed',e);if(note)note.textContent='Save failed — '+(e.message||'insert blocked');}
  if(btn)btn.disabled=false;}
async function loadSavedRuns(){const el=document.getElementById('mrunlist');if(!el)return;
  if(!MOD.runsCache){try{const{data,error}=await sb.from('sr_model_runs').select('id,name,created_at,scenario_type,status,assumptions,summary').order('created_at',{ascending:false}).limit(25);if(error)throw error;MOD.runsCache=data||[];}catch(e){el.innerHTML='<div class="note">Could not load saved runs (network).</div>';return;}}
  const runs=MOD.runsCache.filter(r=>{const a=r.assumptions||{};return !a.system||a.system===sysSlug;});
  if(!runs.length){el.innerHTML='<div class="note">No saved runs yet for this system.</div>';return;}
  el.innerHTML=runs.map(r=>{const a=r.assumptions||{},s=(r.summary||{}).headline||{};const mine=a.engine===ENGINE_VERSION;
    const key=mine?`beds req. 2040: ${fmt(s.beds_required_2040,'count')} (gap ${s.beds_gap_2040>=0?'+':''}${fmt(s.beds_gap_2040,'count')})`:'segmented planning-engine seed';
    return `<div style="padding:8px 0;border-bottom:1px solid var(--line2)"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div style="min-width:0"><div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(r.name)}">${esc(r.name)}</div><div class="muted" style="font-size:11px">${r.created_at?new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):''} · ${esc(r.scenario_type||'')} · ${key}</div></div>${mine?`<button class="btn ghost" style="font-size:11px;padding:4px 10px;flex:none" onclick="loadModelRun('${r.id}')">Load</button>`:''}</div></div>`;}).join('');}
function loadModelRun(id){const r=(MOD.runsCache||[]).find(x=>x.id===id);if(!r||!r.assumptions)return;const a=r.assumptions;
  if(a.age_band_weights)MOD_BANDS.forEach(b=>{if(a.age_band_weights[b]!=null)MOD.w[b]=Number(a.age_band_weights[b]);});
  if(a.non_demographic_growth_pct!=null)MOD.gnd=Number(a.non_demographic_growth_pct);
  if(a.shift_of_care_offset_pct!=null)MOD.shift=Number(a.shift_of_care_offset_pct);
  if(a.productivity_pct!=null)MOD.prod=Number(a.productivity_pct);
  if(a.occupancy_ceiling_pct!=null)MOD.ceil=Number(a.occupancy_ceiling_pct);
  render();}
function methodHtml(){
  const codes=[...new Set(ENGINE_INPUTS.concat(...Object.values(DRIVER_METRICS)))].sort();
  const rd1=sysTrusts()[0]||orgs.find(o=>o.code==='RD1');
  const rowFor=code=>{let r=rd1?rows.find(x=>x.metric_code===code&&x.organisation_id===rd1.id):null;if(!r)r=rows.find(x=>x.metric_code===code&&TRUSTS.includes(x.org_code));return r||rows.find(x=>x.metric_code===code);};
  const tr=codes.map(code=>{const r=rowFor(code);return `<tr><td class="mono" style="font-size:11px">${esc(code)}</td><td>${esc(r?r.metric_name:'—')}</td><td>${esc(r?r.unit:'—')}</td><td class="num">${r&&r.standard!=null?fmt(r.standard,r.unit):'—'}</td><td style="font-size:11px">${r?`${esc(r.source||'—')} · ${esc(r.confidence||'—')} · ${fmtPeriod(r.period)}`:'not loaded for this system'}</td></tr>`;}).join('');
  return `<details class="card" style="margin-top:16px"><summary style="cursor:pointer;font-family:'Source Serif 4',Georgia,serif;font-weight:600;font-size:15px">Method &amp; data</summary>
  <div style="font-size:13px;color:var(--ink2);margin-top:10px;max-width:860px">The engine takes the latest twelve months of non-elective admissions, elective admissions and outpatient attendances for the system's acute trusts and treats their sum as the annual baseline (shorter series are annualised and flagged in the provenance line). It then builds a demographic demand index from ONS 2022-based sub-national population projections: each age band is multiplied by an editable activity weight reflecting how much acute care that band uses per head, and the weighted population of each future year is divided by the weighted population of the baseline year. Demand in year y is the baseline multiplied by this index, compounded by a non-demographic growth rate and reduced by a shift-of-care/prevention offset, both editable. The bed requirement additionally applies an annual length-of-stay/productivity improvement (beds only) and divides by the planning occupancy ceiling, so it answers: how many staffed G&amp;A beds would be needed to run at the ceiling? Theatre and diagnostic figures are growth proxies scaled from elective and outpatient demand — not counts of physical assets. Every saved run stores the full assumption set, the baseline numbers and the per-year outputs, so any figure on this page can be reproduced from its run record.</div>
  <div class="cap" style="margin-top:14px;margin-bottom:4px">Data dictionary · every metric used by the driver tables and this engine · generated live from the metric register</div>
  <div style="overflow-x:auto"><table class="dt"><thead><tr><th>Code</th><th>Name</th><th>Unit</th><th class="num">Standard</th><th>Source of latest row (first trust in scope)</th></tr></thead><tbody>${tr}</tbody></table></div>${freshTable()}</details>`;}
/* D12 · freshness table for the Method & data note */
function freshTable(){if(!freshness.length)return '';return `<div class="cap" style="margin-top:14px;margin-bottom:4px">Data freshness · sr_data_freshness · refresh runs Mondays 07:00</div><div style="overflow-x:auto"><table class="dt"><thead><tr><th>Source</th><th class="num">Latest period</th><th class="num">Rows</th><th class="num">Loaded</th></tr></thead><tbody>`+freshness.slice().sort((a,b)=>(a.source_key<b.source_key?-1:1)).map(f=>`<tr><td style="font-size:11.5px">${esc(f.description||f.source_key)}</td><td class="num">${esc((''+(f.latest_period||'—')).slice(0,10))}</td><td class="num">${f.row_count!=null?Number(f.row_count).toLocaleString():'—'}</td><td class="num">${f.loaded_at?new Date(f.loaded_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—'}</td></tr>`).join('')+`</tbody></table></div>`;}
window.computeModel=computeModel;window.saveModelRun=saveModelRun;window.loadModelRun=loadModelRun;

/* ===== APPRAISE · U1/S4 — surfaces the dormant option-appraisal machinery =====
   Data: sr_options (4 longlist options promoted from AI drafts) + sr_option_components /
   _impacts (8 qualitative domains) / _risks / _scores (per-LENS AI appraisal scores — no
   per-criterion scores exist yet) / _finance_profiles+_years / _workforce_profiles+
   _requirements; sr_ai_option_drafts carries issue_ids — the REGISTERED issue→option link
   (options.source_draft_id → draft.issue_ids → sr_issues.id); sr_statutory_tests hangs off
   option_id; sr_packs/_sections/_exhibits/_exports form the pack register (currently empty
   apart from three export smoke-tests with no pack_id).
   Matrix cells: derived from qualitative impact ratings (positive 75 · mixed 50 · negative
   25 · unknown —), impact domain → ITT criterion: quality→quality_safety,
   inequalities→equity, workforce→workforce, capacity→estates_digital, finance→financial_roi,
   access→travel_access (deliverability & patient_experience shown in the option detail
   only). Cells are capped as indicative; the stored per-lens AI score is shown alongside. */
let optCache=null;
async function ensureOptions(){if(optCache)return optCache;
  try{const [o,c,im,rk,sc,fp,fy,wp,wr,dr,st,pk,ps,pe,px]=await Promise.all([
    sb.from('sr_options').select('*'),sb.from('sr_option_components').select('*'),sb.from('sr_option_impacts').select('*'),
    sb.from('sr_option_risks').select('*'),sb.from('sr_option_scores').select('*'),
    sb.from('sr_option_finance_profiles').select('*'),sb.from('sr_option_finance_years').select('*'),
    sb.from('sr_option_workforce_profiles').select('*'),sb.from('sr_option_workforce_requirements').select('*'),
    sb.from('sr_ai_option_drafts').select('id,title,issue_ids,promoted_option_id,status'),
    sb.from('sr_statutory_tests').select('*'),
    sb.from('sr_packs').select('*'),sb.from('sr_pack_sections').select('*'),
    sb.from('sr_pack_exhibits').select('id,pack_id,exhibit_order,exhibit_type,section,title,slide_status,claim_status'),
    sb.from('sr_pack_exports').select('*')]);
    optCache={options:o.data||[],components:c.data||[],impacts:im.data||[],risks:rk.data||[],scores:sc.data||[],finProfiles:fp.data||[],finYears:fy.data||[],wfProfiles:wp.data||[],wfReqs:wr.data||[],drafts:dr.data||[],tests:st.data||[],packs:pk.data||[],packSections:ps.data||[],packExhibits:pe.data||[],packExports:px.data||[]};
  }catch(e){console.warn('options fetch failed',e);optCache={options:[],components:[],impacts:[],risks:[],scores:[],finProfiles:[],finYears:[],wfProfiles:[],wfReqs:[],drafts:[],tests:[],packs:[],packSections:[],packExhibits:[],packExports:[],error:true};}
  return optCache;}
function scoreCol(v){return v==null?'#9aa0af':v>=70?'#166f4d':v>=45?'#b45309':'#b3261e';}
const IMPACT_CRIT={quality:'quality_safety',inequalities:'equity',workforce:'workforce',capacity:'estates_digital',finance:'financial_roi',access:'travel_access'};
const RATING_SCORE={positive:75,mixed:50,negative:25};
const RISK_ORDER={significant:0,high:0,medium:1,low:2,unknown:3};
function optCrit(o,critCode){if(!optCache)return null;const im=(optCache.impacts||[]).find(x=>x.option_id===o.id&&IMPACT_CRIT[x.domain]===critCode);if(!im)return null;const v=RATING_SCORE[im.rating];return v==null?null:v;}
function optWsum(o){let s=0,tw=0;criteria.forEach(c=>{const v=optCrit(o,c.code);if(v==null)return;const w=weights[c.code]||0;s+=v*w;tw+=w;});return tw?s/tw:null;}
function optDraft(o){return optCache?(optCache.drafts||[]).find(d=>d.id===o.source_draft_id||d.promoted_option_id===o.id):null;}
function optIssues(o){const d=optDraft(o);return d&&d.issue_ids?d.issue_ids.map(id=>issues.find(i=>i.id===id)).filter(Boolean):[];}
function optShort(t){return (t||'').replace(/^Draft option \d+ — /,'');}
function aiScore(o,lens){const s=optCache?(optCache.scores||[]).find(x=>x.option_id===o.id&&x.lens===lens):null;return s?Math.round(Number(s.score)):null;}
function testMeta(s){return {met:['met','#166f4d'],passed:['met','#166f4d'],partial:['partial','#b45309'],needs_evidence:['needs evidence','#b45309'],not_started:['not started','#9aa0af'],high_risk:['high risk','#b3261e'],unmet:['unmet','#b3261e']}[s]||[(s||'not assessed').replace(/_/g,' '),'#9aa0af'];}
async function renderOptions(v){v.innerHTML='<div class="loading">Loading options…</div>';const OC=await ensureOptions();
  const opts=(OC.options||[]).slice().sort((a,b)=>(a.code||'').localeCompare(b.code||''));
  let h=`<h1 class="serif">Options &amp; appraisal</h1><div class="lead">The long list: configuration options developed from the issue register, appraised against the six ITT criteria.</div>`;
  if(sysSlug!==BSW_SLUG)h+=`<div class="banner">The option set belongs to the flagship system in this working prototype — shown here unchanged.</div>`;
  if(OC.error)h+=`<div class="banner">Option data could not be loaded (network). <a href="#" onclick="optCache=null;render();return false">Retry</a></div>`;
  if(!opts.length){if(!OC.error)h+=`<div class="card"><div class="h3">No options yet</div><div class="cap">Options are promoted from AI drafts generated off the issue register.</div></div>`;v.innerHTML=h;return;}
  h+=`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(330px,1fr))">`+opts.map(o=>{const iss=optIssues(o);const stCol={proposed:'#1f3a78',appraised:'#7a6200',shortlisted:'#166f4d',rejected:'#6a7183'}[o.status]||'#1f3a78';
    return `<div class="card" style="cursor:pointer;display:flex;flex-direction:column" onclick="openOption('${o.id}')"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div class="h3" style="font-size:14px">${esc(optShort(o.title))}</div><span class="pill" style="background:${stCol};flex:none">${esc(o.status||'draft')}</span></div><div class="cap" style="margin-bottom:8px">${esc((o.option_type||'').replace(/_/g,' '))} · ${esc(o.stage||'longlist')} · ${esc(o.owner||'')}</div><div style="font-size:12.5px;color:var(--ink2);flex:1">${esc((o.summary||'').slice(0,190))}${(o.summary||'').length>190?'…':''}</div><div style="margin-top:10px">${iss.map(i=>`<span class="pill" style="background:#e8e5dc;color:#3c4354;cursor:pointer;margin-right:5px" onclick="event.stopPropagation();openIssue('${esc(i.code)}')">${esc(i.code.length>28?i.code.slice(0,26)+'…':i.code)}</span>`).join('')||'<span class="note">no registered issue link</span>'}</div></div>`;}).join('')+`</div>`;
  h+=`<div class="eyebrow">Appraisal matrix · six ITT criteria</div>`+lensBar();
  h+=`<div class="card" style="overflow-x:auto;padding:12px 14px"><a class="csvlink" href="#" onclick="csvTable('optmatrix','options-matrix-${sysSlug}-${new Date().toISOString().slice(0,10)}.csv');return false">CSV</a><table class="dt" id="optmatrix"><thead><tr><th style="min-width:200px">Option</th>${criteria.map(c=>`<th class="num">${esc(c.name)}</th>`).join('')}<th class="num" style="border-left:1px solid var(--line)">Weighted · ${esc(lensName)}</th><th class="num">AI appraisal</th></tr></thead><tbody>`+
    opts.map(o=>{const tot=optWsum(o);const ai=aiScore(o,'balanced')!=null?aiScore(o,'balanced'):aiScore(o,'quality_safety_first');
      return `<tr style="cursor:pointer" onclick="openOption('${o.id}')"><td style="font-size:12px">${esc(optShort(o.title).slice(0,84))}</td>${criteria.map(c=>{const s=optCrit(o,c.code);return `<td class="num" style="font-weight:600;color:${scoreCol(s)}">${s==null?'—':s}</td>`;}).join('')}<td class="num" style="border-left:1px solid var(--line);font-weight:700;color:${scoreCol(tot)}">${tot==null?'—':Math.round(tot)}</td><td class="num" style="color:${scoreCol(ai)}">${ai==null?'—':ai}</td></tr>`;}).join('')+
    `</tbody></table><div class="note">Criterion cells are derived from qualitative impact ratings (positive 75 · mixed 50 · negative 25; impact domains mapped quality→quality &amp; safety, inequalities→equity, workforce→workforce, capacity→estates &amp; digital, finance→financial &amp; ROI, access→travel &amp; access) — no per-criterion option scores exist yet, so treat cells as indicative. Weighted = live ${esc(lensName)} lens weights over these cells. AI appraisal = stored balanced-lens option score (directional, asr-option-appraisal-v1).</div></div>`;
  h+=`<div class="note" style="margin-top:10px">Option set is a working draft (late-June facilitation seed) — quantified appraisal pending engine integration.</div>`;
  v.innerHTML=h;}
function openOption(id){if(!optCache)return;const o=(optCache.options||[]).find(x=>x.id===id);if(!o)return;hideTip();
  const comps=(optCache.components||[]).filter(x=>x.option_id===id);
  const imps=(optCache.impacts||[]).filter(x=>x.option_id===id);
  const risks=(optCache.risks||[]).filter(x=>x.option_id===id).sort((a,b)=>((RISK_ORDER[a.rating]!=null?RISK_ORDER[a.rating]:9)-(RISK_ORDER[b.rating]!=null?RISK_ORDER[b.rating]:9)));
  const fp=(optCache.finProfiles||[]).find(x=>x.option_id===id);const fys=fp?(optCache.finYears||[]).filter(x=>x.profile_id===fp.id).sort((a,b)=>a.year_index-b.year_index):[];
  const wp=(optCache.wfProfiles||[]).find(x=>x.option_id===id);const wrs=wp?(optCache.wfReqs||[]).filter(x=>x.profile_id===wp.id):[];
  const tests=(optCache.tests||[]).filter(x=>x.option_id===id);
  const iss=optIssues(o);
  const cs=criteria.map(c=>({c,v:optCrit(o,c.code)})).filter(x=>x.v!=null);
  const hi=cs.length?cs.reduce((a,b)=>b.v>a.v?b:a):null,lo=cs.length?cs.reduce((a,b)=>b.v<a.v?b:a):null;
  const tMet=tests.filter(t=>['met','passed'].includes(t.status)).length,tRed=tests.filter(t=>['high_risk','unmet'].includes(t.status)).length;
  const ratingCol=r=>({positive:'#166f4d',mixed:'#b45309',negative:'#b3261e'}[r]||'#9aa0af');
  const riskCol=r=>({significant:'#b3261e',high:'#b3261e',medium:'#b45309',low:'#166f4d'}[r]||'#9aa0af');
  let h=`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" style="max-width:740px" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>${esc(optShort(o.title))}</h2><div class="ms">${esc((o.option_type||'').replace(/_/g,' '))} · ${esc(o.stage||'')} · ${esc(o.status||'')} · ${esc(o.owner||'')}</div>
   <div style="font-size:13px;color:var(--ink2);margin-bottom:12px">${esc(o.summary||'')}</div>
   <div class="prov" style="margin:0 0 12px">Traceability — issue → option → criteria → statutory tests (registered link: this option's promoted AI draft carries the issue register entries):<br>${iss.length?iss.map(i=>`<a href="#" onclick="openIssue('${esc(i.code)}');return false">${esc(i.title)}</a>`).join(' · '):'no registered issue link'} → <b>this option</b> → strongest ${hi?`<b style="color:${scoreCol(hi.v)}">${esc(hi.c.name)} (${hi.v})</b>`:'—'} · weakest ${lo?`<b style="color:${scoreCol(lo.v)}">${esc(lo.c.name)} (${lo.v})</b>`:'—'} → tests: <b>${tMet}/${tests.length} met</b>${tRed?`, <b style="color:#b3261e">${tRed} high-risk/unmet</b>`:''} — detail in Tests &amp; packs</div>`;
  if(comps.length)h+=`<div class="cap" style="margin-bottom:4px">Components (${comps.length})</div>`+comps.map(c=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--line2)"><span class="pill" style="background:${c.component_type==='site'?'#1f3a78':'#8a6a1e'};margin-right:6px">${esc(c.component_type)}</span>${esc(c.description||'')}${c.phasing?` <span class="muted" style="font-size:10.5px">· ${esc((c.phasing||'').replace(/_/g,' '))}</span>`:''}</div>`).join('');
  if(imps.length)h+=`<div class="cap" style="margin-top:12px;margin-bottom:4px">Impact appraisal by domain</div>`+imps.map(im=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--line2)"><span class="pill" style="background:${ratingCol(im.rating)};margin-right:6px">${esc((im.domain||'').replace(/_/g,' '))} · ${esc(im.rating||'')}</span>${esc((im.impact_summary||'').slice(0,180))}${(im.impact_summary||'').length>180?'…':''}<span class="muted" style="font-size:10.5px"> · confidence ${esc(im.confidence||'—')}</span></div>`).join('');
  if(risks.length)h+=`<div class="cap" style="margin-top:12px;margin-bottom:4px">Top risks (${risks.length} on register · severity-sorted)</div>`+risks.slice(0,6).map(r=>`<div style="font-size:12px;padding:4px 0;border-bottom:1px solid var(--line2)"><span class="pill" style="background:${riskCol(r.rating)};margin-right:6px">${esc(r.rating||'unknown')} · ${esc((r.risk_type||'').replace(/_/g,' '))}</span>${esc((r.description||'').slice(0,170))}${r.mitigation?`<div class="muted" style="font-size:11px;margin-top:2px">mitigation: ${esc((r.mitigation||'').slice(0,140))}</div>`:''}</div>`).join('');
  if(fys.length)h+=`<div class="cap" style="margin-top:12px;margin-bottom:4px">Finance profile · ${esc((fp.finance_status||'').replace(/_/g,' '))} · confidence ${esc(fp.confidence||'—')}</div><div class="chartbox" style="height:160px"><canvas id="optfin"></canvas></div><div class="note">${esc(fp.caveat||'')}</div>`;
  if(wrs.length)h+=`<div class="cap" style="margin-top:12px;margin-bottom:4px">Workforce requirements${wp&&wp.workforce_status?` · ${esc(wp.workforce_status.replace(/_/g,' '))}`:''}</div><table class="dt"><thead><tr><th>Staff group</th><th class="num">FTE change</th><th>Risk</th><th>Rota dependency</th></tr></thead><tbody>`+wrs.map(w=>`<tr><td>${esc((w.staff_group||'').replace(/_/g,' '))}</td><td class="num">${Number(w.fte_change)>=0?'+':''}${Number(w.fte_change).toFixed(2)}</td><td><span class="pill" style="background:${riskCol(w.risk_rating)}">${esc(w.risk_rating||'—')}</span></td><td style="font-size:11.5px">${esc(w.rota_dependency||'')}</td></tr>`).join('')+`</tbody></table>`;
  h+=`<div id="optaccesslink"></div><div class="note" style="margin-top:12px">Option set is a working draft (late-June facilitation seed) — quantified appraisal pending engine integration.</div></div></div>`;
  document.getElementById('modalroot').innerHTML=h;
  /* A2 · cross-link when option components reference sites in the access matrix (fuzzy contains) */
  accessFile().then(A=>{const el=document.getElementById('optaccesslink');if(!el||!A||!A.sites)return;
    const txt=comps.map(c=>(c.description||'')).join(' | ').toLowerCase();if(!txt)return;
    const stems=[];A.sites.forEach(s=>{const nm=(s[2]||'').toLowerCase();if(nm.length>5)stems.push(nm);const st=nm.replace(/\s+(hospital|hospitals|general hospital|community hospital).*$/,'');if(st.length>7&&st!==nm)stems.push(st);});
    if(stems.some(nm=>txt.indexOf(nm)>=0))el.innerHTML=`<div class="note" style="margin-top:10px">This option touches sites in the travel model — <a href="#" onclick="closeDrill();setStage('access');return false">assess travel impact in Access &amp; travel →</a></div>`;}).catch(()=>{});
  if(fys.length){const labels=fys.map(f=>'Yr '+f.year_index);const net=fys.map(f=>+(Number(f.gross_savings_m||0)-Number(f.recurrent_cost_m||0)-Number(f.non_recurrent_cost_m||0)-Number(f.capital_cost_m||0)).toFixed(2));
    lineChart('optfin',labels,[{label:'Net position £m (gross savings − recurrent − non-recurrent − capital)',data:net,borderColor:'#1f3a78',backgroundColor:'rgba(31,58,120,.08)',fill:true,tension:.25,pointRadius:2,borderWidth:2},{label:'Break-even',data:fys.map(()=>0),borderColor:'#9aa0af',borderDash:[5,4],pointRadius:0,borderWidth:1}]);}}
async function renderAssurance(v){v.innerHTML='<div class="loading">Loading tests &amp; packs…</div>';const OC=await ensureOptions();
  const tests=OC.tests||[],opts=(OC.options||[]).slice().sort((a,b)=>(a.code||'').localeCompare(b.code||''));
  let h=`<h1 class="serif">Tests &amp; packs</h1><div class="lead">Statutory and assurance tests per option — the evidence trail an NHSE gateway review will walk — and the evidence-pack register. Readiness is tracked here; PCBC assembly itself is out of scope for this prototype.</div>`;
  if(OC.error)h+=`<div class="banner">Assurance data could not be loaded (network). <a href="#" onclick="optCache=null;render();return false">Retry</a></div>`;
  const counts={};tests.forEach(t=>{counts[t.status]=(counts[t.status]||0)+1;});
  if(tests.length)h+=`<div class="grid kpis">`+Object.keys(counts).sort().map(s=>{const m=testMeta(s);return kpi(m[0],String(counts[s]),'','of '+tests.length+' statutory tests',m[1]);}).join('')+`</div>`;
  opts.forEach(o=>{const ts=tests.filter(t=>t.option_id===o.id);if(!ts.length)return;
    h+=`<div class="eyebrow">${esc(optShort(o.title))}</div><div class="list">`+ts.map(t=>{const m=testMeta(t.status);
      return `<div class="row" style="cursor:default"><span class="tag" style="background:${m[1]}"></span><div class="m"><div class="t1">${esc(t.test_name)}</div><div class="t2">${esc((t.evidence_summary||'').slice(0,230))}${t.gaps?`<div class="muted" style="font-size:11px;margin-top:2px">gaps: ${esc(t.gaps.split(' | ').slice(0,3).join(' · '))}</div>`:''}</div></div><span class="pill" style="background:${m[1]};flex:none">${m[0]}</span></div>`;}).join('')+`</div>`;});
  h+=`<div class="eyebrow">Evidence-pack register</div>`;
  const packs=OC.packs||[];
  if(packs.length)h+=`<div class="list">`+packs.map(p=>{const secs=(OC.packSections||[]).filter(s=>s.pack_id===p.id),exs=(OC.packExhibits||[]).filter(x=>x.pack_id===p.id),xps=(OC.packExports||[]).filter(x=>x.pack_id===p.id);
    return `<div class="row" style="cursor:default"><span class="tag" style="background:#1f3a78"></span><div class="m"><div class="t1">${esc(p.title)}</div><div class="t2">${esc(p.status||'')} · v${p.current_version||1} · ${secs.length} sections · ${exs.length} exhibits · ${xps.length} exports${p.qa_status?` · QA ${esc(p.qa_status)}`:''}${p.signoff_status?` · sign-off ${esc(p.signoff_status)}`:''}</div></div><span class="pill" style="background:#6a7183">${esc(p.audience||'pack')}</span></div>`;}).join('')+`</div>`;
  else h+=`<div class="card"><div class="h3">No packs assembled yet</div><div class="cap">The pack register (sr_packs → sections → exhibits → exports) is live and its export plumbing has been smoke-tested; assembly starts once the option appraisal firms up. PCBC assembly is out of scope here — readiness is what this page tracks.</div></div>`;
  const xp=OC.packExports||[];
  if(xp.length)h+=`<div class="cap" style="margin-top:12px;margin-bottom:4px">Export log</div><div class="card" style="padding:12px 14px"><table class="dt"><thead><tr><th>File</th><th>Type</th><th>Status</th><th class="num">Version</th><th>Created</th></tr></thead><tbody>`+xp.map(x=>`<tr><td class="mono" style="font-size:11px">${esc(x.file_name||'—')}</td><td>${esc(x.export_type||'')}</td><td>${esc(x.status||'')}</td><td class="num">${x.version||1}</td><td>${x.created_at?new Date(x.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—'}</td></tr>`).join('')+`</tbody></table><div class="note">Smoke-test exports (not yet linked to a pack) — they demonstrate the PPTX/DOCX export path ahead of real pack assembly.</div></div>`;
  v.innerHTML=h;}
window.openOption=openOption;

/* ===== DECISION MODULE ===== */
let dstage='orient';
function setDS(s){dstage=s;render();}window.setDS=setDS;
/* WP4 · decision-journey guidance: per-stage action sentence + data-driven completion chips */
const DJOURNEY={orient:'Agree what is true before debating solutions — the measures furthest from standard across the system.',surface:'Turn the evidence into a shared issue register; a system without its own register starts from an auto-drafted one.',frame:'Choose the lens — the weighting of criteria — that the workshop will judge priorities by.',prioritise:'Rank the issues under the chosen lens and stress-test how the order shifts lens to lens.',commit:'Lock the agreed top priorities and the delivery roadmap, then persist and print the pack.'};
let commitCache=null;
function dstageDone(code){const so=new Set(sysOrgs().map(o=>o.id));const own=issues.some(i=>i.organisation_id&&so.has(i.organisation_id));
  const hasIssues=own||issues.length>0||(sysSlug!==BSW_SLUG&&sysIssueDrafts().length>0);
  if(code==='orient')return rows.some(r=>r.org_type==='acute_trust'&&(r.status==='near_failure'||r.status==='serious'));
  if(code==='surface')return hasIssues;
  if(code==='frame')return lensName!=='Balanced'||(typeof lensVotes!=='undefined'&&lensVotes.length>0);
  if(code==='prioritise')return issues.length>0;
  if(code==='commit')return !!(commitCache&&commitCache.slug===sysSlug);
  return false;}
function dJourneyGuide(){const stages=[['orient','Orient'],['surface','Surface'],['frame','Frame'],['prioritise','Prioritise'],['commit','Commit']];
  const prog=stages.map(s=>`<span class="jchip" style="color:${dstageDone(s[0])?'#166f4d':'#9aa0af'}">${dstageDone(s[0])?'✓':'○'} ${s[1]}</span>`).join('<span style="color:#dcd9d0"> · </span>');
  return `<div class="note" style="margin:2px 2px 10px"><b>What you do here:</b> ${esc(DJOURNEY[dstage]||'')}</div><div style="margin:0 2px 14px;font-size:12px">${prog}</div>`;}
async function loadCommitment(){try{const{data}=await sb.from('sr_commitments').select('*').eq('system_slug',sysSlug).order('created_at',{ascending:false}).limit(1);
  const c=(data&&data[0])||null;commitCache=c?{slug:c.system_slug,lens:c.lens,created_at:c.created_at,priorities:c.priorities}:null;
  const el=document.getElementById('commitnote');if(el&&commitCache)el.textContent='Last committed '+fmtPeriod((commitCache.created_at||'').slice(0,10))+' · '+(commitCache.lens||'')+' lens';
}catch(e){/* sr_commitments not provisioned yet — persistence is optional */}}
async function commitPriorities(){if(!isFacilitator()||!session){authMsg('Sign in as a facilitator to commit priorities.');return;}
  const top=ranking().slice(0,5).map((r,i)=>({rank:i+1,code:r.i.code,title:r.i.title,score:Math.round(r.val)}));
  try{const{error}=await sb.from('sr_commitments').insert({system_slug:sysSlug,lens:lensName,priorities:top,committed_by:sessionEmail()});if(error)throw error;
    authMsg('Agreed priorities committed.');await loadCommitment();render();
  }catch(e){authMsg('Could not persist — '+((e&&e.message)||'the commitments table is not yet provisioned')+'. The pack can still be printed.');}}
window.commitPriorities=commitPriorities;
function renderDecide(v){
  let h=sysNote()+`<h1 class="serif">Decision journey</h1><div class="lead">From one agreed picture of the system to a committed set of priorities: orient on the evidence, surface the problems, frame the lens, prioritise together, and commit.</div>`;
  h+=`<div class="lenses">`+[['orient','1 · Orient'],['surface','2 · Surface'],['frame','3 · Frame'],['prioritise','4 · Prioritise'],['commit','5 · Commit']].map(s=>`<button class="lensbtn ${dstage===s[0]?'on':''}" onclick="setDS('${s[0]}')">${s[1]}</button>`).join('')+`</div>${dJourneyGuide()}<div id="dbody"></div>`;
  v.innerHTML=h;const b=document.getElementById('dbody');
  if(dstage==='orient')dOrient(b);else if(dstage==='surface')dSurface(b);else if(dstage==='frame')dFrame(b);else if(dstage==='prioritise')dPrioritise(b);else dCommit(b);
}
function dOrient(b){
  const closest=rows.filter(r=>r.org_type==='acute_trust'&&(r.status==='near_failure'||r.status==='serious')).sort((a,b)=>b.distress-a.distress).slice(0,8);
  let h=`<div class="card" style="margin-bottom:13px"><div class="h3">The agreed starting point</div><div class="cap">Before anyone argues about solutions, the system agrees what is true. These are the measures furthest from standard across the three trusts, from live published NHS data. Each can be challenged by the owning organisation — challenges are visible to everyone.</div></div>`;
  h+=`<div class="list">`+closest.map(rrow).join('')+`</div>`;
  h+=`<div style="margin-top:13px" class="grid three"><div class="card" style="cursor:pointer" onclick="setStage('drivers')"><div class="h3">Four priority drivers →</div><div class="cap">The review's framing of the evidence</div></div><div class="card" style="cursor:pointer" onclick="setStage('overview')"><div class="h3">System overview →</div><div class="cap">Map, domains and distress</div></div><div class="card" style="cursor:pointer" onclick="setDS('surface')"><div class="h3">Continue: Surface →</div><div class="cap">Name the problems worth solving</div></div></div>`;
  b.innerHTML=h;
}
function dSurface(b){let h='';
  /* S5 · systems without their own register get an auto-drafted one */
  {const so=new Set(sysOrgs().map(o=>o.id));const own=issues.some(i=>i.organisation_id&&so.has(i.organisation_id));
   if(sysSlug!==BSW_SLUG&&!own)h+=draftIssuesCard();}
  DRIVERS.concat([['finance','Finance & productivity']]).forEach(dv=>{const dis=issues.filter(i=>dv[0]==='finance'?!i.driver:i.driver===dv[0]);if(!dis.length)return;h+=`<div class="eyebrow">${dv[1]}</div><div class="list">`+dis.map(i=>{const org=i.organisation_id?orgById[i.organisation_id]:null;return `<div class="row" onclick="openIssue('${i.code}')"><span class="tag" style="background:#1f3a78"></span><div class="m"><div class="t1">${esc(i.title)}</div><div class="t2">${esc(i.description||'')}</div></div><span class="pill" style="background:#e8e5dc;color:#3c4354">${org?esc(org.code||'System'):'System'}</span></div>`;}).join('')+`</div>`;});b.innerHTML=h;}
function dFrame(b){const L=lenses.find(x=>x.name===lensName)||lenses[0];let h=lensBar()+`<div class="two"><div class="card"><div class="h3">Criteria weights</div><div class="cap">Drag to rebalance (switches to Custom)</div>`+sliderBlock()+`</div><div class="card"><div class="h3">Criteria</div>`+criteria.map(c=>`<div style="margin-bottom:9px"><b style="font-size:12.5px">${esc(c.name)}</b><div class="muted" style="font-size:12px">${esc(c.descr)}</div></div>`).join('')+`</div></div>`+
  `<div class="note" style="margin-top:10px">Scores carry provenance tags; facilitator-seeded scores are replaced by workshop-agreed scores during Surface/Frame sessions.</div>`+lensVotesCard();b.innerHTML=h;refreshLensVotes();}
function lensBar(){return `<div class="lenses">`+lenses.map(x=>`<button class="lensbtn ${x.name===lensName?'on':''}" onclick="setLens('${esc(x.name)}')">${esc(x.name)}</button>`).join('')+(lenses.some(x=>x.name===lensName)?'':`<button class="lensbtn on">${esc(lensName)}</button>`)+`</div>`;}
function sliderBlock(){return criteria.map(c=>{const w=Math.round((weights[c.code]||0)*100);return `<div style="margin-bottom:12px"><div class="slabel"><span>${esc(c.name)}</span><b>${w}%</b></div><input type="range" min="0" max="50" value="${w}" oninput="setWeight('${c.code}',this.value)"></div>`;}).join('');}
function wsum(iss){const tot=criteria.reduce((s,c)=>s+(weights[c.code]||0),0)||1;let s=0;criteria.forEach(c=>{const sc=iscores.find(x=>x.issue_id===iss.id&&x.criterion_code===c.code);s+=(sc?Number(sc.score):0)*(weights[c.code]||0);});return s/tot;}
function ranking(){return issues.map(i=>({i,val:wsum(i)})).sort((a,b)=>b.val-a.val);}
function rankingForLens(L){const w=L.weights,tot=Object.values(w).reduce((a,b)=>a+b,0)||1;return issues.map(i=>{let s=0;criteria.forEach(c=>{const sc=iscores.find(x=>x.issue_id===i.id&&x.criterion_code===c.code);s+=(sc?Number(sc.score):0)*(w[c.code]||0);});return{code:i.code,val:s/tot};}).sort((a,b)=>b.val-a.val);}
function dPrioritise(b){const topSets=lenses.map(l=>rankingForLens(l).slice(0,5).map(r=>r.code));const robust=new Set(topSets.length?topSets[0].filter(c=>topSets.every(s=>s.includes(c))):[]);
  let h=lensBar()+`<div class="two"><div class="card"><div class="h3">Weights</div><div class="cap">Live re-ranking</div>`+sliderBlock()+`</div><div class="card"><div class="h3">How priorities shift by lens</div><div class="chartbox"><canvas id="bump"></canvas></div></div></div>`;
  h+=sensitivityCard();
  h+=`<div class="eyebrow">Ranked priorities</div><div class="list">`+ranking().map((r,i)=>{const vv=Math.round(r.val);const col=vv>=70?'#b3261e':vv>=60?'#b45309':vv>=45?'#7a6200':'#166f4d';return `<div class="rank" onclick="openIssue('${r.i.code}')"><span class="n">${i+1}</span><div class="m"><div class="t1">${esc(r.i.title)}${robust.has(r.i.code)?'<span class="robust">robust</span>':''}</div><div class="bar" style="margin-top:7px"><div style="width:${vv}%;background:${col}"></div></div></div><span class="sc" style="color:${col}">${vv}</span></div>`;}).join('')+`</div>`;
  b.innerHTML=h;
  const order=ranking().slice(0,6).map(r=>r.i.code);const pal=['#1f3a78','#44639f','#7c93c4','#b45309','#166f4d','#b3261e'];
  charts.bump=new Chart(document.getElementById('bump').getContext('2d'),{type:'line',data:{labels:lenses.map(l=>l.name),datasets:order.map((code,idx)=>({label:(issues.find(i=>i.code===code)||{}).title,data:lenses.map(l=>rankingForLens(l).findIndex(x=>x.code===code)+1),borderColor:pal[idx%6],backgroundColor:pal[idx%6],borderWidth:2,tension:.3,pointRadius:3}))},options:{plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:8,font:{size:9},color:'#6a7183'}}},scales:{y:{reverse:true,min:1,max:issues.length,ticks:{stepSize:1,font:{size:9},color:'#9aa0af'},grid:{color:'#e8e5dc'}},x:{ticks:{font:{size:9},color:'#6a7183'},grid:{display:false}}},responsive:true,maintainAspectRatio:false}});}
function dCommit(b){const top=ranking().slice(0,5);const terms={Short:[],Medium:[],Long:[]};ranking().forEach(r=>{const im=IMPACT[r.i.code]||['',''];if(terms[im[1]])terms[im[1]].push({t:r.i.title,d:im[0]});});
  let h=lensBar()+`<div class="eyebrow">Agreed priorities · ${esc(lensName)} lens</div><div class="list">`+top.map((r,i)=>{const im=IMPACT[r.i.code]||['',''];const tc=im[1]==='Short'?'#166f4d':im[1]==='Medium'?'#7a6200':'#b45309';return `<div class="rank"><span class="n">${i+1}</span><div class="m"><div class="t1">${esc(r.i.title)}</div><div class="t2">${esc(im[0])}</div></div><span class="pill" style="background:${tc}">${im[1]} term</span></div>`;}).join('')+`</div>`;
  h+=`<div class="eyebrow">Delivery roadmap</div><div class="three">`+[['Short','0–12 months'],['Medium','1–3 years'],['Long','3–10 years']].map(t=>`<div class="card"><div class="h3">${t[0]} term</div><div class="cap">${t[1]}</div>`+(terms[t[0]].map(x=>`<div style="border-left:3px solid #1f3a78;padding:7px 10px;margin-bottom:7px;background:#f2f0e9;border-radius:6px;font-size:12.5px"><b>${esc(x.t)}</b><div class="muted" style="font-size:11.5px">${esc(x.d)}</div></div>`).join('')||'<div class="muted" style="font-size:12px">—</div>')+`</div>`).join('')+`</div>`;
  h+=`<div style="margin-top:16px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn" onclick="window.print()">Export priority pack</button>${(isFacilitator()&&session)?`<button class="btn ghost" onclick="commitPriorities()">Commit agreed priorities</button>`:`<span class="muted" style="font-size:12px">Sign in as a facilitator to commit priorities.</span>`}<span id="commitnote" class="muted" style="font-size:12px">${(commitCache&&commitCache.slug===sysSlug)?('Last committed '+fmtPeriod((commitCache.created_at||'').slice(0,10))+' · '+esc(commitCache.lens||'')+' lens'):''}</span></div>`;b.innerHTML=h;loadCommitment();}

/* S2 · workshop weighting — votes, divergence and median adoption (sr_lens_votes) */
let lensVotes=[];
async function loadLensVotes(){try{const{data}=await sb.from('sr_lens_votes').select('*').order('created_at');lensVotes=data||[];}catch(e){lensVotes=[];}}
function latestVotes(){const by={};lensVotes.forEach(v=>{by[(v.voter||'anon').toLowerCase()]=v;});return Object.values(by);}
function medianOf(arr){const s=arr.slice().sort((a,b)=>a-b);const n=s.length;return n?(n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2):0;}
async function submitLensVote(){if(!session){authMsg('Sign in to submit weights.');return;}
  const{error}=await sb.from('sr_lens_votes').insert({voter:sessionEmail(),weights:weights});
  if(error){authMsg('Weights not saved — '+(error.message||'insert blocked'));return;}
  authMsg('Your weights are recorded.');await refreshLensVotes();}
function adoptMedianWeights(){if(!isFacilitator()||!session)return;const vs=latestVotes();if(vs.length<2)return;
  const w={};criteria.forEach(c=>{w[c.code]=medianOf(vs.map(v=>Number((v.weights||{})[c.code]||0)));});
  weights=w;lensName='Workshop median';render();authMsg('Median weights adopted as the working lens.');}
function lensVotesInner(){const vs=latestVotes();
  let h='';
  if(session)h+=`<div style="margin-bottom:9px"><button class="btn" onclick="submitLensVote()">Submit my weights</button><span class="muted" style="font-size:11.5px;margin-left:9px">records the current sliders as the vote of ${esc(sessionEmail()||'')}</span></div>`;
  else h+=`<div class="note" style="margin:0 0 9px">Sign in to submit your weights — one live vote per person, visible to the whole room.</div>`;
  if(vs.length<2)return h+`<div class="muted" style="font-size:12px">${vs.length?'1 vote so far — the divergence view appears from 2 votes.':'No votes yet.'}</div>`;
  const X=p=>Math.min(100,p*2); /* weight sliders run 0–50%, so 50% spans the track */
  h+=`<div class="cap" style="margin-bottom:4px">Divergence across ${vs.length} voters · min — median — max weight per criterion</div>`;
  h+=criteria.map(c=>{const vals=vs.map(v=>Math.round(100*Number((v.weights||{})[c.code]||0)));
    const mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),md=Math.round(medianOf(vals));
    return `<div style="margin-bottom:8px"><div class="slabel"><span>${esc(c.name)}</span><b>${mn} — ${md} — ${mx}%</b></div><div style="position:relative;height:10px;background:#f2f0e9;border-radius:5px"><div style="position:absolute;top:0;height:10px;border-radius:5px;left:${X(mn)}%;width:${Math.max(1.5,X(mx)-X(mn))}%;background:#7c93c4"></div><div style="position:absolute;top:-2px;height:14px;width:3px;border-radius:2px;left:${X(md)}%;background:#1f3a78"></div></div></div>`;}).join('');
  h+=`<div class="cap" style="margin:10px 0 4px">Voters</div><div style="overflow-x:auto"><table class="dt"><thead><tr><th>Voter</th>${criteria.map(c=>`<th class="num">${esc(c.name.split(' ')[0].split('&')[0])}</th>`).join('')}</tr></thead><tbody>`+vs.map(v=>`<tr><td>${esc((v.voter||'—').split('@')[0])}</td>${criteria.map(c=>`<td class="num">${Math.round(100*Number((v.weights||{})[c.code]||0))}%</td>`).join('')}</tr>`).join('')+`</tbody></table></div>`;
  if(isFacilitator()&&session)h+=`<div style="margin-top:10px"><button class="btn" onclick="adoptMedianWeights()">Adopt median weights</button><span class="muted" style="font-size:11.5px;margin-left:9px">sets the working lens to “Workshop median”</span></div>`;
  return h;}
function lensVotesCard(){return `<div class="card" style="margin-top:13px"><div class="h3">Workshop weighting</div><div class="cap">Each participant submits their preferred weights; the room sees where it agrees and where it splits before adopting a shared lens. Stored in sr_lens_votes — reads open, writes require sign-in.</div><div id="wsvotes">${lensVotesInner()}</div></div>`;}
async function refreshLensVotes(){await loadLensVotes();const el=document.getElementById('wsvotes');if(el)el.innerHTML=lensVotesInner();}
window.submitLensVote=submitLensVote;window.adoptMedianWeights=adoptMedianWeights;

/* S3 · ranking sensitivity — every criterion weight stressed ±25%, renormalised via the weighted-sum denominator */
function rankingWith(w){const tot=criteria.reduce((s,c)=>s+(w[c.code]||0),0)||1;
  return issues.map(i=>{let s=0;criteria.forEach(c=>{const sc=iscores.find(x=>x.issue_id===i.id&&x.criterion_code===c.code);s+=(sc?Number(sc.score):0)*(w[c.code]||0);});return{code:i.code,val:s/tot};}).sort((a,b)=>b.val-a.val);}
function sensitivityCard(){if(!issues.length||!criteria.length)return '';
  const base=ranking().map(r=>r.i.code);const top5=base.slice(0,5);if(!top5.length)return '';
  const hold={};top5.forEach(t=>hold[t]=true);
  const res=criteria.map(c=>{let mx=0;
    [0.75,1.25].forEach(f=>{const w={};criteria.forEach(k=>w[k.code]=weights[k.code]||0);w[c.code]=(weights[c.code]||0)*f;
      const rk=rankingWith(w).map(r=>r.code);
      top5.forEach(t=>{const d=Math.abs(rk.indexOf(t)-base.indexOf(t));if(d>mx)mx=d;if(rk.indexOf(t)>=5)hold[t]=false;});});
    return{name:c.name,mx};}).sort((a,b)=>b.mx-a.mx);
  const mxAll=Math.max.apply(null,[1].concat(res.map(r=>r.mx)));
  const robust=top5.filter(t=>hold[t]).map(t=>(issues.find(i=>i.code===t)||{}).title).filter(Boolean);
  const bars=res.map(r=>`<div style="margin-bottom:7px"><div class="slabel"><span>${esc(r.name)}</span><b>${r.mx?('±'+r.mx+' place'+(r.mx>1?'s':'')):'no movement'}</b></div><div class="bar"><div style="width:${Math.max(2,Math.round(r.mx/mxAll*100))}%;background:${r.mx===0?'#166f4d':r.mx<=1?'#7a6200':'#b45309'}"></div></div></div>`).join('');
  const verdict=robust.length?`<b style="color:#166f4d">Robust under ±25% weight stress:</b> ${robust.map(t=>esc(t)).join(' · ')} — ${robust.length===top5.length?'the whole top 5 holds whichever single weight is stressed':'these never leave the top 5'}.`:`<b style="color:#b45309">No issue holds the top 5 under every ±25% weight stress</b> — treat this ranking as weight-sensitive.`;
  return `<div class="card" style="margin-top:13px"><div class="h3">Ranking sensitivity</div><div class="cap">Each criterion's weight stressed ±25% one at a time (weights renormalise automatically); bars show the largest rank move any current top-5 issue makes.</div>${bars}<div class="note" style="margin-top:8px">${verdict}</div></div>`;}

/* S5 · auto-drafted issue register for systems without one — derived client-side, saved by a facilitator */
function slugifyCode(s){return (''+s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);}
function sysIssueDrafts(){const dn={};DRIVERS.forEach(d=>dn[d[0]]=d[1]);
  const ids=new Set(sysTrusts().map(o=>o.id));
  const cand=rows.filter(r=>ids.has(r.organisation_id)&&!r.service_id&&(r.status==='near_failure'||r.status==='serious')&&r.driver&&dn[r.driver]).sort((a,b)=>b.distress-a.distress);
  const perDriver={},out=[];
  cand.forEach(r=>{if(out.length>=6)return;if((perDriver[r.driver]||0)>=2)return;perDriver[r.driver]=(perDriver[r.driver]||0)+1;
    const org=orgById[r.organisation_id]||{};
    out.push({driver:r.driver,driverName:dn[r.driver],severity:r.distress>=80?5:r.distress>=65?4:3,organisation_id:r.organisation_id,distress:r.distress,
      code:slugifyCode(r.driver+'-'+r.metric_code+'-'+(org.code||'')),
      title:`${dn[r.driver]}: ${r.metric_name} at ${fmt(r.value,r.unit)} (${trustShort(org.code)})`,
      statement:`${r.metric_name} at ${org.name||org.code||'trust'} stands at ${fmt(r.value,r.unit)}${r.standard!=null?` against a standard of ${fmt(r.standard,r.unit)}`:''}${r.nm_value!=null?` (national median ${fmt(r.nm_value,r.unit)})`:''}, scored ${r.distress}/100 (${slab(r.status)}${r.worsening===true?', deteriorating':''}). Auto-drafted from live published data — refine the framing in the workshop before adoption.`});});
  return out;}
function draftIssuesCard(){const ds=sysIssueDrafts();
  let h=`<div class="card" style="margin-bottom:13px"><div class="h3">Draft issue register (auto-generated) <span class="pill" style="background:#b45309;margin-left:7px;vertical-align:2px">auto-draft — not saved</span></div><div class="cap">${esc(system()?system().name:'This system')} has no issue register of its own yet. ${ds.length?'Up to six candidate issues drafted client-side from its trusts’ near-failure and serious signals, grouped by driver — severity follows distress.':'No near-failure or serious signals found for its acute trusts, so there is nothing to draft.'}</div>`;
  const byD={};ds.forEach(d=>{(byD[d.driver]=byD[d.driver]||[]).push(d);});
  Object.keys(byD).forEach(k=>{h+=`<div class="cap" style="margin:9px 0 3px;font-weight:700">${esc(byD[k][0].driverName)}</div><div class="list">`+byD[k].map(d=>`<div class="row" style="cursor:default"><span class="tag" style="background:${color(d.distress)}"></span><div class="m"><div class="t1">${esc(d.title)}</div><div class="t2">${esc(d.statement)}</div></div><span class="pill" style="background:#e8e5dc;color:#3c4354">sev ${d.severity}/5</span></div>`).join('')+`</div>`;});
  if(ds.length)h+=(isFacilitator()&&session)?`<div style="margin-top:10px"><button class="btn" id="sdbtn" onclick="saveDraftIssues()">Save drafts to register</button></div><div class="note" id="sdnote">Inserts into sr_issues (ai_seed, candidate) — the saved register then replaces this draft view.</div>`:`<div class="note" style="margin-top:8px">${session?'Only a facilitator can save drafts to the register.':'Sign in as facilitator to save these drafts to the register.'}</div>`;
  return h+`</div>`;}
async function saveDraftIssues(){if(!isFacilitator()||!session)return;const ds=sysIssueDrafts();if(!ds.length)return;
  const btn=document.getElementById('sdbtn'),note=document.getElementById('sdnote');if(btn)btn.disabled=true;
  const payload=ds.map(d=>({code:d.code,title:d.title,driver:d.driver,severity:d.severity,organisation_id:d.organisation_id,ai_seed:true,status:'candidate',problem_statement:d.statement,description:'Auto-drafted issue — pending workshop review.'}));
  const{error}=await sb.from('sr_issues').insert(payload);
  if(error){if(note)note.textContent='Not saved — '+(error.message||'insert blocked')+'.';if(btn)btn.disabled=false;return;}
  const{data}=await sb.from('sr_issues').select('*');issues=data||[];
  authMsg(ds.length+' draft issues saved to the register.');render();}
window.saveDraftIssues=saveDraftIssues;

/* ===== modals ===== */
function openIssue(code){const i=issues.find(x=>x.code===code);if(!i)return;const org=i.organisation_id?orgById[i.organisation_id]:null;hideTip();
  let h=`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>${esc(i.title)}</h2><div class="ms">${org?esc(org.name):'System-wide'} · ${esc((i.driver||'finance').replace(/_/g,' '))}${i.severity?` · severity ${i.severity}/5`:''}</div><div style="font-size:13px;color:var(--ink2);margin-bottom:13px">${esc(i.problem_statement||i.description||'')}</div><div class="cap">Appraisal scores (0–100)</div>`;
  criteria.forEach(c=>{const s=iscores.find(x=>x.issue_id===i.id&&x.criterion_code===c.code);const val=s?Math.round(s.score):0;h+=`<div style="margin-bottom:8px"><div class="slabel"><span>${esc(c.name)}</span><b>${val}</b></div><div class="bar"><div style="width:${val}%;background:#1f3a78"></div></div></div>`;});
  const seeded=SEEDED_ISSUES.includes(code);
  h+=`<div class="note" style="margin-top:4px">Score provenance: <b style="color:${seeded?'#7a6200':'#6a7183'}">${seeded?'Facilitator-seeded (2 Jul 2026) — pending workshop evidence':'Illustrative seed'}</b></div>`;
  const evs=(issueEvidence||[]).filter(x=>x.issue_id===i.id).map(x=>(evidenceItems||[]).find(e=>e.id===x.evidence_item_id)).filter(Boolean);
  if(evs.length)h+=`<div class="cap" style="margin-top:12px;margin-bottom:4px">Linked evidence</div>`+evs.map(e=>`<div style="font-size:12.5px;padding:5px 0;border-bottom:1px solid var(--line2)">${e.source_url?`<a href="${e.source_url}" target="_blank" rel="noopener">${esc(e.title)}</a>`:esc(e.title)}<span class="muted" style="font-size:11px"> · ${esc((e.evidence_type||'evidence').replace(/_/g,' '))}${e.confidence?' · '+esc(e.confidence):''}</span></div>`).join('');
  h+=`<div class="cap" style="margin-top:12px;margin-bottom:4px">Traceability · issue → option → tests</div><div id="tracechain" class="note" style="margin:0">Checking linked options…</div>`;
  h+=`</div></div>`;document.getElementById('modalroot').innerHTML=h;
  /* S4 · walk the registered chain: issue → promoted-draft issue_ids → option → derived criteria strengths → statutory test status */
  ensureOptions().then(OC=>{const el=document.getElementById('tracechain');if(!el)return;
    const linked=(OC.options||[]).filter(o=>{const d=(OC.drafts||[]).find(x=>x.id===o.source_draft_id||x.promoted_option_id===o.id);return d&&(d.issue_ids||[]).includes(i.id);});
    if(!linked.length){el.textContent='No options trace to this issue yet — the current longlist was generated from the two register issues carrying the elective-recovery and financial-sustainability cases.';return;}
    el.innerHTML=linked.map(o=>{const cs2=criteria.map(c=>({c,v:optCrit(o,c.code)})).filter(x=>x.v!=null);const hi=cs2.length?cs2.reduce((a,b)=>b.v>a.v?b:a):null,lo=cs2.length?cs2.reduce((a,b)=>b.v<a.v?b:a):null;const ts=(OC.tests||[]).filter(t=>t.option_id===o.id);const met=ts.filter(t=>['met','passed'].includes(t.status)).length,red=ts.filter(t=>['high_risk','unmet'].includes(t.status)).length;
      return `<div style="padding:5px 0;border-bottom:1px solid var(--line2)"><a href="#" style="font-weight:600" onclick="openOption('${o.id}');return false">${esc(optShort(o.title))}</a><div class="muted" style="font-size:11px">registered link (promoted AI draft carries this issue) → strongest ${hi?esc(hi.c.name)+' ('+hi.v+')':'—'} · weakest ${lo?esc(lo.c.name)+' ('+lo.v+')':'—'} → statutory tests ${met}/${ts.length} met${red?' · '+red+' high-risk':''}</div></div>`;}).join('');});}
window.openIssue=openIssue;
async function openFactDrill(domain,orgId,specCode,metric){const f=await ensure(domain);const ser=f.filter(x=>x.organisation_id===orgId&&x.specialty_code===specCode&&x.metric_code===metric).sort((a,b)=>a.period<b.period?-1:1);const o=orgById[orgId];const unit=ser[0]?ser[0].unit:'';
  document.getElementById('modalroot').innerHTML=`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>${esc(specName(specCode))}</h2><div class="ms">${esc(o?o.name:'')} · ${metric==='rtt_18wk'?'RTT 18-week %':metric==='rtt_incomplete'?'Waiting list':'52-week breaches'}</div><div class="chartbox" style="height:200px"><canvas id="fd"></canvas></div><div class="kv"><span class="k">Latest</span><b>${ser.length?fmt(Number(ser[ser.length-1].value),unit):'—'}</b></div><div class="prov">Source: ${esc(ser.length&&ser[ser.length-1].source?ser[ser.length-1].source:'modelled pending ingestion')} · confidence: <b style="color:${ser.length&&ser[ser.length-1].confidence==='actual'?'#166f4d':'#7a6200'}">${esc(ser.length?(ser[ser.length-1].confidence||'modelled'):'modelled')}</b> · ${ser.length} months</div></div></div>`;
  lineChart('fd',ser.map(x=>fmtPeriod(x.period)),[{data:ser.map(x=>Number(x.value)),borderColor:'#1f3a78',backgroundColor:'rgba(31,58,120,.1)',fill:true,tension:.3,pointRadius:0,borderWidth:2}]);
}
window.openFactDrill=openFactDrill;
/* D3 · DM01 diagnostic waits by test type */
async function openTestDrill(orgId){hideTip();const o=orgById[orgId]||{};
  const shell=inner=>`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>Diagnostic waits by test</h2><div class="ms">${esc(o.name||'')} · DM01 · % of waiting list at 6+ weeks</div>${inner}</div></div>`;
  document.getElementById('modalroot').innerHTML=shell('<div class="loading">Loading test-level series…</div>');
  const f=await ensure('performance');
  const fr=f.filter(x=>x.organisation_id===orgId&&x.metric_code==='dm01_6wk_test_pct');
  if(!fr.length){document.getElementById('modalroot').innerHTML=shell('<div class="note">Test-level series loads with full ingestion for this trust.</div>');return;}
  const lp=latestPeriod(fr);
  const latest=fr.filter(x=>x.period===lp).map(x=>({name:x.line_code,v:Number(x.value)})).sort((a,b)=>b.v-a.v);
  const tcol=v=>v>15?'#b3261e':v>5?'#b45309':'#166f4d';
  const bars=latest.map(t=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="width:168px;flex:none;font-size:11px;color:var(--ink2);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(t.name)}">${esc(t.name)}</span><div class="bar" style="flex:1"><div style="width:${Math.min(100,t.v*2.5)}%;background:${tcol(t.v)}"></div></div><b class="mono" style="font-size:11px;width:46px;flex:none;text-align:right;color:${tcol(t.v)}">${fmt(t.v,'pct')}</b></div>`).join('');
  const worst=latest.slice(0,3);const periods=[...new Set(fr.map(x=>x.period))].sort().slice(-24);
  const l0=fr.find(x=>x.period===lp)||{};
  document.getElementById('modalroot').innerHTML=shell(`<div class="cap">Latest ${fmtPeriod(lp)} · standard: under 5% waiting 6+ weeks</div>${bars}<div class="cap" style="margin-top:13px;margin-bottom:4px">Worst three tests · 24-month trend</div><div class="chartbox" style="height:170px"><canvas id="testtrend"></canvas></div><div class="prov">Source: ${esc(l0.source||'NHS England DM01')} · confidence: <b style="color:${l0.confidence==='actual'||l0.confidence==='official'?'#166f4d':'#7a6200'}">${esc(l0.confidence||'actual')}</b> · <a href="#" onclick="openDrill('${orgId}','dm01_6wk');return false">open headline metric →</a></div>`);
  lineChart('testtrend',periods.map(p=>fmtPeriod(p)),worst.map((t,i)=>({label:t.name,data:periods.map(p=>{const r2=fr.find(x=>x.period===p&&x.line_code===t.name);return r2?Number(r2.value):null;}),borderColor:['#b3261e','#b45309','#1f3a78'][i],backgroundColor:'transparent',tension:.3,pointRadius:0,borderWidth:2})),{plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:9,font:{size:9},color:'#6a7183'}}}});
}
window.openTestDrill=openTestDrill;
/* D4 · Cancer 62-day performance by tumour group */
async function openTumourDrill(orgId){hideTip();const o=orgById[orgId]||{};
  const shell=inner=>`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>Cancer 62-day by tumour group</h2><div class="ms">${esc(o.name||'')} · % treated within 62 days of urgent referral</div>${inner}</div></div>`;
  document.getElementById('modalroot').innerHTML=shell('<div class="loading">Loading tumour-level series…</div>');
  const f=await ensure('performance');
  const fr=f.filter(x=>x.organisation_id===orgId&&x.metric_code==='cancer_62_tumour_pct');
  if(!fr.length){document.getElementById('modalroot').innerHTML=shell('<div class="note">Tumour-level series loads with full ingestion for this system.</div>');return;}
  const lp=latestPeriod(fr);
  const latest=fr.filter(x=>x.period===lp).map(x=>({name:x.line_code,v:Number(x.value)})).sort((a,b)=>a.v-b.v);
  const ccol=v=>v>=85?'#166f4d':v>=70?'#b45309':'#b3261e';
  const bars=latest.map(t=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="width:168px;flex:none;font-size:11px;color:var(--ink2);text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(t.name)}">${esc(t.name)}</span><div class="bar" style="flex:1"><div style="width:${Math.min(100,Math.max(0,t.v))}%;background:${ccol(t.v)}"></div></div><b class="mono" style="font-size:11px;width:46px;flex:none;text-align:right;color:${ccol(t.v)}">${fmt(t.v,'pct')}</b></div>`).join('');
  const worst=latest.slice(0,3);const periods=[...new Set(fr.map(x=>x.period))].sort().slice(-24);
  const l0=fr.find(x=>x.period===lp)||{};
  document.getElementById('modalroot').innerHTML=shell(`<div class="cap">Latest ${fmtPeriod(lp)} · standard 85% · lowest first</div>${bars}<div class="cap" style="margin-top:13px;margin-bottom:4px">Weakest three tumour groups · 24-month trend</div><div class="chartbox" style="height:170px"><canvas id="tumtrend"></canvas></div><div class="prov">Source: ${esc(l0.source||'NHS England cancer waiting times')} · confidence: <b style="color:${l0.confidence==='actual'||l0.confidence==='official'?'#166f4d':'#7a6200'}">${esc(l0.confidence||'actual')}</b> · <a href="#" onclick="openDrill('${orgId}','cancer_62');return false">open headline metric →</a></div>`);
  lineChart('tumtrend',periods.map(p=>fmtPeriod(p)),worst.map((t,i)=>({label:t.name,data:periods.map(p=>{const r2=fr.find(x=>x.period===p&&x.line_code===t.name);return r2?Number(r2.value):null;}),borderColor:['#b3261e','#b45309','#1f3a78'][i],backgroundColor:'transparent',tension:.3,pointRadius:0,borderWidth:2})),{plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:9,font:{size:9},color:'#6a7183'}}}});
}
window.openTumourDrill=openTumourDrill;
/* A6 · fragility composite method note (mirrors scripts/serving/build_fragility_composite.py) */
function openFragilityInfo(){hideTip();document.getElementById('modalroot').innerHTML=`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>How fragility is scored</h2><div class="ms">Service fragility composite v1 · 0–100, higher = more fragile · confidence: derived</div>
<table class="dt"><thead><tr><th>Component</th><th class="num">Weight</th><th>Scaling to 0–100</th></tr></thead><tbody>
<tr><td>G&amp;A bed occupancy</td><td class="num">0.20</td><td>88% → 98%</td></tr>
<tr><td>DM01 diagnostic 6-week breaches</td><td class="num">0.15</td><td>0% → 25%</td></tr>
<tr><td>CQC overall rating (inverted)</td><td class="num">0.20</td><td>Outstanding 0 · Good 33 · Requires improvement 67 · Inadequate 100</td></tr>
<tr><td>SHMI (banded)</td><td class="num">0.15</td><td>0.90 → 1.10</td></tr>
<tr><td>Sickness absence</td><td class="num">0.15</td><td>3.5% → 6.5%</td></tr>
<tr><td>Low-volume RTT specialty share</td><td class="num">0.15</td><td>share of specialties under 500 pathways (flagship trusts only this wave)</td></tr>
</tbody></table>
<div class="note" style="margin-top:10px">Weights are renormalised over the components available for each trust (at least three required). This is a <b style="color:#7a6200">derived</b> score, not a published statistic — challengeable by trusts through the normal challenge route on the fragility drill.</div></div></div>`;}
window.openFragilityInfo=openFragilityInfo;
/* A8 · distress method note + facilitator criticality editor (sr_metrics.criticality) */
let critEdit={};
function openDistressInfo(){hideTip();
  const codes=[...new Set([].concat.apply([],Object.values(DRIVER_METRICS)))];
  critEdit={};
  codes.forEach(c=>{const r=rows.find(x=>x.metric_code===c);if(r){const v=r.criticality!=null?Number(r.criticality):3;critEdit[c]={name:r.metric_name,cur:v,orig:v};}});
  renderDistressInfo('');
}
function renderDistressInfo(msg){const fac=isFacilitator()&&!!session;
  const critRows=Object.keys(critEdit).map(c=>{const e=critEdit[c];return `<tr><td style="font-size:12px">${esc(e.name)}</td><td class="num">${fac?`<button class="btn ghost" style="padding:1px 9px;font-size:13px" onclick="adjCrit('${c}',-1)">−</button> <b style="display:inline-block;min-width:16px;text-align:center">${e.cur}</b> <button class="btn ghost" style="padding:1px 9px;font-size:13px" onclick="adjCrit('${c}',1)">+</button>`:`<b>${e.cur}</b>`}${e.cur!==e.orig?` <span class="pill" style="background:#b45309;font-size:9px;padding:2px 6px;vertical-align:2px">edited</span>`:''}</td></tr>`;}).join('');
  document.getElementById('modalroot').innerHTML=`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>How distress is scored</h2><div class="ms">Distress index v1 · 0–100 per metric, higher = further from standard · confidence: derived</div>
<table class="dt"><thead><tr><th>Component</th><th class="num">Contribution</th></tr></thead><tbody>
<tr><td>Position vs standard (or national median where no standard exists) — relative shortfall, capped at 100%</td><td class="num">× 60</td></tr>
<tr><td>Deteriorating against the previous period</td><td class="num">+ 15</td></tr>
<tr><td>Criticality adjustment (criticality − 3)</td><td class="num">× 8</td></tr>
</tbody></table>
<div class="note" style="margin:8px 0 0">distress = clamp(0–100, position×60 + worsening×15 + (criticality−3)×8). <b>Near-failure</b> requires all three of: standard breached, deteriorating, and criticality ≥ 4; serious / watch / stable then follow the score. Scored in the serving database (sr_v_metric_status), so every figure in the app carries the same rule.</div>
<div class="cap" style="margin-top:14px;margin-bottom:4px">Criticality by driver metric (1 = peripheral · 5 = critical to the review)</div>
${fac?`<div class="note" style="margin:0 0 6px">Facilitator mode — adjust and save. Saving re-scores distress for every organisation nationally.</div>`:`<div class="note" style="margin:0 0 6px">Read-only — criticality is set by the review facilitator${session?'':' (sign in as facilitator to edit)'}.</div>`}
<div style="max-height:250px;overflow-y:auto"><table class="dt"><thead><tr><th>Metric</th><th class="num">Criticality</th></tr></thead><tbody>${critRows}</tbody></table></div>
${fac?`<div style="margin-top:10px"><button class="btn" id="critsave" onclick="saveCriticality()">Save &amp; re-score</button></div>`:''}
<div class="note" id="critnote" style="margin-top:7px">${msg||''}</div></div></div>`;
}
function adjCrit(c,d){const e=critEdit[c];if(!e)return;e.cur=Math.max(1,Math.min(5,e.cur+d));renderDistressInfo('');}
async function saveCriticality(){if(!isFacilitator()||!session)return;
  const changed=Object.keys(critEdit).filter(c=>critEdit[c].cur!==critEdit[c].orig);
  if(!changed.length){renderDistressInfo('Nothing changed.');return;}
  const btn=document.getElementById('critsave');if(btn)btn.disabled=true;
  for(const c of changed){const{error}=await sb.from('sr_metrics').update({criticality:critEdit[c].cur}).eq('code',c);
    if(error){renderDistressInfo('Not saved — '+(error.message||'update blocked')+'.');return;}
    critEdit[c].orig=critEdit[c].cur;}
  const{data,error:rerr}=await sb.from('sr_v_metric_status').select('*').limit(20000);
  if(!rerr&&data)rows=data;
  closeDrill();render();authMsg('Criticality saved — distress re-scored across the system.');}
window.openDistressInfo=openDistressInfo;window.adjCrit=adjCrit;window.saveCriticality=saveCriticality;
async function openDrill(orgId,code){drill={orgId,code};showSourceValue=false;
  /* Explorer opens drills on any English trust: series for non-system orgs is fetched lazily (cached). */
  const r0=rows.find(x=>x.organisation_id===orgId&&x.metric_code===code);
  if(r0&&!seriesFor(orgId,r0.metric_id).length&&!xSeriesCache[orgId]){try{await xFetchOrgSeries(orgId)}catch(e){console.warn('drill series fetch failed',e);}}
  redrawDrill();}
function drillSeries(r){let ser=seriesFor(drill.orgId,r.metric_id);if(!ser.length&&xSeriesCache[drill.orgId])ser=xSeriesCache[drill.orgId][r.metric_id]||[];if(drill.code==='shmi')ser=ser.filter(x=>x.confidence==='official');return ser;} /* A6/D7 · SHMI: official points only (stale ×100 modelled rows ignored) */
function redrawDrill(){if(!drill)return;renderMetricModal();const r=rows.find(x=>x.organisation_id===drill.orgId&&x.metric_code===drill.code);if(!r)return;const ser=drillSeries(r);if(charts.trendchart){try{charts.trendchart.destroy()}catch(e){}delete charts.trendchart;}
  const vals=ser.map(d=>Number(d.value));const sp=spc(vals,r.higher_is_better!==false);
  const guide=(v,dash)=>({data:ser.map(()=>v),borderColor:'#9aa0af',borderDash:dash,pointRadius:0,borderWidth:1,backgroundColor:'transparent'});
  lineChart('trendchart',ser.map(d=>fmtPeriod(d.period)),[
    {data:vals,borderColor:'#1f3a78',backgroundColor:'rgba(31,58,120,.1)',fill:true,tension:.3,pointRadius:ser.length<=2?3:0,borderWidth:2},
    r.standard!=null?{data:ser.map(()=>r.standard),borderColor:'#9aa0af',borderDash:[5,4],pointRadius:0,borderWidth:1.2,backgroundColor:'transparent'}:null,
    sp&&sp.sd>0?guide(sp.mean,[2,3]):null,
    sp&&sp.sd>0?guide(sp.mean+3*sp.sd,[1,3]):null,
    sp&&sp.sd>0?guide(sp.mean-3*sp.sd,[1,3]):null].filter(Boolean));}
function toggleSourceValue(){showSourceValue=!showSourceValue;redrawDrill();}
window.openDrill=openDrill;window.toggleSourceValue=toggleSourceValue;
function closeDrill(){drill=null;['trendchart','fd','testtrend','tumtrend','optfin'].forEach(k=>{if(charts[k]){try{charts[k].destroy()}catch(e){}delete charts[k];}});document.getElementById('modalroot').innerHTML='';}
window.closeDrill=closeDrill;
function renderMetricModal(){if(!drill)return;const r=rows.find(x=>x.organisation_id===drill.orgId&&x.metric_code===drill.code);if(!r){document.getElementById('modalroot').innerHTML='';return;}const o=orgById[drill.orgId],selOrg=orgById[sel];const canCh=selOrg.type==='acute_trust'&&selOrg.id===drill.orgId;const trend=r.prev_value==null?'no prior period':r.worsening===true?'deteriorating':r.worsening===false?'improving':'stable';const ovs=overrides.filter(x=>x.metric_value_id===r.metric_value_id);
  /* U2/A3 · peer-family + national quartile benchmarks, latest period at or before the metric period */
  const fam=(TRUSTMETA[o.code]||{}).peer||null;
  const bLatest=(type,famv)=>{const c=bench.filter(b=>b.metric_id===r.metric_id&&b.type===type&&(famv?b.peer_family===famv:b.peer_family==null)&&(!r.period||(b.period&&b.period<=r.period)));return c.length?c.reduce((m,x)=>x.period>m.period?x:m):null;};
  const pmed=fam?bLatest('peer_median',fam):null,q25=bLatest('peer_p25',null),q75=bLatest('peer_p75',null);
  /* U4 · adjusted challenge display */
  const adj=adjustedOverride(r.metric_value_id);const showAdj=adj&&!showSourceValue;
  /* A4 · SPC verdict on the plotted series · U6 · national strip · D12 · freshness */
  const spSer=drillSeries(r);const sp=spc(spSer.map(x=>Number(x.value)),r.higher_is_better!==false);
  const spCol=sp?(sp.verdict.indexOf('deterioration')>=0?'#b45309':sp.verdict.indexOf('improvement')>=0?'#166f4d':'#6a7183'):'#9aa0af';
  const spChip=sp?`<span class="pill" style="background:${spCol};margin-left:7px;vertical-align:1px">${esc(sp.verdict)}</span>`:'';
  const spNote=`<div class="note" style="margin:2px 0 0">SPC: ${sp?esc(sp.detail):'insufficient series for SPC (fewer than 8 points)'}</div>`;
  const strip=o.type==='acute_trust'?distStrip(r.metric_code,[drill.orgId],fam):'';
  const fresh=freshFor(r);
  document.getElementById('modalroot').innerHTML=`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>${esc(r.metric_name)}</h2><div class="ms">${esc(o.name)} · ${esc(r.domain)}</div><div style="margin:4px 0 10px"><span class="pill" style="background:${color(r.distress)}">${slab(r.status)} · ${r.distress}/100</span>${adj?`<span class="pill" style="background:#b45309;margin-left:6px">adjusted</span>`:''}</div><div class="chartbox" style="height:155px"><canvas id="trendchart"></canvas></div>
    <div class="kv"><span class="k">${adj?(showAdj?'Adjusted value':'Source value'):'Latest value'}</span><b${showAdj?' style="color:#b45309"':''}>${fmt(showAdj?adj.proposed_value:r.value,r.unit)}</b></div>
    ${adj?`<div class="note" style="margin:3px 0 0">${showAdj?`Adjusted following an accepted challenge · <a href="#" onclick="toggleSourceValue();return false">adjusted — view source value</a>`:`Published source value shown · <a href="#" onclick="toggleSourceValue();return false">view adjusted value</a>`}</div>`:''}
    <div class="kv"><span class="k">Standard</span><b>${r.standard!=null?fmt(r.standard,r.unit):'—'}</b></div><div class="kv"><span class="k">National median</span><b>${r.nm_value!=null?fmt(r.nm_value,r.unit):'—'}</b></div>
    ${pmed?`<div class="kv"><span class="k">Peer median (${esc(fam.replace('|',' · '))})</span><b>${fmt(pmed.value,r.unit)}</b></div>`:''}
    ${(q25&&q75)?`<div class="kv"><span class="k">National quartiles (p25–p75)</span><b>${fmt(q25.value,r.unit)} – ${fmt(q75.value,r.unit)}</b></div>`:''}
    <div class="kv"><span class="k">Trend</span><b>${trend}${spChip}</b></div>${spNote}
    ${strip?`<div style="margin-top:11px"><div class="cap" style="margin-bottom:2px">All English acute trusts · latest published${fam?` · peers (${esc(fam.replace('|',' · '))}) darker`:''}</div>${strip}</div>`:''}
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn ghost" style="font-size:11.5px;padding:6px 12px" onclick="xGoMetric('${r.metric_code}')">All trusts on this metric →</button>${o.type==='acute_trust'?`<button class="btn ghost" style="font-size:11.5px;padding:6px 12px" onclick="xGoOrg('${drill.orgId}')">Everything on ${esc(trustShort(o.code)||o.code||'this trust')} →</button>`:''}</div>
    <div class="prov">Source: ${r.source_url?`<a href="${r.source_url}" target="_blank" rel="noopener">${esc(r.source||'source')}</a>`:esc(r.source||'illustrative (modelled)')} · confidence: <b style="color:${r.confidence==='official'?'#166f4d':'#7a6200'}">${esc(r.confidence||'modelled')}</b> · ${r.period}${fresh&&fresh.loaded_at?` · loaded ${new Date(fresh.loaded_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`:''}</div>
    ${ovs.map(x=>{const st=x.state||'challenged';const stCol=st==='adjusted'?'#b45309':st==='dismissed'?'#6a7183':'#1f3a78';return `<div class="ovr">Challenge: ${x.proposed_value!=null?x.proposed_value:'(no value)'} — ${esc(x.rationale)} <span class="pill" style="background:${stCol};margin-left:5px">${esc(st)}</span>${isFacilitator()&&st==='challenged'?`<div style="margin-top:7px"><button class="btn" style="font-size:11px;padding:5px 11px" onclick="setOverrideState('${x.id}','adjusted')">Accept as adjusted</button> <button class="btn ghost" style="font-size:11px;padding:5px 11px" onclick="setOverrideState('${x.id}','dismissed')">Dismiss</button></div>`:''}</div>`;}).join('')}
    <div style="margin-top:13px;border-top:1px solid var(--line2);padding-top:12px"><div class="h3" style="font-size:13px">Challenge this figure</div>${canCh?`<input class="field" id="cval" type="number" placeholder="Proposed value (optional)"/><textarea class="field" id="cwhy" rows="2" placeholder="Rationale (required)"></textarea><div style="margin-top:8px"><button class="btn" id="cbtn" onclick="submitChallenge()">Submit challenge</button></div><div class="note" id="chnote">${session?'':'Sign in to challenge — public data stays open to read.'}</div>`:`<div class="note">Only ${esc(o.name)} can challenge its own data — switch “Viewing as”.</div>`}</div></div></div>`;}
async function submitChallenge(){
  /* U3 · writes require a session (anon INSERT revoked in E2) */
  if(!session){const n=document.getElementById('chnote');if(n)n.textContent='Sign in to challenge — public data stays open to read.';return;}
  const why=document.getElementById('cwhy').value.trim();if(!why)return;const cv=document.getElementById('cval').value;document.getElementById('cbtn').disabled=true;const r=rows.find(x=>x.organisation_id===drill.orgId&&x.metric_code===drill.code);
  const{error:cerr}=await sb.from('sr_overrides').insert({metric_value_id:r.metric_value_id,author_org_id:sel,proposed_value:cv===''?null:Number(cv),rationale:why,state:'challenged'});
  if(cerr){const n=document.getElementById('chnote');if(n)n.textContent='Challenge not saved — '+(cerr.message||'insert blocked')+'.';const b=document.getElementById('cbtn');if(b)b.disabled=false;return;}
  const{data}=await sb.from('sr_overrides').select('*');overrides=data||[];redrawDrill();}
window.submitChallenge=submitChallenge;
/* U4 · facilitator adjudication of challenges. U3: requires a signed-in facilitator session
   (email on FACILITATOR_EMAILS); the ?facilitator URL flag alone no longer grants this. */
async function setOverrideState(id,state){if(!isFacilitator()||!session)return;
  const{error}=await sb.from('sr_overrides').update({state}).eq('id',id);
  if(error){console.warn('override update failed',error);authMsg('Adjudication failed — '+(error.message||'update blocked'));return;}
  const{data}=await sb.from('sr_overrides').select('*');overrides=data||[];redrawDrill();}
window.setOverrideState=setOverrideState;
/* ===== U9 · first-visit guided tour (localStorage flag sr_tour_done; never under automation) ===== */
const TOUR_STEPS=[
 {sel:'#syssel',t:'Choose your system',b:'Every ICB in England is here — pick yours and the whole app re-cuts. The flagship system carries the full dataset; headline performance, benchmarking and the strategic map run live everywhere.'},
 {sel:'.mapwrap',t:'The strategic map',b:'Population need, service distress, NHS sites, CQC-rated care and GP practices in one picture. Use the chips on the map to switch basis, need metric and layers; click a site or neighbourhood to interrogate it.'},
 {sel:'#nav button[data-stage="drivers"]',side:true,t:'Priority drivers',b:'The four pressures driving the review — service fragility, urgent & emergency care, elective backlog and cancer — benchmarked against every English trust. Click any figure to drill to trend, standard and source.'},
 {sel:'#nav button[data-stage="decide"]',side:true,t:'Decision journey',b:'Orient → Diagnose → Prioritise → Options → Commit: a governed journey from evidence to a defensible weighted decision, with workshop voting, saved lenses and board packs.'},
 {sel:'#authui',t:'Challenge anything',b:'Every figure carries its source and confidence tag — nothing is a black box. Trusts can challenge their own data and facilitators adjudicate: sign in to challenge or vote; reading stays open to all.'},
 {sel:'#nav button[data-stage="xentity"]',side:true,t:'Or skip the story',b:'Or ignore our story entirely — the Explorer is uncurated: any metric, any English acute trust. Trust-by-trust, metric-by-metric across England, plus a raw extract grid with source and confidence on every value.'}];
let tourIdx=-1;
function maybeStartTour(){try{if(navigator.webdriver)return;if(!window.localStorage)return;if(localStorage.getItem('sr_tour_done'))return;}catch(e){return;}startTour();}
function startTour(){if(stage!=='overview')setStage('overview');tourIdx=0;drawTour();}
function endTour(){tourIdx=-1;try{localStorage.setItem('sr_tour_done','1')}catch(e){}const r=document.getElementById('tourroot');if(r)r.innerHTML='';if(innerWidth<=920)toggleSide(false);}
function tourNext(){if(tourIdx>=TOUR_STEPS.length-1){endTour();return;}tourIdx++;drawTour();}
function tourBack(){if(tourIdx>0){tourIdx--;drawTour();}}
function drawTour(){const r=document.getElementById('tourroot');if(!r||tourIdx<0)return;const s=TOUR_STEPS[tourIdx];
  if(s.side&&innerWidth<=920&&!document.querySelector('.side.open')){toggleSide(true);setTimeout(drawTour,260);return;}
  let t=null;try{t=s.sel?document.querySelector(s.sel):null;}catch(e){}
  if(t)try{t.scrollIntoView({block:'center',behavior:'auto'})}catch(e){}
  let hl='',pos='top:50%;left:50%;transform:translate(-50%,-50%)';
  if(t){const b=t.getBoundingClientRect();
    if(b.width>0){hl=`<div class="tour-hl" style="top:${Math.max(0,b.top-5)}px;left:${Math.max(0,b.left-5)}px;width:${Math.min(innerWidth-8,b.width+10)}px;height:${b.height+10}px"></div>`;
      const W=Math.min(350,innerWidth-28);const x=Math.min(Math.max(12,b.left),Math.max(12,innerWidth-W-12));let y=b.bottom+14;
      if(y+250>innerHeight)y=Math.max(12,b.top-260);
      pos=`top:${y}px;left:${x}px`;}}
  r.innerHTML=`<div class="tour-scrim" onclick="endTour()"></div>${hl}<div class="card tour-pop" role="dialog" aria-modal="true" aria-label="Guided tour — step ${tourIdx+1} of ${TOUR_STEPS.length}" tabindex="-1" style="${pos}"><div class="stepno">Step ${tourIdx+1} of ${TOUR_STEPS.length}</div><div class="h3">${esc(s.t)}</div><p>${esc(s.b)}</p><div style="display:flex;gap:8px;align-items:center"><button class="btn" onclick="tourNext()" aria-label="${tourIdx>=TOUR_STEPS.length-1?'Finish the tour':'Next step'}">${tourIdx>=TOUR_STEPS.length-1?'Finish':'Next'}</button>${tourIdx>0?`<button class="btn ghost" onclick="tourBack()" aria-label="Previous step">Back</button>`:''}<a href="#" style="margin-left:auto;font-size:12px" onclick="endTour();return false" aria-label="Skip the tour">Skip tour</a></div></div>`;
  const p=r.querySelector('.tour-pop');if(p)try{p.focus({preventScroll:true})}catch(e){}}
window.startTour=startTour;window.endTour=endTour;window.tourNext=tourNext;window.tourBack=tourBack;window.maybeStartTour=maybeStartTour;
/* ===== U9 · glossary & standards ===== */
const GLOSSARY=[
 ['RTT 18-week standard','Referral-to-treatment: 92% of patients should wait no more than 18 weeks from referral to the start of consultant-led treatment.'],
 ['A&E 4-hour standard','95% of A&E attendances should be admitted, transferred or discharged within 4 hours of arrival (current national interim ambition 78%).'],
 ['Cancer 62-day standard','85% of patients should start their first treatment within 62 days of an urgent suspected-cancer referral.'],
 ['Faster Diagnosis Standard (FDS)','75% of people urgently referred should have cancer confirmed or ruled out within 28 days.'],
 ['DM01 6-week diagnostic standard','The share of the diagnostic waiting list (15 key tests) waiting 6+ weeks — the operating standard is under 5%, with a 1% ambition.'],
 ['G&A bed occupancy 92%','General & acute beds: occupancy above 92% is associated with rising harm, long A&E waits and lost flow — treated here as the safe operating ceiling.'],
 ['SHMI','Summary Hospital-level Mortality Indicator: observed deaths vs expected (1.0 = as expected). “Higher than expected” is a trigger for review, not a verdict.'],
 ['Core20','The most deprived 20% of neighbourhoods in England (by IMD) — the focus of NHS England’s Core20PLUS5 health-inequalities approach.'],
 ['IMD','Index of Multiple Deprivation: England’s official small-area deprivation measure, shown as deciles (1 = most deprived 10%).'],
 ['Distress index','This tool’s derived 0–100 score per metric: distance from standard benchmarked against every English trust, weighted for trend — higher = further from standard. Method published in-app; challengeable.'],
 ['Near-failure','The strongest flag: a metric breaching its standard badly and still deteriorating (distress 70+).'],
 ['SPC special cause','Statistical process control: a run-chart rule fires (a point beyond mean±3σ, 7+ points one side of the mean, or 6+ consecutive rises/falls), meaning the change is signal rather than noise.'],
 ['Fragility composite','A derived 0–100 score of how close a service runs to the edge, combining occupancy, diagnostics, workforce, mortality and finance signals — components and weights published in-app.'],
 ['Confidence tags','official = published national statistic · actual = published operational data · derived = computed here from published inputs (method shown) · modelled = illustrative estimate pending ingestion. Every figure is labelled.'],
 ['Explorer','Three uncurated surfaces over the full serving catalogue — Trust explorer (everything held on one trust), Metric explorer (every English acute trust ranked on one metric) and the Extract grid (raw org × period × metric extract). Catalogue-driven, so newly ingested metrics appear automatically; every value keeps its source and confidence.']];
function openGlossary(){document.getElementById('modalroot').innerHTML=`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" style="max-width:640px" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>Glossary &amp; standards</h2><div class="ms">Plain-English definitions of the standards and scores used across this tool</div>`+
  GLOSSARY.map(g=>`<div style="padding:8px 0;border-bottom:1px solid var(--line2)"><b style="font-size:13px">${esc(g[0])}</b><div style="font-size:12.5px;color:var(--ink2);margin-top:2px">${esc(g[1])}</div></div>`).join('')+`</div></div>`;}
window.openGlossary=openGlossary;
/* ===== Wiring · sidebar data-QA badge (sr_qa_results, latest run, anon-readable) ===== */
let qaLatest=[];
async function loadQaBadge(){const el=document.getElementById('qabadge');if(!el)return;
  try{const{data,error}=await sb.from('sr_qa_results').select('run_at,check_key,status,detail').order('run_at',{ascending:false}).limit(500);if(error)throw error;
    const qr=data||[];if(!qr.length){el.innerHTML='';return;}
    const latest=qr[0].run_at;qaLatest=qr.filter(x=>x.run_at===latest);
    const n=s=>qaLatest.filter(x=>x.status===s).length;const ok=n('ok'),warn=n('warn'),fail=n('fail');
    const col=fail?'var(--red)':warn?'var(--amber)':'var(--green)';
    el.innerHTML=`<a href="#" onclick="openQaModal();return false" aria-label="Open the data quality checks from the latest run" style="color:${col};font-weight:700">Data QA: ${ok} ok / ${warn} warn / ${fail} fail</a>`;}
  catch(e){console.warn('qa badge failed',e);el.innerHTML='';}}
function openQaModal(){const bad=qaLatest.filter(x=>x.status!=='ok');
  document.getElementById('modalroot').innerHTML=`<div class="overlay" onclick="closeDrill()"><div class="modal" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><button class="x" onclick="closeDrill()" aria-label="Close dialog">×</button><h2>Data QA — latest run</h2><div class="ms">${qaLatest.length} automated checks on the serving database${qaLatest[0]?` · run ${new Date(qaLatest[0].run_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:''}</div>`+
  (bad.length?bad.map(x=>`<div style="padding:7px 0;border-bottom:1px solid var(--line2)"><b style="color:${x.status==='fail'?'var(--red)':'var(--amber)'};text-transform:uppercase;font-size:10px;letter-spacing:.5px">${esc(x.status)}</b> <b style="font-size:12px">${esc(x.check_key)}</b><div style="font-size:12px;color:var(--ink2)">${esc(x.detail||'')}</div></div>`).join(''):`<div class="ovr">All ${qaLatest.length} checks passed — source freshness and row-count deviation within tolerance.</div>`)+
  `<div class="note">Checks cover source freshness against expected cadence and row-count deviation vs the stored baseline · sr_qa_results (reads open).</div></div></div>`;}
window.openQaModal=openQaModal;
/* ===== U10 · one Escape handler (tour → modal → mobile drawer) + focus modals on open ===== */
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;
  if(tourIdx>=0){endTour();return;}
  if(document.querySelector('#modalroot .overlay')){closeDrill();return;}
  if(document.querySelector('.side.open'))toggleSide(false);});
try{new MutationObserver(()=>{const m=document.querySelector('#modalroot .modal');
  if(m&&m.getAttribute('data-focused')!=='1'){m.setAttribute('data-focused','1');m.setAttribute('tabindex','-1');try{m.focus({preventScroll:true})}catch(e){}}
}).observe(document.getElementById('modalroot'),{childList:true});}catch(e){}

/* ===== EXPLORER · three uncurated surfaces over the full serving catalogue =====
   xentity (Trust explorer) · xmetric (Metric explorer) · xgrid (Extract grid).
   Catalogue-driven: sr_v_metric_catalog / sr_v_fact_catalog decide what is on offer, so
   newly ingested metrics and line-level splits appear automatically. Fetches are lazy per
   stage and cached (per trust / per metric·trust / catalogue once); extracts paginate
   PostgREST at 1,000 rows and cap at 20,000 values. */
let xSelOrg=null,xSelMetric=null,xQ='',xDom=null,xOvl=null,xSelSplit='',xShowAllRank=false;
let xCatalog=null,xFactCat=null,xSeriesCache={},xMSeries={},xSplitData={};
let xgSel=[],xgScope='system',xgOrgs=[],xgQ='',xgOrgQ='',xgFrom='',xgTo='',xgData=null,xgCapped=false,xgBusy=false;
/* Status-metric code → sr_fact line-split code where the loader stores splits under a sibling code. */
const XSPLIT_MAP={dm01_6wk:'dm01_6wk_test_pct',cancer_62:'cancer_62_tumour_pct',bed_occupancy:'beds_specialty_occupied',beds_ga_occupied:'beds_specialty_occupied',beds_ga_available:'beds_specialty_occupied'};
function escAttr(s){return esc(s).replace(/"/g,'&quot;');}
function sysTrustIds(){return TRUSTS.map(c=>(orgs.find(o=>o.code===c)||{}).id).filter(Boolean);}
async function xEnsureCatalog(){if(xCatalog&&xFactCat)return;
  const [c,f]=await Promise.all([sb.from('sr_v_metric_catalog').select('*').order('name').limit(2000),sb.from('sr_v_fact_catalog').select('*').limit(2000)]);
  if(c.error)throw c.error;
  xCatalog=c.data||[];xFactCat={};((f&&f.data)||[]).forEach(x=>{xFactCat[x.metric_code]=x;});}
function xSplitCode(code){const fc=XSPLIT_MAP[code]||code;const f=xFactCat&&xFactCat[fc];return (f&&Number(f.split_count)>0)?fc:null;}
function xSplitInfo(code){const fc=xSplitCode(code);return fc?xFactCat[fc]:null;}
async function xFetchOrgSeries(orgId){if(xSeriesCache[orgId])return xSeriesCache[orgId];const m={};
  if(sysOrgs().some(o=>o.id===orgId)&&Object.keys(series).length){Object.keys(series).forEach(k=>{const i=k.indexOf('|');if(k.slice(0,i)===orgId)m[k.slice(i+1)]=series[k];});}
  else{const{data,error}=await sb.from('sr_metric_values').select('metric_id,period,value,confidence').is('service_id',null).eq('organisation_id',orgId).limit(20000);
    if(error)throw error;
    (data||[]).forEach(x=>{(m[x.metric_id]=m[x.metric_id]||[]).push(x);});Object.values(m).forEach(a=>a.sort((p,q)=>p.period<q.period?-1:1));}
  xSeriesCache[orgId]=m;return m;}
function xSer(orgId,r){let s=(xSeriesCache[orgId]||{})[r.metric_id]||[];if(r.metric_code==='shmi'){const off=s.filter(x=>x.confidence==='official');if(off.length)s=off;}return s;}
async function xFetchSplits(orgId,factCode){const k=orgId+'|'+factCode;if(xSplitData[k])return xSplitData[k];
  const{data}=await sb.from('sr_fact').select('line_code,period,value,unit,source,confidence').eq('organisation_id',orgId).eq('metric_code',factCode).not('line_code','is',null).limit(20000);
  const a=data||[];a.sort((p,q)=>p.period<q.period?-1:1);xSplitData[k]=a;return a;}
function xGoMetric(code){xSelMetric=code;xSelSplit='';xShowAllRank=false;closeDrill();setStage('xmetric');}
function xGoOrg(orgId){xSelOrg=orgId;closeDrill();setStage('xentity');}
window.xGoMetric=xGoMetric;window.xGoOrg=xGoOrg;

/* --- Trust explorer (xentity): everything we hold on any English acute trust --- */
function xSetOrg(id){xSelOrg=id;render();}
window.xSetOrg=xSetOrg;
async function renderXEntity(v){
  v.innerHTML='<div class="loading">Loading the trust explorer…</div>';
  try{await xEnsureCatalog();}catch(e){console.warn('catalogue failed',e);v.innerHTML='<div class="banner">The metric catalogue could not be loaded (network). <a href="#" onclick="location.reload();return false">Retry</a></div>';return;}
  const acute=orgs.filter(o=>o.type==='acute_trust');
  if(!xSelOrg||!orgById[xSelOrg]){const ids=sysTrustIds();xSelOrg=ids[0]||(acute[0]||{}).id;}
  try{await xFetchOrgSeries(xSelOrg);}catch(e){console.warn('org series fetch failed',e);xSeriesCache[xSelOrg]=xSeriesCache[xSelOrg]||{};}
  if(stage!=='xentity')return;
  const o=orgById[xSelOrg]||{},meta=TRUSTMETA[o.code]||{},sysm=SYSTEMS.find(s=>s.slug===meta.icb);
  const cq=CQC[o.code],dd=distByCode[o.code]||distByOrg[xSelOrg];
  const orows=rows.filter(r=>r.organisation_id===xSelOrg&&!r.service_id&&r.value!=null);
  const frag=orows.find(r=>r.metric_code==='fragility_index');
  const bySys={};acute.forEach(t=>{const s=SYSTEMS.find(x=>x.slug===(TRUSTMETA[t.code]||{}).icb);const rg=s?s.region:'other';(bySys[rg]=bySys[rg]||[]).push(t);});
  const cur=TRUSTS.map(c=>acute.find(t=>t.code===c)).filter(Boolean);
  const opt=t=>`<option value="${t.id}" ${t.id===xSelOrg?'selected':''}>${esc(t.name)}</option>`;
  const selHtml=`<select class="sel" id="xorgsel" aria-label="Select any English acute trust" onchange="xSetOrg(this.value)"><optgroup label="Current system · ${escAttr((system()||{}).name||'')}">`+cur.map(opt).join('')+`</optgroup>`+Object.keys(bySys).sort().map(rg=>`<optgroup label="${escAttr(rg.replace(/-/g,' '))}">`+bySys[rg].slice().sort((a,b)=>a.name<b.name?-1:1).map(opt).join('')+`</optgroup>`).join('')+`</select>`;
  let h=`<h1 class="serif">Trust explorer</h1><div class="lead">Every published metric we hold, for any English acute trust — uncurated, benchmarked, source-tagged. Expand a row for the full series, line-level splits and the drill.</div>`;
  h+=`<div class="filters">Trust ${selHtml}</div>`;
  h+=`<div class="card" style="margin-bottom:4px"><div style="display:flex;gap:16px;flex-wrap:wrap;align-items:baseline;justify-content:space-between"><div><div class="h3" style="font-size:18px">${esc(o.name||'')}</div><div class="cap" style="margin-bottom:0">${esc(o.code||'')}${meta.type?' · '+esc(meta.type):''}${sysm?' · '+esc(sysm.name)+' · '+esc((sysm.region||'').replace(/-/g,' ')):''}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">${cq&&cq[0]?`<span class="pill" style="background:${/inadequate/i.test(cq[0])?'#b3261e':/requires/i.test(cq[0])?'#b45309':/outstanding/i.test(cq[0])?'#166f4d':'#44639f'}">CQC · ${esc(cq[0])}</span>`:''}${frag?`<span class="pill" style="background:${color(frag.distress)}">fragility ${fmt(frag.value,'score')}/100</span>`:''}${dd?`<span class="pill" style="background:${color(dd.distress_index)}">distress ${dd.distress_index}/100 · ${dd.near_failure_count||0} near-failure</span>`:''}<span class="pill" style="background:#6a7183">${orows.length} metrics</span></div></div></div>`;
  const extra=[...new Set(orows.map(r=>r.domain))].filter(d=>!DOMAINS.some(x=>x[0]===d)).sort();
  const doms=DOMAINS.concat(extra.map(d=>[d,(d||'other').replace(/_/g,' ')])).filter(d=>orows.some(r=>r.domain===d[0]));
  doms.forEach(dm=>{const rs=orows.filter(r=>r.domain===dm[0]).sort((a,b)=>(b.distress||0)-(a.distress||0));
    h+=`<div class="eyebrow">${esc(dm[1])} · ${rs.length} ${rs.length===1?'metric':'metrics'}</div><div class="card" style="padding:4px 0;overflow-x:auto;position:relative"><a class="csvlink" href="#" onclick="xeCsv('${dm[0]}','${esc(o.code||'trust')}-${dm[0]}-${new Date().toISOString().slice(0,10)}.csv');return false">CSV</a><table class="dt" id="xetbl_${dm[0]}"><thead><tr><th>Metric</th><th class="num">Latest</th><th class="num">vs standard</th><th class="num">vs nat. median</th><th style="width:112px">Trend · last 12</th><th>SPC</th><th></th></tr></thead><tbody>`;
    rs.forEach((r,i)=>{const rid=dm[0]+'_'+i;const ser=xSer(xSelOrg,r);const sp=spc(ser.map(x=>Number(x.value)),r.higher_is_better!==false);
      const spCol=sp?(sp.verdict.indexOf('deterioration')>=0?'#b45309':sp.verdict.indexOf('improvement')>=0?'#166f4d':'#6a7183'):null;
      const goodCol=dv=>dv==null?'#9aa0af':dv===0?'#6a7183':((dv>0)===(r.higher_is_better!==false)?'#166f4d':'#b3261e');
      const dfmt=dv=>dv==null?'—':(dv>0?'+':dv<0?'−':'')+fmt(Math.abs(dv),r.unit);
      const dstd=(r.standard!=null&&r.value!=null)?Number(r.value)-Number(r.standard):null;
      const dnm=(r.nm_value!=null&&r.value!=null)?Number(r.value)-Number(r.nm_value):null;
      const split=xSplitInfo(r.metric_code);
      h+=`<tr style="cursor:pointer" onclick="xToggleRow('${rid}','${r.metric_code}')"><td>${esc(r.metric_name)}${split?` <span class="pill" style="background:#44639f;font-size:8.5px;padding:2px 6px;vertical-align:2px" title="${split.split_count} line-level splits held in sr_fact">splits available</span>`:''}</td><td class="num" style="font-weight:600;color:${color(r.distress)}">${fmt(r.value,r.unit)}</td><td class="num" style="color:${goodCol(dstd)}">${dfmt(dstd)}</td><td class="num" style="color:${goodCol(dnm)}">${dfmt(dnm)}</td><td>${ser.length>1?`<div style="height:24px">${spark(ser.slice(-12),'#1f3a78')}</div>`:'<span class="muted" style="font-size:10px">—</span>'}</td><td>${sp?`<span class="pill" style="background:${spCol}">${esc(sp.verdict.replace('special-cause ','').replace(' variation',''))}</span>`:'<span class="muted" style="font-size:10px">—</span>'}</td><td class="num muted" id="xch_${rid}" style="font-size:11px">▸</td></tr>`;
      h+=`<tr class="xex" id="xe_${rid}" style="display:none"><td colspan="7" style="background:var(--surface2);padding:12px 14px"><div class="cap" style="margin-bottom:6px">${fmtPeriod(r.period)} · ${esc(r.source||'source pending')} · confidence ${esc(r.confidence||'—')} · <a href="#" onclick="event.stopPropagation();openDrill('${xSelOrg}','${r.metric_code}');return false">Open drill →</a></div><div class="chartbox sm"><canvas id="xec_${rid}"></canvas></div><div id="xesp_${rid}"></div></td></tr>`;});
    h+=`</tbody></table></div>`;});
  h+=`<div class="note" style="margin-top:14px">Latest positions from sr_v_metric_status; the trust's full series is fetched once and cached. Every figure keeps its source and confidence — the drill adds benchmarks, SPC detail and provenance.</div>`;
  v.innerHTML=h;
}
async function xToggleRow(rid,code){const tr=document.getElementById('xe_'+rid);if(!tr)return;const open=tr.style.display==='none';
  tr.style.display=open?'':'none';const ch=document.getElementById('xch_'+rid);if(ch)ch.textContent=open?'▾':'▸';
  if(!open)return;
  const r=rows.find(x=>x.organisation_id===xSelOrg&&x.metric_code===code&&!x.service_id);if(!r)return;
  if(tr.dataset.drawn!=='1'){tr.dataset.drawn='1';const ser=xSer(xSelOrg,r);
    if(ser.length>1)lineChart('xec_'+rid,ser.map(x=>fmtPeriod(x.period)),[{data:ser.map(x=>Number(x.value)),borderColor:'#1f3a78',backgroundColor:'rgba(31,58,120,.1)',fill:true,tension:.3,pointRadius:0,borderWidth:2},r.standard!=null?{data:ser.map(()=>Number(r.standard)),borderColor:'#9aa0af',borderDash:[5,4],pointRadius:0,borderWidth:1.2,backgroundColor:'transparent'}:null].filter(Boolean));
    else{const cb=document.getElementById('xec_'+rid);if(cb&&cb.parentElement)cb.parentElement.innerHTML='<div class="note">A single published point — nothing to chart yet.</div>';}}
  const fc=xSplitCode(code),spEl=document.getElementById('xesp_'+rid);
  if(fc&&spEl&&spEl.dataset.done!=='1'){spEl.dataset.done='1';spEl.innerHTML='<div class="note">Loading line-level splits…</div>';
    try{const f=await xFetchSplits(xSelOrg,fc);
      const latest={};f.forEach(x=>{if(!latest[x.line_code]||x.period>latest[x.line_code].period)latest[x.line_code]=x;});
      const ls=Object.values(latest).sort((a,b)=>Number(b.value)-Number(a.value));
      spEl.innerHTML=ls.length?`<div class="cap" style="margin:10px 0 4px">Line-level splits (${esc(fc)}) · latest value per line · sr_fact</div><table class="dt"><thead><tr><th>Line</th><th class="num">Latest</th><th class="num">Period</th></tr></thead><tbody>`+ls.map(x=>`<tr><td>${esc((''+x.line_code).replace(/_/g,' '))}</td><td class="num">${fmt(x.value,x.unit)}</td><td class="num">${fmtPeriod(x.period)}</td></tr>`).join('')+`</tbody></table>`:`<div class="note">No line-level splits held for this trust on this metric.</div>`;
    }catch(e){spEl.dataset.done='';spEl.innerHTML='<div class="note">Splits could not be loaded (network).</div>';}}}
window.xToggleRow=xToggleRow;
function xeCsv(dom,fname){const t=document.getElementById('xetbl_'+dom);if(!t)return;
  const csv=[...t.querySelectorAll('tr')].filter(x=>!x.classList.contains('xex')).map(x=>[...x.children].slice(0,4).map(c=>{let s=(c.innerText||c.textContent||'').replace(/\s+/g,' ').trim();return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n');
  const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent('﻿'+csv);a.download=fname;document.body.appendChild(a);a.click();a.remove();}
window.xeCsv=xeCsv;

/* --- Metric explorer (xmetric): every English acute trust on one catalogue metric --- */
function xmCovLine(c){return `${c.org_count} trusts · ${fmtPeriod(c.first_period)} → ${fmtPeriod(c.latest_period)} · ${Number(c.obs_count).toLocaleString()} obs`;}
function xmList(){const q=(xQ||'').toLowerCase();
  let l=xCatalog.filter(c=>(!xDom||c.domain===xDom)&&(!q||((c.name||'')+' '+(c.code||'')).toLowerCase().indexOf(q)>=0));
  if(q)l=l.slice().sort((a,b)=>(b.org_count-a.org_count)||((a.name||'')<(b.name||'')?-1:1));
  return l;}
function xmRenderList(){const el=document.getElementById('xmlist');if(!el)return;const l=xmList();
  el.innerHTML=(l.length?l.slice(0,150).map(c=>`<div class="row" onclick="xSelectMetric('${c.code}')" style="${c.code===xSelMetric?'background:var(--surface2)':''}"><span class="tag" style="background:${c.code===xSelMetric?'#191f2b':'#dcd9d0'}"></span><div class="m"><div class="t1">${esc(c.name)}</div><div class="t2">${esc(c.code)} · ${esc(c.domain||'—')} · ${xmCovLine(c)}</div><div class="t2">${esc(c.latest_source||'')}${c.confidences?' · '+esc(c.confidences):''}</div></div></div>`).join('')+(l.length>150?`<div class="note" style="padding:8px 14px">${l.length-150} more — narrow the search.</div>`:''):'<div class="note" style="padding:10px 14px">No metrics match.</div>');}
function xSelectMetric(code){xSelMetric=code;xSelSplit='';xShowAllRank=false;render();}
function xSetDom(d){xDom=xDom===d?null:d;render();}
function xToggleOvl(id){if(!xOvl)xOvl=[];const i=xOvl.indexOf(id);if(i>=0)xOvl.splice(i,1);else{if(xOvl.length>=6){authMsg('Up to 6 trusts on the overlay — untick one first.');render();return;}xOvl.push(id);}render();}
function xSetSplit(s){xSelSplit=s;render();}
function xToggleRankAll(){xShowAllRank=!xShowAllRank;render();}
window.xSelectMetric=xSelectMetric;window.xSetDom=xSetDom;window.xToggleOvl=xToggleOvl;window.xSetSplit=xSetSplit;window.xToggleRankAll=xToggleRankAll;
async function xmFetchOverlay(mid,ids){const need=ids.filter(id=>!xMSeries[mid+'|'+id]);
  if(need.length){const{data,error}=await sb.from('sr_metric_values').select('organisation_id,period,value').eq('metric_id',mid).is('service_id',null).in('organisation_id',need).limit(20000);
    if(error)throw error;
    need.forEach(id=>{xMSeries[mid+'|'+id]=[];});(data||[]).forEach(x=>{(xMSeries[mid+'|'+x.organisation_id]||(xMSeries[mid+'|'+x.organisation_id]=[])).push(x);});
    need.forEach(id=>{xMSeries[mid+'|'+id].sort((a,b)=>a.period<b.period?-1:1);});}
  const out={};ids.forEach(id=>{out[id]=xMSeries[mid+'|'+id]||[];});return out;}
async function renderXMetric(v){
  v.innerHTML='<div class="loading">Loading the metric catalogue…</div>';
  try{await xEnsureCatalog();}catch(e){console.warn('catalogue failed',e);v.innerHTML='<div class="banner">The metric catalogue could not be loaded (network). <a href="#" onclick="location.reload();return false">Retry</a></div>';return;}
  if(stage!=='xmetric')return;
  if(!xOvl)xOvl=sysTrustIds().slice(0,6);
  const doms=[...new Set(xCatalog.map(c=>c.domain).filter(Boolean))].sort();
  const cat=xSelMetric?xCatalog.find(c=>c.code===xSelMetric):null;
  const anyRow=xSelMetric?rows.find(r=>r.metric_code===xSelMetric&&!r.service_id):null;
  let h=`<h1 class="serif">Metric explorer</h1><div class="lead">The full serving catalogue — ${xCatalog.length} metrics, uncurated. Search, pick one, and see every English acute trust ranked on it, the national distribution and overlay trends.</div>`;
  h+=`<div class="xgrid2">`;
  h+=`<div><input class="field" id="xmq" style="margin:0 0 8px" placeholder="Search ${xCatalog.length} metrics — name or code" value="${escAttr(xQ)}" oninput="xQ=this.value;xmRenderList()" aria-label="Search metrics"/>`;
  h+=`<div class="chips" style="margin-bottom:8px">`+doms.map(d=>`<button class="chip ${xDom===d?'on':''}" onclick="xSetDom('${d}')" aria-pressed="${xDom===d?'true':'false'}">${esc(d.replace(/_/g,' '))}</button>`).join('')+`</div>`;
  h+=`<div class="list" id="xmlist" style="max-height:560px;overflow:auto"></div></div>`;
  let mid=null,unit='',name='';
  if(!xSelMetric){h+=`<div class="card"><div class="h3">Pick a metric</div><div class="cap">Everything in the catalogue is fair game — coverage, source and confidence shown per metric. Selecting one ranks every English acute trust that holds it.</div></div>`;}
  else{
    name=cat?cat.name:(anyRow?anyRow.metric_name:xSelMetric);
    unit=cat?cat.unit:(anyRow?anyRow.unit:'');
    mid=cat?cat.metric_id:(anyRow?anyRow.metric_id:null);
    const hib=cat?cat.higher_is_better!==false:(anyRow?anyRow.higher_is_better!==false:true);
    const std=cat?cat.standard:(anyRow?anyRow.standard:null);
    let rr=rows.filter(r=>r.metric_code===xSelMetric&&r.org_type==='acute_trust'&&!r.service_id&&r.value!=null);
    rr.sort((a,b)=>hib?(Number(b.value)-Number(a.value)):(Number(a.value)-Number(b.value)));
    const ids=sysTrustIds();
    const shown=xShowAllRank?rr:rr.slice(0,30);
    const spl=xSplitInfo(xSelMetric);
    h+=`<div>`;
    h+=`<div class="card" style="margin-bottom:14px"><div class="h3">${esc(name)}</div><div class="cap">${esc(xSelMetric)}${cat?' · '+esc(cat.domain||'')+' · '+xmCovLine(cat):''}${std!=null?' · standard '+fmt(std,unit):''}${(cat&&cat.latest_source)||(anyRow&&anyRow.source)?' · '+esc((cat&&cat.latest_source)||anyRow.source):''}</div>`+
      (rr.length>=10?`<div class="cap" style="margin:2px 0 2px">All English acute trusts · latest published · current system's trusts marked as diamonds</div>${distStrip(xSelMetric,ids)}`:'')+`</div>`;
    h+=`<div class="card" style="padding:4px 0;overflow-x:auto;position:relative;margin-bottom:14px"><a class="csvlink" href="#" onclick="csvTable('xmrank','${xSelMetric}-england-${new Date().toISOString().slice(0,10)}.csv');return false">CSV</a><table class="dt" id="xmrank"><thead><tr><th style="width:34px">#</th><th>Overlay · trust</th><th class="num">Latest</th><th>Status</th><th class="num">Period</th></tr></thead><tbody>`;
    shown.forEach((r,i)=>{const on=xOvl.indexOf(r.organisation_id)>=0;
      h+=`<tr><td class="num muted">${i+1}</td><td><label style="display:inline-flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" ${on?'checked':''} onchange="xToggleOvl('${r.organisation_id}')" aria-label="Overlay ${escAttr(trustShort(r.org_code)||r.org_code||'')}"/> <span onclick="event.preventDefault();openDrill('${r.organisation_id}','${xSelMetric}')">${esc(trustShort(r.org_code)||r.org_code||'')}</span>${ids.indexOf(r.organisation_id)>=0?' <span class="pill" style="background:#191f2b;font-size:8.5px;padding:2px 6px;vertical-align:1px">system</span>':''}</label></td><td class="num" style="font-weight:600;color:${color(r.distress)}">${fmt(r.value,r.unit)}</td><td style="font-size:11.5px;color:${color(r.distress)}">${esc(slab(r.status))}</td><td class="num muted">${fmtPeriod(r.period)}</td></tr>`;});
    h+=`</tbody></table>${rr.length>30?`<div style="padding:8px 14px;font-size:12px"><a href="#" onclick="xToggleRankAll();return false">${xShowAllRank?'Show the top 30':'Show all '+rr.length+' trusts'}</a></div>`:''}${rr.length?'':'<div class="note" style="padding:10px 14px">No latest-status rows held for this metric.</div>'}</div>`;
    h+=`<div class="card"><div class="h3">Overlay · up to 6 trusts</div><div class="cap">Tick trusts in the ranked table · national median dashed where published${spl?` · ${spl.split_count} line-level splits available`:''}</div>${spl?`<div class="filters">Split <select class="sel" id="xmsplit" onchange="xSetSplit(this.value)" aria-label="Choose a line-level split"><option value="">Headline series</option></select></div>`:''}<div class="chartbox"><canvas id="xmchart"></canvas></div><div class="note" id="xmnote"></div></div>`;
    h+=`</div>`;
  }
  h+=`</div>`;
  v.innerHTML=h;xmRenderList();
  if(!xSelMetric||!mid)return;
  const ids6=(xOvl||[]).slice(0,6);
  const leg={plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:9,font:{size:9},color:'#6a7183'}}}};
  try{
    const fc=xSplitCode(xSelMetric);
    if(fc){const packs=await Promise.all(ids6.map(id=>xFetchSplits(id,fc)));
      if(stage!=='xmetric')return;
      const all=[].concat(...packs);const lcs=[...new Set(all.map(x=>x.line_code))].sort();
      const selEl=document.getElementById('xmsplit');
      if(selEl)selEl.innerHTML=`<option value="">Headline series</option>`+lcs.map(l=>`<option value="${escAttr(l)}" ${l===xSelSplit?'selected':''}>${esc((''+l).replace(/_/g,' '))}</option>`).join('');
      if(xSelSplit&&lcs.indexOf(xSelSplit)>=0){
        const per=[...new Set(all.filter(x=>x.line_code===xSelSplit).map(x=>x.period))].sort().slice(-48);
        const ds=ids6.map((id,i)=>{const by={};(xSplitData[id+'|'+fc]||[]).filter(x=>x.line_code===xSelSplit).forEach(x=>{by[x.period]=Number(x.value);});return{label:trustShort((orgById[id]||{}).code)||'?',data:per.map(p=>by[p]!=null?by[p]:null),borderColor:PALETTE[i%PALETTE.length],backgroundColor:'transparent',tension:.3,pointRadius:0,borderWidth:2,spanGaps:true};});
        if(per.length){lineChart('xmchart',per.map(fmtPeriod),ds,leg);const nEl=document.getElementById('xmnote');if(nEl)nEl.textContent='Line-level split from sr_fact ('+fc+') · '+xSelSplit.replace(/_/g,' ')+' · trusts without this split simply show no line.';return;}
        const nEl=document.getElementById('xmnote');if(nEl)nEl.textContent='No values for that split among the ticked trusts.';return;}}
    const sers=await xmFetchOverlay(mid,ids6);
    if(stage!=='xmetric')return;
    const per=[...new Set([].concat(...ids6.map(id=>sers[id].map(x=>x.period))))].sort().slice(-48);
    const ds=ids6.map((id,i)=>{const by={};sers[id].forEach(x=>{by[x.period]=Number(x.value);});return{label:trustShort((orgById[id]||{}).code)||'?',data:per.map(p=>by[p]!=null?by[p]:null),borderColor:PALETTE[i%PALETTE.length],backgroundColor:'transparent',tension:.3,pointRadius:0,borderWidth:2,spanGaps:true};});
    const nm=benchSeries(mid,'national_median');
    if(nm.length){const by={};nm.forEach(x=>{by[x.period]=Number(x.value);});ds.push({label:'National median',data:per.map(p=>by[p]!=null?by[p]:null),borderColor:'#9aa0af',borderDash:[5,4],pointRadius:0,borderWidth:1.5,backgroundColor:'transparent',spanGaps:true});}
    if(per.length)lineChart('xmchart',per.map(fmtPeriod),ds,leg);
    else{const nEl=document.getElementById('xmnote');if(nEl)nEl.textContent='No series held for the ticked trusts on this metric.';}
  }catch(e){console.warn('overlay failed',e);const nEl=document.getElementById('xmnote');if(nEl)nEl.textContent='Overlay series could not be loaded (network).';}
}

/* --- Extract grid (xgrid): raw org × period × metric extract, reproducible --- */
function xgMonth(y,m){y+=Math.floor((m-1)/12);m=((m-1)%12+12)%12+1;return y+'-'+String(m).padStart(2,'0');}
function xgNext(ym){const p=(ym||'').split('-').map(Number);if(!p[0]||!p[1])return ym;return xgMonth(p[0],p[1]+1)+'-01';}
function xgToggleMetric(code){const i=xgSel.indexOf(code);if(i>=0)xgSel.splice(i,1);else{if(xgSel.length>=12){authMsg('Up to 12 metrics per extract.');xgRenderMetricList();return;}xgSel.push(code);}
  /* no list re-render on a plain toggle — replacing the checkbox mid-interaction loses focus/state */
  const c=document.getElementById('xgcount');if(c)c.textContent=xgSel.length+' of 12 selected';}
function xgRenderMetricList(){const el=document.getElementById('xgmlist');if(!el)return;const q=(xgQ||'').toLowerCase();
  let l=xCatalog.filter(c=>!q||((c.name||'')+' '+(c.code||'')).toLowerCase().indexOf(q)>=0);
  if(q)l=l.slice().sort((a,b)=>(b.org_count-a.org_count)||((a.name||'')<(b.name||'')?-1:1));
  el.innerHTML=l.slice(0,120).map(c=>`<label class="row" style="cursor:pointer"><input type="checkbox" ${xgSel.indexOf(c.code)>=0?'checked':''} onchange="xgToggleMetric('${c.code}')" aria-label="${escAttr(c.name)}"/><div class="m"><div class="t1" style="font-weight:500;font-size:12.5px">${esc(c.name)}</div><div class="t2">${esc(c.code)} · ${c.org_count} trusts · ${fmtPeriod(c.first_period)} → ${fmtPeriod(c.latest_period)}</div></div></label>`).join('')||'<div class="note" style="padding:10px 14px">No metrics match.</div>';}
function xgSetScope(s){xgScope=s;render();}
function xgToggleOrg(id){const i=xgOrgs.indexOf(id);if(i>=0)xgOrgs.splice(i,1);else{if(xgOrgs.length>=20){authMsg('Up to 20 trusts in a custom scope.');xgRenderOrgList();return;}xgOrgs.push(id);}
  const c=document.getElementById('xgocount');if(c)c.textContent=xgOrgs.length+' of 20 selected';}
function xgRenderOrgList(){const el=document.getElementById('xgolist');if(!el)return;const q=(xgOrgQ||'').toLowerCase();
  const l=orgs.filter(o=>o.type==='acute_trust'&&(!q||((o.name||'')+' '+(o.code||'')).toLowerCase().indexOf(q)>=0)).slice().sort((a,b)=>a.name<b.name?-1:1);
  el.innerHTML=l.slice(0,80).map(o=>`<label class="row" style="cursor:pointer"><input type="checkbox" ${xgOrgs.indexOf(o.id)>=0?'checked':''} onchange="xgToggleOrg('${o.id}')" aria-label="${escAttr(o.name)}"/><div class="m"><div class="t1" style="font-weight:500;font-size:12.5px">${esc(o.name)}</div><div class="t2">${esc(o.code)}</div></div></label>`).join('');
  const c=document.getElementById('xgocount');if(c)c.textContent=xgOrgs.length+' of 20 selected';}
window.xgToggleMetric=xgToggleMetric;window.xgSetScope=xgSetScope;window.xgToggleOrg=xgToggleOrg;
function xgScopeIds(){return xgScope==='system'?sysTrustIds():xgScope==='custom'?xgOrgs.slice():orgs.filter(o=>o.type==='acute_trust').map(o=>o.id);}
async function xgRun(){if(xgBusy)return;
  const mids=xgSel.map(c=>(xCatalog.find(x=>x.code===c)||{}).metric_id).filter(Boolean);
  if(!mids.length){authMsg('Pick at least one metric first.');return;}
  const oids=xgScopeIds();
  if(!oids.length){authMsg('Pick at least one trust first.');return;}
  if(!xgFrom||!xgTo||xgFrom>xgTo){authMsg('Set a valid period range first.');return;}
  xgBusy=true;xgCapped=false;const out=[];const st=document.getElementById('xgstatus');const btn=document.getElementById('xgrun');if(btn)btn.disabled=true;
  try{for(let off=0;off<20000;off+=1000){
    if(st)st.textContent='Fetching… '+out.length.toLocaleString()+' values so far';
    const{data,error}=await sb.from('sr_metric_values').select('organisation_id,metric_id,period,value,source,confidence').is('service_id',null).in('metric_id',mids).in('organisation_id',oids).gte('period',xgFrom+'-01').lt('period',xgNext(xgTo)).order('period',{ascending:true}).order('organisation_id',{ascending:true}).order('metric_id',{ascending:true}).range(off,off+999);
    if(error)throw error;const page=data||[];for(const r of page)out.push(r);
    if(page.length<1000)break;
    if(off+1000>=20000)xgCapped=true;}
    xgData=out;
  }catch(e){console.warn('extract failed',e);xgBusy=false;if(btn)btn.disabled=false;if(st)st.textContent='Extract failed — '+(e.message||'network')+'. Try a narrower selection.';return;}
  xgBusy=false;render();}
function xgCsv(){if(!xgData||!xgData.length)return;const codeBy={},nameBy={},unitBy={};xCatalog.forEach(c=>{codeBy[c.metric_id]=c.code;nameBy[c.metric_id]=c.name;unitBy[c.metric_id]=c.unit;});
  const q=s=>{s=(s==null?'':''+s);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const lines=['org_code,organisation,metric_code,metric,period,value,unit,source,confidence'];
  xgData.forEach(r=>{const o=orgById[r.organisation_id]||{};lines.push([o.code||'',q(o.name),codeBy[r.metric_id]||r.metric_id,q(nameBy[r.metric_id]),r.period,r.value,unitBy[r.metric_id]||'',q(r.source),r.confidence||''].join(','));});
  const blob=new Blob(['﻿'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sr-extract-'+new Date().toISOString().slice(0,10)+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{try{URL.revokeObjectURL(a.href);a.remove();}catch(e){}},500);}
function xgCopyDef(){const def={source:'sr_metric_values',service_id:null,metrics:xgSel.slice(),organisations:xgScopeIds().map(id=>(orgById[id]||{}).code||id),scope:xgScope,period_gte:xgFrom+'-01',period_lt:xgNext(xgTo),order:'period,organisation_id,metric_id',cap:20000,rows_returned:xgData?xgData.length:null,capped:xgCapped,generated:new Date().toISOString()};
  const s=JSON.stringify(def,null,1);
  try{navigator.clipboard.writeText(s).then(()=>authMsg('Query definition copied to the clipboard.'),()=>prompt('Copy the query definition:',s));}catch(e){prompt('Copy the query definition:',s);}}
window.xgRun=xgRun;window.xgCsv=xgCsv;window.xgCopyDef=xgCopyDef;
async function renderXGrid(v){
  v.innerHTML='<div class="loading">Loading the extract builder…</div>';
  try{await xEnsureCatalog();}catch(e){console.warn('catalogue failed',e);v.innerHTML='<div class="banner">The metric catalogue could not be loaded (network). <a href="#" onclick="location.reload();return false">Retry</a></div>';return;}
  if(stage!=='xgrid')return;
  if(!xgFrom){const d=new Date();xgTo=xgMonth(d.getFullYear(),d.getMonth()+1);xgFrom=xgMonth(d.getFullYear(),d.getMonth()+1-23);}
  let h=`<h1 class="serif">Extract grid</h1><div class="lead">Uncurated extract. Every value carries source and confidence in the CSV. Pick up to 12 metrics, a trust scope and a period range — no story, no curation, reproducible via the query definition.</div>`;
  h+=`<div class="xgrid2">`;
  h+=`<div><div class="eyebrow" style="margin-top:0">Metrics · <span id="xgcount">${xgSel.length} of 12 selected</span></div>`;
  h+=`<input class="field" id="xgq" style="margin:0 0 8px" placeholder="Search the catalogue" value="${escAttr(xgQ)}" oninput="xgQ=this.value;xgRenderMetricList()" aria-label="Search metrics for the extract"/>`;
  h+=`<div class="list" id="xgmlist" style="max-height:430px;overflow:auto"></div></div>`;
  h+=`<div><div class="eyebrow" style="margin-top:0">Scope &amp; period</div><div class="card">`;
  h+=`<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px">`+[['system','Current system trusts'],['england','All England acute trusts'],['custom','Custom picker (max 20)']].map(s=>`<label style="display:inline-flex;gap:6px;align-items:center;cursor:pointer"><input type="radio" name="xgscope" value="${s[0]}" ${xgScope===s[0]?'checked':''} onchange="xgSetScope('${s[0]}')"/>${s[1]}</label>`).join('')+`</div>`;
  if(xgScope==='custom')h+=`<div style="margin-top:10px"><input class="field" id="xgoq" style="margin:0 0 8px" placeholder="Search trusts" value="${escAttr(xgOrgQ)}" oninput="xgOrgQ=this.value;xgRenderOrgList()" aria-label="Search trusts for the extract"/><div class="list" id="xgolist" style="max-height:230px;overflow:auto"></div><div class="note"><span id="xgocount">${xgOrgs.length} of 20 selected</span></div></div>`;
  h+=`<div class="filters" style="margin:12px 0 0">From <input type="month" class="sel" id="xgfrom" value="${xgFrom}" onchange="xgFrom=this.value" aria-label="Extract period from"/> To <input type="month" class="sel" id="xgto" value="${xgTo}" onchange="xgTo=this.value" aria-label="Extract period to"/> <button class="btn" id="xgrun" onclick="xgRun()">Run extract</button></div>`;
  h+=`<div class="note" id="xgstatus">${xgData?xgData.length.toLocaleString()+' values fetched.':'Nothing run yet. Extracts read sr_metric_values live (service-level rows excluded), paginate at 1,000 and cap at 20,000 values.'}</div></div></div>`;
  h+=`</div>`;
  if(xgData&&xgData.length){
    const codeBy={},unitBy={};xCatalog.forEach(c=>{codeBy[c.metric_id]=c.code;unitBy[c.code]=c.unit;});
    const cols=xgSel.filter(c=>xgData.some(r=>codeBy[r.metric_id]===c));
    const piv={};xgData.forEach(r=>{const k=r.organisation_id+'|'+r.period;(piv[k]=piv[k]||{o:r.organisation_id,p:r.period,v:{}}).v[codeBy[r.metric_id]]=r.value;});
    const prows=Object.values(piv).sort((a,b)=>{const an=(orgById[a.o]||{}).name||'',bn=(orgById[b.o]||{}).name||'';return an<bn?-1:an>bn?1:(a.p<b.p?-1:1);});
    const MAXR=400;
    h+=`<div class="eyebrow">Extract · ${xgData.length.toLocaleString()} values · ${prows.length.toLocaleString()} org × period rows${xgCapped?' · capped':''}</div>`;
    if(xgCapped)h+=`<div class="banner">Capped at 20,000 values — narrow the metric, trust or period selection for a complete extract.</div>`;
    h+=`<div class="card" style="padding:4px 0;overflow-x:auto"><table class="dt" id="xgtable"><thead><tr><th>Trust</th><th class="num">Period</th>`+cols.map(c=>`<th class="num" title="${escAttr(c)}">${esc(c)}</th>`).join('')+`</tr></thead><tbody>`;
    prows.slice(0,MAXR).forEach(r=>{const o=orgById[r.o]||{};h+=`<tr><td>${esc(trustShort(o.code)||o.name||'')}</td><td class="num">${fmtPeriod(r.p)}</td>`+cols.map(c=>`<td class="num">${r.v[c]!=null?fmt(r.v[c],unitBy[c]):'—'}</td>`).join('')+`</tr>`;});
    h+=`</tbody></table>${prows.length>MAXR?`<div class="note" style="padding:8px 14px">First ${MAXR} of ${prows.length.toLocaleString()} pivot rows shown — the CSV carries everything.</div>`:''}</div>`;
    h+=`<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" id="xgcsv" onclick="xgCsv()">Download CSV — long format with source &amp; confidence</button><button class="btn ghost" id="xgcopy" onclick="xgCopyDef()">Copy query definition</button></div>`;
  }else if(xgData){h+=`<div class="banner" style="margin-top:14px">No values matched that selection — widen the period, scope or metric set.</div>`;}
  v.innerHTML=h;xgRenderMetricList();if(xgScope==='custom')xgRenderOrgList();
}

initAuth();
loadAll();
