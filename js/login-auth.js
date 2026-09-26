/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — Member Login: অথেন্টিকেশন লেয়ার (v3 — Firebase Authentication)

   ✔ পাসওয়ার্ড আর Firestore-এ থাকে না, ব্রাউজারেও যাচাই হয় না — যাচাই করে Firebase Authentication (সার্ভারে)
   ✔ ভুল-পাসওয়ার্ডের রেট-লিমিট Firebase-এর সার্ভারে (auth/too-many-requests); এখানে শুধু অতিরিক্ত UX-সীমা
   ✔ সদস্যের তথ্য পড়া যায় শুধু ইমেইল-ভেরিফাইড লগইন করা নিজের ডকুমেন্ট (firestore.rules নিশ্চিত করে)
   ✔ পাসওয়ার্ড সেট/রিসেট: Firebase নিজেই ইমেইলে লিংক পাঠায় — কোথাও সাধারণ টেক্সট পাসওয়ার্ড নেই

   প্রবাহ: signIn → member_emails/{ইমেইল} (নিজের) → members/{member_doc} (নিজের) → ড্যাশবোর্ড
   ========================================================================== */
(function (global) {
  'use strict';

  const RJF = (global.RJF = global.RJF || {});
  const lp = (RJF.lp = RJF.lp || {});
  const cfg = () => RJF.loginConfig || {};

  /* ────────────────────────────────────────────────
     Firebase (lazy): App + Auth + Firestore — ব্যর্থ হলে ক্যাশ মুছে যাতে আবার চেষ্টা করা যায়
     ────────────────────────────────────────────── */
  let fbPromise = null;

  lp.getFirebase = () => {
    if (fbPromise) return fbPromise;
    const c = cfg();
    const base = 'https://www.gstatic.com/firebasejs/' + c.firebaseSdkVersion + '/';
    fbPromise = Promise.all([
      import(base + 'firebase-app.js'),
      import(base + 'firebase-auth.js'),
      import(base + 'firebase-firestore.js')
    ])
      .then(([appMod, authMod, fsMod]) => {
        let app;
        try { app = appMod.getApp('rjf-login'); } catch (e) { app = appMod.initializeApp(c.firebaseConfig, 'rjf-login'); }
        const auth = authMod.getAuth(app); /* Firestore-এর আগে — যাতে Firestore এই অ্যাপের টোকেন ব্যবহার করে */
        const db = fsMod.getFirestore(app);
        return { app, auth, authMod, db, fs: fsMod };
      })
      .catch((err) => { fbPromise = null; throw err; });
    return fbPromise;
  };

  /* পেজ লোডের পর অলস সময়ে SDK নামিয়ে রাখা — সাবমিটে দেরি হয় না */
  lp.warmUp = () => {
    if (global.navigator && navigator.onLine === false) return;
    const run = () => { lp.getFirebase().catch(() => {}); };
    if (typeof global.requestIdleCallback === 'function') global.requestIdleCallback(run, { timeout: 2500 });
    else setTimeout(run, 800);
  };

  const actionSettings = () => ({
    url: cfg().authContinueUrl || (global.location.origin + '/#/login'),
    handleCodeInApp: false
  });

  /* ────────────────────────────────────────────────
     এরর শ্রেণিবিন্যাস (Firebase Auth + Firestore + নেটওয়ার্ক)
     ────────────────────────────────────────────── */
  lp.classifyError = (e) => {
    const code = String((e && e.code) || '');
    const msg = String((e && e.message) || '');
    const both = code + ' ' + msg;
    if (code === 'timeout' || msg === 'timeout') return 'TIMEOUT';
    if (global.navigator && navigator.onLine === false) return 'OFFLINE';
    if (/^auth\/(invalid-credential|wrong-password|user-not-found|invalid-login-credentials)$/.test(code)) return 'INVALID';
    if (code === 'auth/too-many-requests') return 'RATE';
    if (code === 'auth/user-disabled') return 'DENIED';
    if (code === 'auth/invalid-email' || code === 'auth/missing-email') return 'BAD_IDENTIFIER';
    if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') return 'CONFIG';
    if (/permission-denied/i.test(both)) return 'PERMISSION';
    if (/resource-exhausted|quota/i.test(both)) return 'BUSY';
    if (/auth\/network-request-failed|unavailable|network|failed to fetch|load failed|importing|module|dynamically imported/i.test(both)) return 'NETWORK';
    return 'ERROR';
  };

  /* ────────────────────────────────────────────────
     ইমেইল পার্সার — ছোট হাতের করে, অদৃশ্য অক্ষর/স্পেস বাদ দিয়ে
     ────────────────────────────────────────────── */
  lp.parseEmail = (raw) => {
    const t = lp.cleanInput(raw).replace(/\s+/g, '');
    if (!t) return { kind: 'empty', input: '' };
    if (t.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return { kind: 'invalid', input: t };
    const v = t.toLowerCase();
    return { kind: 'email', input: t, value: v, display: v };
  };

  /* সেশনে/স্ক্রিনে যা রাখা হবে (পাসওয়ার্ড নেই — আর ডেটাবেসেও নেই) */
  lp.toProfile = (data) => ({
    member_id: data.member_id || '',
    full_name: data.full_name || 'সদস্য',
    email: data.email || '',
    mobile_number: data.mobile_number || '',
    membership_type: data.membership_type || '',
    status: String(data.status || 'pending').toLowerCase(),
    photo_url: data.photo_url || '',
    occupation: data.occupation || '',
    blood_group: data.blood_group || '',
    gender: data.gender || '',
    permanent_address: data.permanent_address || '',
    position: data.position || ''
  });

  const isDenied = (status) => (cfg().deniedStatuses || []).indexOf(String(status || '').toLowerCase()) !== -1;
  lp.isDeniedStatus = isDenied;

  /* ────────────────────────────────────────────────
     অতিরিক্ত UX-সীমা (এই ডিভাইসে) — আসল রেট-লিমিট Firebase সার্ভারেই
     ────────────────────────────────────────────── */
  const GUARD_KEY = 'rjf_login_guard';

  function guardRead() {
    const now = Date.now();
    const s = lp.ls.getJSON(GUARD_KEY) || {};
    let fails = Number(s.fails) || 0;
    let level = Number(s.level) || 0;
    const lockUntil = Number(s.lockUntil) || 0;
    const updatedAt = Number(s.updatedAt) || 0;
    if (lockUntil <= now && updatedAt) {
      if (now - updatedAt > 15 * 60000) fails = 0;
      if (now - updatedAt > 60 * 60000) level = 0;
    }
    return { fails, level, lockUntil, updatedAt };
  }

  function guardCheck() {
    const now = Date.now();
    const s = guardRead();
    const locked = s.lockUntil > now;
    return {
      locked,
      remaining: locked ? Math.ceil((s.lockUntil - now) / 1000) : 0,
      attemptsLeft: Math.max(0, cfg().maxAttempts - s.fails)
    };
  }

  function guardFail() {
    const c = cfg();
    const now = Date.now();
    const s = guardRead();
    s.fails += 1;
    s.updatedAt = now;
    if (s.fails >= c.maxAttempts) {
      const secs = c.lockSeconds[Math.min(s.level, c.lockSeconds.length - 1)];
      s.level += 1;
      s.fails = 0;
      s.lockUntil = now + secs * 1000;
    }
    lp.ls.setJSON(GUARD_KEY, s);
    return guardCheck();
  }

  lp.guard = { check: guardCheck, fail: guardFail, clear: () => lp.ls.remove(GUARD_KEY) };

  /* ────────────────────────────────────────────────
     সাইন-আউট
     ────────────────────────────────────────────── */
  lp.signOutFirebase = async () => {
    try {
      const { auth, authMod } = await lp.getFirebase();
      await authMod.signOut(auth);
    } catch (e) { /* SDK না নামলে/অফলাইনে — উপেক্ষা */ }
  };

  /* ────────────────────────────────────────────────
     প্রোফাইল লোড: member_emails/{নিজের ইমেইল} → members/{member_doc}
     ────────────────────────────────────────────── */
  lp.loadProfile = async (user) => {
    const c = cfg();
    const key = String((user && user.email) || '').trim().toLowerCase();
    if (!key) return { ok: false, code: 'NO_MEMBER' };

    let fb;
    try { fb = await lp.withTimeout(lp.getFirebase(), c.sdkTimeoutMs, 'timeout'); } catch (e) { return { ok: false, code: lp.classifyError(e) }; }
    const { fs, db } = fb;

    /* ইমেইল ভেরিফাইড না হলে rules পড়তে দেয় না → permission-denied = "ভেরিফাই করুন" */
    const fail = (e) => {
      const code = lp.classifyError(e);
      if (code === 'PERMISSION') return { ok: false, code: user.emailVerified ? 'PERMISSION' : 'UNVERIFIED' };
      return { ok: false, code };
    };

    let idx;
    try { idx = await lp.withTimeout(fs.getDoc(fs.doc(db, 'member_emails', key)), c.queryTimeoutMs, 'timeout'); } catch (e) { return fail(e); }
    if (!idx.exists()) return { ok: false, code: 'NO_MEMBER' };
    const ref = idx.data() || {};
    if (!ref.member_doc) return { ok: false, code: 'NO_MEMBER' };

    let snap;
    try { snap = await lp.withTimeout(fs.getDoc(fs.doc(db, 'members', String(ref.member_doc))), c.queryTimeoutMs, 'timeout'); } catch (e) { return fail(e); }
    if (!snap.exists()) return { ok: false, code: 'NO_MEMBER' };

    const member = lp.toProfile(snap.data());
    if (isDenied(member.status) || isDenied(ref.status)) return { ok: false, code: 'DENIED' };
    return { ok: true, member };
  };

  /* সাইন-ইনের পরের ধাপ: প্রোফাইল লোড। ভেরিফাই বাকি থাকলে সাইন-ইন রেখে UNVERIFIED, অন্য ব্যর্থতায় সাইন-আউট */
  async function finishSignIn(user) {
    const res = await lp.loadProfile(user);
    if (res.ok) return { ok: true, member: res.member };
    if (res.code === 'UNVERIFIED') return { ok: false, code: 'UNVERIFIED', email: user.email };
    await lp.signOutFirebase();
    return { ok: false, code: res.code };
  }
  lp.finishSignIn = finishSignIn;

  /* ────────────────────────────────────────────────
     লগইন
     ────────────────────────────────────────────── */
  lp.authenticate = async (rawEmail, password, remember) => {
    const c = cfg();
    const lock = guardCheck();
    if (lock.locked) return { ok: false, code: 'LOCKED', retryAfter: lock.remaining };

    const parsed = lp.parseEmail(rawEmail);
    if (parsed.kind !== 'email') return { ok: false, code: 'BAD_IDENTIFIER' };

    let fb;
    try { fb = await lp.withTimeout(lp.getFirebase(), c.sdkTimeoutMs, 'timeout'); } catch (e) { return { ok: false, code: lp.classifyError(e) }; }
    const { auth, authMod } = fb;

    try {
      await authMod.setPersistence(auth, remember ? authMod.browserLocalPersistence : authMod.browserSessionPersistence);
      await lp.withTimeout(authMod.signInWithEmailAndPassword(auth, parsed.value, password), c.queryTimeoutMs, 'timeout');
    } catch (e) {
      const code = lp.classifyError(e);
      if (code === 'INVALID') {
        const g = guardFail();
        return { ok: false, code: 'INVALID', attemptsLeft: g.attemptsLeft, locked: g.locked, retryAfter: g.remaining };
      }
      console.error('Sign-in error:', (e && e.code) || e);
      return { ok: false, code };
    }

    /* গার্ড শুধু তখনই সাফ করা হয় যখন সদস্য সত্যিই ড্যাশবোর্ডে ঢুকতে পারলেন —
       নইলে blocked/pending-এর মতো একটি সঠিক পাসওয়ার্ড দিয়েও অন্য অ্যাকাউন্টের ভুল-চেষ্টার হিসাব মুছে যেত */
    const res = await finishSignIn(auth.currentUser);
    if (res.ok) lp.guard.clear();
    return res;
  };

  /* ────────────────────────────────────────────────
     ইমেইল ভেরিফিকেশন (ফলব্যাক): পাসওয়ার্ড-রিসেট লিংক সাধারণত ইমেইল ভেরিফাইড করে দেয়;
     না হলে এখান থেকে আলাদা ভেরিফিকেশন লিংক পাঠানো ও যাচাই করা যায়
     ────────────────────────────────────────────── */
  lp.verification = {
    async send() {
      const c = cfg();
      let fb;
      try { fb = await lp.withTimeout(lp.getFirebase(), c.sdkTimeoutMs, 'timeout'); } catch (e) { return { ok: false, code: lp.classifyError(e) }; }
      const user = fb.auth.currentUser;
      if (!user) return { ok: false, code: 'SIGNEDOUT' };
      try {
        try { await lp.withTimeout(fb.authMod.sendEmailVerification(user, actionSettings()), c.emailTimeoutMs, 'timeout'); }
        catch (e) {
          if (/continue-uri|unauthorized-domain/.test(String(e && e.code))) await lp.withTimeout(fb.authMod.sendEmailVerification(user), c.emailTimeoutMs, 'timeout');
          else throw e;
        }
      } catch (e) {
        return { ok: false, code: lp.classifyError(e) };
      }
      return { ok: true, masked: lp.maskEmail(user.email) };
    },

    async check() {
      const c = cfg();
      let fb;
      try { fb = await lp.withTimeout(lp.getFirebase(), c.sdkTimeoutMs, 'timeout'); } catch (e) { return { ok: false, code: lp.classifyError(e) }; }
      const user = fb.auth.currentUser;
      if (!user) return { ok: false, code: 'SIGNEDOUT' };
      try {
        await lp.withTimeout(user.reload(), c.queryTimeoutMs, 'timeout');
        await lp.withTimeout(user.getIdToken(true), c.queryTimeoutMs, 'timeout'); /* নতুন টোকেনে email_verified: true */
      } catch (e) {
        return { ok: false, code: lp.classifyError(e) };
      }
      if (!user.emailVerified) return { ok: false, code: 'STILL_UNVERIFIED' };
      return finishSignIn(user);
    }
  };

  /* ব্যাকগ্রাউন্ডে সেশন যাচাই: লগইন এখনো বৈধ? সদস্যপদ নিষ্ক্রিয় হয়নি তো? */
  lp.revalidate = async () => {
    let fb;
    try { fb = await lp.getFirebase(); } catch (e) { return { status: 'offline' }; }
    const { auth } = fb;
    try {
      if (typeof auth.authStateReady === 'function') await lp.withTimeout(auth.authStateReady(), 8000, 'timeout');
    } catch (e) { return { status: 'offline' }; }

    const user = auth.currentUser;
    if (!user) return { status: 'signedout' };
    try {
      await lp.withTimeout(user.reload(), cfg().queryTimeoutMs, 'timeout');
    } catch (e) {
      /* পাসওয়ার্ড বদলানো/অ্যাকাউন্ট নিষ্ক্রিয় হলে রিফ্রেশ টোকেন বাতিল — সাইন-আউট */
      if (/user-token-expired|user-disabled|user-not-found|invalid-user-token|requires-recent-login/.test(String(e && e.code))) return { status: 'signedout' };
      return { status: 'offline' };
    }

    const res = await lp.loadProfile(user);
    if (res.ok) return { status: 'ok', member: res.member };
    if (res.code === 'DENIED' || res.code === 'PERMISSION') return { status: 'denied' };
    if (res.code === 'NO_MEMBER') return { status: 'gone' };
    if (res.code === 'UNVERIFIED') return { status: 'unverified' };
    return { status: 'offline' };
  };

  /* অন্য ট্যাব/ডিভাইসে সাইন-আউট হলে জানানো (Firebase নিজেই ট্যাবগুলো সিঙ্ক রাখে) */
  lp.watchAuth = async (handler) => {
    const { auth, authMod } = await lp.getFirebase();
    return authMod.onAuthStateChanged(auth, handler);
  };

  /* ────────────────────────────────────────────────
     সেশন র‍্যাপার (v3) — শুধু UI-র মেয়াদ/নিষ্ক্রিয়তা/"লগইন থাকুন" হিসাব।
     আসল ক্রেডেনশিয়াল Firebase Auth-এর (persistence: local/session) — তার সাথে মিলিয়ে চলে।
     ব্যক্তিগত তথ্য (মোবাইল, ইমেইল, ঠিকানা ইত্যাদি) স্টোরেজে রাখা হয় না; শুধু পাবলিক-ভেরিফাইয়ে
     যা দেখা যায় (নাম, আইডি, ধরন, স্ট্যাটাস, ছবি) — ড্যাশবোর্ড দ্রুত দেখাতে
     ────────────────────────────────────────────── */
  const KEEP = ['member_id', 'full_name', 'membership_type', 'status', 'photo_url'];
  const slim = (m) => { const o = {}; KEEP.forEach((k) => { o[k] = (m && m[k]) || ''; }); return o; };

  function sessionRead() {
    const key = cfg().sessionKey;
    const fromLocal = lp.ls.getJSON(key);
    if (fromLocal) return fromLocal;
    return lp.ss.getJSON(key);
  }

  function sessionWrite(s) {
    const c = cfg();
    const target = s.remember ? lp.ls : lp.ss;
    const other = s.remember ? lp.ss : lp.ls;
    other.remove(c.sessionKey);
    target.setJSON(c.sessionKey, Object.assign({}, s, { member: slim(s.member) }));
  }

  lp.session = {
    endReason: null,

    save(member, remember) {
      const c = cfg();
      const now = Date.now();
      const s = {
        v: 3,
        member,
        remember: !!remember,
        issuedAt: now,
        lastActive: now,
        expiresAt: now + (remember ? c.rememberDays * 86400000 : c.sessionHours * 3600000)
      };
      sessionWrite(s);
      return s;
    },

    load() {
      const c = cfg();
      const now = Date.now();
      lp.session.endReason = null;
      const s = sessionRead();
      if (!s) return null;
      if (s.v !== 3 || !s.member || !s.member.member_id) { lp.session.clear(); return null; }
      if (s.expiresAt && now > s.expiresAt) { lp.session.clear(); lp.session.endReason = 'expired'; return null; }
      if (!s.remember && c.idleMinutes > 0 && now - (s.lastActive || s.issuedAt) > c.idleMinutes * 60000) {
        lp.session.clear();
        lp.session.endReason = 'idle';
        return null;
      }
      return s;
    },

    touch(s) {
      if (!s) return;
      s.lastActive = Date.now();
      sessionWrite(s);
    },

    updateMember(s, member) {
      if (!s) return;
      s.member = member;
      sessionWrite(s);
    },

    clear() {
      const key = cfg().sessionKey;
      lp.ls.remove(key);
      lp.ss.remove(key);
    },

    /* অন্য ট্যাবে লগআউট/লগইন হলে এই ট্যাবকে জানানো (localStorage সেশনের ক্ষেত্রে) */
    onRemoteChange(handler) {
      const fn = (e) => { if (e.key === cfg().sessionKey) handler(); };
      global.addEventListener('storage', fn);
      return () => global.removeEventListener('storage', fn);
    }
  };

  /* ────────────────────────────────────────────────
     পাসওয়ার্ড সেট / রিসেট — Firebase নিজেই ইমেইলে লিংক পাঠায়
     (প্রথমবার পাসওয়ার্ড সেট করাও এটাই: অ্যাডমিন অনুমোদনের সময় অ্যাকাউন্ট বানিয়ে রাখেন)
     ⚠️ গোপনীয়তা: ইমেইল সিস্টেমে আছে কিনা কখনো বলা হয় না — উত্তর সবসময় একই
     ────────────────────────────────────────────── */
  const RESET_KEY = 'rjf_reset_guard';

  function resetGuardCheck() {
    const c = cfg();
    const now = Date.now();
    const st = lp.ls.getJSON(RESET_KEY) || {};
    const times = (Array.isArray(st.times) ? st.times : []).filter((t) => now - t < 3600000);
    const last = times.length ? times[times.length - 1] : 0;
    if (times.length >= c.resetMaxPerHour) {
      return { allowed: false, wait: Math.ceil((times[0] + 3600000 - now) / 1000), reason: 'hourly' };
    }
    if (last && now - last < c.resetCooldownSeconds * 1000) {
      return { allowed: false, wait: Math.ceil((last + c.resetCooldownSeconds * 1000 - now) / 1000), reason: 'cooldown' };
    }
    return { allowed: true, wait: 0 };
  }

  function resetGuardRecord() {
    const now = Date.now();
    const st = lp.ls.getJSON(RESET_KEY) || {};
    const times = (Array.isArray(st.times) ? st.times : []).filter((t) => now - t < 3600000);
    times.push(now);
    lp.ls.setJSON(RESET_KEY, { times });
  }

  let pendingEmail = null;

  async function sendReset(email) {
    const c = cfg();
    let fb;
    try { fb = await lp.withTimeout(lp.getFirebase(), c.sdkTimeoutMs, 'timeout'); } catch (e) { return { ok: false, code: lp.classifyError(e) }; }
    const { auth, authMod } = fb;
    try {
      try {
        await lp.withTimeout(authMod.sendPasswordResetEmail(auth, email, actionSettings()), c.emailTimeoutMs, 'timeout');
      } catch (e) {
        /* সাইটের ডোমেইন Firebase "Authorized domains"-এ না থাকলে কন্টিনিউ-URL ছাড়াই পাঠানো */
        if (/continue-uri|unauthorized-domain/.test(String(e && e.code))) {
          await lp.withTimeout(authMod.sendPasswordResetEmail(auth, email), c.emailTimeoutMs, 'timeout');
        } else throw e;
      }
    } catch (e) {
      const code = lp.classifyError(e);
      if (code !== 'INVALID') { console.error('Password reset error:', (e && e.code) || e); return { ok: false, code }; }
      /* user-not-found: গোপনীয়তার জন্য সফলের মতোই আচরণ */
    }
    return { ok: true };
  }

  lp.reset = {
    guard: { check: resetGuardCheck },

    async start(rawEmail) {
      const g = resetGuardCheck();
      if (!g.allowed) return { ok: false, code: 'COOLDOWN', wait: g.wait, reason: g.reason };
      const parsed = lp.parseEmail(rawEmail);
      if (parsed.kind !== 'email') return { ok: false, code: 'BAD_IDENTIFIER' };

      const res = await sendReset(parsed.value);
      if (!res.ok) return res;
      resetGuardRecord();
      pendingEmail = parsed.value;
      return { ok: true, masked: lp.maskEmail(parsed.value), email: parsed.value };
    },

    async resend() {
      if (!pendingEmail) return { ok: false, code: 'ERROR' };
      const g = resetGuardCheck();
      if (!g.allowed) return { ok: false, code: 'COOLDOWN', wait: g.wait, reason: g.reason };
      const res = await sendReset(pendingEmail);
      if (!res.ok) return res;
      resetGuardRecord();
      return { ok: true, masked: lp.maskEmail(pendingEmail), email: pendingEmail };
    },

    hasPending: () => !!pendingEmail,
    clear() { pendingEmail = null; }
  };
})(window);
