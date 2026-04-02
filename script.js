/**
 * CityByteHub — script.js v6.1 (Security Pass)
 * ─────────────────────────────────────────────
 * Changes from v6.0:
 *  1. XSS: All dynamic HTML output replaced with textContent / safe DOM builders
 *  2. reCAPTCHA v3 integrated on Booking, Inquiry, Prime Application
 *  3. Input sanitization helper (strip tags, trim, length-cap)
 *  4. Per-form 5-second anti-spam cooldown + button lock during submit
 *  5. try/catch on every async; error messages never expose stack/internals
 *  6. No new global functions — all Firebase handlers registered as _fb_* only
 *  7. checkCardStatus and checkBookingStatus use DOM builder, not innerHTML
 *  8. Announcement / offers use textContent (no innerHTML from RTDB)
 *  9. console.log removed from production path
 * 10. primeCard status display built via DOM, not innerHTML template
 */
 
'use strict';
 
// ═══════════════════════════════════════════
// FIREBASE IMPORTS
// ═══════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getDatabase, ref, onValue }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
 
const firebaseConfig = {
  apiKey:            "AIzaSyAGfzMX4vrLR_yYPDi0FRYTjpEY_8RCRRE",
  authDomain:        "citybytehub-dde05.firebaseapp.com",
  databaseURL:       "https://citybytehub-dde05-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "citybytehub-dde05",
  storageBucket:     "citybytehub-dde05.firebasestorage.app",
  messagingSenderId: "1022508813132",
  appId:             "1:1022508813132:web:8782022cf65ff28c7bdde9"
};
 
const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const rtdb = getDatabase(app);
 
// ═══════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════
const RECAPTCHA_SITE_KEY = '6Lcb26IsAAAAAEM5QouEhfso4Arh4SvmNRFX5cKD';
const PAYMENT_PHONE      = '8829822950';
const SEAT_LIMITS        = { 'gaming-pc':5, 'ps5':2, 'internet':8, 'printing':3, 'form-filling':3, 'other':5 };
const SUBMIT_COOLDOWN_MS = 5000; // 5-second anti-spam cooldown per form
 
// Per-form last-submit timestamps (in-memory, reset on page reload)
const _lastSubmit = { booking: 0, inquiry: 0, prime: 0 };
 
// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
 
/** Safe DOM element getter */
const $ = id => document.getElementById(id);
 
/**
 * SECURITY: Sanitize a text input.
 * - Trims whitespace
 * - Strips any HTML tags (< >) to prevent stored XSS
 * - Caps at maxLen characters
 */
function sanitize(val, maxLen = 500) {
  if (typeof val !== 'string') return '';
  return val.trim().replace(/<[^>]*>/g, '').slice(0, maxLen);
}
 
/** Show a field-level error using textContent (XSS-safe) */
function showErr(id, msg) {
  const e = $(id);
  if (!e) return;
  e.textContent = msg;   // safe — no innerHTML
  e.style.display = 'block';
  clearTimeout(e._t);
  e._t = setTimeout(() => { e.style.display = 'none'; }, 6000);
}
 
/** Clear a field-level error */
function clearErr(id) {
  const e = $(id);
  if (e) { e.textContent = ''; e.style.display = 'none'; }
}
 
/** Show/hide form-level success box (XSS-safe) */
function showFormSuccess(id, msg) {
  const e = $(id);
  if (!e) return;
  e.textContent = msg;
  e.style.display = 'block';
}
 
/** Show/hide form-level error box (XSS-safe) */
function showFormErr(id, msg) {
  const e = $(id);
  if (!e) return;
  e.textContent = msg;
  e.style.display = 'block';
}
 
function hideEl(id)   { const e = $(id); if (e) e.style.display = 'none'; }
function setTxt(id, v){ const e = $(id); if (e) e.textContent = v; }
 
/** Button loading state helpers */
function setBtnLoading(btnId, txtId, loadId) {
  const btn  = $(btnId);
  const btxt = $(txtId);
  const bld  = $(loadId);
  if (btn)  btn.disabled = true;
  if (btxt) btxt.style.display = 'none';
  if (bld)  bld.style.display  = 'inline';
}
function setBtnReady(btnId, txtId, loadId) {
  const btn  = $(btnId);
  const btxt = $(txtId);
  const bld  = $(loadId);
  if (btn)  btn.disabled = false;
  if (btxt) btxt.style.display = 'inline';
  if (bld)  bld.style.display  = 'none';
}
 
/** Anti-spam: check + enforce 5-second cooldown per form */
function checkCooldown(formKey) {
  const now = Date.now();
  if (now - _lastSubmit[formKey] < SUBMIT_COOLDOWN_MS) {
    const rem = Math.ceil((SUBMIT_COOLDOWN_MS - (now - _lastSubmit[formKey])) / 1000);
    return `Please wait ${rem} second${rem !== 1 ? 's' : ''} before submitting again.`;
  }
  return null;
}
function stampCooldown(formKey) {
  _lastSubmit[formKey] = Date.now();
}
 
/**
 * SECURITY: reCAPTCHA v3 token getter.
 * Returns token string or null on failure.
 * Never throws — failure is handled by callers.
 */
async function getRecaptchaToken(action) {
  try {
    return await new Promise((resolve, reject) => {
      if (!window.grecaptcha) { reject(new Error('reCAPTCHA not loaded')); return; }
      window.grecaptcha.ready(function() {
        window.grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action })
          .then(resolve)
          .catch(reject);
      });
    });
  } catch {
    return null;
  }
}
 
/**
 * SECURITY: Rate-limit by phone (localStorage, per calendar day).
 * Max 3 bookings per phone per day.
 */
function checkRateLimit(phone) {
  try {
    const k = 'cbh_bk_' + new Date().toDateString();
    return (JSON.parse(localStorage.getItem(k) || '{}')[phone] || 0) < 3;
  } catch { return true; }
}
function incrementRateLimit(phone) {
  try {
    const k = 'cbh_bk_' + new Date().toDateString();
    const s = JSON.parse(localStorage.getItem(k) || '{}');
    s[phone] = (s[phone] || 0) + 1;
    localStorage.setItem(k, JSON.stringify(s));
  } catch { /* silent */ }
}
 
// ═══════════════════════════════════════════
// PARTICLES
// ═══════════════════════════════════════════
(function initParticles() {
  const canvas = $('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [], W, H;
 
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function mkP() {
    return { x:rnd(0,W), y:rnd(0,H), vx:rnd(-0.3,0.3), vy:rnd(-0.4,-0.1),
             size:rnd(1,2.5), opacity:rnd(0.2,0.7),
             color:Math.random() > 0.5 ? '0,220,255' : '124,58,237',
             life:0, maxLife:rnd(200,500) };
  }
  function init() {
    particles = [];
    const n = Math.min(Math.floor(W / 8), 80);
    for (let i = 0; i < n; i++) { const p = mkP(); p.life = Math.random() * p.maxLife; particles.push(p); }
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i], b = particles[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0,220,255,${(1 - d / 120) * 0.06})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
    }
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.life++;
      const a = p.opacity * Math.sin(p.life / p.maxLife * Math.PI);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color},${a})`; ctx.fill();
      if (p.life >= p.maxLife || p.x < 0 || p.x > W || p.y < 0) particles[i] = mkP();
    });
    requestAnimationFrame(draw);
  }
  resize(); init(); draw();
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { resize(); init(); }, 200); });
})();
 
// ═══════════════════════════════════════════
// REVEAL ELEMENTS
// ═══════════════════════════════════════════
(function initReveal() {
  function showAll() { document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible')); }
  showAll();
  setTimeout(showAll, 300);
  setTimeout(showAll, 1000);
})();
 
// ═══════════════════════════════════════════
// RTDB: ANNOUNCEMENTS
// XSS-safe: textContent only
// ═══════════════════════════════════════════
onValue(ref(rtdb, 'announcements/latest'), snap => {
  const bar = $('ann-bar'), txt = $('ann-bar-text');
  if (!snap.exists() || !bar || !txt) return;
  const data = snap.val();
  if (data && typeof data.message === 'string' && data.message.trim()) {
    // SECURITY: textContent — no XSS risk
    txt.textContent = sanitize(data.message, 300);
    bar.classList.add('show');
  }
}, () => { /* silent on error */ });
 
// ═══════════════════════════════════════════
// RTDB: PRICING
// XSS-safe: textContent only
// ═══════════════════════════════════════════
onValue(ref(rtdb, 'pricing'), snap => {
  if (!snap.exists()) return;
  const p = snap.val();
  const map = { pc:'pc-price', ps5:'ps5-price', net:'net-price', prime:'prime-price' };
  Object.entries(map).forEach(([key, elId]) => {
    if (p[key] !== undefined && p[key] !== null) {
      const e = $(elId);
      if (e) {
        // SECURITY: textContent, not innerHTML
        e.textContent = sanitize(String(p[key]), 20);
        e.classList.remove('ask');
      }
    }
  });
}, () => { /* silent */ });
 
// ═══════════════════════════════════════════
// RTDB: OFFERS
// XSS-safe: textContent only
// ═══════════════════════════════════════════
onValue(ref(rtdb, 'offers/current'), snap => {
  const el = $('current-offer-txt');
  if (!el) return;
  if (snap.exists() && snap.val()) {
    el.textContent = sanitize(String(snap.val()), 300);
  } else {
    el.textContent = 'Visit us for current offers on Weekly & Monthly plans!';
  }
}, () => {
  const el = $('current-offer-txt');
  if (el) el.textContent = 'Visit us for current offers!';
});
 
// ═══════════════════════════════════════════
// RTDB: LIVE SEATS
// XSS-safe: textContent
// ═══════════════════════════════════════════
onValue(ref(rtdb, 'seats'), snap => {
  const v  = snap.exists() ? parseInt(snap.val(), 10) : 5;
  const el = $('avail-pc');
  if (el) {
    el.textContent = (isNaN(v) ? 5 : Math.max(0, v)) + ' seats available';
    el.style.color = v <= 0 ? 'var(--danger)' : v <= 2 ? 'var(--gold)' : 'var(--green)';
  }
}, () => { setTxt('avail-pc', '5 seats available'); });
 
// ═══════════════════════════════════════════
// CARD PREVIEW
// ═══════════════════════════════════════════
window.switchCardPreview = function(plan, btn) {
  const isWeekly = plan === 'weekly';
  const w  = $('card-preview-weekly');
  const m  = $('card-preview-monthly');
  const bw = $('plan-benefits-weekly');
  const bm = $('plan-benefits-monthly');
  if (w)  w.style.display  = isWeekly ? 'flex'  : 'none';
  if (m)  m.style.display  = isWeekly ? 'none'  : 'flex';
  if (bw) bw.style.display = isWeekly ? 'block' : 'none';
  if (bm) bm.style.display = isWeekly ? 'none'  : 'block';
  document.querySelectorAll('.card-preview-box .plan-btn').forEach(b => {
    b.classList.remove('active', 'weekly', 'monthly');
    b.classList.add(b.textContent.toLowerCase().includes('weekly') ? 'weekly' : 'monthly');
    b.setAttribute('aria-pressed', 'false');
  });
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
  window.setFormPlan(plan);
};
 
window.setFormPlan = function(plan) {
  const sel = $('selected-plan');
  if (sel) sel.value = plan;
  const wb = $('form-weekly-btn'), mb = $('form-monthly-btn');
  if (wb && mb) {
    wb.classList.remove('active'); mb.classList.remove('active');
    wb.setAttribute('aria-pressed', 'false'); mb.setAttribute('aria-pressed', 'false');
    const active = plan === 'weekly' ? wb : mb;
    active.classList.add('active');
    active.setAttribute('aria-pressed', 'true');
  }
  // Sync card preview panels
  const w  = $('card-preview-weekly');
  const m  = $('card-preview-monthly');
  const bw = $('plan-benefits-weekly');
  const bm = $('plan-benefits-monthly');
  if (w)  w.style.display  = plan === 'weekly' ? 'flex'  : 'none';
  if (m)  m.style.display  = plan === 'weekly' ? 'none'  : 'flex';
  if (bw) bw.style.display = plan === 'weekly' ? 'block' : 'none';
  if (bm) bm.style.display = plan === 'weekly' ? 'none'  : 'block';
};
 
window.updateCardPreview = function() {
  const raw  = $('prime-name')?.value || '';
  // SECURITY: sanitize before inserting into DOM via textContent
  const name = sanitize(raw.toUpperCase(), 80) || 'YOUR NAME HERE';
  const today = new Date();
  const exp7  = new Date(today); exp7.setDate(today.getDate() + 7);
  const exp30 = new Date(today); exp30.setMonth(today.getMonth() + 1);
  const fmtMY = d => String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(-2);
  setTxt('prev-w-name', name);  setTxt('prev-m-name', name);
  setTxt('prev-w-exp', fmtMY(exp7));  setTxt('prev-m-exp', fmtMY(exp30));
  setTxt('prev-w-bal', '10 hrs');     setTxt('prev-m-bal', '40 hrs');
};
 
// Register the live-preview listener
const primeNameInput = $('prime-name');
if (primeNameInput) primeNameInput.addEventListener('input', window.updateCardPreview);
window.updateCardPreview();
 
// ═══════════════════════════════════════════
// PRIME CARD APPLICATION
// ═══════════════════════════════════════════
window._fb_submitPrimeApplication = async function() {
  // Cooldown check
  const coolErr = checkCooldown('prime');
  if (coolErr) { showFormErr('prime-err', '⏳ ' + coolErr); return; }
 
  // Read + sanitize
  const name    = sanitize($('prime-name')?.value   || '', 80);
  const phone   = sanitize($('prime-phone')?.value  || '', 10);
  const plan    = ($('selected-plan')?.value === 'monthly') ? 'monthly' : 'weekly';
  const college = sanitize($('prime-college')?.value || '', 120);
  const note    = sanitize($('prime-note')?.value    || '', 400);
 
  // Clear previous messages
  ['prime-name-err','prime-phone-err'].forEach(clearErr);
  hideEl('prime-ok'); hideEl('prime-err');
 
  // Validation
  let valid = true;
  if (!name || name.length < 2)                       { showErr('prime-name-err',  'Full name required (min 2 chars).'); valid = false; }
  if (!phone)                                          { showErr('prime-phone-err', 'Phone number required.'); valid = false; }
  else if (!/^[6-9][0-9]{9}$/.test(phone))            { showErr('prime-phone-err', 'Enter a valid 10-digit Indian mobile number.'); valid = false; }
  if (!valid) return;
 
  // reCAPTCHA v3
  const token = await getRecaptchaToken('prime_apply');
  if (!token) {
    showFormErr('prime-err', '⚠️ Security check failed. Please refresh and try again.');
    return;
  }
 
  stampCooldown('prime');
  setBtnLoading('prime-apply-btn', 'prime-apply-txt', 'prime-apply-load');
 
  try {
    await addDoc(collection(db, 'updateRequests'), {
      type:        'new_card',
      studentName: name,
      phone:       phone,
      plan:        plan,
      college:     college || null,
      note:        note    || null,
      status:      'pending',
      requestedBy: 'website_user',
      requestedAt: new Date().toISOString(),
      source:      'website',
      recaptchaToken: token   // stored for server-side verification
    });
 
    showFormSuccess('prime-ok',
      '✅ Application submitted! Visit Piprali Road to pay and activate your card. We will call you soon.');
 
    // Clear inputs
    [$('prime-name'), $('prime-phone'), $('prime-college'), $('prime-note')].forEach(el => { if (el) el.value = ''; });
    window.updateCardPreview();
 
  } catch {
    // SECURITY: never expose Firebase error details to user
    showFormErr('prime-err', '❌ Submission failed. Please try again or WhatsApp: ' + PAYMENT_PHONE);
  } finally {
    setBtnReady('prime-apply-btn', 'prime-apply-txt', 'prime-apply-load');
  }
};
 
// ═══════════════════════════════════════════
// CHECK CARD STATUS
// XSS-safe: builds DOM nodes, no innerHTML
// ═══════════════════════════════════════════
window._fb_checkCardStatus = async function() {
  const rawVal = sanitize($('card-check-input')?.value || '', 20).toUpperCase();
  const res    = $('card-check-result');
  if (!rawVal || !res) return;
 
  res.style.display = 'block';
  res.textContent   = '🔍 Checking...';   // textContent — safe
 
  try {
    let cards = [];
    const s1 = await getDocs(query(collection(db, 'primeCards'), where('cardNumber', '==', rawVal)));
    s1.forEach(d => cards.push({ id: d.id, ...d.data() }));
 
    // Fallback: search by phone if looks like one
    if (!cards.length && rawVal.length === 10 && /^\d+$/.test(rawVal)) {
      const s2 = await getDocs(query(collection(db, 'primeCards'), where('phone', '==', rawVal)));
      s2.forEach(d => cards.push({ id: d.id, ...d.data() }));
    }
 
    if (!cards.length) {
      res.textContent = '❌ Card not found.';
      return;
    }
 
    const c  = cards[0];
    // SECURITY: build DOM safely — no innerHTML with data from Firestore
    const wrap = document.createElement('div');
    wrap.style.cssText = 'background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:1rem';
 
    const statusColor = c.status === 'active' ? 'var(--green)' : c.status === 'expired' ? 'var(--danger)' : 'var(--gold)';
    const statusLabel = c.status === 'active' ? '✅ Active'   : c.status === 'expired'  ? '❌ Expired'   : '⏳ Pending';
 
    const stEl = document.createElement('div');
    stEl.style.cssText = `font-family:var(--font-h);font-size:0.78rem;color:${statusColor};margin-bottom:0.5rem`;
    stEl.textContent   = statusLabel;
    wrap.appendChild(stEl);
 
    // Info rows — all textContent
    const info = [
      ['Card',       c.cardNumber || '—'],
      ['Name',       c.name       || '—'],
      ['Plan',       c.plan === 'weekly' ? 'Weekly' : 'Monthly'],
      ['Balance',    c.balance    || '—'],
      ['Valid Till', c.expiry     || '—'],
    ];
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'font-size:0.82rem;color:var(--white);font-family:var(--font-alt);line-height:1.9';
    info.forEach(([label, val]) => {
      const row = document.createElement('div');
      const b   = document.createElement('b');
      b.textContent = label + ': ';
      row.appendChild(b);
      row.appendChild(document.createTextNode(val));
      infoDiv.appendChild(row);
    });
    wrap.appendChild(infoDiv);
 
    if (c.status !== 'active') {
      const warn = document.createElement('div');
      warn.style.cssText = 'color:var(--danger);font-size:0.78rem;margin-top:0.5rem';
      warn.textContent   = 'Card not active — please visit our store.';
      wrap.appendChild(warn);
    }
 
    res.textContent = ''; // clear "Checking..."
    res.appendChild(wrap);
 
  } catch {
    res.textContent = '❌ Error checking card. Please try again.';
  }
};
 
// ═══════════════════════════════════════════
// DATE LIMITS FOR BOOKING
// ═══════════════════════════════════════════
(function initDateLimits() {
  const di = $('bk-date');
  if (!di) return;
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
 
  di.min   = today;
  di.max   = tomorrowStr;
  di.value = today;
 
  const hint = $('bk-date-hint');
  if (hint) hint.textContent = '(today or tomorrow only)';
 
  di.addEventListener('change', function() {
    const payBox = $('bk-payment-box');
    if (payBox) payBox.style.display = (this.value > today) ? 'block' : 'none';
  });
})();
 
// Service change → show seat info
setTimeout(() => {
  $('bk-service')?.addEventListener('change', function() {
    const service = this.value;
    const box     = $('slot-availability');
    if (!service || !box) return;
    const seats = SEAT_LIMITS[service] || 5;
    // SECURITY: textContent — no innerHTML
    box.textContent = `Max ${seats} seats per slot`;
    box.style.cssText = 'margin-top:0.5rem;padding:8px 12px;background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.18);border-radius:8px;font-size:0.78rem;color:var(--green);font-family:var(--font-alt)';
  });
}, 500);
 
// ═══════════════════════════════════════════
// BOOKING FORM SUBMISSION
// ═══════════════════════════════════════════
window._fb_submitBooking = async function() {
  // Cooldown check
  const coolErr = checkCooldown('booking');
  if (coolErr) {
    const bkErr = $('bk-err');
    if (bkErr) { bkErr.textContent = '⏳ ' + coolErr; bkErr.style.display = 'block'; }
    return;
  }
 
  // Read + sanitize
  const name    = sanitize($('bk-name')?.value    || '', 80);
  const phone   = sanitize($('bk-phone')?.value   || '', 10);
  const service = sanitize($('bk-service')?.value || '', 30);
  const date    = sanitize($('bk-date')?.value    || '', 10);
  const time    = sanitize($('bk-time')?.value    || '', 10);
  const dur     = sanitize($('bk-duration')?.value || '1', 2);
  const card    = sanitize(($('bk-card')?.value    || '').toUpperCase(), 30);
  const note    = sanitize($('bk-note')?.value    || '', 400);
 
  // Clear prev
  ['bk-name-err','bk-phone-err','bk-service-err','bk-date-err','bk-time-err'].forEach(clearErr);
  const bkOk  = $('bk-ok');
  const bkErr = $('bk-err');
  if (bkOk)  { bkOk.style.display  = 'none'; bkOk.textContent  = ''; }
  if (bkErr) { bkErr.style.display = 'none'; bkErr.textContent = ''; }
 
  // Validation
  let valid = true;
  if (!name  || name.length < 2)              { showErr('bk-name-err',    'Full name required (min 2 chars).');     valid = false; }
  if (!phone)                                  { showErr('bk-phone-err',   'Phone number required.');                valid = false; }
  else if (!/^[6-9][0-9]{9}$/.test(phone))    { showErr('bk-phone-err',   'Enter a valid 10-digit mobile number.'); valid = false; }
  if (!service)                                { showErr('bk-service-err', 'Please select a service.');              valid = false; }
  if (!date)                                   { showErr('bk-date-err',    'Please select a date.');                 valid = false; }
  if (!time)                                   { showErr('bk-time-err',    'Please select a time slot.');            valid = false; }
  if (!valid) return;
 
  // Date range check — only today or tomorrow
  const today   = new Date(); today.setHours(0, 0, 0, 0);
  const selDate = new Date(date + 'T00:00:00');
  if (selDate > new Date(today.getTime() + 86400000)) {
    showErr('bk-date-err', 'Only today or tomorrow bookings are allowed.');
    return;
  }
 
  // Per-phone rate limit
  if (!checkRateLimit(phone)) {
    if (bkErr) { bkErr.textContent = '⚠️ Max 3 bookings per phone per day. WhatsApp: ' + PAYMENT_PHONE; bkErr.style.display = 'block'; }
    return;
  }
 
  // reCAPTCHA v3
  const token = await getRecaptchaToken('booking');
  if (!token) {
    if (bkErr) { bkErr.textContent = '⚠️ Security check failed. Refresh and try again.'; bkErr.style.display = 'block'; }
    return;
  }
 
  stampCooldown('booking');
  setBtnLoading('bk-btn', 'bk-txt', 'bk-load');
 
  try {
    const isAdv      = selDate.getTime() > today.getTime();
    const trackCode  = String(Math.floor(10000 + Math.random() * 90000));
 
    await addDoc(collection(db, 'bookings'), {
      name, phone, service, date, time,
      duration:        dur     || '1',
      primeCard:       card    || null,
      note:            note    || null,
      status:          isAdv ? 'pending_payment' : 'pending',
      bookingRef:      'CBH-BK-' + trackCode,
      trackCode,
      isAdvance:       isAdv,
      createdAt:       new Date().toISOString(),
      source:          'website',
      recaptchaToken:  token
    });
 
    incrementRateLimit(phone);
 
    // SECURITY: Build success message with DOM — no innerHTML with user data
    if (bkOk) {
      bkOk.textContent = ''; // clear old
 
      const wrap = document.createElement('div');
      wrap.style.cssText = 'text-align:center;padding:0.5rem 0 1rem';
 
      const heading = document.createElement('div');
      heading.style.cssText = 'font-size:0.75rem;color:var(--green);font-family:var(--font-alt);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.08em';
      heading.textContent = '✅ Booking Request Received!';
      wrap.appendChild(heading);
 
      const sub = document.createElement('div');
      sub.style.cssText = 'font-size:0.72rem;color:var(--txt2);font-family:var(--font-alt);margin-bottom:0.75rem';
      sub.textContent = 'Note your booking code:';
      wrap.appendChild(sub);
 
      const code = document.createElement('div');
      code.style.cssText = 'font-family:var(--font-h);font-size:2.5rem;font-weight:900;color:var(--cyan);letter-spacing:0.15em;text-shadow:0 0 20px rgba(0,220,255,0.4);margin-bottom:0.5rem';
      code.textContent = trackCode;   // safe — numeric only
      wrap.appendChild(code);
 
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:0.68rem;color:var(--muted);font-family:var(--font-alt);margin-bottom:1rem';
      hint.textContent = 'Save this 5-digit code to check booking status later.';
      wrap.appendChild(hint);
 
      if (isAdv) {
        const payNote = document.createElement('div');
        payNote.style.cssText = 'background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:8px;padding:0.75rem;font-size:0.8rem;color:var(--gold);font-family:var(--font-alt)';
        payNote.textContent = '💳 Advance payment required. Call us: ';
        const tel = document.createElement('a');
        tel.href = 'tel:+91' + PAYMENT_PHONE;
        tel.style.cssText = 'color:var(--cyan);font-weight:700';
        tel.textContent = PAYMENT_PHONE;
        payNote.appendChild(tel);
        wrap.appendChild(payNote);
      } else {
        const callNote = document.createElement('div');
        callNote.style.cssText = 'font-size:0.8rem;color:var(--txt2);font-family:var(--font-alt)';
        callNote.textContent = '📞 We will call ' + phone + ' to confirm your booking.';
        wrap.appendChild(callNote);
      }
 
      bkOk.appendChild(wrap);
      bkOk.style.display = 'block';
    }
 
    // Clear form fields
    [$('bk-name'), $('bk-phone'), $('bk-card'), $('bk-note')].forEach(el => { if (el) el.value = ''; });
    if ($('bk-service'))  $('bk-service').value  = '';
    if ($('bk-time'))     $('bk-time').value      = '';
    const sab = $('slot-availability'); if (sab) sab.textContent = '';
    const payBox = $('bk-payment-box'); if (payBox) payBox.style.display = 'none';
 
  } catch {
    if (bkErr) { bkErr.textContent = '❌ Submission failed. Please try again or WhatsApp: ' + PAYMENT_PHONE; bkErr.style.display = 'block'; }
  } finally {
    setBtnReady('bk-btn', 'bk-txt', 'bk-load');
  }
};
 
// ═══════════════════════════════════════════
// INQUIRY FORM SUBMISSION
// ═══════════════════════════════════════════
window._fb_submitInquiry = async function() {
  // Cooldown check
  const coolErr = checkCooldown('inquiry');
  if (coolErr) {
    const errEl = $('inq-err');
    if (errEl) { errEl.textContent = '⏳ ' + coolErr; errEl.style.display = 'block'; }
    return;
  }
 
  // Read + sanitize
  const name   = sanitize($('inq-name')?.value   || '', 80);
  const phone  = sanitize($('inq-phone')?.value  || '', 10);
  const reason = sanitize($('inq-reason')?.value || '', 30);
  const msg    = sanitize($('inq-msg')?.value    || '', 600);
 
  // Clear prev
  ['inq-name-err','inq-phone-err','inq-reason-err'].forEach(clearErr);
  const okEl  = $('inq-ok');
  const errEl = $('inq-err');
  if (okEl)  okEl.style.display  = 'none';
  if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
 
  // Validation
  let valid = true;
  if (!name  || name.length < 2)           { showErr('inq-name-err',   'Full name required (min 2 chars).'); valid = false; }
  if (!phone)                               { showErr('inq-phone-err',  'Phone number required.');            valid = false; }
  else if (!/^[6-9][0-9]{9}$/.test(phone)) { showErr('inq-phone-err',  'Enter a valid 10-digit mobile number.'); valid = false; }
  if (!reason)                              { showErr('inq-reason-err', 'Please select a reason.');           valid = false; }
  if (!valid) return;
 
  // reCAPTCHA v3
  const token = await getRecaptchaToken('inquiry');
  if (!token) {
    if (errEl) { errEl.textContent = '⚠️ Security check failed. Refresh and try again.'; errEl.style.display = 'block'; }
    return;
  }
 
  stampCooldown('inquiry');
  setBtnLoading('inq-btn', 'inq-txt', 'inq-load');
 
  try {
    await addDoc(collection(db, 'inquiries'), {
      name, phone, reason,
      message:        msg || null,
      status:         'new',
      createdAt:      new Date().toISOString(),
      source:         'website',
      recaptchaToken: token
    });
 
    if (okEl) {
      okEl.textContent   = '✅ Inquiry received! We will call you soon. WhatsApp: ' + PAYMENT_PHONE;
      okEl.style.display = 'block';
    }
    [$('inq-name'), $('inq-phone'), $('inq-msg')].forEach(el => { if (el) el.value = ''; });
    if ($('inq-reason')) $('inq-reason').value = '';
 
  } catch {
    if (errEl) { errEl.textContent = '❌ Submission failed. WhatsApp: ' + PAYMENT_PHONE; errEl.style.display = 'block'; }
  } finally {
    setBtnReady('inq-btn', 'inq-txt', 'inq-load');
  }
};
 
// ═══════════════════════════════════════════
// SIDEBAR NAV — delegate (also handled in
// inline script, this adds module-scope ones)
// ═══════════════════════════════════════════
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', function(e) {
    const page = this.getAttribute('data-nav');
    if (page && window.navTo) { e.preventDefault(); window.navTo(this, page); }
  });
});
 
// Reveal on section switch
document.querySelectorAll('.page-section.active .reveal').forEach(el => el.classList.add('visible'));
 
// ═══════════════════════════════════════════
// BOOKING STATUS CHECK
// XSS-safe: DOM builder only
// ═══════════════════════════════════════════
window._fb_checkBookingStatus = async function() {
  const inp = $('bk-track-input');
  const res = $('bk-track-result');
  if (!inp || !res) return;
 
  const code = sanitize(inp.value, 5).replace(/\D/g, ''); // digits only
 
  if (!code || code.length !== 5) {
    res.style.display = 'block';
    res.textContent   = '❌ Enter a 5-digit numeric code (e.g. 48291)';
    res.style.cssText += ';color:var(--danger);font-family:var(--font-alt);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px';
    return;
  }
 
  res.style.display = 'block';
  res.textContent   = '🔍 Searching...';
 
  try {
    let snap = await getDocs(query(collection(db, 'bookings'), where('trackCode', '==', code)));
    if (snap.empty) {
      snap = await getDocs(query(collection(db, 'bookings'), where('bookingRef', '==', 'CBH-BK-' + code)));
    }
 
    if (snap.empty) {
      res.textContent = '';
      const notFound = document.createElement('div');
      notFound.style.cssText = 'color:var(--danger);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px;border:1px solid rgba(255,68,68,0.2)';
      notFound.textContent = '❌ No booking found for code: ' + code + '. WhatsApp: ' + PAYMENT_PHONE;
      res.appendChild(notFound);
      return;
    }
 
    const b = snap.docs[0].data();
 
    const STATUS_COLORS = {
      pending:         'var(--gold)',
      confirmed:       'var(--green)',
      rejected:        'var(--danger)',
      pending_payment: 'var(--cyan)'
    };
    const STATUS_LABELS = {
      pending:         '⏳ Pending — We are reviewing. You will receive a call.',
      confirmed:       '✅ Confirmed! Your slot is booked. 🎮',
      rejected:        '❌ Rejected — Please book a different time.',
      pending_payment: '💳 Payment Pending — Call us: ' + PAYMENT_PHONE
    };
    const SVC_LABELS = {
      'gaming-pc':   '🖥️ Gaming PC',
      'ps5':         '🎮 PS5 Gaming',
      'internet':    '🌐 Internet',
      'printing':    '🖨️ Printing',
      'form-filling':'📋 Form Filling',
      'other':       '📌 Other'
    };
 
    const sColor = STATUS_COLORS[b.status] || 'var(--gold)';
    const sLabel = STATUS_LABELS[b.status] || '⏳ Pending';
 
    // Build result DOM safely
    res.textContent = '';
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:var(--card);border:1px solid ${sColor}44;border-radius:var(--r);padding:1.25rem`;
 
    const statusBox = document.createElement('div');
    statusBox.style.cssText = `font-family:var(--font-h);font-size:1rem;color:${sColor};margin-bottom:1rem;padding:0.6rem 1rem;background:${sColor}11;border-radius:8px;border:1px solid ${sColor}33`;
    statusBox.textContent = sLabel;
    wrap.appendChild(statusBox);
 
    const details = [
      ['Naam',    b.name    || '—'],
      ['Service', SVC_LABELS[b.service] || (b.service || '—')],
      ['Date',    b.date    || '—'],
      ['Time',    b.time    || '—'],
      ['Code',    code],
    ];
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = 'font-family:var(--font-alt);font-size:0.85rem;line-height:2.2;color:var(--txt2)';
    details.forEach(([label, val]) => {
      const row = document.createElement('div');
      const b2  = document.createElement('b');
      b2.style.color  = 'var(--white)';
      b2.textContent  = label + ': ';
      row.appendChild(b2);
      const span = document.createElement('span');
      // code gets special styling
      if (label === 'Code') {
        span.style.cssText = 'color:var(--cyan);font-family:var(--font-h);letter-spacing:0.1em';
      }
      span.textContent = val;
      row.appendChild(span);
      infoDiv.appendChild(row);
    });
    wrap.appendChild(infoDiv);
 
    if (b.status === 'rejected') {
      const rej = document.createElement('div');
      rej.style.cssText = 'margin-top:1rem;padding:0.75rem;background:rgba(0,220,255,0.05);border-radius:8px;font-size:0.8rem;color:var(--txt2)';
      rej.textContent = '📞 Book a new slot — WhatsApp: ';
      const waLink = document.createElement('a');
      waLink.href            = 'https://wa.me/918829822950';
      waLink.target          = '_blank';
      waLink.rel             = 'noopener noreferrer';
      waLink.style.cssText   = 'color:var(--cyan);font-weight:600';
      waLink.textContent     = PAYMENT_PHONE;
      rej.appendChild(waLink);
      wrap.appendChild(rej);
    }
 
    res.appendChild(wrap);
 
  } catch {
    res.textContent = '❌ Error checking status. Please try again.';
  }
};
 