// ── EASING ──
function easeOutExpo(t){return t===1?1:1-Math.pow(2,-10*t)}
function easeOutQuart(t){return 1-Math.pow(1-t,4)}

// ── COUNT UP ──
function countUp(el, duration=1400) {
  const target   = parseFloat(el.dataset.target);
  const divide   = parseFloat(el.dataset.divide||1);
  const decimals = parseInt(el.dataset.decimals||0);
  const prefix   = el.dataset.prefix||'';
  const suffix   = el.dataset.suffix||'';
  const start    = performance.now();
  function frame(now){
    const t = Math.min((now-start)/duration,1);
    const e = easeOutExpo(t);
    const val = (target/divide)*e;
    el.textContent = prefix + (decimals>0 ? val.toFixed(decimals) : Math.round(val)) + suffix;
    if(t<1) requestAnimationFrame(frame);
    else el.textContent = prefix + (decimals>0?(target/divide).toFixed(decimals):Math.round(target/divide)) + suffix;
  }
  requestAnimationFrame(frame);
}

// ── ANIMATE RING ──
function animateRing(svg, duration=1300){
  const pct  = parseFloat(svg.dataset.pct)/100;
  const circ = 2*Math.PI*34; // r=34
  const fg   = svg.querySelector('.ring-fg');
  const start= performance.now();
  function frame(now){
    const t = Math.min((now-start)/duration,1);
    const e = easeOutExpo(t);
    fg.style.strokeDashoffset = circ*(1-pct*e);
    if(t<1) requestAnimationFrame(frame);
    else fg.style.strokeDashoffset = circ*(1-pct);
  }
  requestAnimationFrame(frame);
}

// ── INTERACTIVE DONUT ──
let donutDone = false;
const SEGS = [
  {v:0.64, color:'#0047BB', hover:'#003a96', pct:'64%', lbl:'Fully Remote'},
  {v:0.26, color:'#93c5fd', hover:'#60a5fa', pct:'26%', lbl:'On-site'},
  {v:0.10, color:'#dbeafe', hover:'#bfdbfe', pct:'10%', lbl:'Hybrid'},
];
let activeSegIdx = 0;
let animProgress = 0; // 0→1 during draw-in animation

function getSegAngles(progress=1){
  const out=[]; let s=-Math.PI/2;
  SEGS.forEach(seg=>{
    const sweep=seg.v*Math.PI*2*progress;
    out.push({start:s, end:s+sweep, mid:s+sweep/2});
    s+=sweep;
  });
  return out;
}

function drawDonut(hoverIdx=-1, progress=1){
  const c=document.getElementById('donut'); if(!c) return;
  const ctx=c.getContext('2d');
  const W=260,cx=130,cy=130,r=108,inner=68,gap=2.5;
  ctx.clearRect(0,0,W,W);
  const angles=getSegAngles(progress);
  angles.forEach((a,i)=>{
    const isActive = i===hoverIdx || (hoverIdx===-1 && i===activeSegIdx);
    const rad = isActive ? r+6 : r;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,rad,a.start+gap/rad,a.end-gap/rad);
    ctx.closePath();
    ctx.fillStyle = isActive ? SEGS[i].hover : SEGS[i].color;
    ctx.fill();
  });
  // inner white circle
  ctx.beginPath(); ctx.arc(cx,cy,inner,0,Math.PI*2);
  ctx.fillStyle='#fff'; ctx.fill();
}

function setDonutCenter(idx){
  document.getElementById('donut-pct').textContent = SEGS[idx].pct;
  document.getElementById('donut-lbl').textContent = SEGS[idx].lbl;
  // highlight legend row
  document.querySelectorAll('#donut-legend .leg-row').forEach((row,i)=>{
    row.style.background = i===idx ? 'var(--blue-light)' : '';
  });
}

function animateDonutIn(){
  if(donutDone) return; donutDone=true;
  const dur=1100, start=performance.now();
  function frame(now){
    const t=Math.min((now-start)/dur,1);
    animProgress=easeOutQuart(t);
    drawDonut(-1, animProgress);
    if(t<1) requestAnimationFrame(frame);
    else { animProgress=1; drawDonut(-1,1); setDonutCenter(0); }
  }
  requestAnimationFrame(frame);
}

// Mouse interaction on canvas
(function(){
  const c=document.getElementById('donut'); if(!c) return;
  function getHoveredSeg(e){
    const rect=c.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const cx=130,cy=130,inner=68,r=120;
    const dx=mx-cx, dy=my-cy, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<inner||dist>r) return -1;
    let angle=Math.atan2(dy,dx);
    if(angle<-Math.PI/2) angle+=Math.PI*2;
    const angles=getSegAngles(1);
    for(let i=0;i<angles.length;i++){
      let s=angles[i].start, e=angles[i].end;
      if(s<-Math.PI/2){s+=Math.PI*2; e+=Math.PI*2;}
      if(angle>=s&&angle<=e) return i;
    }
    return -1;
  }
  c.addEventListener('mousemove',e=>{
    if(animProgress<1) return;
    const idx=getHoveredSeg(e);
    if(idx>=0){ drawDonut(idx,1); setDonutCenter(idx); activeSegIdx=idx; }
  });
  c.addEventListener('mouseleave',()=>{
    if(animProgress<1) return;
    drawDonut(-1,1); setDonutCenter(activeSegIdx);
  });
  c.addEventListener('click',e=>{
    if(animProgress<1) return;
    const idx=getHoveredSeg(e);
    if(idx>=0){ activeSegIdx=idx; drawDonut(-1,1); setDonutCenter(idx); }
  });
  // legend rows
  document.querySelectorAll('#donut-legend .leg-row').forEach((row,i)=>{
    row.addEventListener('mouseenter',()=>{
      if(animProgress<1) return;
      drawDonut(i,1); setDonutCenter(i);
    });
    row.addEventListener('mouseleave',()=>{
      if(animProgress<1) return;
      drawDonut(-1,1); setDonutCenter(activeSegIdx);
    });
    row.addEventListener('click',()=>{
      activeSegIdx=i; drawDonut(-1,1); setDonutCenter(i);
    });
  });
})();

// ── OBSERVE & TRIGGER ──
const triggered = new Set();
const io = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(!e.isIntersecting || triggered.has(e.target)) return;
    triggered.add(e.target);
    const el = e.target;

    // Reveal
    el.classList.add('in');

    // Count-up numbers inside this block
    el.querySelectorAll('.countup[data-target]').forEach(n=>countUp(n));

    // Rings
    el.querySelectorAll('.ring-svg[data-pct]').forEach(svg=>animateRing(svg));

    // Skill bars
    el.querySelectorAll('.sk-fill[data-w]').forEach((bar,i)=>{
      setTimeout(()=>{bar.style.width=bar.dataset.w+'%';},i*50);
    });

    // Trend KPI countups (numbers only, skip symbol-only ones)
    el.querySelectorAll('.trend-kpi-n[data-target]').forEach(n=>countUp(n,1000));

    // Donut
    if(el.contains(document.getElementById('donut'))) {
      animateDonutIn();
      document.querySelectorAll('.leg-n[data-target]').forEach(n=>countUp(n,1100));
    }
  });
},{threshold:0.08,rootMargin:'0px 0px -30px 0px'});

document.querySelectorAll('.rev').forEach(el=>io.observe(el));

// Hero stat bar — observe separately (not .rev)
const heroBar = document.querySelector('.stat-bar');
if(heroBar){
  const heroIo = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting||triggered.has(e.target)) return;
      triggered.add(e.target);
      e.target.querySelectorAll('.countup[data-target]').forEach(n=>countUp(n,1600));
    });
  },{threshold:0.3});
  heroIo.observe(heroBar);
}

// ── DATA ──
const SKILLS = [
  {name:'AI / ML / LLM Testing', pct:17, cat:'emerging',   fill:'f-amber', badge:'b-new',  label:'Emerging'},
  {name:'Selenium',              pct:17, cat:'frameworks',  fill:'f-blue',  badge:'b-core', label:'Framework'},
  {name:'CI / CD Pipelines',    pct:16, cat:'devops',      fill:'f-green', badge:'b-ops',  label:'DevOps'},
  {name:'Python',                pct:16, cat:'languages',   fill:'f-gray',  badge:'b-lang', label:'Language'},
  {name:'SQL',                   pct:16, cat:'languages',   fill:'f-gray',  badge:'b-lang', label:'Language'},
  {name:'Java',                  pct:15, cat:'languages',   fill:'f-gray',  badge:'b-lang', label:'Language'},
  {name:'Playwright',            pct:14, cat:'frameworks',  fill:'f-blue',  badge:'b-core', label:'Framework'},
  {name:'JavaScript',            pct:12, cat:'languages',   fill:'f-gray',  badge:'b-lang', label:'Language'},
  {name:'TypeScript',            pct:12, cat:'languages',   fill:'f-gray',  badge:'b-lang', label:'Language'},
  {name:'Git',                   pct:11, cat:'devops',      fill:'f-green', badge:'b-ops',  label:'DevOps'},
  {name:'Azure',                 pct:11, cat:'devops',      fill:'f-green', badge:'b-ops',  label:'Cloud'},
  {name:'AWS',                   pct:10, cat:'devops',      fill:'f-green', badge:'b-ops',  label:'Cloud'},
  {name:'Cypress',               pct:10, cat:'frameworks',  fill:'f-blue',  badge:'b-core', label:'Framework'},
  {name:'Mobile Testing',        pct:10, cat:'emerging',    fill:'f-amber', badge:'b-new',  label:'Emerging'},
  {name:'C# / .NET',             pct:10, cat:'languages',   fill:'f-gray',  badge:'b-lang', label:'Language'},
  {name:'API Testing',           pct:9,  cat:'devops',      fill:'f-green', badge:'b-ops',  label:'DevOps'},
  {name:'Docker',                pct:9,  cat:'devops',      fill:'f-green', badge:'b-ops',  label:'DevOps'},
  {name:'Manual Testing',        pct:8,  cat:'other',       fill:'f-gray',  badge:'b-dec',  label:'Declining'},
  {name:'Postman',               pct:7,  cat:'devops',      fill:'f-green', badge:'b-ops',  label:'Tool'},
];

function buildSkills(containerId, filter) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const list = filter === 'all' ? SKILLS : SKILLS.filter(s => s.cat === filter);
  const max = Math.max(...list.map(s => s.pct));
  el.innerHTML = list.map((s, i) => `
    <div class="sk">
      <span class="sk-i">${String(i+1).padStart(2,'0')}</span>
      <span class="sk-name">${s.name}</span>
      <div class="sk-track"><div class="sk-fill ${s.fill}" data-w="${(s.pct/max*100).toFixed(1)}"></div></div>
      <span class="sk-pct">${s.pct}%</span>
      <span class="badge ${s.badge}">${s.label}</span>
    </div>`).join('');
}

buildSkills('c-all','all');
buildSkills('c-emerging','emerging');
buildSkills('c-frameworks','frameworks');
buildSkills('c-languages','languages');
buildSkills('c-devops','devops');

// ── TABS ──
function switchTab(name, btn) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  document.getElementById('p-'+name).classList.add('on');
  // animate bars in newly shown tab
  const el = document.getElementById('c-'+name);
  if (el) {
    el.querySelectorAll('.sk-fill').forEach((bar,i) => {
      bar.style.width = '0';
      setTimeout(()=>{ bar.style.width = bar.dataset.w+'%'; }, i*50);
    });
  }
}

// ── GATE (HubSpot) ──
function revealGatedContent() {
  document.getElementById('hubspot-form-wrapper').style.display = 'none';
  document.getElementById('gok').style.display = 'block';
  setTimeout(() => {
    const full = document.getElementById('full-report');
    full.style.display = 'block';
    revealFullReport();
    setTimeout(() => full.scrollIntoView({behavior:'smooth', block:'start'}), 100);
  }, 700);
}

// Init HubSpot form — wait until hbspt is available
function initHubSpotForm() {
  if (typeof hbspt !== 'undefined' && hbspt.forms) {
    hbspt.forms.create({
      portalId: "145896847",
      formId: "b39a1821-f30a-4d55-a6c3-1ed012c44914",
      region: "eu1",
      target: "#hbspt-form-target",
      onFormSubmitted: function() {
        revealGatedContent();
      }
    });
  } else {
    setTimeout(initHubSpotForm, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHubSpotForm);
} else {
  initHubSpotForm();
}

// ── FULL REPORT JS ──

const JOBS = [
  {n:1,title:'Senior QA Specialist (IC4)',co:'Loka',loc:'Remote (Europe/Americas)',flag:'🌍',work:'remote',salary:null,region:'europe',url:'https://euremotejobs.com/job/senior-quality-assurance-specialist-starting-march-1-2026-2/'},
  {n:2,title:'Automation Tester (Python)',co:'Société Générale',loc:'Bucharest, Romania',flag:'🇷🇴',work:'onsite',salary:null,region:'europe',url:'https://careers.societegenerale.com/en/job-offers/specialist-software-engineer-automation-tester-python-260001X2-en'},
  {n:3,title:'ICT Associate – QA',co:'UNOPS',loc:'Copenhagen, Denmark',flag:'🇩🇰',work:'onsite',salary:null,region:'europe',url:'https://www.devex.com/jobs/ict-associate-quality-assurance-1413635'},
  {n:4,title:'Head of QA',co:'Bitpanda',loc:'Dubai / Remote',flag:'🇦🇪',work:'remote',salary:'$115K–$132K',region:'europe',url:'https://web3.career/quality-assurance-jobs'},
  {n:5,title:'QA Engineer Internship 2026',co:'Amazon',loc:'United States',flag:'🇺🇸',work:'onsite',salary:'Paid internship',region:'us',url:'https://www.amazon.jobs/en/jobs/3169030/quality-assurance-engineer-internship-2026-us'},
  {n:6,title:'Software Engineer in Test',co:'Dataiku',loc:'Paris, France',flag:'🇫🇷',work:'onsite',salary:null,region:'europe',url:'https://builtin.com/jobs/eu/france/paris/dev-engineering/search/qa'},
  {n:7,title:'QA Engineer (AI Products)',co:'AI Company',loc:'Paris, France',flag:'🇫🇷',work:'hybrid',salary:null,region:'europe',url:'https://builtin.com/jobs/eu/france/paris/dev-engineering/search/qa'},
  {n:8,title:'QA Automation Engineer',co:'Fintech/AI',loc:'Boulogne-Billancourt, FR',flag:'🇫🇷',work:'onsite',salary:null,region:'europe',url:'https://builtin.com/jobs/eu/france/paris/dev-engineering/search/qa'},
  {n:9,title:'Senior QA Engineer',co:'Security Software',loc:'Paris, France',flag:'🇫🇷',work:'onsite',salary:null,region:'europe',url:'https://builtin.com/jobs/eu/france/paris/dev-engineering/search/qa'},
  {n:10,title:'Senior QA Engineer (Blockchain)',co:'The Block',loc:'Remote (28 locations)',flag:'🌍',work:'remote',salary:null,region:'remote',url:'https://builtin.com/jobs/eu/france/paris/dev-engineering/search/qa'},
  {n:11,title:'QA Automation (Crypto)',co:'Fintech/Crypto',loc:'Remote (28 locations)',flag:'🌍',work:'remote',salary:null,region:'remote',url:'https://builtin.com/jobs/eu/france/paris/dev-engineering/search/qa'},
  {n:12,title:'QA Automation (Backend)',co:'Blockchain/ML FinServ',loc:'Remote (28 locations)',flag:'🌍',work:'remote',salary:'€60K–€100K',region:'remote',url:'https://builtin.com/jobs/eu/france/paris/dev-engineering/search/qa'},
  {n:13,title:'Senior QA Engineer',co:'ApproveShield',loc:'Richardson, TX',flag:'🇺🇸',work:'onsite',salary:'$95K–$115K',region:'us',url:'https://www.indeed.com/q-qa-engineer-jobs.html'},
  {n:14,title:'Senior Quality Engineer – QMS',co:'RxPx',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$80K–$100K',region:'us',url:'https://www.indeed.com/q-qa-engineer-jobs.html'},
  {n:15,title:'Test Automation Sr. Advisor',co:'Elevance Health',loc:'Atlanta, GA',flag:'🇺🇸',work:'hybrid',salary:'$103K–$180K',region:'us',url:'https://www.indeed.com/q-qa-engineer-jobs.html'},
  {n:16,title:'QA Manager',co:'Majid Al Futtaim',loc:'Dubai, UAE',flag:'🇦🇪',work:'onsite',salary:null,region:'remote',url:'https://www.naukrigulf.com/software-quality-assurance-jobs'},
  {n:17,title:'Senior QA Engineer',co:'Webook',loc:'Riyadh, Saudi Arabia',flag:'🇸🇦',work:'onsite',salary:null,region:'remote',url:'https://www.naukrigulf.com/software-quality-assurance-jobs'},
  {n:18,title:'QA Engineer – AI',co:'CKEditor/ButterCMS',loc:'Poland (Remote)',flag:'🇵🇱',work:'remote',salary:'PLN 10.5K–16K/mo',region:'europe',url:'https://testdevjobs.com/location/remote-europe/'},
  {n:19,title:'Senior Quality Engineer',co:'Ada Health',loc:'Germany (Remote)',flag:'🇩🇪',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/location/remote-europe/'},
  {n:20,title:'Senior QA Engineer',co:'JetBrains',loc:'Netherlands (Remote)',flag:'🇳🇱',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/location/remote-europe/'},
  {n:21,title:'.NET SDET',co:'Charles Schwab',loc:'Southlake, TX',flag:'🇺🇸',work:'onsite',salary:'$90K–$112K',region:'us',url:'https://www.schwabjobs.com/job/southlake/net-sdet-software-development-engineer-in-test/33727/91635825680'},
  {n:22,title:'SDET, Apps',co:'Apple',loc:'France',flag:'🇫🇷',work:'onsite',salary:null,region:'europe',url:'https://jobs.apple.com/fr-fr/details/200644871-0836/software-development-engineer-test-sdet-apps'},
  {n:23,title:'Automation Test Engineer',co:'General Dynamics IT',loc:'Remote (Indiana)',flag:'🇺🇸',work:'remote',salary:'$97K–$131K',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:24,title:'Test Automation Engineer',co:'BAE Systems',loc:'Sterling, VA',flag:'🇺🇸',work:'onsite',salary:'$133K–$226K',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:25,title:'Sr. Accessibility & QA Automation',co:'Aretum',loc:'Remote (McLean, VA)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:26,title:'QA Test Engineer',co:'Expion Health',loc:'Remote (OR)',flag:'🇺🇸',work:'remote',salary:'$80K–$130K',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:27,title:'QA Engineer',co:'Pactfi',loc:'Remote (New York)',flag:'🇺🇸',work:'remote',salary:'$80K–$100K',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:28,title:'Test Engineer (Python)',co:'RainesDev',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:29,title:'QA Automation Engineer',co:'NMG Technology',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$38–$45/hr',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:30,title:'Test Engineer (SDET)',co:'Dev Technology Group',loc:'Tysons, VA',flag:'🇺🇸',work:'hybrid',salary:null,region:'us',url:'https://www.indeed.com/q-usa-hiring-qa-engineer-jobs.html'},
  {n:31,title:'QA Automation Engineer',co:'Biotech Company',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$110K–$130K',region:'us',url:'https://builtin.com/jobs/remote/dev-engineering/search/qa-automation-engineer'},
  {n:32,title:'Senior QA Automation Engineer II',co:'Software/FinServ',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$159K–$198K',region:'us',url:'https://builtin.com/jobs/remote/dev-engineering/search/qa-automation-engineer'},
  {n:33,title:'QA Automation Developer',co:'IT Consulting',loc:'Washington, DC',flag:'🇺🇸',work:'hybrid',salary:null,region:'us',url:'https://builtin.com/jobs/remote/dev-engineering/search/qa-automation-engineer'},
  {n:34,title:'QA Automation Engineer (BDD)',co:'Insurance/Software',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://builtin.com/jobs/remote/dev-engineering/search/qa-automation-engineer'},
  {n:35,title:'Senior QA Automation Lead',co:'Insurance Company',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://builtin.com/jobs/remote/dev-engineering/search/qa-automation-engineer'},
  {n:36,title:'QA Automation Engineer',co:'IT Software Consulting',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://builtin.com/jobs/remote/dev-engineering/search/qa-automation-engineer'},
  {n:37,title:'QA Test Automation Engineer',co:'Cloud OTI Platform',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-qa-test-engineer-jobs.html'},
  {n:38,title:'QA/Test Engineer, Senior',co:'Federal Contractor',loc:'Ashburn, VA',flag:'🇺🇸',work:'onsite',salary:null,region:'us',url:'https://www.indeed.com/q-qa-test-engineer-jobs.html'},
  {n:39,title:'Manual QA Engineer',co:'Flip',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-qa-test-engineer-jobs.html'},
  {n:40,title:'QA Engineer (Gaming)',co:'Battle Creek Games',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-qa-test-engineer-jobs.html'},
  {n:41,title:'Senior Mobile QA Engineer',co:'Doximity',loc:'Remote (SF)',flag:'🇺🇸',work:'remote',salary:'$128K–$171K',region:'us',url:'https://testdevjobs.com/remote-jobs'},
  {n:42,title:'QA Engineer – Zaps',co:'LI.FI',loc:'Remote (Europe)',flag:'🌍',work:'remote',salary:'€60K–€90K',region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:43,title:'Senior QA Engineer',co:'Veeva Systems',loc:'Remote (CA)',flag:'🇺🇸',work:'remote',salary:'$80K–$150K',region:'us',url:'https://testdevjobs.com/remote-jobs'},
  {n:44,title:'Automation Engineer',co:'Intent',loc:'Remote (Poland)',flag:'🇵🇱',work:'remote',salary:'PLN 90–150/hr',region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:45,title:'QA Consultant',co:'Capio Group',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$115K–$125K',region:'us',url:'https://testdevjobs.com/remote-jobs'},
  {n:46,title:'Salesforce QA Tester',co:'Capio Group',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$115K–$125K',region:'us',url:'https://testdevjobs.com/remote-jobs'},
  {n:47,title:'QA Documentation Specialist',co:'Sabin Vaccine Inst.',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$72K–$85K',region:'us',url:'https://testdevjobs.com/remote-jobs'},
  {n:48,title:'Mid QA Automation Engineer',co:'DB',loc:'Remote (Brazil)',flag:'🇧🇷',work:'remote',salary:null,region:'latam',url:'https://testdevjobs.com/remote-jobs'},
  {n:49,title:'Senior QA Engineer – Backend',co:'Qu POS',loc:'Remote (Argentina)',flag:'🇦🇷',work:'remote',salary:null,region:'latam',url:'https://testdevjobs.com/remote-jobs'},
  {n:50,title:'QA Specialist',co:'KnowBe4',loc:'Remote (UK)',flag:'🇬🇧',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:51,title:'Java Tester, Selenium',co:'AM53 Smart Solutions',loc:'Remote (Brazil)',flag:'🇧🇷',work:'remote',salary:null,region:'latam',url:'https://testdevjobs.com/remote-jobs'},
  {n:52,title:'QA Specialist',co:'tbi bank',loc:'Remote (Bulgaria)',flag:'🇧🇬',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:53,title:'Senior QA Engineer',co:'Celara',loc:'Remote (Argentina)',flag:'🇦🇷',work:'remote',salary:null,region:'latam',url:'https://testdevjobs.com/remote-jobs'},
  {n:54,title:'Software Tester',co:'Intact',loc:'Remote (Europe)',flag:'🌍',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:55,title:'Senior QA Analyst',co:'ArcTouch',loc:'Remote (Brazil)',flag:'🇧🇷',work:'remote',salary:null,region:'latam',url:'https://testdevjobs.com/remote-jobs'},
  {n:56,title:'QA Engineer (Middle/Senior)',co:'Veeam Software',loc:'Remote (Czech Republic)',flag:'🇨🇿',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:57,title:'Senior QA Engineer (Trading)',co:'Binance',loc:'Remote (Philippines)',flag:'🇵🇭',work:'remote',salary:null,region:'remote',url:'https://testdevjobs.com/remote-jobs'},
  {n:58,title:'Senior QA Engineer',co:'Canary Technologies',loc:'Remote (Latin America)',flag:'🌎',work:'remote',salary:null,region:'latam',url:'https://testdevjobs.com/remote-jobs'},
  {n:59,title:'Tech Lead QA Engineer',co:'Devoteam',loc:'Remote (Portugal)',flag:'🇵🇹',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:60,title:'Junior Performance QA Engineer',co:'Veeam Software',loc:'Remote (Czech Republic)',flag:'🇨🇿',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:61,title:'Software QA Tester',co:'Federal Contractor',loc:'US (On-site)',flag:'🇺🇸',work:'onsite',salary:null,region:'us',url:'https://www.indeed.com/q-usa-hiring-qa-engineer-jobs.html'},
  {n:62,title:'QA Automation Engineer',co:'TP ICAP',loc:'New York, NY',flag:'🇺🇸',work:'onsite',salary:null,region:'us',url:'https://www.indeed.com/q-usa-hiring-qa-engineer-jobs.html'},
  {n:63,title:'Software QA Engineer',co:'KLA',loc:'Milpitas, CA',flag:'🇺🇸',work:'onsite',salary:null,region:'us',url:'https://www.indeed.com/q-usa-hiring-qa-engineer-jobs.html'},
  {n:64,title:'Sr. Software QA Analyst',co:'Enterprise (US)',loc:'US (Hybrid)',flag:'🇺🇸',work:'hybrid',salary:null,region:'us',url:'https://www.indeed.com/q-usa-hiring-qa-engineer-jobs.html'},
  {n:65,title:'QA Engineer',co:'CoinFlip',loc:'Chicago, IL',flag:'🇺🇸',work:'onsite',salary:null,region:'us',url:'https://www.indeed.com/q-usa-hiring-qa-engineer-jobs.html'},
  {n:66,title:'Manual QA Tester',co:'Enterprise Tech',loc:'San Antonio, TX',flag:'🇺🇸',work:'onsite',salary:'$30–$39/hr',region:'us',url:'https://www.dice.com/jobs/q-entry+level+manual+tester-jobs'},
  {n:67,title:'Entry Level QA',co:'MicroCoders',loc:'Herndon, VA',flag:'🇺🇸',work:'onsite',salary:null,region:'us',url:'https://www.indeed.com/q-entry-level-manual-tester-jobs.html'},
  {n:68,title:'Software QA Engineer – Entry',co:'EAi Technologies',loc:'Vienna, VA',flag:'🇺🇸',work:'hybrid',salary:null,region:'us',url:'https://www.indeed.com/q-entry-level-manual-tester-jobs.html'},
  {n:69,title:'Entry Level Test Engineer',co:'General Dynamics MS',loc:'Manassas, VA',flag:'🇺🇸',work:'onsite',salary:'$57K–$97K',region:'us',url:'https://www.indeed.com/q-entry-level-manual-tester-jobs.html'},
  {n:70,title:'Entry Level Software Tester',co:'JND',loc:'Englewood Cliffs, NJ',flag:'🇺🇸',work:'onsite',salary:null,region:'us',url:'https://www.indeed.com/q-entry-level-manual-tester-jobs.html'},
  {n:71,title:'Jr QA Tester',co:'IT EXCEL LLC',loc:'Mount Rainier, MD',flag:'🇺🇸',work:'onsite',salary:'$55K–$58K',region:'us',url:'https://www.indeed.com/q-entry-level-manual-tester-jobs.html'},
  {n:72,title:'QA/C# Test Automation Engineer',co:'Federal Agency',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-qa-test-engineer-jobs.html'},
  {n:73,title:'QA Software Test Engineer',co:'Liquidware',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-qa-test-engineer-jobs.html'},
  {n:74,title:'Automated Test Engineer',co:'Engineering Firm',loc:'US (On-site)',flag:'🇺🇸',work:'onsite',salary:null,region:'us',url:'https://www.indeed.com/q-qa-test-engineer-jobs.html'},
  {n:75,title:'Senior Penetration Tester',co:'Humana',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$118K–$162K',region:'us',url:'https://testdevjobs.com/remote-jobs'},
  {n:76,title:'SDET (TikTok Eng Test)',co:'TikTok',loc:'San Jose, CA',flag:'🇺🇸',work:'onsite',salary:null,region:'us',url:'https://www.linkedin.com/jobs/sdet-software-development-engineer-in-test-jobs'},
  {n:77,title:'Senior QA Engineer (Cypress)',co:'Pitch Software',loc:'Berlin/Remote (DE)',flag:'🇩🇪',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:78,title:'Senior QA Engineer',co:'Box',loc:'Remote (Poland)',flag:'🇵🇱',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:79,title:'SDET',co:'Hays',loc:'Luxembourg',flag:'🇱🇺',work:'onsite',salary:null,region:'europe',url:'https://en.moovijob.com/job-offers/hays-luxembourg/software-development-engineer-test-sdet-mw'},
  {n:80,title:'QA Automation Test Lead',co:'Federal Gov\'t (CA)',loc:'Remote (Atlantic Canada)',flag:'🇨🇦',work:'remote',salary:null,region:'remote',url:'https://ca.indeed.com/q-qa-engineer-jobs.html'},
  {n:81,title:'Jr Software Engineer / QA Analyst',co:'Parkway Pharmacy',loc:'Remote (Canada)',flag:'🇨🇦',work:'remote',salary:null,region:'remote',url:'https://ca.indeed.com/q-qa-engineer-jobs.html'},
  {n:82,title:'Software QA Engineer',co:'Speer Technologies',loc:'Remote (Canada)',flag:'🇨🇦',work:'remote',salary:null,region:'remote',url:'https://ca.indeed.com/q-quality-assurance-engineer-jobs.html'},
  {n:83,title:'Quality Engineering Analyst',co:'Enterprise (Canada)',loc:'Canada',flag:'🇨🇦',work:'onsite',salary:null,region:'remote',url:'https://ca.indeed.com/q-qa-engineer-jobs.html'},
  {n:84,title:'QA Specialist (Blockchain)',co:'01 Communique',loc:'Toronto (Hybrid)',flag:'🇨🇦',work:'hybrid',salary:null,region:'remote',url:'https://ca.indeed.com/q-part-time-qa-testing-jobs.html'},
  {n:85,title:'Technical Support & QA (IoT)',co:'IoT Company',loc:'Canada',flag:'🇨🇦',work:'onsite',salary:null,region:'remote',url:'https://ca.indeed.com/q-part-time-qa-testing-jobs.html'},
  {n:86,title:'Senior QA Automation Engineer',co:'Resilience Care',loc:'France (Remote)',flag:'🇫🇷',work:'remote',salary:null,region:'europe',url:'https://fr.indeed.com/q-playwright-automation-emplois.html'},
  {n:87,title:'Test Automation Playwright',co:'K-Lagan',loc:'Niort, France',flag:'🇫🇷',work:'onsite',salary:null,region:'europe',url:'https://fr.indeed.com/q-playwright-automation-emplois.html'},
  {n:88,title:'QA Automation Engineer',co:'Asteri AI',loc:'France (Remote)',flag:'🇫🇷',work:'remote',salary:null,region:'europe',url:'https://fr.indeed.com/q-playwright-automation-emplois.html'},
  {n:89,title:'QA Automation',co:'KLETA',loc:'France/Spain (Hybrid)',flag:'🇪🇺',work:'hybrid',salary:null,region:'europe',url:'https://fr.indeed.com/q-playwright-automation-emplois.html'},
  {n:90,title:'Sr Test Automation Engineer',co:'Intone Networks',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$65/hr',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:91,title:'QA Test Automation Engineer',co:'Aries Solutions',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$65–$70/hr',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:92,title:'Selenium Automation Engineer',co:'Data Concepts',loc:'Remote (Richmond, VA)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:93,title:'Senior Test Automation Engineer',co:'Crystal Management',loc:'Remote (Washington, DC)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:94,title:'Test Automation Architect',co:'Anika Systems',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:null,region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:95,title:'Senior QA Engineer (Remote)',co:'DualEntry',loc:'Remote (New York)',flag:'🇺🇸',work:'remote',salary:'$50K–$85K',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:96,title:'Solution Tester I',co:'MicroHealth',loc:'Remote (Vienna, VA)',flag:'🇺🇸',work:'remote',salary:'$70K–$80K',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:97,title:'QA Engineer',co:'S.A.G.A Corp',loc:'Remote (US)',flag:'🇺🇸',work:'remote',salary:'$35K–$65K',region:'us',url:'https://www.indeed.com/q-remote-test-automation-engineer-international-jobs.html'},
  {n:98,title:'Software QA Engineer Intern',co:'Vimachem',loc:'Remote (Greece)',flag:'🇬🇷',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:99,title:'QA Specialist (Remote)',co:'KnowBe4',loc:'Remote (UK)',flag:'🇬🇧',work:'remote',salary:null,region:'europe',url:'https://testdevjobs.com/remote-jobs'},
  {n:100,title:'Senior QA Engineer',co:'HW.Tech',loc:'Remote (Mexico)',flag:'🇲🇽',work:'remote',salary:null,region:'latam',url:'https://testdevjobs.com/remote-jobs'},
];

const PLATFORMS = [
  {name:'Indeed (US)',vol:'11,000+ jobs',desc:'Largest volume, all seniority levels',pct:100,url:'https://www.indeed.com/q-qa-engineer-jobs.html'},
  {name:'LinkedIn',vol:'5,000+ roles',desc:'Enterprise roles, networking, senior hires',pct:45,url:'https://www.linkedin.com/jobs/qa-engineer-jobs'},
  {name:'TestDevJobs',vol:'905+ remote',desc:'Testing-specific board, remote focus',pct:8,url:'https://testdevjobs.com/remote-jobs'},
  {name:'Built In',vol:'81+ Paris jobs',desc:'Startups & tech companies',pct:7,url:'https://builtin.com/jobs/eu/france/paris/dev-engineering/search/qa'},
  {name:'Indeed (France)',vol:'500+ jobs',desc:'French market & automation roles',pct:5,url:'https://fr.indeed.com/q-test-automation-emplois.html'},
  {name:'Indeed (Canada)',vol:'500+ jobs',desc:'Canadian market coverage',pct:5,url:'https://ca.indeed.com/q-qa-engineer-jobs.html'},
  {name:'Jobgether',vol:'490+ remote',desc:'International remote roles',pct:4,url:'https://jobgether.com/remote-jobs/test-automation-engineer'},
  {name:'Dice',vol:'Entry–Senior',desc:'US tech specialists',pct:3,url:'https://www.dice.com/jobs/q-entry+level+manual+tester-jobs'},
  {name:'NaukriGulf',vol:'48+ vacancies',desc:'Middle East market',pct:2,url:'https://www.naukrigulf.com/software-quality-assurance-jobs'},
  {name:'Web3.career',vol:'—',desc:'Web3 & blockchain QA roles',pct:2,url:'https://web3.career/quality-assurance-jobs'},
  {name:'RemoteRocketship',vol:'53+ remote',desc:'Remote Europe focus',pct:2,url:'https://www.remoterocketship.com/country/europe/jobs/quality-assurance-tester/'},
  {name:'Wellfound',vol:'—',desc:'Startup equity roles',pct:1,url:'https://wellfound.com/role/r/automation-engineer'},
];

// ── JOBS GRID ──
const PREVIEW = 20;
let showAll = false;
let currentFilter = 'all';

function jobCard(j) {
  const workClass = j.work==='remote'?'pill-remote':j.work==='hybrid'?'pill-hybrid':'pill-onsite';
  const workLabel = j.work==='remote'?'Remote':j.work==='hybrid'?'Hybrid':'On-site';
  return `<div class="job-card" data-region="${j.region}" data-work="${j.work}" data-salary="${j.salary?'yes':'no'}">
    <div class="job-title">${j.n}. ${j.title}</div>
    <div class="job-company">${j.co} · ${j.loc}</div>
    <div class="job-meta">
      <span class="job-pill ${workClass}">${workLabel}</span>
      ${j.salary?`<span class="job-pill pill-salary">${j.salary}</span>`:''}
    </div>
  </div>`;
}

function renderJobs() {
  const grid = document.getElementById('jobs-grid');
  const toggle = document.getElementById('jobs-toggle');
  let list = currentFilter === 'all' ? JOBS
    : currentFilter === 'salary' ? JOBS.filter(j=>j.salary)
    : JOBS.filter(j=>j.region===currentFilter);
  const visible = showAll ? list : list.slice(0, PREVIEW);
  grid.innerHTML = visible.map(jobCard).join('');
  if (list.length > PREVIEW) {
    toggle.style.display = 'block';
    toggle.textContent = showAll ? `Show fewer ↑` : `Show all ${list.length} jobs ↓`;
  } else {
    toggle.style.display = 'none';
  }
}

function filterJobs(f, btn) {
  currentFilter = f; showAll = false;
  document.querySelectorAll('.job-filter-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  renderJobs();
}

function toggleAllJobs() {
  showAll = !showAll;
  renderJobs();
  if (!showAll) document.getElementById('jobs-grid').scrollIntoView({behavior:'smooth',block:'start'});
}

// ── PLATFORMS ──
function renderPlatforms() {
  const grid = document.getElementById('platform-grid');
  if (!grid) return;
  grid.innerHTML = PLATFORMS.map(p=>`
    <a class="platform-card" href="${p.url}" target="_blank" rel="noopener" style="text-decoration:none">
      <div class="platform-name">${p.name}</div>
      <div class="platform-vol">${p.vol}</div>
      <div class="platform-desc">${p.desc}</div>
      <div class="platform-bar"><div class="platform-bar-fill" data-w="${p.pct}"></div></div>
    </a>`).join('');
}

// ── EXPERIENCE BARS ANIMATION ──
function animateExpBars() {
  document.querySelectorAll('#exp-bars .exp-bar-fill').forEach((bar,i)=>{
    setTimeout(()=>{
      bar.style.width = bar.dataset.w + '%';
      bar.classList.add('animated');
    }, i * 150);
  });
}

// ── FULL REPORT REVEAL ──
function revealFullReport() {
  renderJobs();
  renderPlatforms();
  // Animate experience bars after a short delay
  setTimeout(animateExpBars, 400);
  // Animate platform bars
  setTimeout(()=>{
    document.querySelectorAll('.platform-bar-fill').forEach((bar,i)=>{
      setTimeout(()=>{ bar.style.width = bar.dataset.w+'%'; }, i*80);
    });
  }, 500);
  // Countup for what's next cards
  setTimeout(()=>{
    document.querySelectorAll('#full-report .countup[data-target]').forEach(el=>countUp(el,1200));
  }, 600);
}

// ── SHARE CARDS ──
document.querySelectorAll('.share-stat-card').forEach(card => {
  card.addEventListener('click', () => {
    navigator.clipboard.writeText(card.dataset.text).then(() => {
      card.classList.add('copied');
      card.querySelector('.share-stat-copy').textContent = '✓ Copied!';
      setTimeout(() => {
        card.classList.remove('copied');
        card.querySelector('.share-stat-copy').textContent = 'Click to copy';
      }, 2000);
    });
  });
});

const tocSections = ['s-findings','s-skills','s-trends'];
const tocLinks = document.querySelectorAll('.toc-link:not(.toc-gated)');

function setActiveToc(id) {
  tocLinks.forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === '#' + id);
  });
}

const secObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) setActiveToc(e.target.id);
  });
}, {threshold: 0, rootMargin: '-10% 0px -80% 0px'});

tocSections.forEach(id => {
  const el = document.getElementById(id);
  if (el) secObs.observe(el);
});

tocLinks.forEach(link => {
  link.addEventListener('click', () => {
    const id = link.getAttribute('href').slice(1);
    setActiveToc(id);
  });
});
