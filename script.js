// ===== FIREBASE IMPORTS =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, query, where }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDatabase, ref, onValue, get }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
 
const firebaseConfig = {
  apiKey: "AIzaSyB7YPyOX4C-UwrzGXz13n_FREKHQdJw82k",
  authDomain: "citybytehub-clothes.firebaseapp.com",
  databaseURL: "https://citybytehub-clothes-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "citybytehub-clothes",
  storageBucket: "citybytehub-clothes.firebasestorage.app",
  messagingSenderId: "209730359699",
  appId: "1:209730359699:web:23ceff264fbf32b693d866",
  measurementId: "G-DV4QHKQSVB"
};
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const rtdb = getDatabase(app);
const RTDB_REST_PRICING_URL = `${String(firebaseConfig.databaseURL || '').replace(/\/+$/,'')}/pricing.json`;
const RTDB_REST_ANNOUNCEMENT_URL = `${String(firebaseConfig.databaseURL || '').replace(/\/+$/,'')}/announcements/latest.json`;
const RTDB_REST_SEATS_URL = `${String(firebaseConfig.databaseURL || '').replace(/\/+$/,'')}/seats.json`;
const RTDB_REST_BOOKING_AVAILABILITY_URLS = [
  `${String(firebaseConfig.databaseURL || '').replace(/\/+$/,'')}/booking/availability.json`,
  `${String(firebaseConfig.databaseURL || '').replace(/\/+$/,'')}/live/bookingAvailability.json`
];

// SECURITY NOTE: Enable Firebase App Check for CSRF protection.
// SECURITY NOTE: Restrict authorized domains in Firebase Console.

const RECAPTCHA_SITE_KEY = document.querySelector('meta[name="recaptcha-site-key"]')?.getAttribute('content') || '';
const RECAPTCHA_VERIFY_ENDPOINT = document.querySelector('meta[name="recaptcha-verify-endpoint"]')?.getAttribute('content') || '';
const ABUSE_CHECK_ENDPOINT = document.querySelector('meta[name="abuse-check-endpoint"]')?.getAttribute('content') || '/api/abuse-check';
const RECAPTCHA_MODE = (document.querySelector('meta[name="recaptcha-mode"]')?.getAttribute('content') || 'v3').toLowerCase();
const IS_LOCAL_DEV = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
const IP_LOOKUP_URL = 'https://api64.ipify.org?format=json';
let CAPTCHA_ENABLED = false;
const rcWidgets = { prime: null, booking: null, inquiry: null };
let _cachedPublicIpPromise = null;
const DEVICE_ID_KEY = 'cbh_device_id_v1';

if (IS_LOCAL_DEV) {
  console.warn('reCAPTCHA bypassed in local development (localhost).');
}

function setAvailabilityLoading(isLoading) {
  document.body?.classList.toggle('availability-loading', !!isLoading);
}

setAvailabilityLoading(true);
 
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
let BOOKING_OPEN_WINDOW = { openMin: 7 * 60, closeMin: 21 * 60, label: '7:00 AM - 9:00 PM' };
function isWithinBookingHours(v){
  const mins = hhmmToMinutes(v);
  if(mins === null) return false;
  const openMin = Number.isFinite(BOOKING_OPEN_WINDOW?.openMin) ? BOOKING_OPEN_WINDOW.openMin : 7 * 60;
  const closeMin = Number.isFinite(BOOKING_OPEN_WINDOW?.closeMin) ? BOOKING_OPEN_WINDOW.closeMin : 21 * 60;
  return mins >= openMin && mins <= closeMin;
}
function bookingHoursLabel(){
  return String(BOOKING_OPEN_WINDOW?.label || '7:00 AM - 9:00 PM');
}
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
  return String($('bk-time')?.value || '');
}
function getBookingEndTime24(){
  return String($('bk-end-time')?.value || '');
}
function syncAmPmFromTime(inputId, ampmId){
  const t = $(inputId)?.value || '';
  const ampm = $(ampmId);
  if(!ampm || !isValidTimeHHMM(t)) return;
  const h = Number(t.split(':')[0]);
  ampm.value = h >= 12 ? 'pm' : 'am';
}

const BOOKING_AUTO_ADVANCE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([readonly]):not([tabindex="-1"])'
].join(',');
const BOOKING_AUTO_ADVANCE_SKIP_IDS = new Set([
  'card-check-input',
  'bk-track-phone',
  'bk-track-input'
]);
const BOOKING_AUTO_ADVANCE_RULES = {
  'prime-phone': { type: 'digits', minLength: 10 },
  'bk-phone': { type: 'digits', minLength: 10 },
  'inq-phone': { type: 'digits', minLength: 10 },
  'bk-time': { type: 'time' },
  'bk-end-time': { type: 'time' }
};

function isBookingFieldVisible(el){
  if(!el || !(el instanceof HTMLElement)) return false;
  if(el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(el);
  if(style.display === 'none' || style.visibility === 'hidden') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getBookingAutoScope(el){
  return el.closest('.form-wrap, .booking-info, .page-section, .container, body') || document.body;
}

function focusNextBookingField(current){
  if(!current || !(current instanceof HTMLElement)) return false;
  const scope = getBookingAutoScope(current);
  const fields = Array.from(scope.querySelectorAll(BOOKING_AUTO_ADVANCE_SELECTOR)).filter(isBookingFieldVisible);
  const idx = fields.indexOf(current);
  if(idx < 0 || idx >= fields.length - 1) return false;
  const next = fields[idx + 1];
  if(!(next instanceof HTMLElement)) return false;
  next.focus();
  if(next instanceof HTMLInputElement && ['text','search','tel','email','number','password','url'].includes(next.type)) {
    next.select();
  }
  return true;
}

function initBookingAutoAdvance(){
  document.addEventListener('keydown', (e)=>{
    if(e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target;
    if(!(target instanceof HTMLElement)) return;
    if(!(target.matches('input, select, textarea'))) return;
    if(target.tagName === 'TEXTAREA') return;
    if(target.dataset.noAutoAdvance === '1') return;
    if(BOOKING_AUTO_ADVANCE_SKIP_IDS.has(target.id || '')) return;
    if(focusNextBookingField(target)) e.preventDefault();
  });

  document.addEventListener('change', (e)=>{
    const target = e.target;
    if(!(target instanceof HTMLElement)) return;
    if(!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;
    if(target.dataset.noAutoAdvance === '1') return;
    if(BOOKING_AUTO_ADVANCE_SKIP_IDS.has(target.id || '')) return;
    if(!String(target.value || '').trim()) return;
    if(target instanceof HTMLInputElement && target.type !== 'time') return;
    setTimeout(()=>{ focusNextBookingField(target); }, 0);
  });

  
  document.addEventListener('input', (e)=>{
    const target = e.target;
    if(!(target instanceof HTMLInputElement)) return;
    if(target.dataset.noAutoAdvance === '1') return;
    if(BOOKING_AUTO_ADVANCE_SKIP_IDS.has(target.id || '')) return;
    const rule = BOOKING_AUTO_ADVANCE_RULES[target.id || ''];
    if(!rule) return;

    if(rule.type === 'time') {
      if(/^\d{2}:\d{2}$/.test(String(target.value || '').trim())) {
        setTimeout(()=>{ focusNextBookingField(target); }, 0);
      }
      return;
    }

    if(rule.type === 'digits') {
      const digits = String(target.value || '').replace(/\D/g, '');
      if(digits.length >= (rule.minLength || 1)) {
        setTimeout(()=>{ focusNextBookingField(target); }, 0);
      }
    }
  });
}

initBookingAutoAdvance();

const FORM_DRAFT_KEY = 'cbh_booking_form_draft_v1';
const FORM_DRAFT_IDS = [
  'prime-name', 'prime-phone', 'selected-plan', 'prime-college', 'prime-note',
  'bk-name', 'bk-phone', 'bk-service', 'bk-date', 'bk-time',
  'bk-end-time', 'bk-duration', 'bk-card', 'bk-note',
  'bk-print-single', 'bk-print-double', 'bk-form-kind', 'bk-form-extra', 'bk-custom-qty',
  'inq-name', 'inq-phone', 'inq-reason', 'inq-msg',
  'bk-track-phone', 'bk-track-input'
];
let _draftPersistTimer = 0;

function readFormDraft() {
  try {
    const raw = localStorage.getItem(FORM_DRAFT_KEY);
    if(!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch(_) {
    return {};
  }
}

function writeFormDraft(nextDraft) {
  try {
    localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(nextDraft || {}));
  } catch(_) {}
}

function persistFormDraftNow() {
  const out = {};
  for(let i = 0; i < FORM_DRAFT_IDS.length; i++) {
    const id = FORM_DRAFT_IDS[i];
    const el = $(id);
    if(!el) continue;
    if(el instanceof HTMLInputElement && el.type === 'checkbox') out[id] = !!el.checked;
    else out[id] = String(el.value ?? '');
  }
  writeFormDraft(out);
}

function queueFormDraftPersist() {
  clearTimeout(_draftPersistTimer);
  _draftPersistTimer = setTimeout(persistFormDraftNow, 120);
}

function clearFormDraftFields(ids = []) {
  if(!ids || !ids.length) return;
  const draft = readFormDraft();
  for(let i = 0; i < ids.length; i++) delete draft[ids[i]];
  writeFormDraft(draft);
}

function restoreFormDraft() {
  const draft = readFormDraft();
  const keys = Object.keys(draft);
  if(!keys.length) return;

  for(let i = 0; i < keys.length; i++) {
    const id = keys[i];
    if(!FORM_DRAFT_IDS.includes(id)) continue;
    const el = $(id);
    if(!el) continue;
    const v = draft[id];
    if(el instanceof HTMLInputElement && el.type === 'checkbox') {
      el.checked = !!v;
      continue;
    }
    el.value = v == null ? '' : String(v);
  }

  const selectedPlan = String($('selected-plan')?.value || '').toLowerCase();
  if((selectedPlan === 'weekly' || selectedPlan === 'monthly') && typeof window.setFormPlan === 'function') {
    window.setFormPlan(selectedPlan);
  }

  const dateInput = $('bk-date');
  if(dateInput) {
    const v = String(dateInput.value || '');
    if(v && dateInput.min && v < dateInput.min) dateInput.value = dateInput.min;
    if(v && dateInput.max && v > dateInput.max) dateInput.value = dateInput.max;
  }
}

function initFormDraftPersistence() {
  document.addEventListener('input', (e) => {
    const t = e.target;
    if(!(t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement)) return;
    if(!t.id || !FORM_DRAFT_IDS.includes(t.id)) return;
    queueFormDraftPersist();
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if(!(t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement)) return;
    if(!t.id || !FORM_DRAFT_IDS.includes(t.id)) return;
    queueFormDraftPersist();
  });
  window.addEventListener('beforeunload', persistFormDraftNow);
}

initFormDraftPersistence();

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
function getDailyIpBucket(key){
  const day = todayYmd();
  const raw = localStorage.getItem(key);
  const state = raw ? JSON.parse(raw) : { day, count: 0 };
  if(!state || state.day !== day) return { day, count: 0 };
  return { day, count: Number(state.count) || 0 };
}
function getOrCreateDeviceId(){
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if(existing && existing.length >= 12) return existing;
    const id = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch(e) {
    return 'dev-fallback';
  }
}
function canUseDailyIpQuota(key, maxAttempts){
  try { return getDailyIpBucket(key).count < maxAttempts; }
  catch(e) { return true; }
}
function incrementDailyIpQuota(key){
  try {
    const state = getDailyIpBucket(key);
    state.count += 1;
    localStorage.setItem(key, JSON.stringify(state));
  } catch(e) {}
}
async function getPublicIpSafe(){
  if(IS_LOCAL_DEV) return '';
  if(_cachedPublicIpPromise) return _cachedPublicIpPromise;
  _cachedPublicIpPromise = (async ()=>{
    try {
      const res = await fetch(IP_LOOKUP_URL, { cache: 'no-store' });
      if(!res.ok) return '';
      const json = await res.json();
      const ip = String(json?.ip || '').trim();
      return /^\d{1,3}(\.\d{1,3}){3}$/.test(ip) ? ip : '';
    } catch(e) {
      return '';
    }
  })();
  return _cachedPublicIpPromise;
}
async function evaluateIpDeviceGuard(scope, opts = {}){
  const windowLimit = Number(opts.windowLimit || 4);
  const windowMs = Number(opts.windowMs || 10 * 60 * 1000);
  const dailyIpLimit = Number(opts.dailyIpLimit || 25);
  const dailyDeviceLimit = Number(opts.dailyDeviceLimit || 8);
  const ip = await getPublicIpSafe();

  if(ip) {
    if(!consumeWindowRateLimit(`cbh_${scope}_ip_window_${ip}`, windowLimit, windowMs)) {
      return { ok: false, reason: 'ip_window', ip };
    }
    if(!canUseDailyIpQuota(`cbh_${scope}_ip_daily_${ip}`, dailyIpLimit)) {
      return { ok: false, reason: 'ip_daily', ip };
    }
  }
  if(!canUseDailyDeviceQuota(`cbh_${scope}_device_daily`, dailyDeviceLimit)) {
    return { ok: false, reason: 'device_daily', ip };
  }
  return { ok: true, ip };
}
function commitIpDeviceGuard(scope, ip){
  incrementDailyDeviceQuota(`cbh_${scope}_device_daily`);
  if(ip) incrementDailyIpQuota(`cbh_${scope}_ip_daily_${ip}`);
}
async function evaluateServerAbuseGuard(scope, phone){
  if(IS_LOCAL_DEV || !ABUSE_CHECK_ENDPOINT) return { ok: true, reason: null };
  try {
    const res = await fetch(ABUSE_CHECK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope,
        phone: String(phone || '').replace(/\D/g,'').slice(-10),
        deviceId: getOrCreateDeviceId()
      })
    });
    if(res.status === 404 || res.status === 405) {
      return { ok: true, reason: null };
    }
    if(res.status === 429) {
      return { ok: true, reason: null };
    }
    if(!res.ok) {
      const data = await res.json().catch(()=>({}));
      const reason = String(data?.reason || 'server_rate_limit');
      if(/rate[_-]?limit|too[_-]?many/i.test(reason)) {
        return { ok: true, reason: null };
      }
      return { ok: false, reason };
    }
    const data = await res.json().catch(()=>({ ok: true }));
    return { ok: !!data?.ok, reason: String(data?.reason || '') || null };
  } catch(e) {
    // Do not hard-break when endpoint is temporarily unavailable.
    return { ok: true, reason: null };
  }
}
function abuseReasonText(reason, fallback){
  if(reason === 'ip_window') return '⚠️ Too many requests from this network. Please try again later.';
  if(reason === 'ip_daily') return '⚠️ Daily limit reached for this network.';
  if(reason === 'device_daily') return '⚠️ Daily limit reached for this device.';
  if(reason === 'phone_window') return '⚠️ Too many requests from this phone number. Please wait and try again.';
  return fallback;
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
    // Soft-fail on missing/down verify endpoint so forms don't hard-break on hosting misconfig.
    if(res.status === 404 || res.status >= 500) {
      console.warn('reCAPTCHA verify endpoint unavailable, allowing token-only flow.');
      return true;
    }
    if(!res.ok) return false;
    const json = await res.json();
    return !!json?.success;
  } catch(e) {
    console.warn('reCAPTCHA server verification failed:', e);
    return true;
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
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if(!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const isSmallScreen = () => window.innerWidth <= 768;
  const targetFrameMs = prefersReducedMotion ? 1000 / 24 : 1000 / 55;
  const maxParticles = prefersReducedMotion ? 26 : (isSmallScreen() ? 34 : 56);
  const linkDist = prefersReducedMotion ? 68 : (isSmallScreen() ? 84 : 108);

  let particles = [], W, H;
  let rafId = 0;
  let lastTs = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function rnd(a,b) { return a + Math.random()*(b-a); }
  function mkP() {
    return {
      x: rnd(0, W),
      y: rnd(0, H),
      vx: rnd(-0.24, 0.24),
      vy: rnd(-0.34, -0.08),
      size: rnd(0.9, 2.1),
      opacity: rnd(0.16, 0.5),
      color: Math.random() > 0.5 ? '0,220,255' : '124,58,237',
      life: 0,
      maxLife: rnd(170, 430)
    };
  }
  function init() {
    particles = [];
    const n = Math.min(Math.floor(W / 18), maxParticles);
    for(let i = 0; i < n; i++) {
      const p = mkP();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }
  }

  function draw(ts) {
    if(document.hidden) {
      if(rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      return;
    }
    if(lastTs && ts - lastTs < targetFrameMs) {
      rafId = requestAnimationFrame(draw);
      return;
    }

    const dt = lastTs ? Math.min(2.2, (ts - lastTs) / 16.67) : 1;
    lastTs = ts;

    ctx.clearRect(0,0,W,H);

    const cell = linkDist;
    const grid = new Map();
    for(let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const gx = Math.floor(p.x / cell);
      const gy = Math.floor(p.y / cell);
      const key = `${gx}|${gy}`;
      const arr = grid.get(key);
      if(arr) arr.push(i);
      else grid.set(key, [i]);
    }

    const neighbors = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,0],[0,1],[1,-1],[1,0],[1,1]];
    const distSq = linkDist * linkDist;
    for(let i = 0; i < particles.length; i++) {
      const a = particles[i];
      const gx = Math.floor(a.x / cell);
      const gy = Math.floor(a.y / cell);
      for(let n = 0; n < neighbors.length; n++) {
        const nx = gx + neighbors[n][0];
        const ny = gy + neighbors[n][1];
        const bucket = grid.get(`${nx}|${ny}`);
        if(!bucket) continue;
        for(let bi = 0; bi < bucket.length; bi++) {
          const j = bucket[bi];
          if(j <= i) continue;
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if(d2 >= distSq) continue;
          const alpha = (1 - (d2 / distSq)) * 0.055;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0,220,255,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    for(let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      const a = p.opacity * Math.sin((p.life / p.maxLife) * Math.PI);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.fill();
      if(p.life >= p.maxLife || p.x < -8 || p.x > W + 8 || p.y < -8) particles[i] = mkP();
    }

    rafId = requestAnimationFrame(draw);
  }

  function restartParticles() {
    resize();
    init();
    lastTs = 0;
  }

  restartParticles();
  rafId = requestAnimationFrame(draw);

  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(restartParticles, 180);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if(!document.hidden && !rafId) {
      lastTs = 0;
      rafId = requestAnimationFrame(draw);
    }
  });

  window.addEventListener('pagehide', () => {
    if(rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  });
})();
 
// ===== REVEAL =====
(function() {
  function showAll() { document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible')); }
  showAll(); setTimeout(showAll,300); setTimeout(showAll,1000);
})();
 
// ===== RTDB: ANNOUNCEMENTS / LIVE STATUS =====
let _liveStateSyncTimer = null;
let _lastLiveSeats = null;
let _lastLiveAnnouncement = '';
let _announcementDismissed = false;
let _lastBookingAvailabilityVersion = '';
let _lastBookingAvailabilityUpdatedAt = 0;
window.dismissAnnouncementBar = function() {
  const bar = $('ann-bar');
  if(!bar) return;
  _announcementDismissed = true;
  bar.style.display = 'none';
  bar.classList.remove('show');
};

function applyLiveAnnouncement(message) {
  const bar = $('ann-bar');
  const txt = $('ann-bar-text');
  if(!bar || !txt) return;
  const cleanMsg = String(message || '').trim();
  if(!cleanMsg) {
    _lastLiveAnnouncement = '';
    bar.classList.remove('show');
    return;
  }
  _lastLiveAnnouncement = cleanMsg;
  txt.textContent = cleanMsg;
  if(_announcementDismissed) {
    bar.classList.remove('show');
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  bar.classList.add('show');
}

function applyLiveSeats(value) {
  const parsed = parseInt(value, 10);
  const v = Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  const el = $('avail-pc');
  if(el) {
    el.textContent = Number.isFinite(v) ? `${v} seats available` : '--';
    el.style.color = Number.isFinite(v)
      ? (v <= 0 ? 'var(--danger)' : v <= 2 ? 'var(--gold)' : 'var(--green)')
      : 'var(--muted)';
  }
  _lastLiveSeats = v;
}

function normalizeBookingAvailability(raw = {}) {
  const src = (raw && typeof raw === 'object') ? raw : {};
  const gamingPcParsed = parseInt(src.gamingPcSeats ?? src.seats, 10);
  const ps5Parsed = parseInt(src.ps5Consoles, 10);
  const internetParsed = parseInt(src.internetBrowsingPcs ?? src.internetStatus ?? src.internetSeats, 10);
  const mobileParsed = parseInt(src.mobileSeats, 10);
  const gamingPcSeats = Number.isFinite(gamingPcParsed) ? Math.max(0, gamingPcParsed) : null;
  const ps5Consoles = Number.isFinite(ps5Parsed) ? Math.max(0, ps5Parsed) : null;
  const internetBrowsingPcs = Number.isFinite(internetParsed) ? Math.max(0, internetParsed) : null;
  const mobileSeats = Number.isFinite(mobileParsed) ? Math.max(0, mobileParsed) : null;
  const openHours = String(src.openHours || '').trim() || '';
  return { gamingPcSeats, ps5Consoles, internetBrowsingPcs, mobileSeats, openHours };
}

const SLOT_STEP_MIN = 30;
const BOOKING_SUGGESTION_CACHE_TTL_MS = 25 * 1000;
let _bookingCache = { date: '', ts: 0, rows: [] };

function minutesToHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.max(0, mins % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function parseTimeTokenToMinutes(raw) {
  const txt = String(raw || '').trim();
  if(!txt) return null;
  const ampmMatch = txt.match(/(am|pm)/i);
  const timeMatch = txt.match(/(\d{1,2})(?::(\d{2}))?/);
  if(!timeMatch) return null;
  let h = parseInt(timeMatch[1], 10);
  let m = parseInt(timeMatch[2] || '0', 10);
  if(!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if(ampmMatch) {
    const mer = ampmMatch[1].toLowerCase();
    if(h === 12) h = mer === 'am' ? 0 : 12;
    else if(mer === 'pm') h += 12;
  }
  if(h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function parseOpenHoursRange(raw) {
  const text = String(raw || '').trim();
  if(!text) return null;
  const parts = text.split(/\s*(?:-|to)\s*/i);
  if(parts.length < 2) return null;
  const startMin = parseTimeTokenToMinutes(parts[0]);
  const endMin = parseTimeTokenToMinutes(parts[1]);
  if(startMin === null || endMin === null) return null;
  if(endMin <= startMin) return null;
  return { openMin: startMin, closeMin: endMin, label: text };
}

function applyBookingTimeConstraints() {
  const openMin = Number.isFinite(BOOKING_OPEN_WINDOW?.openMin) ? BOOKING_OPEN_WINDOW.openMin : 7 * 60;
  const closeMin = Number.isFinite(BOOKING_OPEN_WINDOW?.closeMin) ? BOOKING_OPEN_WINDOW.closeMin : 21 * 60;
  const minVal = minutesToHHMM(openMin);
  const maxVal = minutesToHHMM(closeMin);
  const stepSec = SLOT_STEP_MIN * 60;
  ['bk-time','bk-end-time'].forEach(id => {
    const el = $(id);
    if(!el) return;
    el.min = minVal;
    el.max = maxVal;
    el.step = String(stepSec);
  });
}

function updateBookingOpenWindow(openHoursText) {
  const parsed = parseOpenHoursRange(openHoursText);
  if(parsed) BOOKING_OPEN_WINDOW = parsed;
  applyBookingTimeConstraints();
}

function getAvailabilityUpdatedAt(raw = {}) {
  const t = Date.parse(String(raw?.updatedAt || ''));
  return Number.isFinite(t) ? t : 0;
}

function applyBookingAvailabilitySettings(raw = {}) {
  if(!raw || typeof raw !== 'object' || !Object.keys(raw).length) return;
  setAvailabilityLoading(false);
  const incomingTs = getAvailabilityUpdatedAt(raw);
  if(_lastBookingAvailabilityUpdatedAt > 0) {
    if(incomingTs > 0 && incomingTs < _lastBookingAvailabilityUpdatedAt) return;
  }

  const normalized = normalizeBookingAvailability(raw);

  const ps5El = $('avail-ps5');
  if (ps5El) {
    ps5El.textContent = Number.isFinite(normalized.ps5Consoles) ? `${normalized.ps5Consoles} consoles` : '--';
    ps5El.style.color = Number.isFinite(normalized.ps5Consoles)
      ? (normalized.ps5Consoles <= 0 ? 'var(--danger)' : normalized.ps5Consoles <= 1 ? 'var(--gold)' : 'var(--green)')
      : 'var(--muted)';
  }

  const pcEl = $('avail-pc');
  if (pcEl) {
    pcEl.textContent = Number.isFinite(normalized.gamingPcSeats) ? `${normalized.gamingPcSeats} seats available` : '--';
    pcEl.style.color = Number.isFinite(normalized.gamingPcSeats)
      ? (normalized.gamingPcSeats <= 0 ? 'var(--danger)' : normalized.gamingPcSeats <= 2 ? 'var(--gold)' : 'var(--green)')
      : 'var(--muted)';
  }

  const netEl = $('avail-net-pc');
  if (netEl) {
    netEl.textContent = Number.isFinite(normalized.internetBrowsingPcs) ? `${normalized.internetBrowsingPcs} PCs` : '--';
    netEl.style.color = Number.isFinite(normalized.internetBrowsingPcs)
      ? (normalized.internetBrowsingPcs <= 0 ? 'var(--danger)' : normalized.internetBrowsingPcs <= 1 ? 'var(--gold)' : 'var(--green)')
      : 'var(--muted)';
  }

  const mobileEl = $('avail-mobile');
  if (mobileEl) {
    mobileEl.textContent = Number.isFinite(normalized.mobileSeats) ? `${normalized.mobileSeats} seats` : '--';
    mobileEl.style.color = Number.isFinite(normalized.mobileSeats)
      ? (normalized.mobileSeats <= 0 ? 'var(--danger)' : normalized.mobileSeats <= 1 ? 'var(--gold)' : 'var(--green)')
      : 'var(--muted)';
  }

  const hrsEl = $('avail-hours');
  if (hrsEl) hrsEl.textContent = normalized.openHours || '--';
  if(normalized.openHours) updateBookingOpenWindow(normalized.openHours);

  _lastBookingAvailabilityVersion = JSON.stringify(normalized);
  if(incomingTs > 0) _lastBookingAvailabilityUpdatedAt = incomingTs;
}

function availabilityLooksLoading() {
  const ids = ['avail-pc', 'avail-ps5', 'avail-net-pc', 'avail-mobile', 'avail-hours'];
  return ids.some((id) => String($(id)?.textContent || '').toLowerCase().includes('loading'));
}

function setAvailabilityPlaceholderState() {
  const items = [
    ['avail-pc', '--'],
    ['avail-ps5', '--'],
    ['avail-net-pc', '--'],
    ['avail-mobile', '--'],
    ['avail-hours', '--']
  ];
  items.forEach(([id, text]) => {
    const el = $(id);
    if(el) {
      el.textContent = text;
      el.style.color = 'var(--muted)';
    }
  });
  setAvailabilityLoading(false);
}

function applyAvailabilitySafeFallback() {
  if(!availabilityLooksLoading()) return;
  // Strict mode: no fake defaults, only placeholders + another live sync attempt.
  setAvailabilityPlaceholderState();
  syncLiveStateOnce();
}

async function syncLiveStateOnce() {
  try {
    const [seatsRes, annRes, availabilityResPrimary, availabilityResSecondary] = await Promise.allSettled([
      get(ref(rtdb, 'seats')),
      get(ref(rtdb, 'announcements/latest')),
      get(ref(rtdb, 'booking/availability')),
      get(ref(rtdb, 'live/bookingAvailability'))
    ]);

    let seatsVal = null;
    if(seatsRes.status === 'fulfilled') {
      const seatsSnap = seatsRes.value;
      seatsVal = seatsSnap.exists() ? seatsSnap.val() : null;
    } else if(RTDB_REST_SEATS_URL) {
      try {
        const res = await fetch(`${RTDB_REST_SEATS_URL}?ts=${Date.now()}`, { cache: 'no-store' });
        if(res.ok) seatsVal = await res.json();
      } catch(_) {}
    }

    let annMsg = '';
    if(annRes.status === 'fulfilled') {
      const annSnap = annRes.value;
      annMsg = annSnap.exists() ? String(annSnap.val()?.message || '').trim() : '';
    } else if(RTDB_REST_ANNOUNCEMENT_URL) {
      try {
        const res = await fetch(`${RTDB_REST_ANNOUNCEMENT_URL}?ts=${Date.now()}`, { cache: 'no-store' });
        if(res.ok) {
          const data = await res.json();
          annMsg = String(data?.message || '').trim();
        }
      } catch(_) {}
    }

    if(_lastLiveSeats === null || parseInt(seatsVal, 10) !== _lastLiveSeats) applyLiveSeats(seatsVal);
    if(annMsg && annMsg !== _lastLiveAnnouncement) applyLiveAnnouncement(annMsg);

    let availabilityData = null;
    if(availabilityResPrimary.status === 'fulfilled' && availabilityResPrimary.value.exists()) {
      availabilityData = availabilityResPrimary.value.val() || {};
    } else if(availabilityResSecondary.status === 'fulfilled' && availabilityResSecondary.value.exists()) {
      availabilityData = availabilityResSecondary.value.val() || {};
    } else {
      for (const url of RTDB_REST_BOOKING_AVAILABILITY_URLS) {
        try {
          const res = await fetch(`${url}?ts=${Date.now()}`, { cache: 'no-store' });
          if(res.ok) {
            const data = await res.json();
            if(data && typeof data === 'object') {
              availabilityData = data;
              break;
            }
          }
        } catch(_) {}
      }
    }

    if(availabilityData) {
      const availabilitySeats = parseInt(availabilityData?.gamingPcSeats ?? availabilityData?.seats, 10);
      if(Number.isFinite(availabilitySeats)) applyLiveSeats(availabilitySeats);
      const nextVersion = JSON.stringify(normalizeBookingAvailability(availabilityData));
      if(nextVersion !== _lastBookingAvailabilityVersion) applyBookingAvailabilitySettings(availabilityData);
    } else {
      setAvailabilityPlaceholderState();
    }
  } catch(err) {
    console.warn('Live state fallback sync failed:', err);
    setAvailabilityPlaceholderState();
  }
}

async function syncLiveStateViaRest() {
  try {
    // Seats
    if(RTDB_REST_SEATS_URL) {
      const seatsRes = await fetch(`${RTDB_REST_SEATS_URL}?ts=${Date.now()}`, { cache: 'no-store' });
      if(seatsRes.ok) {
        const seatsData = await seatsRes.json();
        applyLiveSeats(seatsData);
      }
    }

    // Announcement
    if(RTDB_REST_ANNOUNCEMENT_URL) {
      const annRes = await fetch(`${RTDB_REST_ANNOUNCEMENT_URL}?ts=${Date.now()}`, { cache: 'no-store' });
      if(annRes.ok) {
        const annData = await annRes.json();
        applyLiveAnnouncement(String(annData?.message || '').trim());
      }
    }

    // Booking availability (primary then fallback path)
    for (const url of RTDB_REST_BOOKING_AVAILABILITY_URLS) {
      try {
        const res = await fetch(`${url}?ts=${Date.now()}`, { cache: 'no-store' });
        if(res.ok) {
          const data = await res.json();
          if(data && typeof data === 'object' && Object.keys(data).length) {
            applyBookingAvailabilitySettings(data);
            break;
          }
        }
      } catch(_) {}
    }
  } catch(err) {
    console.warn('REST live sync failed:', err);
  }
}

function ensureLiveStateFallbackSync() {
  if(_liveStateSyncTimer) return;
  _liveStateSyncTimer = setInterval(() => {
    syncLiveStateOnce();
    syncLiveStateViaRest();
  }, 3000);
}

onValue(ref(rtdb,'announcements/latest'), snap => {
  if(snap.exists()) applyLiveAnnouncement(snap.val()?.message || '');
},(err)=>{
  console.warn('RTDB announcement listener issue:', err);
  syncLiveStateOnce();
});
 
// ===== RTDB: PRICING =====
let _pricingSyncTimer = null;
let _lastPricingVersion = '';

function initBookingRealtimePricing() {
  onValue(ref(rtdb,'pricing'), snap => {
    const p = snap.exists() ? (snap.val() || {}) : {};
    _lastPricingVersion = String(p.updatedAt || JSON.stringify(p.serviceRates || p));
    applyBookingPricing(p);
  },err=>{
    console.warn('RTDB pricing listener issue, fallback polling enabled:', err);
    ensurePricingFallbackSync();
  });
  ensurePricingFallbackSync();
  syncBookingPricingOnce();
}
 
// ===== RTDB: OFFERS =====
onValue(ref(rtdb,'offers/current'), snap => {
  const el=$('current-offer-txt');
  if(el) el.textContent=snap.exists()&&snap.val()?snap.val():'Visit us for current offers on Weekly & Monthly plans!';
},()=>{ const el=$('current-offer-txt'); if(el) el.textContent='Visit us for current offers!'; });
 
// ===== RTDB: LIVE SEATS — admin panel se update hoga, yahan live dikhega =====
onValue(ref(rtdb,'seats'), snap => {
  applyLiveSeats(snap.exists() ? snap.val() : null);
},()=>{ applyLiveSeats(null); });

// ===== RTDB: BOOKING AVAILABILITY SETTINGS =====
onValue(ref(rtdb,'booking/availability'), snap => {
  if(snap.exists()) applyBookingAvailabilitySettings(snap.val() || {});
},()=>{ syncLiveStateOnce(); });

onValue(ref(rtdb,'live/bookingAvailability'), snap => {
  if(snap.exists()) applyBookingAvailabilitySettings(snap.val() || {});
},()=>{ syncLiveStateOnce(); });

ensureLiveStateFallbackSync();
syncLiveStateOnce();
syncLiveStateViaRest();
setTimeout(applyAvailabilitySafeFallback, 2500);
setTimeout(syncLiveStateViaRest, 1200);
document.addEventListener('visibilitychange', () => {
  if(!document.hidden) {
    syncLiveStateOnce();
    syncLiveStateViaRest();
  }
});
window.addEventListener('focus', () => {
  syncLiveStateOnce();
  syncLiveStateViaRest();
});

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
      if(errEl){ errEl.textContent='❌ reCAPTCHA verification failed. Please try again.'; errEl.style.display='block'; }
      return;
    }
  }
  if(looksLikeBot('prime-website','prime-apply-btn')){
    if(errEl){ errEl.textContent='❌ Suspicious request blocked. Please wait and try again.'; errEl.style.display='block'; }
    return;
  }
  let valid=true;
  if(!name){ showErr('prime-name-err','Name is required.'); valid=false; }
  else if(!isLikelyName(name)){ showErr('prime-name-err','Enter a valid name.'); valid=false; }
  if(!phone){ showErr('prime-phone-err','Phone is required.'); valid=false; }
  else if(!/^[6-9][0-9]{9}$/.test(phone)){ showErr('prime-phone-err','Enter a valid 10-digit phone.'); valid=false; }
  if(!valid) return;
  if(!canUseDailyDeviceQuota('cbh_prime_device_daily', 4)){
    if(errEl){ errEl.textContent='⚠️ Daily prime request limit reached for this device. Try again tomorrow or call us.'; errEl.style.display='block'; }
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
    if(okEl){ okEl.textContent='✅ Application sent! Visit Piprali Road to pay and activate your card. We will call you.'; okEl.style.display='block'; }
    [$('prime-name'),$('prime-phone'),$('prime-college'),$('prime-note')].forEach(el=>{if(el)el.value='';});
    clearFormDraftFields(['prime-name','prime-phone','prime-college','prime-note']);
    queueFormDraftPersist();
    updateCardPreview();
  } catch(err) {
    console.error('Prime application failed:', err);
    if(errEl){ errEl.textContent='❌ Request could not be submitted. Please try again later.'; errEl.style.display='block'; }
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
    res.innerHTML='<span style="color:var(--danger)">❌ Too many checks. Please try again after 1 hour.</span>';
    return;
  }
  if(!/^CBH-[A-Z0-9-]{6,}$/.test(val)){
    res.style.display='block';
    res.innerHTML='<span style="color:var(--danger)">❌ Only a valid card number can be checked (phone lookup disabled).</span>';
    return;
  }
  res.style.display='block';
  res.innerHTML='<span style="color:var(--muted)">🔍 Checking...</span>';
  try {
    let cards=[];
    const s1=await getDocs(query(collection(db,'primeCards'),where('cardNumber','==',val)));
    s1.forEach(d=>cards.push({id:d.id,...d.data()}));
    if(!cards.length){ res.innerHTML='<span style="color:var(--danger)">❌ Card not found.</span>'; return; }
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
        ${c.status!=='active'?'<span style="color:var(--danger);font-size:0.78rem">Card is not active — please contact staff.</span>':''}
      </div>
    </div>`;
  } catch(e){
    console.error('Card status lookup failed:', e);
    res.innerHTML='<span style="color:var(--danger)">❌ Status could not be fetched. Please try again later.</span>';
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
  'other': 0
};
const DEFAULT_BOOKING_PRICE_DETAILS = {
  printing: { singleSideRate: 8, bothSideRate: 12 },
  formFilling: { note: 'Contact for quote' },
  primePlans: { weekly: 499, monthly: 1499 },
  otherContact: { phone: '8829822950', email: 'citybytehub@gmail.com' }
};
const DEFAULT_BOOKING_OFFERS = {
  global: { tag: '', percent: 0 },
  services: {}
};
let BOOKING_HOURLY_RATES = { ...DEFAULT_BOOKING_HOURLY_RATES };
let CUSTOM_BOOKING_SERVICES = {};
let BOOKING_PRICE_DETAILS = JSON.parse(JSON.stringify(DEFAULT_BOOKING_PRICE_DETAILS));
let BOOKING_OFFERS = JSON.parse(JSON.stringify(DEFAULT_BOOKING_OFFERS));

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
    if (k === 'other') {
      base[k] = 0;
      return;
    }
    if (Number.isFinite(n) && n > 0) base[k] = n;
  });
  return base;
}

function normalizeBookingPriceDetails(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const printing = src.printing && typeof src.printing === 'object' ? src.printing : {};
  const form = src.formFilling && typeof src.formFilling === 'object' ? src.formFilling : {};
  const prime = src.primePlans && typeof src.primePlans === 'object' ? src.primePlans : {};
  const otherContact = src.otherContact && typeof src.otherContact === 'object' ? src.otherContact : {};

  const singleSideRate = parseInt(printing.singleSideRate ?? printing.single ?? DEFAULT_BOOKING_PRICE_DETAILS.printing.singleSideRate, 10);
  const bothSideRate = parseInt(printing.bothSideRate ?? printing.doubleSideRate ?? printing.double ?? DEFAULT_BOOKING_PRICE_DETAILS.printing.bothSideRate, 10);
  const weekly = parseInt(prime.weekly ?? DEFAULT_BOOKING_PRICE_DETAILS.primePlans.weekly, 10);
  const monthly = parseInt(prime.monthly ?? DEFAULT_BOOKING_PRICE_DETAILS.primePlans.monthly, 10);
  const phone = String(otherContact.phone || '').replace(/\D/g, '').slice(-10);
  const email = String(otherContact.email || '').trim().slice(0, 120).toLowerCase();

  return {
    printing: {
      singleSideRate: Number.isFinite(singleSideRate) && singleSideRate > 0 ? singleSideRate : DEFAULT_BOOKING_PRICE_DETAILS.printing.singleSideRate,
      bothSideRate: Number.isFinite(bothSideRate) && bothSideRate > 0 ? bothSideRate : DEFAULT_BOOKING_PRICE_DETAILS.printing.bothSideRate
    },
    formFilling: {
      note: String(form.note || DEFAULT_BOOKING_PRICE_DETAILS.formFilling.note || '').trim().slice(0, 160) || DEFAULT_BOOKING_PRICE_DETAILS.formFilling.note
    },
    primePlans: {
      weekly: Number.isFinite(weekly) && weekly > 0 ? weekly : DEFAULT_BOOKING_PRICE_DETAILS.primePlans.weekly,
      monthly: Number.isFinite(monthly) && monthly > 0 ? monthly : DEFAULT_BOOKING_PRICE_DETAILS.primePlans.monthly
    },
    otherContact: {
      phone: phone || DEFAULT_BOOKING_PRICE_DETAILS.otherContact.phone,
      email: email || DEFAULT_BOOKING_PRICE_DETAILS.otherContact.email
    }
  };
}

function bookingOtherContactLine() {
  const phone = BOOKING_PRICE_DETAILS?.otherContact?.phone || DEFAULT_BOOKING_PRICE_DETAILS.otherContact.phone;
  const email = BOOKING_PRICE_DETAILS?.otherContact?.email || DEFAULT_BOOKING_PRICE_DETAILS.otherContact.email;
  return { phone, email, text: `Call ${phone} or ${email}` };
}

function normalizeBookingOffers(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const globalSrc = src.global && typeof src.global === 'object' ? src.global : {};
  const servicesSrc = src.services && typeof src.services === 'object' ? src.services : {};

  const out = {
    global: {
      tag: String(globalSrc.tag || '').trim().slice(0, 36),
      percent: Math.max(0, Math.min(90, parseInt(globalSrc.percent || 0, 10) || 0))
    },
    services: {}
  };

  Object.entries(servicesSrc).forEach(([k, v]) => {
    const key = String(k || '').trim().toLowerCase();
    if(!key) return;
    const entry = v && typeof v === 'object' ? v : {};
    const percent = Math.max(0, Math.min(90, parseInt(entry.percent || 0, 10) || 0));
    const tag = String(entry.tag || '').trim().slice(0, 36);
    if(!percent) return;
    out.services[key] = { tag, percent };
  });

  return out;
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

function getOfferForService(serviceKey) {
  const key = String(serviceKey || '').trim().toLowerCase();
  const serviceOffer = BOOKING_OFFERS.services[key];
  if(serviceOffer && serviceOffer.percent > 0) return serviceOffer;
  if(BOOKING_OFFERS.global.percent > 0) return BOOKING_OFFERS.global;
  return { tag: '', percent: 0 };
}

function applyOfferAmount(amount, serviceKey) {
  const amt = Math.max(0, parseInt(amount, 10) || 0);
  const offer = getOfferForService(serviceKey);
  if(!offer.percent) {
    return { amount: amt, baseAmount: amt, offerTag: '', offerPercent: 0, discount: 0 };
  }
  const discount = Math.round((amt * offer.percent) / 100);
  const finalAmount = Math.max(0, amt - discount);
  return {
    amount: finalAmount,
    baseAmount: amt,
    offerTag: offer.tag || `${offer.percent}% OFF`,
    offerPercent: offer.percent,
    discount
  };
}

function renderOfferChip(chipId, serviceKey) {
  const chip = $(chipId);
  if(!chip) return;
  const offer = getOfferForService(serviceKey);
  if(!offer.percent) {
    chip.style.display = 'none';
    chip.textContent = '';
    return;
  }
  chip.textContent = `🏷 ${offer.tag || `${offer.percent}% OFF`}`;
  chip.style.display = 'inline-flex';
}

function priceServiceLabel(serviceKey) {
  const key = String(serviceKey || '').trim().toLowerCase();
  if (BOOKING_SERVICE_LABELS[key]) return BOOKING_SERVICE_LABELS[key];
  if (key === 'prime') return '🎓 Prime Card';
  if (CUSTOM_BOOKING_SERVICES[key]?.name) return `✨ ${CUSTOM_BOOKING_SERVICES[key].name}`;
  return key || 'Service';
}

function renderAllPricingCard() {
  const host = $('pricing-all-card-body');
  if (!host) return;

  const rows = [
    { label: '🖥️ Gaming PC', amount: BOOKING_HOURLY_RATES['gaming-pc'], unit: '/hr', offerKey: 'gaming-pc' },
    { label: '🎮 PS5', amount: BOOKING_HOURLY_RATES.ps5, unit: '/hr', offerKey: 'ps5' },
    { label: '🌐 Internet', amount: BOOKING_HOURLY_RATES.internet, unit: '/hr', offerKey: 'internet' },
    { label: '📱 Mobile', amount: BOOKING_HOURLY_RATES.mobile, unit: '/hr', offerKey: 'mobile' },
    { label: '🖨️ Printing Single Side', amount: BOOKING_PRICE_DETAILS.printing.singleSideRate, unit: '/page', offerKey: 'printing' },
    { label: '🖨️ Printing Both Side', amount: BOOKING_PRICE_DETAILS.printing.bothSideRate, unit: '/sheet', offerKey: 'printing' },
    { label: '📋 Form Filling', type: 'contact', offerKey: 'form-filling' },
    { label: '🔧 Other Service', type: 'contact' },
    { label: '⭐ Prime Weekly', amount: BOOKING_PRICE_DETAILS.primePlans.weekly, unit: '/week', offerKey: 'prime' },
    { label: '⭐ Prime Monthly', amount: BOOKING_PRICE_DETAILS.primePlans.monthly, unit: '/month', offerKey: 'prime' }
  ];

  Object.entries(CUSTOM_BOOKING_SERVICES).forEach(([key, data]) => {
    rows.push({ label: `✨ ${data.name}`, amount: data.price, unit: '/unit', offerKey: key });
  });

  const rowHtml = rows.map((row) => {
    const rowClass = row.offerKey === 'prime' ? 'pricing-master-row is-prime' : 'pricing-master-row is-bubble';
    if (row.type === 'contact') {
      const contact = bookingOtherContactLine();
      return `
      <div class="pricing-master-row is-bubble is-contact">
        <span class="pricing-master-label">${escHTML(row.label)}</span>
        <span class="pricing-master-val">${escHTML(contact.text)}</span>
      </div>
    `;
    }
    const offer = applyOfferAmount(row.amount, row.offerKey);
    const hasDiscount = offer.discount > 0;
    const offerTag = hasDiscount ? (offer.offerTag || `${offer.offerPercent}% OFF`) : '';
    return `
      <div class="${rowClass}">
        <span class="pricing-master-label">${escHTML(row.label)}</span>
        <span class="pricing-master-val">
          ${hasDiscount ? `<span class="pricing-master-base">Rs.${offer.baseAmount}${row.unit}</span>` : ''}
          <span class="pricing-master-final">Rs.${offer.amount}${row.unit}</span>
          ${offerTag ? `<span class="pricing-master-tag">${escHTML(offerTag)}</span>` : ''}
        </span>
      </div>
    `;
  }).join('');

  const globalTag = BOOKING_OFFERS.global.percent > 0
    ? `<div class="pricing-master-row is-bubble is-offer"><span class="pricing-master-label">🌍 Global Offer</span><span class="pricing-master-val"><span class="pricing-master-tag">${escHTML(BOOKING_OFFERS.global.tag || `${BOOKING_OFFERS.global.percent}% OFF`)}</span></span></div>`
    : '';

  const serviceOfferRows = Object.entries(BOOKING_OFFERS.services || {}).map(([key, value]) => `
    <div class="pricing-master-row is-bubble is-offer">
      <span class="pricing-master-label">🏷 ${escHTML(priceServiceLabel(key))}</span>
      <span class="pricing-master-val"><span class="pricing-master-tag">${escHTML(value.tag || `${value.percent}% OFF`)}</span></span>
    </div>
  `).join('');

  host.innerHTML = rowHtml + globalTag + serviceOfferRows;
}

function getBookingServiceDetailPayload() {
  return {
    printSingle: parseInt($('bk-print-single')?.value || '0', 10) || 0,
    printDouble: parseInt($('bk-print-double')?.value || '0', 10) || 0,
    formKind: cleanInput($('bk-form-kind')?.value || '', 90),
    formExtra: cleanInput($('bk-form-extra')?.value || '', 220),
    customQty: Math.max(1, parseInt($('bk-custom-qty')?.value || '1', 10) || 1)
  };
}

function updateBookingServiceDetailUi() {
  const service = String($('bk-service')?.value || '');
  const wrap = $('bk-service-detail-box');
  const printFields = $('bk-print-fields');
  const formFields = $('bk-form-fields');
  const customFields = $('bk-custom-fields');
  const title = $('bk-service-detail-title');
  if(!wrap || !printFields || !formFields || !customFields || !title) return;

  const isPrinting = service === 'printing';
  const isForm = service === 'form-filling';
  const isCustom = !!CUSTOM_BOOKING_SERVICES[service];
  wrap.style.display = (isPrinting || isForm || isCustom) ? 'block' : 'none';
  printFields.style.display = isPrinting ? 'block' : 'none';
  formFields.style.display = isForm ? 'block' : 'none';
  customFields.style.display = isCustom ? 'block' : 'none';
  if(isPrinting) title.textContent = 'PRINTING DETAILS';
  else if(isForm) title.textContent = 'FORM DETAILS';
  else if(isCustom) title.textContent = 'CUSTOM SERVICE DETAILS';
}

function computeBookingCharge(service, durationMin, details = {}) {
  const key = String(service || '').trim().toLowerCase();
  if(!key) return { amount: 0, mainText: 'Select a service', noteText: 'Please choose a service.', raw: { baseAmount: 0, discount: 0, offerTag: '' } };

  if(key === 'other') {
    const contact = bookingOtherContactLine();
    return {
      amount: 0,
      mainText: 'Other Service (custom requirement)',
      noteText: `Contact: ${contact.phone} | ${contact.email}`,
      raw: { baseAmount: 0, discount: 0, offerTag: '' }
    };
  }

  if(key === 'printing') {
    const single = Math.max(0, parseInt(details.printSingle || 0, 10) || 0);
    const both = Math.max(0, parseInt(details.printDouble || 0, 10) || 0);
    const base = (single * BOOKING_PRICE_DETAILS.printing.singleSideRate) + (both * BOOKING_PRICE_DETAILS.printing.bothSideRate);
    const priced = applyOfferAmount(base, key);
    const desc = `Print: ${single} single + ${both} both-side`;
    const note = priced.discount > 0
      ? `Offer ${priced.offerTag}: -Rs.${priced.discount} applied`
      : `Single Rs.${BOOKING_PRICE_DETAILS.printing.singleSideRate}/page | Both-side Rs.${BOOKING_PRICE_DETAILS.printing.bothSideRate}/sheet`;
    return { amount: priced.amount, mainText: desc, noteText: note, raw: priced };
  }

  if(key === 'form-filling') {
    const contact = bookingOtherContactLine();
    const kind = String(details.formKind || '').trim();
    const desc = kind ? `Form (${kind})` : 'Form Filling Service';
    return {
      amount: 0,
      mainText: desc,
      noteText: `Contact: ${contact.phone} | ${contact.email}`,
      raw: { baseAmount: 0, discount: 0, offerTag: '' }
    };
  }

  const rate = bookingRateForService(key);
  const dur = Math.max(0, parseInt(durationMin || 0, 10) || 0);
  if(CUSTOM_BOOKING_SERVICES[key]) {
    const qty = Math.max(1, parseInt(details.customQty || 1, 10) || 1);
    const base = rate * qty;
    const priced = applyOfferAmount(base, key);
    const desc = `${CUSTOM_BOOKING_SERVICES[key].name} x ${qty} @ Rs.${rate}`;
    const note = priced.discount > 0
      ? `Offer ${priced.offerTag}: -Rs.${priced.discount} applied`
      : 'Custom service quantity ke hisab se amount auto-calc hua.';
    return { amount: priced.amount, mainText: desc, noteText: note, raw: priced };
  }

  const base = calcAmountByDuration(rate, dur);
  const priced = applyOfferAmount(base, key);
  const hoursTxt = (dur / 60).toFixed(2).replace(/\.00$/, '');
  const desc = `${dur} min (${hoursTxt} hr) @ Rs.${rate}/hr`;
  const suggestion = findNearestFiveSuggestion(rate, dur);
  const note = priced.discount > 0
    ? `Offer ${priced.offerTag}: -Rs.${priced.discount} applied`
    : (suggestion || 'Rounded amount direct billed hoga.');
  return { amount: priced.amount, mainText: desc, noteText: note, raw: priced };
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
    { key: 'printing', label: `${BOOKING_SERVICE_LABELS.printing} (Single Page)` },
    { key: 'printing-double', label: '🖨️ Printing (Both Side Sheet)' },
    { key: 'form-filling', label: BOOKING_SERVICE_LABELS['form-filling'] },
    { key: 'other', label: BOOKING_SERVICE_LABELS.other }
  ];

  const customRows = Object.entries(CUSTOM_BOOKING_SERVICES)
    .sort((a, b) => a[1].name.localeCompare(b[1].name))
    .map(([key, data]) => ({ key, label: `✨ ${data.name}`, rate: data.price }));

  const rowHtml = [
    ...baseRows.map(r => {
      if(r.key === 'other') {
        const contact = bookingOtherContactLine();
        return { ...r, isContact: true, text: contact.text };
      }
      if(r.key === 'printing') return { ...r, rate: BOOKING_PRICE_DETAILS.printing.singleSideRate, unit: '/page' };
      if(r.key === 'printing-double') return { ...r, rate: BOOKING_PRICE_DETAILS.printing.bothSideRate, unit: '/sheet' };
      if(r.key === 'form-filling') return { ...r, rate: BOOKING_PRICE_DETAILS.formFilling.baseCharge, unit: '/form' };
      return { ...r, rate: Number.isFinite(BOOKING_HOURLY_RATES[r.key]) ? BOOKING_HOURLY_RATES[r.key] : 30, unit: '/hr' };
    }),
    ...customRows
  ].map(r => {
    if(r.isContact) {
      return `
    <div class="avail-row">
      <span class="avail-label">${escHTML(r.label)}</span>
      <span class="avail-val" style="color:var(--cyan)">${escHTML(r.text)}</span>
    </div>
  `;
    }
    return `
    <div class="avail-row">
      <span class="avail-label">${escHTML(r.label)}</span>
      <span class="avail-val" style="color:var(--gold)">Rs.${r.rate}${r.unit || '/hr'}</span>
    </div>
  `;
  }).join('');

  host.innerHTML = rowHtml || '<div style="color:var(--muted)">Rates unavailable right now.</div>';
}

function applyBookingPricing(payload = {}) {
  const p = payload && typeof payload === 'object' ? payload : {};
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

  BOOKING_HOURLY_RATES = normalized;
  CUSTOM_BOOKING_SERVICES = normalizeBookingCustomServices(p.customServices || {});
  BOOKING_PRICE_DETAILS = normalizeBookingPriceDetails(p.details || {});
  BOOKING_OFFERS = normalizeBookingOffers(p.offers || {});

  const pcEl = $('pc-price');
  if(pcEl){
    const priced = applyOfferAmount(BOOKING_HOURLY_RATES['gaming-pc'], 'gaming-pc');
    pcEl.textContent = String(priced.amount);
    pcEl.classList.remove('ask');
  }
  const psEl = $('ps5-price');
  if(psEl){
    const priced = applyOfferAmount(BOOKING_HOURLY_RATES.ps5, 'ps5');
    psEl.textContent = String(priced.amount);
    psEl.classList.remove('ask');
  }
  const netEl = $('net-price');
  if(netEl){
    const priced = applyOfferAmount(BOOKING_HOURLY_RATES.internet, 'internet');
    netEl.textContent = String(priced.amount);
    netEl.classList.remove('ask');
  }

  const primeWeekly = BOOKING_PRICE_DETAILS.primePlans.weekly;
  const primeMonthly = BOOKING_PRICE_DETAILS.primePlans.monthly;
  const primeDisplay = p.prime || p.primePrice || p.primeDisplayPrice || String(primeWeekly);
  if(primeDisplay) {
    const primeEl = $('prime-price');
    if(primeEl){
      const weeklyPriced = applyOfferAmount(parseInt(primeWeekly || 0, 10) || parseInt(primeDisplay, 10) || 0, 'prime');
      primeEl.textContent = String(weeklyPriced.amount || primeDisplay);
      primeEl.classList.remove('ask');
    }
  }
  const primeMonthlyEl = $('prime-price-monthly');
  if(primeMonthlyEl) {
    const monthlyPriced = applyOfferAmount(primeMonthly, 'prime');
    primeMonthlyEl.textContent = String(monthlyPriced.amount);
    primeMonthlyEl.classList.remove('ask');
  }

  const mobileTip = $('mobile-tip-price');
  if(mobileTip) mobileTip.textContent = `Rs.${BOOKING_HOURLY_RATES.mobile} per hour`;

  renderOfferChip('offer-chip-pc', 'gaming-pc');
  renderOfferChip('offer-chip-ps5', 'ps5');
  renderOfferChip('offer-chip-net', 'internet');
  renderOfferChip('offer-chip-prime', 'prime');

  renderBookingServiceOptions();
  updateBookingServiceDetailUi();
  renderBookingLiveRateList();
  renderAllPricingCard();
  updateBookingBillPreview();
  document.body?.classList.remove('pricing-loading');
  document.body?.classList.add('pricing-ready');
}

async function syncBookingPricingOnce() {
  try {
    const snap = await get(ref(rtdb, 'pricing'));
    if(!snap.exists()) return;
    const p = snap.val() || {};
    const version = String(p.updatedAt || JSON.stringify(p.serviceRates || p));
    if(version === _lastPricingVersion) return;
    _lastPricingVersion = version;
    applyBookingPricing(p);
  } catch(err) {
    console.warn('Pricing polling failed:', err);
    await syncBookingPricingViaRest();
  }
}

async function syncBookingPricingViaRest() {
  if(!RTDB_REST_PRICING_URL) return;
  try {
    const res = await fetch(`${RTDB_REST_PRICING_URL}?ts=${Date.now()}`, { cache: 'no-store' });
    if(!res.ok) return;
    const p = await res.json();
    if(!p || typeof p !== 'object') return;
    const version = String(p.updatedAt || JSON.stringify(p.serviceRates || p));
    if(version === _lastPricingVersion) return;
    _lastPricingVersion = version;
    applyBookingPricing(p);
  } catch(err) {
    console.warn('REST pricing fallback failed:', err);
  }
}

function ensurePricingFallbackSync() {
  if(_pricingSyncTimer) return;
  _pricingSyncTimer = setInterval(() => {
    syncBookingPricingOnce();
    syncBookingPricingViaRest();
  }, 5000);
}

// Render defaults only after the rate constants exist, so startup cannot trip on TDZ errors.
renderBookingServiceOptions();
updateBookingBillPreview();
initBookingRealtimePricing();

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
  if (service === 'other') return 0;
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
  const durInput = $('bk-duration');
  const durLockNote = $('bk-duration-lock-note');
  if(!box || !mainTxt || !amtEl || !noteEl) return;

  const service = $('bk-service')?.value;
  const startTime = getBookingStartTime24();
  const endTime = getBookingEndTime24();
  const detailPayload = getBookingServiceDetailPayload();
  updateBookingServiceDetailUi();
  const manualDur = parseInt(durInput?.value || '0', 10);
  const rangeDur = endTime ? durationFromTimeRange(startTime, endTime) : null;
  const dur = rangeDur || manualDur;

  if(durInput) {
    if(rangeDur && startTime && endTime) {
      durInput.value = String(rangeDur);
      durInput.readOnly = true;
      durInput.setAttribute('aria-readonly', 'true');
      durInput.title = 'Duration is auto-calculated from start/end time.';
      if(durLockNote) durLockNote.style.display = 'block';
    } else {
      durInput.readOnly = false;
      durInput.removeAttribute('aria-readonly');
      durInput.title = '';
      if(durLockNote) durLockNote.style.display = 'none';
    }
  }

  if(endTime && startTime && rangeDur === null) {
    mainTxt.textContent = 'Check start/end time';
    amtEl.textContent = 'Rs.0';
    noteEl.textContent = 'End time must be after start time.';
    box.style.display = 'block';
    return;
  }

  if(!service || !dur || dur < 1) {
    if(service === 'printing' || service === 'form-filling' || service === 'other' || CUSTOM_BOOKING_SERVICES[service]) {
      // continue for non-hourly services
    } else {
      box.style.display = 'none';
      return;
    }
  }

  const charge = computeBookingCharge(service, dur, detailPayload);
  mainTxt.textContent = charge.mainText;
  amtEl.textContent = `Rs.${charge.amount}`;
  noteEl.textContent = charge.noteText || (rangeDur ? 'Duration is auto-calculated from start/end time.' : 'Rounded amount will be billed.');
  box.style.display = 'block';
}
 
function checkRateLimit(phone) {
  try { const k='cbh_bk_'+new Date().toDateString(); return (JSON.parse(localStorage.getItem(k)||'{}')[phone]||0)<20; }
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
  const hint=$('bk-date-hint'); if(hint) hint.textContent='(today or tomorrow only)';
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

function isActiveBookingStatus(status) {
  const st = String(status || '').toLowerCase();
  return st === 'pending' || st === 'confirmed' || st === 'pending_payment';
}

async function loadActiveBookingsForDate(date) {
  if(!date) return [];
  const now = Date.now();
  if(_bookingCache.date === date && (now - _bookingCache.ts) < BOOKING_SUGGESTION_CACHE_TTL_MS) {
    return _bookingCache.rows;
  }
  const snap = await getDocs(query(collection(db, 'bookings'), where('date', '==', date)));
  const rows = [];
  snap.forEach(d => {
    const b = d.data() || {};
    if(isActiveBookingStatus(b.status)) rows.push(b);
  });
  _bookingCache = { date, ts: now, rows };
  return rows;
}

function countUsedSlots(bookings, service, window) {
  let used = 0;
  for(let i = 0; i < bookings.length; i++) {
    const b = bookings[i];
    if(b.service !== service) continue;
    const bookedWindow = deriveWindowFromBookingDoc(b);
    if(windowsOverlap(window, bookedWindow)) used++;
  }
  return used;
}

function getServiceSeatLimit(service) {
  return SEAT_LIMITS[service] || 5;
}

function listAvailableSlots(bookings, service, date, durationMin) {
  const openMin = Number.isFinite(BOOKING_OPEN_WINDOW?.openMin) ? BOOKING_OPEN_WINDOW.openMin : 7 * 60;
  const closeMin = Number.isFinite(BOOKING_OPEN_WINDOW?.closeMin) ? BOOKING_OPEN_WINDOW.closeMin : 21 * 60;
  const dur = Math.max(1, parseInt(durationMin || 0, 10) || 0);
  if(!dur) return [];

  const today = todayYmd();
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const out = [];
  for(let startMin = openMin; startMin + dur <= closeMin; startMin += SLOT_STEP_MIN) {
    if(date === today && startMin <= nowMin) continue;
    const window = { startMin, endMin: startMin + dur };
    const used = countUsedSlots(bookings, service, window);
    const limit = getServiceSeatLimit(service);
    if(used < limit) out.push(window);
  }
  return out;
}

function getRequestedDurationMin() {
  const startTime = getBookingStartTime24();
  const endTime = getBookingEndTime24();
  const rangeDur = endTime ? durationFromTimeRange(startTime, endTime) : null;
  if(rangeDur) return rangeDur;
  return parseInt($('bk-duration')?.value || '0', 10) || 60;
}

function formatWindowLabel(window) {
  const start = minutesToHHMM(window.startMin);
  const end = minutesToHHMM(window.endMin);
  return `${formatTime12(start)} - ${formatTime12(end)}`;
}

window.applySuggestedSlot = function(serviceKey, startMin, endMin) {
  const start = minutesToHHMM(startMin);
  const end = minutesToHHMM(endMin);
  if($('bk-service')) $('bk-service').value = serviceKey;
  if($('bk-time')) $('bk-time').value = start;
  if($('bk-end-time')) $('bk-end-time').value = end;
  const dur = endMin - startMin;
  if($('bk-duration')) $('bk-duration').value = String(Math.max(1, dur));
  updateBookingServiceDetailUi();
  updateBookingBillPreview();
  checkSlotAvail();
};

function renderSlotSuggestions(service, date, bookings) {
  const host = $('slot-suggestions');
  if(!host) return;
  host.innerHTML = '';
  if(!service || !date) return;

  const durationMin = getRequestedDurationMin();
  const slots = listAvailableSlots(bookings, service, date, durationMin);
  if(!slots.length) {
    host.innerHTML = `<div style="background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.2);border-radius:10px;padding:10px 12px;font-size:0.78rem;color:var(--danger);font-family:var(--font-alt)">❌ No available slots for ${escHTML(priceServiceLabel(service))} in the selected window.</div>`;
    return;
  }

  const btns = slots.map(window => {
    const label = formatWindowLabel(window);
    return `<button type="button" class="btn btn-outline btn-sm" style="padding:0.4rem 0.65rem" onclick="applySuggestedSlot('${service}',${window.startMin},${window.endMin})">${escHTML(label)}</button>`;
  }).join('');

  host.innerHTML = `
    <div style="background:rgba(0,220,255,0.06);border:1px solid rgba(0,220,255,0.2);border-radius:10px;padding:10px 12px;font-size:0.78rem;color:var(--cyan);font-family:var(--font-alt)">
      <div style="font-family:var(--font-h);font-size:0.74rem;letter-spacing:0.06em;color:var(--cyan);margin-bottom:0.5rem">AVAILABLE ${escHTML(priceServiceLabel(service)).toUpperCase()} SLOTS</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.4rem">${btns}</div>
    </div>
  `;
}

function renderAlternateServiceSuggestions(selectedService, date, bookings) {
  const host = $('alt-service-suggestions');
  if(!host) return;
  host.innerHTML = '';
  if(!selectedService || !date) return;

  const durationMin = getRequestedDurationMin();
  const services = [
    ...Object.keys(BOOKING_SERVICE_LABELS),
    ...Object.keys(CUSTOM_BOOKING_SERVICES)
  ].filter(key => key && key !== selectedService);

  const rows = services.map((service) => {
    const slots = listAvailableSlots(bookings, service, date, durationMin);
    if(!slots.length) return '';
    const btns = slots.map(window => {
      const label = formatWindowLabel(window);
      return `<button type="button" class="btn btn-outline btn-sm" style="padding:0.35rem 0.6rem" onclick="applySuggestedSlot('${service}',${window.startMin},${window.endMin})">${escHTML(label)}</button>`;
    }).join('');
    return `
      <div style="margin-top:0.6rem">
        <div style="font-size:0.78rem;color:var(--gold);font-family:var(--font-alt);margin-bottom:0.35rem">${escHTML(priceServiceLabel(service))}</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.35rem">${btns}</div>
      </div>
    `;
  }).filter(Boolean).join('');

  if(!rows) return;
  host.innerHTML = `
    <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.25);border-radius:10px;padding:10px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">
      <div style="font-family:var(--font-h);font-size:0.74rem;letter-spacing:0.06em;color:var(--gold);margin-bottom:0.45rem">ALTERNATE SERVICES AVAILABLE</div>
      ${rows}
    </div>
  `;
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
    renderSlotSuggestions('', '', []);
    renderAlternateServiceSuggestions('', '', []);
    return;
  }

  if(!date || !startTime){
    box.innerHTML=`<div style="background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.18);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--green);font-family:var(--font-alt)">✅ Max ${SEAT_LIMITS[service]||5} seats per slot</div>`;
    const bookings = date ? await loadActiveBookingsForDate(date) : [];
    renderSlotSuggestions(service, date, bookings);
    renderAlternateServiceSuggestions(service, date, bookings);
    return;
  }

  if(!isValidTimeHHMM(startTime)) {
    box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ Select a valid start time.</div>';
    renderSlotSuggestions(service, date, await loadActiveBookingsForDate(date));
    renderAlternateServiceSuggestions(service, date, await loadActiveBookingsForDate(date));
    return;
  }

  if(!isWithinBookingHours(startTime)) {
    box.innerHTML=`<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ Select a time between ${escHTML(bookingHoursLabel())}.</div>`;
    renderSlotSuggestions(service, date, await loadActiveBookingsForDate(date));
    renderAlternateServiceSuggestions(service, date, await loadActiveBookingsForDate(date));
    return;
  }

  if(endTime) {
    if(!isValidTimeHHMM(endTime)) {
      box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ Select a valid end time.</div>';
      return;
    }
    if(!isWithinBookingHours(endTime)) {
      box.innerHTML=`<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ End time must be within ${escHTML(bookingHoursLabel())}.</div>`;
      renderSlotSuggestions(service, date, await loadActiveBookingsForDate(date));
      renderAlternateServiceSuggestions(service, date, await loadActiveBookingsForDate(date));
      return;
    }
    if(durationFromTimeRange(startTime, endTime) === null) {
      box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ End time must be after start time.</div>';
      renderSlotSuggestions(service, date, await loadActiveBookingsForDate(date));
      renderAlternateServiceSuggestions(service, date, await loadActiveBookingsForDate(date));
      return;
    }
  }

  box.innerHTML='<div style="background:rgba(0,220,255,0.06);border:1px solid rgba(0,220,255,0.2);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--cyan);font-family:var(--font-alt)">⏳ Checking live slot availability...</div>';
  try {
    const bookings = await loadActiveBookingsForDate(date);
    const requestedWindow = deriveBookingWindow(startTime, endTime, duration || 60);
    if(!requestedWindow) {
      box.innerHTML='<div style="background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--danger);font-family:var(--font-alt)">❌ Invalid time window. Check start/end time.</div>';
      renderSlotSuggestions(service, date, bookings);
      renderAlternateServiceSuggestions(service, date, bookings);
      return;
    }
    const used = countUsedSlots(bookings, service, requestedWindow);
    const limit = getServiceSeatLimit(service);
    const state = { ok: used < limit, used, limit, reason: null };
    if(state.reason === 'invalid_window') {
      box.innerHTML='<div style="background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--danger);font-family:var(--font-alt)">❌ Invalid time window. Check start/end time.</div>';
      return;
    }
    const left = Math.max(0, state.limit - state.used);
    const color = left <= 0 ? 'var(--danger)' : left <= 1 ? 'var(--gold)' : 'var(--green)';
    const status = left <= 0 ? 'Slot currently full' : `${left} seats left`;
    box.innerHTML=`<div style="background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.18);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:${color};font-family:var(--font-alt)">📊 ${status} (used ${state.used}/${state.limit})</div>`;
    renderSlotSuggestions(service, date, bookings);
    renderAlternateServiceSuggestions(service, date, bookings);
  } catch (e) {
    const code = String(e?.code || '');
    if(code.includes('permission-denied')) {
      box.innerHTML='<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.24);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--gold);font-family:var(--font-alt)">⚠️ Live availability check is temporarily unavailable. Final validation happens on submit.</div>';
      return;
    }
    box.innerHTML='<div style="background:rgba(255,68,68,0.06);border:1px solid rgba(255,68,68,0.2);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--danger);font-family:var(--font-alt)">⚠️ Could not fetch availability. We will re-check on submit.</div>';
  }
}
 
setTimeout(()=>{
  restoreFormDraft();
  updateCardPreview();
  updateBookingServiceDetailUi();
  updateBookingBillPreview();
  applyBookingTimeConstraints();
  checkAdvanceBooking($('bk-date')?.value || '');

  $('bk-service')?.addEventListener('change',()=>{ updateBookingServiceDetailUi(); checkSlotAvail(); updateBookingBillPreview(); });
  $('bk-date')?.addEventListener('change',()=>{ checkSlotAvail(); checkAdvanceBooking($('bk-date')?.value); });
  $('bk-time')?.addEventListener('change',()=>{ checkSlotAvail(); checkAdvanceBooking($('bk-date')?.value); });
  $('bk-time')?.addEventListener('input',updateBookingBillPreview);
  $('bk-end-time')?.addEventListener('change',()=>{ updateBookingBillPreview(); checkSlotAvail(); });
  $('bk-end-time')?.addEventListener('input',updateBookingBillPreview);
  $('bk-duration')?.addEventListener('input',()=>{ updateBookingBillPreview(); checkSlotAvail(); });
  $('bk-print-single')?.addEventListener('input',updateBookingBillPreview);
  $('bk-print-double')?.addEventListener('input',updateBookingBillPreview);
  $('bk-form-kind')?.addEventListener('input',updateBookingBillPreview);
  $('bk-form-extra')?.addEventListener('input',updateBookingBillPreview);
  $('bk-custom-qty')?.addEventListener('input',updateBookingBillPreview);
  updateBookingServiceDetailUi();
  updateBookingBillPreview();
  queueFormDraftPersist();
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
  const detailPayload=getBookingServiceDetailPayload();
  const isNonHourlyService = service === 'printing' || service === 'form-filling' || service === 'other' || !!CUSTOM_BOOKING_SERVICES[service];
  let ratePerHour=bookingRateForService(service);
  let estimatedAmount=0;
  let pricingSuggestion='';
  let chargeSummary='';
  let discountApplied=0;
 
  ['bk-name-err','bk-phone-err','bk-service-err','bk-date-err','bk-time-err','bk-end-time-err','bk-human-err'].forEach(clearErr);
  const bkOk=$('bk-ok'), bkErr=$('bk-err');
  if(bkOk){bkOk.style.display='none';bkOk.innerHTML='';}
  if(bkErr){bkErr.style.display='none';bkErr.textContent='';}
  
  // Check "I'm not a robot" checkbox
  const humanVerify = $('bk-human-verify');
  if(!humanVerify || !humanVerify.checked){
    if(bkErr){bkErr.textContent='❌ Please confirm you are human to continue.'; bkErr.style.display='block';}
    return;
  }
  
  // Strong bot protection - honeypot field + form timing check
  if(looksLikeBot('bk-website','bk-btn')){
    if(bkErr){bkErr.textContent='❌ Suspicious request blocked. Please wait and try again.'; bkErr.style.display='block';}
    return;
  }
 
  let valid=true;
  if(!name)  { showErr('bk-name-err','Name is required.');      valid=false; }
  else if(!isLikelyName(name)){ showErr('bk-name-err','Enter a valid name.'); valid=false; }
  if(!phone) { showErr('bk-phone-err','Phone is required.');    valid=false; }
  else if(!/^[6-9][0-9]{9}$/.test(phone)){ showErr('bk-phone-err','Enter a valid 10-digit phone.'); valid=false; }
  if(!service){ showErr('bk-service-err','Select a service.'); valid=false; }
  if(!date)  { showErr('bk-date-err','Select a date.');       valid=false; }
  if(!time)  { showErr('bk-time-err','Enter a start time.');  valid=false; }
  else if(!isValidTimeHHMM(time)){ showErr('bk-time-err','Enter a valid time (e.g., 10:20).'); valid=false; }
  else if(!isWithinBookingHours(time)){ showErr('bk-time-err',`Select a time between ${bookingHoursLabel()}.`); valid=false; }

  if(endTime) {
    if(!isValidTimeHHMM(endTime)) {
      showErr('bk-end-time-err','Enter a valid end time (e.g., 11:20).');
      valid = false;
    } else if(!isWithinBookingHours(endTime)) {
      showErr('bk-end-time-err',`End time must be within ${bookingHoursLabel()}.`);
      valid = false;
    } else {
      const rangeDur = durationFromTimeRange(time, endTime);
      if(!rangeDur) {
        showErr('bk-end-time-err','End time must be after start time.');
        valid = false;
      } else {
        dur = rangeDur;
      }
    }
  }

  if(!isNonHourlyService) {
    if(!dur || dur<15 || dur>480){
      if(bkErr){bkErr.textContent='⚠️ Duration must be between 15 and 480 minutes.'; bkErr.style.display='block';}
      valid=false;
    }
  } else if(service === 'printing') {
    if((detailPayload.printSingle + detailPayload.printDouble) < 1) {
      if(bkErr){bkErr.textContent='⚠️ Enter pages/sheets for printing.'; bkErr.style.display='block';}
      valid = false;
    }
  }
  if(!valid) return;

  const charge = computeBookingCharge(service, dur, detailPayload);
  estimatedAmount = charge.amount;
  chargeSummary = charge.mainText;
  discountApplied = charge.raw?.discount || 0;
  ratePerHour = bookingRateForService(service);
  pricingSuggestion = charge.noteText || '';
 
  const today=new Date(); today.setHours(0,0,0,0);
  const selDate=new Date(date+'T00:00:00');
  if(selDate>new Date(today.getTime()+86400000)){ showErr('bk-date-err','Only today or tomorrow bookings are allowed.'); return; }

  const now = new Date();
  const selectedStartMin = hhmmToMinutes(time);
  if(date===todayYmd() && selectedStartMin!==null){
    const nowMin = now.getHours()*60 + now.getMinutes();
    if(selectedStartMin <= nowMin){
      showErr('bk-time-err','Choose a future time for today. Past time is not allowed.');
      return;
    }
  }
 
  if(!checkRateLimit(phone)){
    if(bkErr){bkErr.textContent='⚠️ Daily booking limit reached for this phone. WhatsApp: '+PAYMENT_PHONE; bkErr.style.display='block';}
    return;
  }
  const abuseGuard = await evaluateIpDeviceGuard('bk', {
    windowLimit: 6,
    windowMs: 10 * 60 * 1000,
    dailyIpLimit: 60,
    dailyDeviceLimit: 20
  });
  if(!abuseGuard.ok){
    if(bkErr){
      bkErr.textContent = abuseGuard.reason === 'ip_window'
        ? '⚠️ Too many requests from this network. Try again after 10 minutes.'
        : abuseGuard.reason === 'ip_daily'
          ? '⚠️ Daily booking limit reached for this network.'
          : '⚠️ Daily booking limit reached for this device. Try again tomorrow or contact us.';
      bkErr.style.display='block';
    }
    return;
  }
  const serverGuard = await evaluateServerAbuseGuard('bk_submit', phone);
  if(!serverGuard.ok){
    if(bkErr){
      bkErr.textContent = abuseReasonText(serverGuard.reason, '⚠️ Request limit exceeded. Please try again later.');
      bkErr.style.display='block';
    }
    return;
  }
  if(!consumeWindowRateLimit('cbh_bk_submit_min_'+phone,1,60000)){
    if(bkErr){bkErr.textContent='⚠️ Only 1 booking per minute is allowed. Please wait and try again.'; bkErr.style.display='block';}
    return;
  }
 
  const btn=$('bk-btn'); if(btn) btn.disabled=true;
  const btxt=$('bk-txt'), bload=$('bk-load');
  if(btxt) btxt.style.display='none';
  if(bload) bload.style.display='inline';
 
  try {
    let slotState = { ok: true, reason: null };
    try {
      slotState = await checkSlotCapacityBeforeSave(service, date, time, endTime || '', dur);
    } catch(slotErr) {
      const code = String(slotErr?.code || '');
      if(code.includes('permission-denied')) {
        if(bkErr){
          bkErr.textContent='⚠️ Live seat check is temporarily unavailable. We saved your request and will confirm by call.';
          bkErr.style.display='block';
        }
        slotState = { ok: true, reason: 'live_check_unavailable' };
      } else {
        throw slotErr;
      }
    }

    if(slotState.reason === 'invalid_window'){
      showErr('bk-end-time-err','Invalid time window. Please set start/end again.');
      return;
    }
    if(!slotState.ok){
      if(bkErr){ bkErr.textContent='⚠️ This slot is full. Please choose another time.'; bkErr.style.display='block'; }
      return;
    }

    const isAdv=selDate.getTime()>today.getTime();
    const trackCode=generateBookingCode();
    const bookingRef='CBH-BK-'+trackCode;
 
    await addDoc(collection(db,'bookings'),{
      name, phone, service, date, time, startTime: time, endTime: endTime || null,
      duration:String(dur), primeCard:card||null, note:note||null,
      ratePerHour, estimatedAmount, pricingSuggestion:pricingSuggestion||null,
      pricingSummary: chargeSummary || null,
      discountApplied: discountApplied || 0,
      serviceDetail: {
        printSingle: detailPayload.printSingle,
        printDouble: detailPayload.printDouble,
        formKind: detailPayload.formKind,
        formExtra: detailPayload.formExtra,
        customQty: detailPayload.customQty
      },
      status:isAdv?'pending_payment':'pending',
      bookingRef, trackCode,        // ← trackCode alag field bhi save hota hai
      isAdvance:isAdv,
      createdAt:new Date().toISOString(), source:'website'
    });
 
    incrementRateLimit(phone);
    commitIpDeviceGuard('bk', abuseGuard.ip);

    const prettyStart = formatTime12(time);
    const prettyEnd = endTime ? formatTime12(endTime) : null;
 
    const estimatedText = service === 'other'
      ? `Estimated Charge: ${bookingOtherContactLine().text}`
      : `Estimated Charge: Rs.${estimatedAmount} (${chargeSummary || `${dur} min @ Rs.${ratePerHour}/hr`})`;

    if(bkOk){
      bkOk.innerHTML=`<div style="text-align:center;padding:0.5rem 0 1rem;max-width:100%;overflow:hidden">
        <div style="font-size:0.75rem;color:var(--green);font-family:var(--font-alt);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.08em">✅ Booking Request Received!</div>
        <div style="font-size:0.72rem;color:var(--txt2);font-family:var(--font-alt);margin-bottom:0.75rem">Save your booking code:</div>
        <div style="font-family:var(--font-h);font-size:clamp(1.9rem,10vw,2.5rem);font-weight:900;color:var(--cyan);letter-spacing:0.08em;text-shadow:0 0 20px rgba(0,220,255,0.4);margin-bottom:0.5rem;line-height:1.05;word-break:break-all;overflow-wrap:anywhere">${trackCode}</div>
        <div style="font-size:0.68rem;color:var(--muted);font-family:var(--font-alt);margin-bottom:1rem">Save this 8-character code to check status later</div>
        <div style="font-size:0.8rem;color:var(--gold);font-family:var(--font-h);margin-bottom:0.4rem;overflow-wrap:anywhere">${escHTML(estimatedText)}</div>
        <div style="font-size:0.75rem;color:var(--txt2);font-family:var(--font-alt);margin-bottom:0.8rem;overflow-wrap:anywhere">Time: ${prettyStart}${prettyEnd?` - ${prettyEnd}`:''}</div>
        ${isAdv?`<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:8px;padding:0.75rem;font-size:0.8rem;color:var(--gold);font-family:var(--font-alt)">
          💳 Payment is required for tomorrow bookings<br>
          📞 Call: <a href="tel:+91${PAYMENT_PHONE}" style="color:var(--cyan);font-weight:700">${PAYMENT_PHONE}</a>
        </div>`:`<div style="font-size:0.8rem;color:var(--txt2);font-family:var(--font-alt)">
          📞 We will call <strong style="color:var(--white)">${maskPhone(phone)}</strong> to confirm
        </div>`}
      </div>`;
      bkOk.style.display='block';
    }
 
    [$('bk-name'),$('bk-phone'),$('bk-card'),$('bk-note')].forEach(el=>{if(el)el.value='';});
    if($('bk-service'))$('bk-service').value='';
    if($('bk-time'))$('bk-time').value='';
    if($('bk-end-time'))$('bk-end-time').value='';
    if($('bk-duration')) {
      $('bk-duration').value='60';
      $('bk-duration').readOnly = false;
      $('bk-duration').removeAttribute('aria-readonly');
      $('bk-duration').title = '';
    }
    if($('bk-duration-lock-note')) $('bk-duration-lock-note').style.display = 'none';
    if($('bk-human-verify'))$('bk-human-verify').checked=false;
    const sab=$('slot-availability'); if(sab) sab.innerHTML='';
    const payBox=$('bk-payment-box'); if(payBox) payBox.style.display='none';
    const billBox=$('bk-bill-preview'); if(billBox) billBox.style.display='none';
    clearFormDraftFields([
      'bk-name','bk-phone','bk-service','bk-date','bk-time','bk-end-time',
      'bk-duration','bk-card','bk-note','bk-print-single','bk-print-double','bk-form-kind','bk-form-extra','bk-custom-qty',
      'bk-track-phone','bk-track-input'
    ]);
    queueFormDraftPersist();
 
  } catch(err) {
    console.error('Booking submit failed:', err);
    if(bkErr){ bkErr.textContent='❌ Booking could not be submitted. Please try again later.'; bkErr.style.display='block'; }
  } finally {
    if(btn) btn.disabled=false;
    if(btxt) btxt.style.display='inline';
    if(bload) bload.style.display='none';
  }
};
 
// ===== INQUIRY =====
  syncBookingPricingViaRest();
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
      if(errEl){ errEl.textContent='❌ reCAPTCHA verification failed. Please try again.'; errEl.style.display='block'; }
      return;
    }
  }
  if(looksLikeBot('inq-website','inq-btn')){
    if(errEl){ errEl.textContent='❌ Suspicious request blocked. Please wait and try again.'; errEl.style.display='block'; }
    return;
  }
  let valid=true;
  if(!name){ showErr('inq-name-err','Name is required.'); valid=false; }
  else if(!isLikelyName(name)){ showErr('inq-name-err','Enter a valid name.'); valid=false; }
  if(!phone){ showErr('inq-phone-err','Phone is required.'); valid=false; }
  else if(!/^[6-9][0-9]{9}$/.test(phone)){ showErr('inq-phone-err','Enter a valid 10-digit phone.'); valid=false; }
  if(!reason){ showErr('inq-reason-err','Select a reason.'); valid=false; }
  if(!valid) return;
  const inquiryGuard = await evaluateIpDeviceGuard('inq', {
    windowLimit: 4,
    windowMs: 10 * 60 * 1000,
    dailyIpLimit: 24,
    dailyDeviceLimit: 6
  });
  if(!inquiryGuard.ok){
    if(errEl){
      errEl.textContent = inquiryGuard.reason === 'ip_window'
        ? '⚠️ Too many inquiries from this network. Try again after 10 minutes.'
        : inquiryGuard.reason === 'ip_daily'
          ? '⚠️ Daily inquiry limit reached for this network.'
          : '⚠️ Daily inquiry limit reached for this device. Try again tomorrow.';
      errEl.style.display='block';
    }
    return;
  }
  const inquiryServerGuard = await evaluateServerAbuseGuard('inq_submit', phone);
  if(!inquiryServerGuard.ok){
    if(errEl){
      errEl.textContent = abuseReasonText(inquiryServerGuard.reason, '⚠️ Inquiry limit exceeded. Please try again later.');
      errEl.style.display='block';
    }
    return;
  }
  const btn=$('inq-btn'); if(btn) btn.disabled=true;
  const btxt=$('inq-txt'), bload=$('inq-load');
  if(btxt) btxt.style.display='none';
  if(bload) bload.style.display='inline';
  try {
    await addDoc(collection(db,'inquiries'),{name,phone,reason,message:cleanInput(msg,300)||null,status:'new',createdAt:new Date().toISOString(),source:'website'});
    commitIpDeviceGuard('inq', inquiryGuard.ip);
    if(okEl){ okEl.textContent='✅ Inquiry received! We will call you. WhatsApp: 8829822950'; okEl.style.display='block'; }
    [$('inq-name'),$('inq-phone'),$('inq-msg')].forEach(el=>{if(el)el.value='';});
    if($('inq-reason'))$('inq-reason').value='';
    clearFormDraftFields(['inq-name','inq-phone','inq-reason','inq-msg']);
    queueFormDraftPersist();
  } catch(err) {
    console.error('Inquiry submit failed:', err);
    if(errEl){ errEl.textContent='❌ Inquiry could not be submitted. Please try again later.'; errEl.style.display='block'; }
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
  const normPhone10 = v => String(v||'').replace(/\D/g,'').slice(-10);
  const phoneRaw = cleanInput(phoneInp.value,20);
  const phone = normPhone10(phoneRaw);
  if(!/^[6-9][0-9]{9}$/.test(phone)){
    res.style.display='block';
    res.innerHTML='<div style="color:var(--danger);font-family:var(--font-alt);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px">❌ Enter a valid 10-digit booking phone (e.g., 98XXXXXXXX). +91 is OK.</div>';
    return;
  }
  if(!consumeWindowRateLimit('cbh_booking_lookup_rl_'+phone,5,3600000)){
    res.style.display='block';
    res.innerHTML='<div style="color:var(--danger);font-family:var(--font-alt);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px">❌ Too many checks. Please try again after 1 hour.</div>';
    return;
  }
  const lookupServerGuard = await evaluateServerAbuseGuard('bk_lookup', phone);
  if(!lookupServerGuard.ok){
    res.style.display='block';
    res.innerHTML=`<div style="color:var(--danger);font-family:var(--font-alt);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px">❌ ${abuseReasonText(lookupServerGuard.reason, 'Request limit exceeded. Please try again later.')}</div>`;
    return;
  }
  const code=inp.value.trim().toUpperCase();
  if(!code || !(/^[A-Z0-9]{8}$/.test(code) || /^[0-9]{5}$/.test(code))){
    res.style.display='block';
    res.innerHTML='<div style="color:var(--danger);font-family:var(--font-alt);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px">❌ Enter a valid booking code (e.g., A1B2C3D4)</div>';
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
        ❌ Booking details could not be verified.<br>
        <span style="font-size:0.78rem;color:var(--muted)">WhatsApp: <a href="https://wa.me/918829822950" style="color:var(--cyan)">8829822950</a></span>
      </div>`;
      return;
    }
 
    const enteredPhone10 = phone;
    const matchedDoc = snap.docs.find(d => normPhone10(d.data()?.phone) === enteredPhone10) || null;
    if(!matchedDoc){
      const expectedMasked = maskPhone(snap.docs[0]?.data()?.phone || '');
      res.innerHTML=`<div style="color:var(--danger);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px;border:1px solid rgba(255,68,68,0.2)">
        ❌ Booking details could not be verified. Match the code and phone.<br>
        <span style="font-size:0.78rem;color:var(--muted)">Hint: This code is linked with phone ${escHTML(expectedMasked)}.</span>
      </div>`;
      return;
    }
    const b=matchedDoc.data();
    const sc={pending:'var(--gold)',confirmed:'var(--green)',rejected:'var(--danger)',pending_payment:'var(--cyan)'};
    const sl={
      pending:'⏳ Pending — We are reviewing, you will get a call',
      confirmed:'✅ Confirmed! Booking is confirmed 🎮',
      rejected:'❌ Rejected — Please book another time',
      pending_payment:'💳 Payment Pending — Call: '+PAYMENT_PHONE
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
        📞 New slot: <a href="https://wa.me/918829822950" style="color:var(--cyan);font-weight:600">WhatsApp 8829822950</a>
      </div>`:''}
    </div>`;
  } catch(err) {
    console.error('Booking status lookup failed:', err);
    const errMsg = String(err?.code || err?.message || '');
    let displayMsg = 'Status could not be fetched. Please try again later.';
    
    if(errMsg.includes('permission-denied')) {
      displayMsg = '⚠️ Server permission issue. WhatsApp: 8829822950';
    } else if(errMsg.includes('network') || errMsg.includes('offline')) {
      displayMsg = '⚠️ Check your internet connection.';
    }
    
    res.innerHTML=`<div style="color:var(--danger);font-size:0.82rem;padding:0.75rem">❌ ${displayMsg}</div>`;
  }
};
 
console.log('✅ CityByteHub Booking v6.0 ready');
 
