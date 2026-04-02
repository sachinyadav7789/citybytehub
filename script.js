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
 
// ===== HELPERS =====
const $  = id => document.getElementById(id);
const fmtDate = iso => { if(!iso) return '—'; const d=new Date(iso); return isNaN(d)?String(iso):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); };
function showErr(id,msg){ const e=$(id); if(!e) return; e.textContent=msg; e.style.display='block'; clearTimeout(e._t); e._t=setTimeout(()=>e.style.display='none',5000); }
function clearErr(id){ const e=$(id); if(e){e.textContent='';e.style.display='none';} }
function setEl(id,v){ const e=$(id); if(e) e.textContent=v; }
 
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
  if(!snap.exists()) return;
  const p=snap.val();
  if(p.pc)    { const e=$('pc-price');    if(e){e.textContent=p.pc;   e.classList.remove('ask');} }
  if(p.ps5)   { const e=$('ps5-price');   if(e){e.textContent=p.ps5;  e.classList.remove('ask');} }
  if(p.net)   { const e=$('net-price');   if(e){e.textContent=p.net;  e.classList.remove('ask');} }
  if(p.prime) { const e=$('prime-price'); if(e){e.textContent=p.prime;e.classList.remove('ask');} }
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
 
// ===== PRIME CARD APPLICATION =====
window.submitPrimeApplication = async function() {
  const name=$('prime-name')?.value.trim();
  const phone=$('prime-phone')?.value.trim();
  const plan=$('selected-plan')?.value||'weekly';
  const college=$('prime-college')?.value.trim();
  const note=$('prime-note')?.value.trim();
  clearErr('prime-name-err'); clearErr('prime-phone-err');
  const okEl=$('prime-ok'), errEl=$('prime-err');
  if(okEl){okEl.style.display='none';okEl.textContent='';}
  if(errEl){errEl.style.display='none';errEl.textContent='';}
  let valid=true;
  if(!name){ showErr('prime-name-err','Naam required hai.'); valid=false; }
  if(!phone){ showErr('prime-phone-err','Phone required hai.'); valid=false; }
  else if(!/^[6-9][0-9]{9}$/.test(phone)){ showErr('prime-phone-err','Valid 10-digit phone daalo.'); valid=false; }
  if(!valid) return;
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
    if(okEl){ okEl.textContent='✅ Application bhej di! Piprali Road pe aakar payment karke card activate karwao. Hum call karenge!'; okEl.style.display='block'; }
    [$('prime-name'),$('prime-phone'),$('prime-college'),$('prime-note')].forEach(el=>{if(el)el.value='';});
    updateCardPreview();
  } catch(err) {
    if(errEl){ errEl.textContent='❌ Error: '+err.message+'. WhatsApp: 8829822950'; errEl.style.display='block'; }
  } finally {
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
  res.style.display='block';
  res.innerHTML='<span style="color:var(--muted)">🔍 Checking...</span>';
  try {
    let cards=[];
    const s1=await getDocs(query(collection(db,'primeCards'),where('cardNumber','==',val)));
    s1.forEach(d=>cards.push({id:d.id,...d.data()}));
    if(!cards.length&&val.length===10&&/^\d+$/.test(val)){
      const s2=await getDocs(query(collection(db,'primeCards'),where('phone','==',val)));
      s2.forEach(d=>cards.push({id:d.id,...d.data()}));
    }
    if(!cards.length){ res.innerHTML='<span style="color:var(--danger)">❌ Card nahi mila.</span>'; return; }
    const c=cards[0];
    const sc=c.status==='active'?'var(--green)':c.status==='expired'?'var(--danger)':'var(--gold)';
    const sl=c.status==='active'?'✅ Active':c.status==='expired'?'❌ Expired':'⏳ Pending';
    res.innerHTML=`<div style="background:var(--card);border:1px solid var(--border);border-radius:var(--r);padding:1rem">
      <div style="font-family:var(--font-h);font-size:0.78rem;color:${sc};margin-bottom:0.5rem">${sl}</div>
      <div style="font-size:0.82rem;color:var(--white);font-family:var(--font-alt);line-height:1.9">
        <b>Card:</b> ${c.cardNumber||'—'}<br>
        <b>Name:</b> ${c.name||'—'}<br>
        <b>Plan:</b> ${c.plan==='weekly'?'📅 Weekly':'📆 Monthly'}<br>
        <b>Balance:</b> <span style="color:var(--gold)">${c.balance||'—'}</span><br>
        <b>Valid Till:</b> ${c.expiry||'—'}<br>
        ${c.status!=='active'?'<span style="color:var(--danger);font-size:0.78rem">Card active nahi — staff se milein.</span>':''}
      </div>
    </div>`;
  } catch(e){ res.innerHTML='<span style="color:var(--danger)">Error: '+e.message+'</span>'; }
};
 
// ===== BOOKING =====
const SEAT_LIMITS = {'gaming-pc':5,'ps5':2,'internet':8,'printing':3,'form-filling':3,'other':5};
const PAYMENT_PHONE = '8829822950';
 
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
 
async function checkSlotAvail() {
  const service=$('bk-service')?.value, box=$('slot-availability');
  if(!service||!box) return;
  box.innerHTML=`<div style="background:rgba(0,255,136,0.05);border:1px solid rgba(0,255,136,0.18);border-radius:8px;padding:8px 12px;font-size:0.78rem;color:var(--green);font-family:var(--font-alt)">✅ Max ${SEAT_LIMITS[service]||5} seats per slot</div>`;
}
 
setTimeout(()=>{
  $('bk-service')?.addEventListener('change',checkSlotAvail);
  $('bk-time')?.addEventListener('change',()=>{ checkSlotAvail(); checkAdvanceBooking($('bk-date')?.value); });
},500);
 
window.submitBooking = async function() {
  const name=$('bk-name')?.value.trim();
  const phone=$('bk-phone')?.value.trim();
  const service=$('bk-service')?.value;
  const date=$('bk-date')?.value;
  const time=$('bk-time')?.value;
  const dur=$('bk-duration')?.value;
  const card=$('bk-card')?.value.trim().toUpperCase();
  const note=$('bk-note')?.value.trim();
 
  ['bk-name-err','bk-phone-err','bk-service-err','bk-date-err','bk-time-err'].forEach(clearErr);
  const bkOk=$('bk-ok'), bkErr=$('bk-err');
  if(bkOk){bkOk.style.display='none';bkOk.innerHTML='';}
  if(bkErr){bkErr.style.display='none';bkErr.textContent='';}
 
  let valid=true;
  if(!name)  { showErr('bk-name-err','Naam required hai.');      valid=false; }
  if(!phone) { showErr('bk-phone-err','Phone required hai.');    valid=false; }
  else if(!/^[6-9][0-9]{9}$/.test(phone)){ showErr('bk-phone-err','Valid 10-digit phone daalo.'); valid=false; }
  if(!service){ showErr('bk-service-err','Service select karo.'); valid=false; }
  if(!date)  { showErr('bk-date-err','Date select karo.');       valid=false; }
  if(!time)  { showErr('bk-time-err','Time slot select karo.');  valid=false; }
  if(!valid) return;
 
  const today=new Date(); today.setHours(0,0,0,0);
  const selDate=new Date(date+'T00:00:00');
  if(selDate>new Date(today.getTime()+86400000)){ showErr('bk-date-err','Sirf aaj ya kal ki booking allowed hai.'); return; }
 
  if(!checkRateLimit(phone)){
    if(bkErr){bkErr.textContent='⚠️ Is phone se aaj 3 bookings ho chuki hain. WhatsApp: '+PAYMENT_PHONE; bkErr.style.display='block';}
    return;
  }
 
  const btn=$('bk-btn'); if(btn) btn.disabled=true;
  const btxt=$('bk-txt'), bload=$('bk-load');
  if(btxt) btxt.style.display='none';
  if(bload) bload.style.display='inline';
 
  try {
    const isAdv=selDate.getTime()>today.getTime();
    const trackCode=String(Math.floor(10000+Math.random()*90000));
    const bookingRef='CBH-BK-'+trackCode;
 
    await addDoc(collection(db,'bookings'),{
      name, phone, service, date, time,
      duration:dur||'1', primeCard:card||null, note:note||null,
      status:isAdv?'pending_payment':'pending',
      bookingRef, trackCode,        // ← trackCode alag field bhi save hota hai
      isAdvance:isAdv,
      createdAt:new Date().toISOString(), source:'website'
    });
 
    incrementRateLimit(phone);
 
    if(bkOk){
      bkOk.innerHTML=`<div style="text-align:center;padding:0.5rem 0 1rem">
        <div style="font-size:0.75rem;color:var(--green);font-family:var(--font-alt);margin-bottom:0.4rem;text-transform:uppercase;letter-spacing:0.08em">✅ Booking Request Mili!</div>
        <div style="font-size:0.72rem;color:var(--txt2);font-family:var(--font-alt);margin-bottom:0.75rem">Apna booking code note karo:</div>
        <div style="font-family:var(--font-h);font-size:2.5rem;font-weight:900;color:var(--cyan);letter-spacing:0.15em;text-shadow:0 0 20px rgba(0,220,255,0.4);margin-bottom:0.5rem">${trackCode}</div>
        <div style="font-size:0.68rem;color:var(--muted);font-family:var(--font-alt);margin-bottom:1rem">Ye 5-digit code save karo — status check karne ke kaam aayega</div>
        ${isAdv?`<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:8px;padding:0.75rem;font-size:0.8rem;color:var(--gold);font-family:var(--font-alt)">
          💳 Kal ki booking ke liye payment karni hogi<br>
          📞 Call karo: <a href="tel:+91${PAYMENT_PHONE}" style="color:var(--cyan);font-weight:700">${PAYMENT_PHONE}</a>
        </div>`:`<div style="font-size:0.8rem;color:var(--txt2);font-family:var(--font-alt)">
          📞 Hum <strong style="color:var(--white)">${phone}</strong> pe call karenge confirm karne ke liye
        </div>`}
      </div>`;
      bkOk.style.display='block';
    }
 
    [$('bk-name'),$('bk-phone'),$('bk-card'),$('bk-note')].forEach(el=>{if(el)el.value='';});
    if($('bk-service'))$('bk-service').value='';
    if($('bk-time'))$('bk-time').value='';
    const sab=$('slot-availability'); if(sab) sab.innerHTML='';
    const payBox=$('bk-payment-box'); if(payBox) payBox.style.display='none';
 
  } catch(err) {
    if(bkErr){ bkErr.textContent='❌ Error: '+err.message+'. WhatsApp: '+PAYMENT_PHONE; bkErr.style.display='block'; }
  } finally {
    if(btn) btn.disabled=false;
    if(btxt) btxt.style.display='inline';
    if(bload) bload.style.display='none';
  }
};
 
// ===== INQUIRY =====
window.submitInquiry = async function() {
  const name=$('inq-name')?.value.trim(), phone=$('inq-phone')?.value.trim();
  const reason=$('inq-reason')?.value, msg=$('inq-msg')?.value.trim();
  ['inq-name-err','inq-phone-err','inq-reason-err'].forEach(clearErr);
  const okEl=$('inq-ok'), errEl=$('inq-err');
  if(okEl) okEl.style.display='none';
  if(errEl){errEl.style.display='none';errEl.textContent='';}
  let valid=true;
  if(!name){ showErr('inq-name-err','Naam required hai.'); valid=false; }
  if(!phone){ showErr('inq-phone-err','Phone required hai.'); valid=false; }
  else if(!/^[6-9][0-9]{9}$/.test(phone)){ showErr('inq-phone-err','Valid 10-digit phone daalo.'); valid=false; }
  if(!reason){ showErr('inq-reason-err','Reason select karo.'); valid=false; }
  if(!valid) return;
  const btn=$('inq-btn'); if(btn) btn.disabled=true;
  const btxt=$('inq-txt'), bload=$('inq-load');
  if(btxt) btxt.style.display='none';
  if(bload) bload.style.display='inline';
  try {
    await addDoc(collection(db,'inquiries'),{name,phone,reason,message:msg||null,status:'new',createdAt:new Date().toISOString(),source:'website'});
    if(okEl){ okEl.textContent='✅ Inquiry mili! Hum call karenge. WhatsApp: 8829822950'; okEl.style.display='block'; }
    [$('inq-name'),$('inq-phone'),$('inq-msg')].forEach(el=>{if(el)el.value='';});
    if($('inq-reason'))$('inq-reason').value='';
  } catch(err) {
    if(errEl){ errEl.textContent='❌ Error: '+err.message+'. WhatsApp: 8829822950'; errEl.style.display='block'; }
  } finally {
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
  if(!inp||!res) return;
  const code=inp.value.trim();
  if(!code||code.length!==5||!/^\d{5}$/.test(code)){
    res.style.display='block';
    res.innerHTML='<div style="color:var(--danger);font-family:var(--font-alt);font-size:0.85rem;padding:0.75rem;background:rgba(255,68,68,0.08);border-radius:8px">❌ 5-digit numeric code daalo (jaise: 48291)</div>';
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
        ❌ Code <b>${code}</b> se koi booking nahi mili.<br>
        <span style="font-size:0.78rem;color:var(--muted)">WhatsApp: <a href="https://wa.me/918829822950" style="color:var(--cyan)">8829822950</a></span>
      </div>`;
      return;
    }
 
    const b=snap.docs[0].data();
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
        <b style="color:var(--white)">Naam:</b> ${b.name||'—'}<br>
        <b style="color:var(--white)">Service:</b> ${svcL[b.service]||b.service||'—'}<br>
        <b style="color:var(--white)">Date:</b> ${b.date||'—'} &nbsp; <b style="color:var(--white)">Time:</b> ${b.time||'—'}<br>
        <b style="color:var(--white)">Code:</b> <span style="color:var(--cyan);font-family:var(--font-h);letter-spacing:0.1em">${code}</span>
      </div>
      ${b.status==='rejected'?`<div style="margin-top:1rem;padding:0.75rem;background:rgba(0,220,255,0.05);border-radius:8px;font-size:0.8rem;color:var(--txt2)">
        📞 Naya slot: <a href="https://wa.me/918829822950" style="color:var(--cyan);font-weight:600">WhatsApp 8829822950</a>
      </div>`:''}
    </div>`;
  } catch(err) {
    res.innerHTML=`<div style="color:var(--danger);font-size:0.82rem;padding:0.75rem">❌ Error: ${err.message}</div>`;
  }
};
 
console.log('✅ CityByteHub Booking v6.0 ready');
 
