/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — Member Login: অথেন্টিকেশন লেয়ার
   - আইডি/ইমেইল/মোবাইল শনাক্তকরণ ও নর্মালাইজেশন
   - Firestore থেকে সদস্য খোঁজা ও যাচাই
   - ভুল-চেষ্টার সীমা (progressive lockout), সেশন, পাসওয়ার্ড রিসেট
   - EmailJS সরাসরি REST API দিয়ে (SDK লাগে না)
   ⚠️ যাচাই এখনো ক্লায়েন্ট-সাইডে (Firestore-এর stored_password ফিল্ড) — বিস্তারিত LOGIN_UPGRADE_GUIDE.md
   ========================================================================== */
(function (global) {
  'use strict';

  const RJF = (global.RJF = global.RJF || {});
  const lp = (RJF.lp = RJF.lp || {});
  const cfg = () => RJF.loginConfig || {};

  /* ────────────────────────────────────────────────
     Firebase (lazy) — ব্যর্থ হলে ক্যাশ মুছে যাতে আবার চেষ্টা করা যায়
     ────────────────────────────────────────────── */
  let fbPromise = null;

  lp.getFirebase = () => {
    if (fbPromise) return fbPromise;
    const c = cfg();
    const base = 'https://www.gstatic.com/firebasejs/' + c.firebaseSdkVersion + '/';
    fbPromise = Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-firestore.js')])
      .then(([appMod, fsMod]) => {
        let app;
        try { app = appMod.getApp('rjf-login'); } catch (e) { app = appMod.initializeApp(c.firebaseConfig, 'rjf-login'); }
        return { app, fs: fsMod, db: fsMod.getFirestore(app) };
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

  /* ────────────────────────────────────────────────
     এরর শ্রেণিবিন্যাস
     ────────────────────────────────────────────── */
  lp.classifyError = (e) => {
    const code = String((e && e.code) || '');
    const msg = String((e && e.message) || '');
    const both = code + ' ' + msg;
    if (code === 'timeout' || msg === 'timeout') return 'TIMEOUT';
    if (global.navigator && navigator.onLine === false) return 'OFFLINE';
    if (/permission-denied/i.test(both)) return 'PERMISSION';
    if (/resource-exhausted|quota/i.test(both)) return 'BUSY';
    if (/unavailable|network|failed to fetch|load failed|importing|module|dynamically imported/i.test(both)) return 'NETWORK';
    return 'ERROR';
  };

  /* ────────────────────────────────────────────────
     আইডেন্টিফায়ার পার্সার — সদস্য আইডি / ইমেইল / মোবাইল
     - বাংলা অঙ্ক, ড্যাশ/স্পেস ভুল, "1234" (শুধু শেষ ৪ ডিজিট) সবই বোঝে
     ────────────────────────────────────────────── */
  lp.parseIdentifier = (raw, now) => {
    const c = cfg();
    const t = lp.cleanInput(raw);
    if (!t) return { kind: 'empty', input: '' };

    if (t.includes('@')) {
      const email = t.replace(/\s+/g, '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { kind: 'invalid', input: t };
      /* Firestore-এ কেস-ইনসেনসিটিভ কুয়েরি নেই, তাই সম্ভাব্য রূপগুলো একসাথে খোঁজা হয়:
         যেমন লেখা হয়েছে / ছোট হাতের / প্রথম অক্ষর বড় (ফোনের কীবোর্ডে সাধারণ) */
      const lower = email.toLowerCase();
      const cap = lower.charAt(0).toUpperCase() + lower.slice(1);
      return {
        kind: 'email', input: t, value: lower, display: lower,
        candidates: Array.from(new Set([email, lower, cap]))
      };
    }

    const compact = t.replace(/[\s\-_.()+]/g, '').toUpperCase();

    /* মোবাইল: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX, 1XXXXXXXXX */
    let m = /^(?:88)?(01[3-9]\d{8})$/.exec(compact) || /^(1[3-9]\d{8})$/.exec(compact);
    if (m) {
      const mobile = m[1].charAt(0) === '0' ? m[1] : '0' + m[1];
      return { kind: 'mobile', input: t, value: mobile, display: mobile, candidates: [mobile] };
    }

    /* সদস্য আইডি: RJF-2026-1234 / RJF20261234 / 2026-1234 / 1234 */
    m = /^(?:RJF)?(?:(20\d{2}))?(\d{4})$/.exec(compact);
    if (m) {
      const suffix = m[2];
      const years = [];
      if (m[1]) {
        years.push(Number(m[1]));
      } else {
        const y = (now || new Date()).getFullYear();
        const min = Math.min(c.idMinYear || 2025, y);
        for (let v = y; v >= min; v--) years.push(v);
      }
      const candidates = years.map((v) => 'RJF-' + v + '-' + suffix);
      return { kind: 'id', input: t, value: candidates[0], display: candidates[0], candidates, partial: !m[1] };
    }

    return { kind: 'invalid', input: t };
  };

  /* ────────────────────────────────────────────────
     সদস্য খোঁজা
     ────────────────────────────────────────────── */
  lp.findMembers = async (parsed) => {
    const c = cfg();
    const { fs, db } = await lp.withTimeout(lp.getFirebase(), c.sdkTimeoutMs, 'timeout');
    const field = parsed.kind === 'id' ? 'member_id' : parsed.kind === 'email' ? 'email' : 'mobile_number';
    const list = parsed.candidates;
    const constraint = list.length > 1 ? fs.where(field, 'in', list) : fs.where(field, '==', list[0]);
    const snap = await lp.withTimeout(
      fs.getDocs(fs.query(fs.collection(db, 'members'), constraint)),
      c.queryTimeoutMs,
      'timeout'
    );
    return snap.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() || {} }));
  };

  /* সেশনে যা রাখা হবে — stored_password কখনোই নয় */
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
    permanent_address: data.permanent_address || ''
  });

  const isDenied = (status) => (cfg().deniedStatuses || []).indexOf(String(status || '').toLowerCase()) !== -1;
  lp.isDeniedStatus = isDenied;

  /* পাসওয়ার্ড বদলালে অন্য ডিভাইসের সেশন বাতিল করার জন্য ছোট্ট স্ট্যাম্প (SHA-256-এর প্রথম ৮ বাইট) */
  lp.pwStamp = async (memberId, password) => {
    try {
      const subtle = global.crypto && global.crypto.subtle;
      if (!subtle) return null;
      const buf = await subtle.digest('SHA-256', new TextEncoder().encode(memberId + '|' + password));
      return Array.from(new Uint8Array(buf).slice(0, 8)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return null;
    }
  };

  /* ────────────────────────────────────────────────
     ভুল-চেষ্টার সীমা (এই ডিভাইসে) — ৫ বার ভুল হলে ৩০ সে., তারপর ৬০ সে., ২ মি., ৫ মি., ১৫ মি.
     ⚠️ এটা ইউজার-স্তরের সুরক্ষা; সার্ভার-সাইড rate limit নয়
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
     লগইন
     ────────────────────────────────────────────── */
  lp.authenticate = async (rawId, password) => {
    const lock = guardCheck();
    if (lock.locked) return { ok: false, code: 'LOCKED', retryAfter: lock.remaining };

    const parsed = lp.parseIdentifier(rawId);
    if (parsed.kind === 'empty' || parsed.kind === 'invalid') return { ok: false, code: 'BAD_IDENTIFIER' };

    let docs;
    try {
      docs = await lp.findMembers(parsed);
    } catch (e) {
      console.error('Login lookup error:', e);
      return { ok: false, code: lp.classifyError(e) };
    }

    const match = docs.find((d) => {
      const sp = d.data.stored_password;
      return sp != null && String(sp).length > 0 && lp.timingSafeEqual(String(sp), password);
    });

    if (!match) {
      const g = guardFail();
      return { ok: false, code: 'INVALID', attemptsLeft: g.attemptsLeft, locked: g.locked, retryAfter: g.remaining };
    }

    /* সঠিক পাসওয়ার্ড কিন্তু সদস্যপদ নিষ্ক্রিয় — এটা ভুল-চেষ্টা হিসেবে গোনা হয় না */
    if (isDenied(match.data.status)) return { ok: false, code: 'DENIED' };

    lp.guard.clear();
    const member = lp.toProfile(match.data);
    const stamp = await lp.pwStamp(member.member_id, String(match.data.stored_password));
    return { ok: true, member, stamp };
  };

  /* ব্যাকগ্রাউন্ডে সেশন যাচাই: সদস্য আছেন কিনা, নিষ্ক্রিয় কিনা, পাসওয়ার্ড বদলেছে কিনা */
  lp.revalidate = async (session) => {
    const id = session.member.member_id;
    let docs;
    try {
      docs = await lp.findMembers({ kind: 'id', candidates: [id] });
    } catch (e) {
      return { status: 'offline' };
    }
    const same = docs.filter((d) => d.data.member_id === id);
    if (!same.length) return { status: 'gone' };

    let chosen = same[0];
    if (session.pwStamp) {
      chosen = null;
      for (const d of same) {
        const st = await lp.pwStamp(id, String(d.data.stored_password || ''));
        if (!st || st === session.pwStamp) { chosen = d; break; }
      }
      if (!chosen) return { status: 'changed' };
    }
    if (isDenied(chosen.data.status)) return { status: 'denied' };
    return { status: 'ok', member: lp.toProfile(chosen.data) };
  };

  /* ────────────────────────────────────────────────
     সেশন — v2 ফরম্যাট: মেয়াদ + নিষ্ক্রিয়তা (idle) + "লগইন থাকুন" (localStorage)
     ────────────────────────────────────────────── */
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
    target.setJSON(c.sessionKey, s);
  }

  lp.session = {
    endReason: null,

    save(member, remember, pwStamp) {
      const c = cfg();
      const now = Date.now();
      const s = {
        v: 2,
        member,
        pwStamp: pwStamp || null,
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
      if (s.v !== 2 || !s.member || !s.member.member_id) { lp.session.clear(); return null; }
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
     EmailJS — সরাসরি REST (SDK ও পোলিং লুপ ছাড়া)
     ────────────────────────────────────────────── */
  lp.sendPasswordEmail = async (p) => {
    const c = cfg();
    let res;
    try {
      res = await lp.withTimeout(
        fetch(c.emailjsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: c.emailjsServiceId,
            template_id: c.emailjsPasswordTemplateId,
            user_id: c.emailjsPublicKey,
            template_params: {
              to_email: p.email,
              to_name: p.name,
              member_id: p.memberId,
              password: p.password
            }
          })
        }),
        c.emailTimeoutMs,
        'timeout'
      );
    } catch (e) {
      const err = new Error((e && e.message) || 'network');
      err.code = (e && e.code) || 'network';
      throw err;
    }
    if (!res.ok) {
      let detail = '';
      try { detail = await res.text(); } catch (e) { /* উপেক্ষা */ }
      const err = new Error('emailjs ' + res.status + ' ' + detail);
      err.code = 'email-http-' + res.status;
      throw err;
    }
  };

  /* ────────────────────────────────────────────────
     পাসওয়ার্ড রিসেট
     - crypto-নিরাপদ নতুন পাসওয়ার্ড → Firestore → ইমেইল
     - ইমেইল ব্যর্থ হলে একই পাসওয়ার্ড আবার পাঠানো যায় (মেমোরিতে রাখা, ডায়ালগ বন্ধে মুছে যায়)
     - ৬০ সেকেন্ড কুলডাউন ও ঘণ্টায় সর্বোচ্চ ৫ বার (এই ডিভাইসে)
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

  let pending = null;

  async function deliver() {
    if (!pending) return { ok: false, code: 'ERROR' };
    try {
      await lp.sendPasswordEmail(pending);
    } catch (e) {
      console.error('Password email error:', e);
      return { ok: false, code: 'EMAIL_FAILED', canResend: true, detail: lp.classifyError(e) };
    }
    return { ok: true, masked: lp.maskEmail(pending.email), memberId: pending.memberId };
  }

  lp.reset = {
    guard: { check: resetGuardCheck },

    async start(rawId) {
      const g = resetGuardCheck();
      if (!g.allowed) return { ok: false, code: 'COOLDOWN', wait: g.wait, reason: g.reason };

      const parsed = lp.parseIdentifier(rawId);
      if (parsed.kind === 'empty' || parsed.kind === 'invalid') return { ok: false, code: 'BAD_IDENTIFIER' };

      let docs;
      try {
        docs = await lp.findMembers(parsed);
      } catch (e) {
        console.error('Reset lookup error:', e);
        return { ok: false, code: lp.classifyError(e) };
      }
      if (!docs.length) return { ok: false, code: 'NOT_FOUND' };
      if (docs.length > 1) return { ok: false, code: 'AMBIGUOUS', kind: parsed.kind };

      const d = docs[0];
      if (isDenied(d.data.status)) return { ok: false, code: 'DENIED' };

      const email = String(d.data.email || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, code: 'NO_EMAIL' };

      let password;
      try {
        password = lp.generatePassword(cfg().passwordLength);
      } catch (e) {
        return { ok: false, code: 'NO_CRYPTO' };
      }

      try {
        const { fs } = await lp.withTimeout(lp.getFirebase(), cfg().sdkTimeoutMs, 'timeout');
        await lp.withTimeout(fs.updateDoc(d.ref, { stored_password: password }), cfg().queryTimeoutMs, 'timeout');
      } catch (e) {
        console.error('Reset update error:', e);
        return { ok: false, code: lp.classifyError(e) };
      }

      pending = {
        email,
        name: d.data.full_name || 'সদস্য',
        memberId: d.data.member_id || parsed.value,
        password
      };
      resetGuardRecord();
      const result = await deliver();
      result.parsedKind = parsed.kind;
      return result;
    },

    async resend() {
      if (!pending) return { ok: false, code: 'ERROR' };
      const g = resetGuardCheck();
      if (!g.allowed) return { ok: false, code: 'COOLDOWN', wait: g.wait, reason: g.reason };
      resetGuardRecord();
      return deliver();
    },

    hasPending: () => !!pending,
    clear() { pending = null; }
  };
})(window);
