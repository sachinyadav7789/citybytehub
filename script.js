// ===== FIREBASE IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, query, where }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDatabase, ref, onValue, get }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
 
const firebaseConfig = {
  apiKey: "AIzaSyAGfzMX4vrLR_yYPDi0FRYTjpEY_8RCRRE",
  authDomain: "citybytehub-dde05.firebaseapp.com",
  databaseURL: "https://citybytehub-dde05-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "citybytehub-dde05",
  storageBucket: "citybytehub-dde05.firebasestorage.app",
  messagingSenderId: "1022508813132",
  appId: "1:1022508813132:web:8782022cf65ff28c7bdde9"
};
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const rtdb = getDatabase(app);

// SECURITY NOTE: Enable Firebase App Check for CSRF protection.
// SECURITY NOTE: Restrict authorized domains in Firebase Console.

const RECAPTCHA_SITE_KEY = document.querySelector('meta[name="recaptcha-site-key"]')?.getAttribute('content') || '';
const RECAPTCHA_VERIFY_ENDPOINT = document.querySelector('meta[name="recaptcha-verify-endpoint"]')?.getAttribute('content') || '';
const RECAPTCHA_MODE = (document.querySelector('meta[name="recaptcha-mode"]')?.getAttribute('content') || 'v3').toLowerCase();
const IS_LOCAL_DEV = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
let CAPTCHA_ENABLED = Boolean(RECAPTCHA_SITE_KEY) && !IS_LOCAL_DEV;
const rcWidgets = { prime: null, booking: null, inquiry: null };

if (IS_LOCAL_DEV) {
  console.warn('reCAPTCHA bypassed in local development (localhost).');
}
 
// ===== HELPERS =====
const $  = id => document.getElementById(id);
const fmtDate = iso => { if(!iso) return '—'; const d=new Date(iso); return isNaN(d)?String(iso):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); };
function showErr(id,msg){ const e=$(id); if(!e) return; e.textContent=msg; e.style.display='block'; clearTimeout(e._t); e._t=setTimeout(()=>e.style.display='none',5000); }
function clearErr(id){ const e=$(id); if(e){e.textContent='';e.style.display='none';} }
function setEl(id,v){ const e=$(id); if(e) e.textContent=v; }
function escHTML(v){ return String(v??'').replace(/[&<>'"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[m])); }
function cleanInput(v,max=120){ return String(v??'').replace(/[\r\n\t]/g,' ').replace(/\s+/g,' ').trim().slice(0,max); }
function maskCard(v){ const s=String(v||''); return s.length>8 ? s.slice(0,4)+'-****-'+s.slice(-4) : s; }
function maskName(v){ const s=String(v||'').trim(); if(!s) return 'User'; if(s.length<=2) return s[0]+'*'; return s[0]+'***'+s[s.length-1]; }
function maskPhone(v){ const s=String(v||'').replace(/\D/g,''); return s.length===10 ? `${s.slice(0,2)}******${s.slice(-2)}` : 'hidden'; }
function isLikelyName(v){ const s=cleanInput(v,80); return s.length>=2 && /[A-Za-z\u0900-\u097F]/.test(s); }
function isValidTimeHHMM(v){ return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v); }
function isWithinBookingHours(v){ return v >= '07:00' && v <= '21:00'; }
function hhmmToMinutes(v){ if(!isValidTimeHHMM(v)) return null; const [h,m]=v.split(':').map(Number); return (h*60)+m; }
function formatTime12(v){
  if(!isValidTimeHHMM(v)) return String(v || '—');
  const [h,m] = v.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${hour12}:${String(m).padStart(2,'0')} ${ampm}`;
}
function normalizeTimeWithAmPm(timeValue, ampmValue){
  const raw = String(timeValue || '');
  if(!isValidTimeHHMM(raw)) return raw;

  const mer = String(ampmValue || '').toLowerCase();
  if(mer !== 'am' && mer !== 'pm') return raw;

  let [h, m] = raw.split(':').map(Number);
  if(h > 12) return raw;
  if(mer === 'am') {
    if(h === 12) h = 0;
  } else {
    if(h < 12) h += 12;
  }
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function getBookingStartTime24(){
  return normalizeTimeWithAmPm($('bk-time')?.value || '', $('bk-time-ampm')?.value || '');
}
function getBookingEndTime24(){
  return normalizeTimeWithAmPm($('bk-end-time')?.value || '', $('bk-end-time-ampm')?.value || '');
}
function syncAmPmFromTime(inputId, ampmId){
  const t = $(inputId)?.value || '';
  const ampm = $(ampmId);
  if(!ampm || !isValidTimeHHMM(t)) return;
  const h = Number(t.split(':')[0]);
  ampm.value = h >= 12 ? 'pm' : 'am';
}
function todayYmd(){ return new Date().toISOString().split('T')[0]; }
function getDailyDeviceBucket(key){
  const day = todayYmd();
  const raw = localStorage.getItem(key);
  const state = raw ? JSON.parse(raw) : { day, count: 0 };
  if(!state || state.day !== day) return { day, count: 0 };
  return { day, count: Number(state.count) || 0 };
}
function canUseDailyDeviceQuota(key, maxAttempts){
  try { return getDailyDeviceBucket(key).count < maxAttempts; }
  catch(e) { return true; }
}
function incrementDailyDeviceQuota(key){
  try {
    const state = getDailyDeviceBucket(key);
    state.count += 1;
    localStorage.setItem(key, JSON.stringify(state));
  } catch(e) {}
}
function rateLimitCheck(key, maxAttempts, windowMs){
  try {
    const now=Date.now();
    const raw=localStorage.getItem(key);
    const state=raw?JSON.parse(raw):{count:0,start:now};
    if(!state.start||now-state.start>windowMs){ state.count=0; state.start=now; }
    if((state.count||0)>=maxAttempts) return false;
    state.count=(state.count||0)+1;
    localStorage.setItem(key,JSON.stringify(state));
    return true;
  } catch(e){ return true; }
}
function consumeWindowRateLimit(key, maxAttempts, windowMs){
  try {
    const now = Date.now();
    const raw = localStorage.getItem(key);
    let stamps = raw ? JSON.parse(raw) : [];
    if(!Array.isArray(stamps)) stamps = [];
    stamps = stamps.filter(ts => Number.isFinite(ts) && (now - ts) < windowMs);
    if(stamps.length >= maxAttempts) {
      localStorage.setItem(key, JSON.stringify(stamps));
      return false;
    }
    stamps.push(now);
    localStorage.setItem(key, JSON.stringify(stamps));
    return true;
  } catch(e) {
    return true;
  }
}
function generateBookingCode() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  }
  const bytes = new Uint8Array(4);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
function isRecaptchaV2Mode() {
  return RECAPTCHA_MODE === 'v2' || RECAPTCHA_MODE === 'v2-checkbox' || RECAPTCHA_MODE === 'v2_checkbox';
}

function loadRecaptchaApi() {
  if(!CAPTCHA_ENABLED || !RECAPTCHA_SITE_KEY) {
    document.querySelectorAll('.recaptcha-wrap').forEach(el=>{ el.style.display='none'; });
    return Promise.resolve(false);
  }

  if(window.grecaptcha) return Promise.resolve(true);

  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = isRecaptchaV2Mode()
      ? 'https://www.google.com/recaptcha/api.js?render=explicit'
      : `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

async function setupRecaptcha() {
  const ready = await loadRecaptchaApi();
  if(!ready) return;

  if(isRecaptchaV2Mode()) {
    document.querySelectorAll('.recaptcha-wrap').forEach(el=>{ el.style.display='block'; });
    try {
      if($('rc-prime') && rcWidgets.prime===null) rcWidgets.prime = window.grecaptcha.render('rc-prime',{sitekey:RECAPTCHA_SITE_KEY});
      if($('rc-booking') && rcWidgets.booking===null) rcWidgets.booking = window.grecaptcha.render('rc-booking',{sitekey:RECAPTCHA_SITE_KEY});
      if($('rc-inquiry') && rcWidgets.inquiry===null) rcWidgets.inquiry = window.grecaptcha.render('rc-inquiry',{sitekey:RECAPTCHA_SITE_KEY});
    } catch(e) {
      console.error('reCAPTCHA v2 init failed:', e);
    }
  } else {
    document.querySelectorAll('.recaptcha-wrap').forEach(el=>{ el.style.display='none'; });
  }
}

window.addEventListener('load', ()=>{ setupRecaptcha(); });

async function getCaptchaToken(kind) {
  if(!CAPTCHA_ENABLED) return 'captcha-disabled';
  if(!window.grecaptcha) {
    const ok = await loadRecaptchaApi();
    if(!ok || !window.grecaptcha) return '';
  }

  if(isRecaptchaV2Mode()) {
    const wid = rcWidgets[kind];
    if(wid===null||wid===undefined) return '';
    return window.grecaptcha.getResponse(wid) || '';
  }

  try {
    return await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: kind || 'submit' });
  } catch(e) {
    console.warn('reCAPTCHA v3 execute failed:', e);
    return '';
  }
}

function captchaReset(kind){
  if(!CAPTCHA_ENABLED || !window.grecaptcha || !isRecaptchaV2Mode()) return;
  const wid=rcWidgets[kind];
  if(wid!==null&&wid!==undefined) window.grecaptcha.reset(wid);
}

async function verifyCaptchaServer(kind, token){
  if(!CAPTCHA_ENABLED) return true;
  if(IS_LOCAL_DEV) return true;
  if(!RECAPTCHA_VERIFY_ENDPOINT) return true;
  if(!token) return false;
  try {
    const res = await fetch(RECAPTCHA_VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action: kind, mode: RECAPTCHA_MODE })
    });
    if(!res.ok) return false;
    const json = await res.json();
    return !!json?.success;
  } catch(e) {
    console.warn('reCAPTCHA server verification failed:', e);
    return false;
  }
}
function setFormStartTs(id){ const el=$(id); if(el) el.dataset.startTs=String(Date.now()); }
function looksLikeBot(hpId,formId,minMs=1200){
  const hp=$(hpId);
  if(hp&&hp.value&&hp.value.trim()) return true;
  const form=$(formId);
  const ts=form?parseInt(form.dataset.startTs||'0',10):0;
  if(ts&&Date.now()-ts<minMs) return true;
  return false;
}
 
// ===== NAVIGATION =====
const SECTION_MAP = {
  home:'sec-home', services:'sec-home', pricing:'sec-home', 'why-us':'sec-home',
  prime:'sec-prime', booking:'sec-booking', inquiry:'sec-inquiry',
  about:'sec-about', faq:'sec-faq', reviews:'sec-reviews',
};
const TITLE_MAP = {
  home:'Home', services:'Services', pricing:'Pricing', prime:'Prime Card',
  booking:'Book a Slot', inquiry:'Contact & Inquiry', about:'About Us',
  faq:'FAQ', reviews:'Reviews',
};
 
// Nav handled by inline script in HTML
 
// ===== PARTICLES =====
(function() {
  const canvas = $('particle-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [], W, H;
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  function rnd(a,b) { return a + Math.random()*(b-a); }
  function mkP() { return {x:rnd(0,W),y:rnd(0,H),vx:rnd(-0.3,0.3),vy:rnd(-0.4,-0.1),size:rnd(1,2.5),opacity:rnd(0.2,0.7),color:Math.random()>0.5?'0,220,255':'124,58,237',life:0,maxLife:rnd(200,500)}; }
  function init() { particles=[]; const n=Math.min(Math.floor(W/8),80); for(let i=0;i<n;i++){const p=mkP();p.life=Math.random()*p.maxLife;particles.push(p);} }
  function draw() {
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<particles.length;i++) for(let j=i+1;j<particles.length;j++) {
      const a=particles[i],b=particles[j],d=Math.hypot(a.x-b.x,a.y-b.y);
      if(d<120){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=`rgba(0,220,255,${(1-d/120)*0.06})`;ctx.lineWidth=0.5;ctx.stroke();}
    }
    particles.forEach((p,i)=>{
      p.x+=p.vx;p.y+=p.vy;p.life++;
      const a=p.opacity*Math.sin(p.life/p.maxLife*Math.PI);
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fillStyle=`rgba(${p.color},${a})`;ctx.fill();
      if(p.life>=p.maxLife||p.x<0||p.x>W||p.y<0) particles[i]=mkP();
    });
    requestAnimationFrame(draw);
  }
  resize(); init(); draw();
  let rt; window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{resize();init();},200);});
})();
 
// ===== REVEAL =====
(function() {
  function showAll() { document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible')); }
  showAll(); setTimeout(showAll,300); setTimeout(showAll,1000);
})();
 
// ===== RTDB: ANNOUNCEMENTS =====
onValue(ref(rtdb,'announcements/latest'), snap => {
  const bar=$('ann-bar'), txt=$('ann-bar-text');
  if(snap.exists()&&snap.val()?.message&&bar&&txt){ txt.textContent=snap.val().message; bar.classList.add('show'); }
},()=>{});
 
// ===== RTDB: PRICING =====
onValue(ref(rtdb,'pricing'), snap => {
  const p = snap.exists() ? (snap.val() || {}) : {};

  const normalized = normalizeBookingRates(
    p.serviceRates || {
      'gaming-pc': p.pc,
      ps5: p.ps5,
      internet: p.net,
      mobile: p.mobile,
      printing: p.printing,
      'form-filling': p.formFilling,
      other: p.other
    }
  );
  BOOKING_HOURLY_RATES = { ...BOOKING_HOURLY_RATES, ...normalized };
  CUSTOM_BOOKING_SERVICES = normalizeBookingCustomServices(p.customServices || {});

  const pcEl = $('pc-price');
  if(pcEl){ pcEl.textContent = String(BOOKING_HOURLY_RATES['gaming-pc']); pcEl.classList.remove('ask'); }
  const psEl = $('ps5-price');
  if(psEl){ psEl.textContent = String(BOOKING_HOURLY_RATES.ps5); psEl.classList.remove('ask'); }
  const netEl = $('net-price');
  if(netEl){ netEl.textContent = String(BOOKING_HOURLY_RATES.internet); netEl.classList.remove('ask'); }

  if(p.prime) {
    const primeEl = $('prime-price');
    if(primeEl){ primeEl.textContent = p.prime; primeEl.classList.remove('ask'); }
  }

  const mobileTip = $('mobile-tip-price');
  if(mobileTip) mobileTip.textContent = `Rs.${BOOKING_HOURLY_RATES.mobile} per hour`;

  renderBookingServiceOptions();
  renderBookingLiveRateList();
  updateBookingBillPreview();
},()=>{});
 
// ===== RTDB: OFFERS =====
onValue(ref(rtdb,'offers/current'), snap => {
  const el=$('current-offer-txt');
  if(el) el.textContent=snap.exists()&&snap.val()?snap.val():'Visit us for current offers on Weekly & Monthly plans!';
},()=>{ const el=$('current-offer-txt'); if(el) el.textContent='Visit us for current offers!'; });
 
// ===== RTDB: LIVE SEATS — admin panel se update hoga, yahan live dikhega =====
onValue(ref(rtdb,'seats'), snap => {
  const v = snap.exists() ? parseInt(snap.val()) : 5;
  const el = $('avail-pc');
  if(el) {
    el.textContent = v + ' seats available';
    el.style.color = v<=0 ? 'var(--danger)' : v<=2 ? 'var(--gold)' : 'var(--green)';
  }
},()=>{ setEl('avail-pc','5 seats available'); });
 
// ===== CARD PREVIEW =====
window.switchCardPreview = function(plan, btn) {
  $('card-preview-weekly').style.display  = plan==='weekly'  ? 'flex' : 'none';
  $('card-preview-monthly').style.display = plan==='monthly' ? 'flex' : 'none';
  $('plan-benefits-weekly').style.display  = plan==='weekly'  ? 'block' : 'none';
  $('plan-benefits-monthly').style.display = plan==='monthly' ? 'block' : 'none';
  document.querySelectorAll('.card-preview-box .plan-btn').forEach(b=>{
    b.classList.remove('active','weekly','monthly');
    b.classList.add(b.textContent.toLowerCase().includes('weekly')?'weekly':'monthly');
  });
  if(btn) btn.classList.add('active');
  setFormPlan(plan);
};
window.setFormPlan = function(plan) {
  const sel=$('selected-plan'); if(sel) sel.value=plan;
  const wb=$('form-weekly-btn'), mb=$('form-monthly-btn');
  if(wb&&mb){ wb.classList.remove('active'); mb.classList.remove('active'); (plan==='weekly'?wb:mb).classList.add('active'); }
  $('card-preview-weekly').style.display  = plan==='weekly'  ? 'flex' : 'none';
  $('card-preview-monthly').style.display = plan==='monthly' ? 'flex' : 'none';
  $('plan-benefits-weekly').style.display  = plan==='weekly'  ? 'block' : 'none';
  $('plan-benefits-monthly').style.display = plan==='monthly' ? 'block' : 'none';
};
window.updateCardPreview = function() {
  const name=($('prime-name')?.value.trim().toUpperCase()||'YOUR NAME HERE');
  const today=new Date();
  const exp7=new Date(today); exp7.setDate(today.getDate()+7);
  const exp30=new Date(today); exp30.setMonth(today.getMonth()+1);
  const fmtMY=d=>String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getFullYear()).slice(-2);
  setEl('prev-w-name',name); setEl('prev-m-name',name);
  setEl('prev-w-exp',fmtMY(exp7)); setEl('prev-m-exp',fmtMY(exp30));
  setEl('prev-w-bal','10 hrs'); setEl('prev-m-bal','40 hrs');
};
updateCardPreview();
setFormStartTs('prime-apply-btn');
setFormStartTs('bk-btn');
setFormStartTs('inq-btn');
 
// ===== PRIME CARD APPLICATION =====
window.submitPrimeApplication = async function() {
  // SECURITY NOTE: Client-side checks are bypassable. Validate all inputs server-side in Cloud Functions/Rules.
  const name=cleanInput($('prime-name')?.value,80);
  const phone=cleanInput($('prime-phone')?.value,16);
  const plan=$('selected-plan')?.value||'weekly';
  const college=cleanInput($('prime-college')?.value,100);
  const note=cleanInput($('prime-note')?.value,300);
  clearErr('prime-name-err'); clearErr('prime-phone-err');
  const okEl=$('prime-ok'), errEl=$('prime-err');
  if(okEl){okEl.style.display='none';okEl.textContent='';}
  if(errEl){errEl.style.display='none';errEl.textContent='';}
  const primeCaptchaToken = await getCaptchaToken('prime');
  if(!primeCaptchaToken){
    if(errEl){ errEl.textContent='❌ Please verify reCAPTCHA first.'; errEl.style.display='block'; }
    return;
  }
  if(RECAPTCHA_VERIFY_ENDPOINT){
    const serverOk = await verifyCaptchaServer('prime', primeCaptchaToken);
    if(!serverOk){
      if(errEl){ errEl.textContent='❌ reCAPTCHA verification failed. Dobara try karo.'; errEl.style.display='block'; }
      return;
    }
  }
  if(looksLikeBot('prime-website','prime-apply-btn')){
    if(errEl){ errEl.textContent='❌ Suspicious request blocked. Thoda ruk ke dobara try karo.'; errEl.style.display='block'; }
    return;
  }
  let valid=true;
  if(!name){ showErr('prime-name-err','Naam required hai.'); valid=false; }
  else if(!isLikelyName(name)){ showErr('prime-name-err','Valid naam daalo.'); valid=false; }
  if(!phone){ showErr('prime-phone-err','Phone required hai.'); valid=false; }
  else if(!/^[6-9][0-9]{9}$/.test(phone)){ showErr('prime-phone-err','Valid 10-digit phone daalo.'); valid=false; }
  if(!valid) return;
  if(!canUseDailyDeviceQuota('cbh_prime_device_daily', 4)){
    if(errEl){ errEl.textContent='⚠️ Is device se aaj prime request limit ho gayi hai. Kal ya call pe try karo.'; errEl.style.display='block'; }
    return;
  }
  const btn=$('prime-apply-btn'); if(btn) btn.disabled=true;
  const btxt=$('prime-apply-txt'), bload=$('prime-apply-load');
  if(btxt) btxt.style.display='none';
  if(bload) bload.style.display='inline';
  try {
    await addDoc(collection(db,'updateRequests'),{
      type:'new_card', studentName:name, phone, plan,
      college:college||null, note:note||null,
      status:'pending', requestedBy:'website_user',
      requestedAt:new Date().toISOString(), source:'website'
    });
    incrementDailyDeviceQuota('cbh_prime_device_daily');
    if(okEl){ okEl.textContent='✅ Application bhej di! Piprali Road pe aakar payment karke card activate karwao. Hum call karenge!'; okEl.style.display='block'; }
    [$('prime-name'),$('prime-phone'),$('prime-college'),$('prime-note')].forEach(el=>{if(el)el.value='';});
    updateCardPreview();
  } catch(err) {
    console.error('Prime application failed:', err);
    if(errEl){ errEl.textContent='❌ Request submit nahi hui. Thodi der baad dobara try karo.'; errEl.style.display='block'; }
  } finally {
    captchaReset('prime');
    if(btn) btn.disabled=false;
    if(btxt) btxt.style.display='inline';
    if(bload) bload.style.display='none';
  }
};
 
// ===== CHECK CARD STATUS =====
window.checkCardStatus = async function() {
  const val=$('card-check-input')?.value.trim().toUpperCase();
  const res=$('card-check-result');
  if(!val||!res) return;
  if(!rateLimitCheck('cbh_card_lookup_rl',20,3600000)){
    res.style.display='block';
    res.innerHTML='<span style="color:var(--danger)">❌ Too many checks. 1 ghante baad try karo.</span>';
    return;
  }
  if(!/^CBH-[A-Z0-9-]{6,}$/.test(val)){
    res.style.display='block';
    res.innerHTML='<span style="color:var(--danger)">❌ Sirf valid card number se check hoga (phone lookup disabled).</span>';
    return;
  }
  res.style.display='block';
  res.innerHTML='<span style="color:var(--muted)">🔍 Checking...</span>';
  try {
    let cards=[];
    const s1=await getDocs(query(collection(db,'primeCards'),where('cardNumber','==',val)));
    s1.forEach(d=>cards.push({id:d.id,...d.data()}));
    if(!cards.length){ res.innerHTML='<span style="color:var(--danger)">❌ Card nahi mila.</span>'; return; }
    const c=cards[0];
    const sc=c.status==='active'?'var(--green)':c.status==='expired'?'var(--danger)':'var(--gold)';
    const sl=c.status==='active'?'✅ Active':c.status==='expired'?'❌ Expired':'⏳ Pending';
    res.innerHTML=`<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:1rem">
      <div style="font-family:var(--font-h);font-size:0.78rem;color:${sc};margin-bottom:0.5rem">${sl}</div>
      <div style="font-size:0.82rem;color:var(--white);font-family:var(--font-alt);line-height:1.9">
        <b>Card:</b> ${escHTML(maskCard(c.cardNumber||'—'))}<br>
        <b>Name:</b> ${escHTML(maskName(c.name||''))}<br>
        <b>Plan:</b> ${c.plan==='weekly'?'📅 Weekly':'📆 Monthly'}<br>
        <b>Balance:</b> <span style="color:var(--gold)">${escHTML(c.balance||'—')}</span><br>
        <b>Valid Till:</b> ${escHTML(c.expiry||'—')}<br>
        ${c.status!=='active'?'<span style="color:var(--danger);font-size:0.78rem">Card active nahi — staff se milein.</span>':''}
      </div>
    </div>`;
  } catch(e){
    console.error('Card status lookup failed:', e);
    res.innerHTML='<span style="color:var(--danger)">❌ Status abhi fetch nahi ho paya. Thodi der baad try karo.</span>';
  }
};
 
// ===== BOOKING =====
const SEAT_LIMITS = {'gaming-pc':5,'ps5':2,'internet':8,'printing':3,'form-filling':3,'other':5};
const PAYMENT_PHONE = '8829822950';
const DEFAULT_BOOKING_HOURLY_RATES = {
  'gaming-pc': 40,
  'ps5': 60,
  'internet': 30,
  'mobile': 30,
  'printing': 30,
  'form-filling': 30,
  'other': 30
};
let BOOKING_HOURLY_RATES = { ...DEFAULT_BOOKING_HOURLY_RATES };
let CUSTOM_BOOKING_SERVICES = {};

const BOOKING_SERVICE_LABELS = {
  'gaming-pc': '🖥️ Gaming PC',
  'ps5': '🎮 PS5 Gaming',
  'internet': '🌐 Internet / Browsing',
  'printing': '🖨️ Printing & Scanning',
  'form-filling': '📋 Online Form Filling',
  'other': '🔧 Other'
};

function normalizeBookingRates(raw = {}) {
  const base = { ...DEFAULT_BOOKING_HOURLY_RATES };
  Object.keys(base).forEach(k => {
    const n = parseInt(raw[k], 10);
    if (Number.isFinite(n) && n > 0) base[k] = n;
  });
  return base;
}

function normalizeBookingCustomServices(raw = {}) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;

  Object.entries(raw).forEach(([k, v]) => {
    const key = String(k || '').trim().toLowerCase();
    if (!key || Object.prototype.hasOwnProperty.call(DEFAULT_BOOKING_HOURLY_RATES, key)) return;

    const nameCandidate = v && typeof v === 'object' ? String(v.name || '').trim() : '';
    const priceCandidate = v && typeof v === 'object'
      ? parseInt(v.price ?? v.rate ?? v.amount, 10)
      : parseInt(v, 10);
    if (!Number.isFinite(priceCandidate) || priceCandidate < 1) return;

    out[key] = {
      name: nameCandidate || key.replace(/^custom-/, '').replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
      price: Math.min(999, priceCandidate)
    };
  });

  return out;
}

function renderBookingServiceOptions() {
  const sel = $('bk-service');
  if (!sel) return;

  const prev = sel.value;
  sel.querySelectorAll('option[data-custom-service="1"], option[data-custom-sep="1"]').forEach(o => o.remove());

  const entries = Object.entries(CUSTOM_BOOKING_SERVICES)
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  if (entries.length) {
    const sep = document.createElement('option');
    sep.value = '';
    sep.disabled = true;
    sep.dataset.customSep = '1';
    sep.textContent = '── Other Services (Owner Set) ──';
    sel.appendChild(sep);

    entries.forEach(([key, data]) => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.dataset.customService = '1';
      opt.textContent = `✨ ${data.name}`;
      sel.appendChild(opt);
    });
  }

  if (prev && Array.from(sel.options).some(o => o.value === prev)) {
    sel.value = prev;
  }
}

function renderBookingLiveRateList() {
  const host = $('bk-live-rate-list');
  if (!host) return;

  const baseRows = [
    { key: 'gaming-pc', label: BOOKING_SERVICE_LABELS['gaming-pc'] },
    { key: 'ps5', label: BOOKING_SERVICE_LABELS.ps5 },
    { key: 'internet', label: BOOKING_SERVICE_LABELS.internet },
    { key: 'printing', label: BOOKING_SERVICE_LABELS.printing },
    { key: 'form-filling', label: BOOKING_SERVICE_LABELS['form-filling'] },
    { key: 'other', label: BOOKING_SERVICE_LABELS.other }
  ];

  const customRows = Object.entries(CUSTOM_BOOKING_SERVICES)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([key, data]) => ({ key, label: `✨ ${data.name}`, rate: data.price }));

  const rowHtml = [
    ...baseRows.map(r => ({ ...r, rate: BOOKING_HOURLY_RATES[r.key] || 30 })),
    ...customRows
  ].map(r => `
    <div class="avail-row">
      <span class="avail-label">${escHTML(r.label)}</span>
      <span class="avail-val" style="color:var(--gold)">Rs.${r.rate}/hr</span>
    </div>
  `).join('');

  host.innerHTML = rowHtml || '<div style="color:var(--muted)">Rates unavailable right now.</div>';
}

function durationFromTimeRange(startTime, endTime) {
  if (!isValidTimeHHMM(startTime) || !isValidTimeHHMM(endTime)) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return null;
  return diff;
}

function deriveBookingWindow(startTime, endTime, durationMin) {
  if(!isValidTimeHHMM(startTime)) return null;
  const startMin = hhmmToMinutes(startTime);
  if(startMin===null) return null;

  if(endTime) {
    const endMin = hhmmToMinutes(endTime);
    if(endMin===null || endMin<=startMin) return null;
    return { startMin, endMin };
  }

  const dur = parseInt(durationMin, 10);
  if(!Number.isFinite(dur) || dur < 1) return null;
  return { startMin, endMin: startMin + dur };
}

function deriveWindowFromBookingDoc(b) {
  const start = String(b.startTime || b.time || '');
  const end = String(b.endTime || '');
  const duration = parseInt(b.duration || '0', 10);
  return deriveBookingWindow(start, end, duration);
}

function windowsOverlap(a, b) {
  if(!a || !b) return false;
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

function bookingRateForService(service) {
  if (CUSTOM_BOOKING_SERVICES[service]?.price) return CUSTOM_BOOKING_SERVICES[service].price;
  return BOOKING_HOURLY_RATES[service] || 30;
}

function calcAmountByDuration(ratePerHour, durationMin) {
  if(!ratePerHour || !durationMin || durationMin <= 0) return 0;
  return Math.max(0, Math.round((ratePerHour * durationMin) / 60));
}

function findNearestFiveSuggestion(ratePerHour, durationMin) {
  const current = calcAmountByDuration(ratePerHour, durationMin);
  if(current <= 0 || current % 5 === 0) return '';

  let up = null;
  for(let m = durationMin + 1; m <= 600; m++) {
    const amt = calcAmountByDuration(ratePerHour, m);
    if(amt % 5 === 0 && amt !== current) { up = { delta: m - durationMin, amount: amt }; break; }
  }

  let down = null;
  for(let m = durationMin - 1; m >= 1; m--) {
    const amt = calcAmountByDuration(ratePerHour, m);
    if(amt % 5 === 0 && amt !== current) { down = { delta: durationMin - m, amount: amt }; break; }
  }

  const bits = [];
  if(up) bits.push(`+${up.delta} min -> Rs.${up.amount}`);
  if(down) bits.push(`-${down.delta} min -> Rs.${down.amount}`);
  if(!bits.length) return '';
  return `Suggestion: ${bits.join(' | ')}`;
}

function updateBookingBillPreview() {
  const box = $('bk-bill-preview');
  const mainTxt = $('bk-bill-main-txt');
  const amtEl = $('bk-bill-amt');
  const noteEl = $('bk-bill-note');
  if(!box || !mainTxt || !amtEl || !noteEl) return;

  const service = $('bk-service')?.value;
  const startTime = getBookingStartTime24();
  const endTime = getBookingEndTime24();
  const manualDur = parseInt($('bk-duration')?.value || '0', 10);
  const rangeDur = endTime ? durationFromTimeRange(startTime, endTime) : null;
  const dur = rangeDur || manualDur;

  if(endTime && startTime && rangeDur === null) {
    mainTxt.textContent = 'Start/End time check karo';
    amtEl.textContent = 'Rs.0';
    noteEl.textContent = 'End time start time se aage hona chahiye.';
    box.style.display = 'block';
    return;
  }

  if(!service || !dur || dur < 1) {
    box.style.display = 'none';
    return;
  }

  if(rangeDur && $('bk-duration')) $('bk-duration').value = String(rangeDur);

  const rate = bookingRateForService(service);
  const amount = calcAmountByDuration(rate, dur);
  const suggestion = findNearestFiveSuggestion(rate, dur);
  const hoursTxt = (dur / 60).toFixed(2).replace(/\.00$/, '');

  mainTxt.textContent = `${dur} min (${hoursTxt} hr) @ Rs.${rate}/hr`;
  amtEl.textContent = `Rs.${amount}`;
  noteEl.textContent = suggestion || (rangeDur ? 'Duration start/end time se auto-calc hui hai.' : 'Rounded amount direct billed hoga.');
  box.style.display = 'block';
}
 
function checkRateLimit(phone) {
  try { const k='cbh_bk_'+new Date().toDateString(); return (JSON.parse(localStorage.getItem(k)||'{}')[phone]||0)<3; }
  catch(e){ return true; }
}
function incrementRateLimit(phone) {
  try { const k='cbh_bk_'+new Date().toDateString(); const s=JSON.parse(localStorage.getItem(k)||'{}'); s[phone]=(s[phone]||0)+1; localStorage.setItem(k,JSON.stringify(s)); }
  catch(e){}
}
 
// Date limits
(function(){
  const di=$('bk-date'); if(!di) return;
  const today=new Date().toISOString().split('T')[0];
  const tm=new Date(); tm.setDate(tm.getDate()+1);
  di.min=today; di.max=tm.toISOString().split('T')[0]; di.value=today;
  const hint=$('bk-date-hint'); if(hint) hint.textContent='(sirf aaj ya kal)';
  di.addEventListener('change',function(){
    const box=$('bk-payment-box');
    if(box) box.style.display=(this.value>today)?'block':'none';
  });
})();
 
function checkAdvanceBooking(dateVal) {
  const today=new Date().toISOString().split('T')[0];
  const box=$('bk-payment-box');
  if(box) box.style.display=(dateVal&&dateVal>today)?'block':'none';
}

// SECURITY NOTE: This is a client-side pre-check only.
// Real slot locking and validation must run server-side via Cloud Function/transaction.
async function checkSlotCapacityBeforeSave(service, date, time, endTime, durationMin) {
  const limit = SEAT_LIMITS[service] || 5;
  const requestedWindow = deriveBookingWindow(time, endTime, durationMin);
  if(!requestedWindow) {
    return { ok: false, used: 0, limit, reason: 'invalid_window' };
  }

  const snap = await getDocs(collection(db, 'bookings'));
  let used = 0;

  snap.forEach(d => {
    const b = d.data() || {};
    if (b.service !== service || b.date !== date) return;
    const st = String(b.status || '').toLowerCase();
    if (!(st === 'pending' || st === 'confirmed' || st === 'pending_payment')) return;

    const bookedWindow = deriveWindowFromBookingDoc(b);
    if (windowsOverlap(requestedWindow, bookedWindow)) used++;
  });

  return { ok: used < limit, used, limit, reason: null };
}
 
async function checkSlotAvail() {
  const service=$('bk-service')?.value;
  const date=$('bk-date')?.value;
  const startTime=getBookingStartTime24();
  const endTime=getBookingEndTime24() || '';
  const duration = parseInt($('bk-duration')?.value || '0', 10);
  const box=$('slot-availability');
  if(!box) return;

  if(!service){
    box.innerHTML='';
    return;
  }

  if(!date || !startTime){
    box.innerHTML=`<div style="background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.18);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--green);font-family:var(--font-alt)">✅ Max ${SEAT_LIMITS[service]||5} seats per slot</div>`;
    return;
  }

  if(!isValidTimeHHMM(startTime)) {
    box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ Start time valid format me select karo.</div>';
    return;
  }

  if(!isWithinBookingHours(startTime)) {
    box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ Gaming cafe off-time me entry ho rahi hai. Time 7:00 AM se 9:00 PM ke beech rakho.</div>';
    return;
  }

  if(endTime) {
    if(!isValidTimeHHMM(endTime)) {
      box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ End time valid format me select karo.</div>';
      return;
    }
    if(!isWithinBookingHours(endTime)) {
      box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ End time off-time me ja raha hai. Time 7:00 AM se 9:00 PM ke beech rakho.</div>';
      return;
    }
    if(durationFromTimeRange(startTime, endTime) === null) {
      box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ End time start time se aage hona chahiye.</div>';
      return;
    }
  }

  box.innerHTML='<div style="background:rgba(0,220,255,0.06);border:1px solid rgba(0,220,255,0.2);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--cyan);font-family:var(--font-alt)">⏳ Checking live slot availability...</div>';
  try {
    const state = await checkSlotCapacityBeforeSave(service, date, startTime, endTime, duration || 60);
    if(state.reason === 'invalid_window') {
      box.innerHTML='<div style="background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--danger);font-family:var(--font-alt)">❌ Time window invalid hai. Start/End time check karo.</div>';
      return;
    }
    const left = Math.max(0, state.limit - state.used);
    const color = left <= 0 ? 'var(--danger)' : left <= 1 ? 'var(--gold)' : 'var(--green)';
    const status = left <= 0 ? 'Slot currently full' : `${left} seats left`;
    box.innerHTML=`<div style="background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.18);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:${color};font-family:var(--font-alt)">📊 ${status} (used ${state.used}/${state.limit})</div>`;
  } catch (e) {
    const code = String(e?.code || '');
    if(code.includes('permission-denied')) {
      box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ Live availability check temporary unavailable hai. Submit ke time final validation hoga.</div>';
      return;
    }
    box.innerHTML='<div style="background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--danger);font-family:var(--font-alt)">⚠️ Availability fetch nahi ho payi. Submit ke time re-check hoga.</div>';
  }
}
 
setTimeout(()=>{
  $('bk-service')?.addEventListener('change',()=>{ checkSlotAvail(); updateBookingBillPreview(); });
  $('bk-date')?.addEventListener('change',()=>{ checkSlotAvail(); checkAdvanceBooking($('bk-date')?.value); });
  $('bk-time')?.addEventListener('change',()=>{ syncAmPmFromTime('bk-time','bk-time-ampm'); checkSlotAvail(); checkAdvanceBooking($('bk-date')?.value); });
  $('bk-time')?.addEventListener('input',updateBookingBillPreview);
  $('bk-end-time')?.addEventListener('change',()=>{ syncAmPmFromTime('bk-end-time','bk-end-time-ampm'); updateBookingBillPreview(); checkSlotAvail(); });
  $('bk-end-time')?.addEventListener('input',updateBookingBillPreview);
  $('bk-time-ampm')?.addEventListener('change',()=>{ updateBookingBillPreview(); checkSlotAvail(); });
  $('bk-end-time-ampm')?.addEventListener('change',()=>{ updateBookingBillPreview(); checkSlotAvail(); });
  $('bk-duration')?.addEventListener('input',()=>{ updateBookingBillPreview(); checkSlotAvail(); });
  updateBookingBillPreview();
},500);
 
window.submitBooking = async function() {
  // SECURITY NOTE: Client-side checks are bypassable. Validate all inputs server-side in Cloud Functions/Rules.
  const name=cleanInput($('bk-name')?.value,80);
  const phone=cleanInput($('bk-phone')?.value,16);
  const service=$('bk-service')?.value;
  const date=$('bk-date')?.value;
  const time=getBookingStartTime24();
  const endTime=getBookingEndTime24();
  const durRaw=$('bk-duration')?.value;
  let dur=durRaw?parseInt(durRaw,10):60;
  const card=cleanInput($('bk-card')?.value,40).toUpperCase();
  const note=cleanInput($('bk-note')?.value,300);
  let ratePerHour=bookingRateForService(service);
  let estimatedAmount=0;
  let pricingSuggestion='';
 
  ['bk-name-err','bk-phone-err','bk-service-err','bk-date-err','bk-time-err','bk-end-time-err'].forEach(clearErr);
  const bkOk=$('bk-ok'), bkErr=$('bk-err');
  if(bkOk){bkOk.style.display='none';bkOk.innerHTML='';}
  if(bkErr){bkErr.style.display='none';bkErr.textContent='';}
  const bookingCaptchaToken = await getCaptchaToken('booking');
  if(!bookingCaptchaToken){
    if(bkErr){bkErr.textContent='❌ Please verify reCAPTCHA first.'; bkErr.style.display='block';}
    return;
  }
  if(RECAPTCHA_VERIFY_ENDPOINT){
    const serverOk = await verifyCaptchaServer('booking', bookingCaptchaToken);
    if(!serverOk){
      if(bkErr){bkErr.textContent='❌ reCAPTCHA verification failed. Dobara try karo.'; bkErr.style.display='block';}
      return;
    }
  }
  if(looksLikeBot('bk-website','bk-btn')){
    if(bkErr){bkErr.textContent='❌ Suspicious request blocked. Thoda ruk ke dobara try karo.'; bkErr.style.display='block';}
    return;
  }
 
  let valid=true;
  if(!name)  { showErr('bk-name-err','Naam required hai.');      valid=false; }
  else if(!isLikelyName(name)){ showErr('bk-name-err','Valid naam daalo.'); valid=false; }
  if(!phone) { showErr('bk-phone-err','Phone required hai.');    valid=false; }
  else if(!/^[6-9][0-9]{9}$/.test(phone)){ showErr('bk-phone-err','Valid 10-digit phone daalo.'); valid=false; }
  if(!service){ showErr('bk-service-err','Service select karo.'); valid=false; }
  if(!date)  { showErr('bk-date-err','Date select karo.');       valid=false; }
  if(!time)  { showErr('bk-time-err','Start time daalo.');  valid=false; }
  else if(!isValidTimeHHMM(time)){ showErr('bk-time-err','Valid time daalo (jaise 10:20).'); valid=false; }
  else if(!isWithinBookingHours(time)){ showErr('bk-time-err','Gaming cafe off-time me entry ho rahi hai. Time 7:00 AM se 9:00 PM ke beech rakho.'); valid=false; }

  if(endTime) {
    if(!isValidTimeHHMM(endTime)) {
      showErr('bk-end-time-err','End time valid format me daalo (jaise 11:20).');
      valid = false;
    } else if(!isWithinBookingHours(endTime)) {
      showErr('bk-end-time-err','End time off-time me ja raha hai. Time 7:00 AM se 9:00 PM ke beech rakho.');
      valid = false;
    } else {
      const rangeDur = durationFromTimeRange(time, endTime);
      if(!rangeDur) {
        showErr('bk-end-time-err','End time start time se aage hona chahiye.');
        valid = false;
      } else {
        dur = rangeDur;
      }
    }
  }

  if(!dur || dur<15 || dur>480){
    if(bkErr){bkErr.textContent='⚠️ Duration 15 se 480 minutes ke beech honi chahiye.'; bkErr.style.display='block';}
    valid=false;
  }
  if(!valid) return;

  ratePerHour=bookingRateForService(service);
  estimatedAmount=calcAmountByDuration(ratePerHour,dur);
  pricingSuggestion=findNearestFiveSuggestion(ratePerHour,dur);
 
  const today=new Date(); today.setHours(0,0,0,0);
  const selDate=new Date(date+'T00:00:00');
  if(selDate>new Date(today.getTime()+86400000)){ showErr('bk-date-err','Sirf aaj ya kal ki booking allowed hai.'); return; }

  const now = new Date();
  const selectedStartMin = hhmmToMinutes(time);
  if(date===todayYmd() && selectedStartMin!==null){
    const nowMin = now.getHours()*60 + now.getMinutes();
    if(selectedStartMin <= nowMin){
      showErr('bk-time-err','Aaj ke liye future time choose karo. Past time allowed nahi hai.');
      return;
    }
  }
 
  if(!checkRateLimit(phone)){
    if(bkErr){bkErr.textContent='⚠️ Is phone se aaj 3 bookings ho chuki hain. WhatsApp: '+PAYMENT_PHONE; bkErr.style.display='block';}
    return;
  }
  if(!canUseDailyDeviceQuota('cbh_bk_device_daily', 8)){
    if(bkErr){bkErr.textContent='⚠️ Is device se aaj booking attempts limit ho gayi hai. Kal try karo ya contact karo.'; bkErr.style.display='block';}
    return;
  }
  if(!consumeWindowRateLimit('cbh_bk_submit_min_'+phone,1,60000)){
    if(bkErr){bkErr.textContent='⚠️ 1 minute me sirf 1 booking allowed hai. Thoda rukke dobara try karo.'; bkErr.style.display='block';}
    return;
  }
 
  const btn=$('bk-btn'); if(btn) btn.disabled=true;
  const btxt=$('bk-txt'), bload=$('bk-load');
  if(btxt) btxt.style.display='none';
  if(bload) bload.style.display='inline';
 
  try {
    const slotState = await checkSlotCapacityBeforeSave(service, date, time, endTime || '', dur);
    if(slotState.reason === 'invalid_window'){
      showErr('bk-end-time-err','Time window invalid hai. Start/End dobara set karo.');
      return;
    }
    if(!slotState.ok){
      if(bkErr){ bkErr.textContent='⚠️ Is slot ke liye seats full ho chuki hain. Dusra time choose karo.'; bkErr.style.display='block'; }
      return;
    }

    const isAdv=selDate.getTime()>today.getTime();
    const trackCode=generateBookingCode();
    const bookingRef='CBH-BK-'+trackCode;
 
    await addDoc(collection(db,'bookings'),{
      name, phone, service, date, time, startTime: time, endTime: endTime || null,
      duration:String(dur), primeCard:card||null, note:note||null,
      ratePerHour, estimatedAmount, pricingSuggestion:pricingSuggestion||null,
      status:isAdv?'pending_payment':'pending',
      bookingRef, trackCode,        // ← trackCode alag field bhi save hota hai
      isAdvance:isAdv,
      createdAt:new Date().toISOString(), source:'website'
    });
 
    incrementRateLimit(phone);
    incrementDailyDeviceQuota('cbh_bk_device_daily');

    const prettyStart = formatTime12(time);
    const prettyEnd = endTime ? formatTime12(endTime) : null;
 
    if(bkOk){
      bkOk.innerHTML=`<div style="text-align:center;padding:0.5rem 0 1rem">
        <div style="font-size:0.75rem;color:var(--green);font-family:var(--font-alt);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.08em">✅ Booking Request Mili!</div>
        <div style="font-size:0.72rem;color:var(--txt2);font-family:var(--font-alt);margin-bottom:0.75rem">Apna booking code note karo:</div>
        <div style="font-family:var(--font-h);font-size:2.5rem;font-weight:900;color:var(--cyan);letter-spacing:0.15em;text-shadow:0 0 20px rgba(0,220,255,0.4);margin-bottom:0.5rem">${trackCode}</div>
        <div style="font-size:0.68rem;color:var(--muted);font-family:var(--font-alt);margin-bottom:1rem">Ye 8-character code save karo — status check karne ke kaam aayega</div>
        <div style="font-size:0.8rem;color:var(--gold);font-family:var(--font-h);margin-bottom:0.4rem">Estimated Charge: Rs.${estimatedAmount} (${dur} min @ Rs.${ratePerHour}/hr)</div>
        <div style="font-size:0.75rem;color:var(--txt2);font-family:var(--font-alt);margin-bottom:0.8rem">Time: ${prettyStart}${prettyEnd?` - ${prettyEnd}`:''}</div>
        ${isAdv?`<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:8px;padding:0.75rem;font-size:0.8rem;color:var(--gold);font-family:var(--font-alt)">
          💳 Kal ki booking ke liye payment karni hogi<br>
          📞 Call karo: <a href="tel:+91${PAYMENT_PHONE}" style="color:var(--cyan);font-weight:700">${PAYMENT_PHONE}</a>
        </div>`:`<div style="font-size:0.8rem;color:var(--txt2);font-family:var(--font-alt)">
          📞 Hum <strong style="color:var(--white)">${maskPhone(phone)}</strong> pe call karenge confirm karne ke liye
        </div>`}
      </div>`;
      bkOk.style.display='block';
    }
 
    [$('bk-name'),$('bk-phone'),$('bk-card'),$('bk-note')].forEach(el=>{if(el)el.value='';});
    if($('bk-service'))$('bk-service').value='';
    if($('bk-time'))$('bk-time').value='';
    if($('bk-end-time'))$('bk-end-time').value='';
    if($('bk-time-ampm'))$('bk-time-ampm').value='am';
    if($('bk-end-time-ampm'))$('bk-end-time-ampm').value='am';
    if($('bk-duration'))$('bk-duration').value='60';
    const sab=$('slot-availability'); if(sab) sab.innerHTML='';
    const payBox=$('bk-payment-box'); if(payBox) payBox.style.display='none';
    const billBox=$('bk-bill-preview'); if(billBox) billBox.style.display='none';
 
  } catch(err) {
    console.error('Booking submit failed:', err);
    if(bkErr){ bkErr.textContent='❌ Booking abhi submit nahi hui. Thodi der baad dobara try karo.'; bkErr.style.display='block'; }
  } finally {
    captchaReset('booking');
    if(btn) btn.disabled=false;
    if(btxt) btxt.style.display='inline';
    if(bload) bload.style.display='none';
  }
};
 
// ===== INQUIRY =====
window.submitInquiry = async function() {
  // SECURITY NOTE: Client-side checks are bypassable. Validate all inputs server-side in Cloud Functions/Rules.
  const name=cleanInput($('inq-name')?.value,80), phone=cleanInput($('inq-phone')?.value,16);
  const reason=$('inq-reason')?.value, msg=$('inq-msg')?.value.trim();
  ['inq-name-err','inq-phone-err','inq-reason-err'].forEach(clearErr);
  const okEl=$('inq-ok'), errEl=$('inq-err');
  if(okEl) okEl.style.display='none';
  if(errEl){errEl.style.display='none';errEl.textContent='';}
  const inquiryCaptchaToken = await getCaptchaToken('inquiry');
  if(!inquiryCaptchaToken){
    if(errEl){ errEl.textContent='❌ Please verify reCAPTCHA first.'; errEl.style.display='block'; }
    return;
  }
  if(RECAPTCHA_VERIFY_ENDPOINT){
    const serverOk = await verifyCaptchaServer('inquiry', inquiryCaptchaToken);
    if(!serverOk){
      if(errEl){ errEl.textContent='❌ reCAPTCHA verification failed. Dobara try karo.'; errEl.style.display='block'; }
      return;
    }
  }
  if(looksLikeBot('inq-website','inq-btn')){
    if(errEl){ errEl.textContent='❌ Suspicious request blocked. Thoda ruk ke dobara try karo.'; errEl.style.display='block'; }
    return;
  }
  let valid=true;
  if(!name){ showErr('inq-name-err','Naam required hai.'); valid=false; }
  else if(!isLikelyName(name)){ showErr('inq-name-err','Valid naam daalo.'); valid=false; }
  if(!phone){ showErr('inq-phone-err','Phone required hai.'); valid=false; }
  else if(!/^[6-9][0-9]{9}$/.test(phone)){ showErr('inq-phone-err','Valid 10-digit phone daalo.'); valid=false; }
  if(!reason){ showErr('inq-reason-err','Reason select karo.'); valid=false; }
  if(!valid) return;
  if(!canUseDailyDeviceQuota('cbh_inquiry_device_daily', 6)){
    if(errEl){ errEl.textContent='⚠️ Is device se aaj inquiry limit ho gayi hai. Kal try karo.'; errEl.style.display='block'; }
    return;
  }
  const btn=$('inq-btn'); if(btn) btn.disabled=true;
  const btxt=$('inq-txt'), bload=$('inq-load');
  if(btxt) btxt.style.display='none';
  if(bload) bload.style.display='inline';
  try {
    await addDoc(collection(db,'inquiries'),{name,phone,reason,message:cleanInput(msg,300)||null,status:'new',createdAt:new Date().toISOString(),source:'website'});
    incrementDailyDeviceQuota('cbh_inquiry_device_daily');
    if(okEl){ okEl.textContent='✅ Inquiry mili! Hum call karenge. WhatsApp: 8829822950'; okEl.style.display='block'; }
    [$('inq-name'),$('inq-phone'),$('inq-msg')].forEach(el=>{if(el)el.value='';});
    if($('inq-reason'))$('inq-reason').value='';
  } catch(err) {
    console.error('Inquiry submit failed:', err);
    if(errEl){ errEl.textContent='❌ Inquiry abhi submit nahi hui. Thodi der baad dobara try karo.'; errEl.style.display='block'; }
  } finally {
    captchaReset('inquiry');
    if(btn) btn.disabled=false;
    if(btxt) btxt.style.display='inline';
    if(bload) bload.style.display='none';
  }
};
 
// ===== SIDEBAR NAV =====
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    const href=this.getAttribute('href');
    if(href&&href.startsWith('#')){ e.preventDefault(); navTo(this,href.replace('#','')); }
  });
});
 
document.addEventListener('click',e=>{
  const sb=$('sidebar'),ov=$('sidebar-overlay');
  if(sb&&ov&&sb.classList.contains('open')&&!sb.contains(e.target)&&!$('menu-toggle')?.contains(e.target)){
    sb.classList.remove('open'); ov.classList.remove('show');
  }
});
 
document.querySelectorAll('.page-section.active .reveal').forEach(el=>el.classList.add('visible'));
 
// ===== BOOKING STATUS CHECK =====
window.checkBookingStatus = async function() {
  const inp=$('bk-track-input'), res=$('bk-track-result');
  const phoneInp=$('bk-track-phone');
  if(!inp||!res||!phoneInp) return;
  const phone=cleanInput(phoneInp.value,16);
  if(!/^[6-9][0-9]{9}$/.test(phone)){
    res.style.display='block';
    res.innerHTML='<div style="color:var(--danger);font-family:var(--font-alt);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px">❌ Booking wala valid 10-digit phone number daalo.</div>';
    return;
  }
  if(!consumeWindowRateLimit('cbh_booking_lookup_rl_'+phone,5,3600000)){
    res.style.display='block';
    res.innerHTML='<div style="color:var(--danger);font-family:var(--font-alt);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px">❌ Too many checks. 1 ghante baad try karo.</div>';
    return;
  }
  const code=inp.value.trim().toUpperCase();
  if(!code || !(/^[A-Z0-9]{8}$/.test(code) || /^[0-9]{5}$/.test(code))){
    res.style.display='block';
    res.innerHTML='<div style="color:var(--danger);font-family:var(--font-alt);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px">❌ Valid booking code daalo (jaise: A1B2C3D4)</div>';
    return;
  }
  res.style.display='block';
  res.innerHTML='<div style="color:var(--muted);font-size:0.82rem;padding:0.75rem">🔍 Searching...</div>';
  try {
    // Search by trackCode field first, then bookingRef fallback
    let snap=await getDocs(query(collection(db,'bookings'),where('trackCode','==',code)));
    if(snap.empty) snap=await getDocs(query(collection(db,'bookings'),where('bookingRef','==','CBH-BK-'+code)));
 
    if(snap.empty){
      res.innerHTML=`<div style="color:var(--danger);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px;border:1px solid rgba(255,68,68,0.2)">
        ❌ Booking details verify nahi hui.<br>
        <span style="font-size:0.78rem;color:var(--muted)">WhatsApp: <a href="https://wa.me/918829822950" style="color:var(--cyan)">8829822950</a></span>
      </div>`;
      return;
    }
 
    const b=snap.docs[0].data();
    if(String(b.phone||'')!==phone){
      res.innerHTML=`<div style="color:var(--danger);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px;border:1px solid rgba(255,68,68,0.2)">
        ❌ Booking details verify nahi hui. Code aur phone match karo.
      </div>`;
      return;
    }
    const sc={pending:'var(--gold)',confirmed:'var(--green)',rejected:'var(--danger)',pending_payment:'var(--cyan)'};
    const sl={
      pending:'⏳ Pending — Review ho rahi hai, call aayegi',
      confirmed:'✅ Confirmed! Booking pakki hai 🎮',
      rejected:'❌ Rejected — Doosra time book karo',
      pending_payment:'💳 Payment Pending — Call karo: '+PAYMENT_PHONE
    };
    const svcL={'gaming-pc':'🖥️ Gaming PC','ps5':'🎮 PS5 Gaming','internet':'🌐 Internet','printing':'🖨️ Printing','form-filling':'📋 Form Filling','other':'📌 Other'};
    const sColor=sc[b.status]||'var(--gold)';
 
    res.innerHTML=`<div style="background:var(--card);border:1px solid ${sColor}44;border-radius:var(--r);padding:1.25rem">
      <div style="font-family:var(--font-h);font-size:1rem;color:${sColor};margin-bottom:1rem;padding:0.6rem 1rem;background:${sColor}11;border-radius:8px;border:1px solid ${sColor}33">${sl[b.status]||'⏳ Pending'}</div>
      <div style="font-family:var(--font-alt);font-size:0.85rem;line-height:2.2;color:var(--txt2)">
        <b style="color:var(--white)">Customer:</b> ${escHTML(maskName(b.name||''))}<br>
        <b style="color:var(--white)">Date:</b> ${escHTML(b.date||'—')}<br>
        <b style="color:var(--white)">Code:</b> <span style="color:var(--cyan);font-family:var(--font-h);letter-spacing:0.1em">${escHTML(code)}</span>
      </div>
      ${b.status==='rejected'?`<div style="margin-top:1rem;padding:0.75rem;background:rgba(0,220,255,0.05);border-radius:8px;font-size:0.8rem;color:var(--txt2)">
        📞 Naya slot: <a href="https://wa.me/918829822950" style="color:var(--cyan);font-weight:600">WhatsApp 8829822950</a>
      </div>`:''}
    </div>`;
  } catch(err) {
    console.error('Booking status lookup failed:', err);
    res.innerHTML=`<div style="color:var(--danger);font-size:0.82rem;padding:0.75rem">❌ Status abhi fetch nahi ho paya. Thodi der baad try karo.</div>`;
  }
};
 
console.log('✅ CityByteHub Booking v6.0 ready');
 