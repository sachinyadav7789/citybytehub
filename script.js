/* ============================================================
   CITYBYTEHUB Internship Portal – script.js
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ================== YOUR FIREBASE CONFIG ================== */
const firebaseConfig = {
  apiKey: "AIzaSyCZEpzgZKVLV82CmqjXz1A6Thu9q4iCEJo",
  authDomain: "chat-app-e53ed.firebaseapp.com",
  databaseURL: "https://chat-app-e53ed-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chat-app-e53ed",
  storageBucket: "chat-app-e53ed.firebasestorage.app",
  messagingSenderId: "301011173766",
  appId: "1:301011173766:web:ac755f2946cb033837ec07",
  measurementId: "G-WM5SE8ESDV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Optional analytics import
import("https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js")
  .then(({ getAnalytics, isSupported }) => {
    isSupported().then(yes => { if (yes) getAnalytics(app); });
  })
  .catch(() => {});

/* ================== SPA ROUTER ================== */
const pages = [
  'home', 'about', 'internships', 'web-development', 'data-analyst',
  'contact', 'login', 'register', 'dashboard', 'faq', 'terms', 'privacy'
];

function showPage(name) {
  if (!pages.includes(name)) name = 'home';
  pages.forEach(p => {
    const el = document.getElementById('page-' + p);
    if (el) el.style.display = (p === name) ? 'block' : 'none';
  });
  document.querySelectorAll('.nav-links a[data-nav]').forEach(a => {
    a.classList.toggle('active', a.dataset.nav === name);
  });
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleHash() {
  const hash = (location.hash || '#home').replace('#', '');
  showPage(hash);
}
window.addEventListener('hashchange', handleHash);

document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-nav]');
  if (link) {
    const target = link.dataset.nav;
    if (location.hash === '#' + target) {
      e.preventDefault();
      showPage(target);
    }
  }
});

/* ================== MOBILE MENU ================== */
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

/* ================== HELPERS ================== */
function setErr(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('show', show);
}
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function showAlert(id, msg, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alert show ' + (type === 'success' ? 'alert-success' : 'alert-error');
  setTimeout(() => el.classList.remove('show'), 7000);
}

/* ================== REGISTER (Email) ================== */
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const track = document.getElementById('regTrack').value;

  let ok = true;
  if (!name) { setErr('regNameErr', true); ok = false; } else setErr('regNameErr', false);
  if (!isEmail(email)) { setErr('regEmailErr', true); ok = false; } else setErr('regEmailErr', false);
  if (password.length < 6) { setErr('regPasswordErr', true); ok = false; } else setErr('regPasswordErr', false);
  if (!track) { setErr('regTrackErr', true); ok = false; } else setErr('regTrackErr', false);
  if (!ok) return;

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Creating...';

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'students', cred.user.uid), {
      name, email, track,
      status: 'pending',
      progress: 0,
      createdAt: serverTimestamp()
    });
    location.hash = '#dashboard';
  } catch (err) {
    showAlert('registerAlert', err.message);
    btn.disabled = false; btn.textContent = 'Create Account';
  }
});

/* ================== LOGIN (Email) ================== */
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  let ok = true;
  if (!isEmail(email)) { setErr('loginEmailErr', true); ok = false; } else setErr('loginEmailErr', false);
  if (password.length < 6) { setErr('loginPasswordErr', true); ok = false; } else setErr('loginPasswordErr', false);
  if (!ok) return;

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Logging in...';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    location.hash = '#dashboard';
  } catch (err) {
    showAlert('loginAlert', err.message);
    btn.disabled = false; btn.textContent = 'Login';
  }
});

/* ================== GOOGLE AUTH ================== */
async function googleAuth(alertId) {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const ref = doc(db, 'students', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        name: user.displayName || 'Student',
        email: user.email,
        track: '',
        status: 'pending',
        progress: 0,
        createdAt: serverTimestamp()
      });
    }
    location.hash = '#dashboard';
  } catch (err) {
    showAlert(alertId, err.message);
  }
}
document.getElementById('googleLoginBtn').addEventListener('click', () => googleAuth('loginAlert'));
document.getElementById('googleRegisterBtn').addEventListener('click', () => googleAuth('registerAlert'));

/* ================== LOGOUT ================== */
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  await signOut(auth);
  location.hash = '#home';
});

/* ================== CONTACT FORM ================== */
document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('cName').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  const msg = document.getElementById('cMsg').value.trim();
  let ok = true;
  if (!name) { setErr('cNameErr', true); ok = false; } else setErr('cNameErr', false);
  if (!isEmail(email)) { setErr('cEmailErr', true); ok = false; } else setErr('cEmailErr', false);
  if (!msg) { setErr('cMsgErr', true); ok = false; } else setErr('cMsgErr', false);
  if (!ok) return;
  showAlert('contactAlert', 'Message received! We will contact you soon.', 'success');
  e.target.reset();
});

/* ================== AUTH STATE → DASHBOARD ================== */
onAuthStateChanged(auth, async (user) => {
  const loggedOut1 = document.getElementById('navAuthLoggedOut');
  const loggedOut2 = document.getElementById('navAuthLoggedOut2');
  const loggedIn = document.getElementById('navAuthLoggedIn');
  const logout = document.getElementById('navAuthLogout');

  if (user) {
    loggedOut1.style.display = 'none';
    loggedOut2.style.display = 'none';
    loggedIn.style.display = 'block';
    logout.style.display = 'block';

    document.getElementById('dashName').textContent = user.displayName || 'Student';
    document.getElementById('dashEmail').textContent = user.email;

    try {
      const snap = await getDoc(doc(db, 'students', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        document.getElementById('dashTrack').textContent =
          d.track === 'web-development' ? 'Web Development Internship'
          : d.track === 'data-analyst' ? 'Data Analyst Internship'
          : 'No track selected';
        const statusEl = document.getElementById('dashStatus');
        statusEl.textContent = d.status === 'active' ? 'Active' : 'Pending';
        statusEl.className = 'status ' + (d.status === 'active' ? 'active' : 'pending');
        const prog = d.progress || 0;
        document.getElementById('dashProgress').style.width = prog + '%';
        document.getElementById('dashProgressText').textContent = prog + '%';
        document.getElementById('dashCert').textContent =
          d.status === 'active' && prog >= 100 ? 'Certificate available ✓' : 'Not available yet';
      } else {
        await setDoc(doc(db, 'students', user.uid), {
          name: user.displayName || 'Student',
          email: user.email,
          track: '',
          status: 'pending',
          progress: 0,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    }

    if (location.hash === '#login' || location.hash === '#register' || !location.hash) {
      location.hash = '#dashboard';
    }
  } else {
    loggedOut1.style.display = 'block';
    loggedOut2.style.display = 'block';
    loggedIn.style.display = 'none';
    logout.style.display = 'none';
    if (location.hash === '#dashboard') location.hash = '#login';
  }
});

/* ================== INIT ================== */
handleHash();