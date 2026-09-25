/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — Member Login: কোর ইউটিলিটি
   - সব কিছু পিওর ভ্যানিলা জাভাস্ক্রিপ্ট (কোনো লাইব্রেরি/ফ্রেমওয়ার্ক নেই)
   - আইকন: নিজস্ব inline SVG (Font Awesome লাগে না, অফলাইনেও কাজ করে)
   - এই ফাইলে কোনো কনফিগ নেই — কনফিগ আছে js/login.js-এর মাথায়
   - লোড ক্রম: login-core.js → login-auth.js → login-qr.js → login.js
   ========================================================================== */
(function (global) {
  'use strict';

  const RJF = (global.RJF = global.RJF || {});
  const lp = (RJF.lp = RJF.lp || {});

  /* ────────────────────────────────────────────────
     DOM হেল্পার
     ────────────────────────────────────────────── */
  lp.$ = (sel, root) => (root || document).querySelector(sel);
  lp.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  lp.byId = (id) => document.getElementById(id);

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  lp.esc = (v) => (v == null ? '' : String(v).replace(/[&<>"']/g, (c) => ESC[c]));

  /* ────────────────────────────────────────────────
     আইকন — 24×24 লাইন-আইকন (Feather/Lucide ধাঁচ)
     ────────────────────────────────────────────── */
  const ICONS = {
    'id-card': '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5.2 16.2a3 3 0 0 1 5.6 0"/><line x1="14" y1="10" x2="19" y2="10"/><line x1="14" y1="14" x2="18" y2="14"/>',
    mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
    'log-in': '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>',
    'log-out': '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
    'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'alert-triangle': '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    'alert-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'calendar-plus': '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="13" x2="12" y2="19"/><line x1="9" y1="16" x2="15" y2="16"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'map-pin': '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    megaphone: '<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    pin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>',
    'share': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
    'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    'wifi-off': '<line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>',
    'shield-check': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>',
    'qr-code': '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    droplet: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    award: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
    'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>'
  };

  lp.icon = (name, cls) =>
    '<svg class="lp-icon' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="20" height="20" fill="none" ' +
    'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';

  /* ────────────────────────────────────────────────
     ইনপুট ক্লিনআপ — বাংলা অঙ্ক, ড্যাশের ধরন, অদৃশ্য অক্ষর
     ────────────────────────────────────────────── */
  const DIGIT_RE = /[\u09E6-\u09EF\u0660-\u0669\u06F0-\u06F9]/g;
  lp.toAsciiDigits = (s) =>
    String(s).replace(DIGIT_RE, (ch) => {
      const c = ch.charCodeAt(0);
      if (c >= 0x09e6 && c <= 0x09ef) return String(c - 0x09e6);
      if (c >= 0x0660 && c <= 0x0669) return String(c - 0x0660);
      return String(c - 0x06f0);
    });

  const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
  lp.bn = (v) => String(v).replace(/\d/g, (d) => BN_DIGITS[d]);

  lp.cleanInput = (raw) =>
    lp.toAsciiDigits(
      String(raw == null ? '' : raw)
        .normalize('NFKC')
        .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
        .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    ).trim();

  /* ────────────────────────────────────────────────
     মাস্কিং
     ────────────────────────────────────────────── */
  lp.maskEmail = (email) => {
    const s = String(email || '');
    const at = s.lastIndexOf('@');
    if (at < 1) return s;
    const local = s.slice(0, at);
    const keep = local.length > 3 ? 2 : 1;
    return local.slice(0, keep) + '•'.repeat(Math.min(5, Math.max(2, local.length - keep))) + s.slice(at);
  };

  /* ────────────────────────────────────────────────
     নিরাপদ স্টোরেজ (প্রাইভেট মোডে throw করলেও ভাঙবে না)
     ────────────────────────────────────────────── */
  function makeStore(getter) {
    return {
      get(key) {
        try { return getter().getItem(key); } catch (e) { return null; }
      },
      set(key, value) {
        try { getter().setItem(key, value); return true; } catch (e) { return false; }
      },
      remove(key) {
        try { getter().removeItem(key); } catch (e) { /* উপেক্ষা */ }
      },
      getJSON(key) {
        try {
          const raw = getter().getItem(key);
          return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
      },
      setJSON(key, obj) {
        try { getter().setItem(key, JSON.stringify(obj)); return true; } catch (e) { return false; }
      }
    };
  }
  lp.ls = makeStore(() => global.localStorage);
  lp.ss = makeStore(() => global.sessionStorage);

  /* ────────────────────────────────────────────────
     টাইমিং
     ────────────────────────────────────────────── */
  lp.withTimeout = (promise, ms, code) =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        const err = new Error(code || 'timeout');
        err.code = code || 'timeout';
        reject(err);
      }, ms);
      Promise.resolve(promise).then(
        (v) => { clearTimeout(t); resolve(v); },
        (e) => { clearTimeout(t); reject(e); }
      );
    });

  lp.throttle = (fn, ms) => {
    let last = 0;
    return function () {
      const now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(this, arguments); }
    };
  };

  /* ────────────────────────────────────────────────
     তারিখ/সময় — বাংলা ফরম্যাট (ICU-র উপর নির্ভর করে না)
     ────────────────────────────────────────────── */
  lp.MONTHS = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  lp.MONTHS_SHORT = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  lp.WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

  lp.toDate = (v) => {
    if (!v) return null;
    let d = null;
    if (v instanceof Date) d = v;
    else if (typeof v.toDate === 'function') d = v.toDate();
    else if (typeof v === 'object' && typeof v.seconds === 'number') d = new Date(v.seconds * 1000);
    else if (typeof v === 'number' || typeof v === 'string') d = new Date(v);
    return d && !isNaN(d.getTime()) ? d : null;
  };

  lp.formatDate = (d) => lp.bn(d.getDate()) + ' ' + lp.MONTHS[d.getMonth()] + ' ' + lp.bn(d.getFullYear());

  lp.formatTime = (d) => {
    const h = d.getHours();
    const period = h < 4 ? 'রাত' : h < 6 ? 'ভোর' : h < 12 ? 'সকাল' : h < 15 ? 'দুপুর' : h < 18 ? 'বিকেল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
    const h12 = h % 12 || 12;
    return period + ' ' + lp.bn(h12) + ':' + lp.bn(String(d.getMinutes()).padStart(2, '0'));
  };

  lp.formatDateTime = (d) => lp.formatDate(d) + ', ' + lp.formatTime(d);

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  /* কত দিন বাকি (আজ = ০, আগামীকাল = ১) — লোকাল ক্যালেন্ডার দিন ধরে */
  lp.daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / 86400000);

  lp.relativeTime = (d, now) => {
    const ref = now || new Date();
    const diff = ref.getTime() - d.getTime();
    if (diff < 45000) return 'এইমাত্র';
    const min = Math.floor(diff / 60000);
    if (min < 60) return lp.bn(min) + ' মিনিট আগে';
    const days = lp.daysBetween(d, ref);
    if (days === 0) return lp.bn(Math.floor(min / 60)) + ' ঘণ্টা আগে';
    if (days === 1) return 'গতকাল';
    if (days < 7) return lp.bn(days) + ' দিন আগে';
    return lp.formatDate(d);
  };

  /* ────────────────────────────────────────────────
     URL/লিংক নিরাপত্তা
     ────────────────────────────────────────────── */
  lp.safeUrl = (u) => {
    const s = String(u || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/^\/(?!\/)/.test(s)) return s;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(s)) return s;
    return '';
  };

  /* নোটিশের লেখায় http/https লিংকগুলো ক্লিকযোগ্য করা — আগে escape, তারপর anchor */
  lp.linkify = (raw) => {
    const text = String(raw == null ? '' : raw);
    const re = /https?:\/\/[^\s<>"']+/gi;
    let out = '';
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      let url = m[0];
      const tail = (/[.,;:!?)\]}\u0964]+$/.exec(url) || [''])[0];
      if (tail) url = url.slice(0, -tail.length);
      out += lp.esc(text.slice(last, m.index)) +
        '<a href="' + lp.esc(url) + '" target="_blank" rel="noopener noreferrer nofollow">' + lp.esc(url) + '</a>' +
        lp.esc(tail);
      last = m.index + m[0].length;
    }
    return out + lp.esc(text.slice(last));
  };

  lp.initials = (name) => {
    const s = String(name || '').trim();
    if (!s) return '•';
    try {
      if (global.Intl && Intl.Segmenter) {
        for (const part of new Intl.Segmenter('bn', { granularity: 'grapheme' }).segment(s)) return part.segment;
      }
    } catch (e) { /* ফলব্যাক নিচে */ }
    return Array.from(s)[0];
  };

  /* ────────────────────────────────────────────────
     ক্লিপবোর্ড ও ডাউনলোড
     ────────────────────────────────────────────── */
  lp.copy = async (text) => {
    try {
      if (global.navigator && navigator.clipboard && global.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* ফলব্যাক */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  };

  lp.download = (filename, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  /* ────────────────────────────────────────────────
     টোস্ট — #lpToasts (aria-live) কন্টেইনারে দেখায়
     বার্তা textContent দিয়ে বসে, তাই সদস্যের নাম/ডেটা থেকে XSS হবে না
     ────────────────────────────────────────────── */
  lp.toast = (message, type, opts) => {
    /* মডাল ডায়ালগ খোলা থাকলে টোস্ট ডায়ালগের ভেতরে বসে — নইলে ব্যাকড্রপের নিচে চলে যায় */
    const openDlg = document.querySelector('.lp dialog[open]');
    let host = lp.byId('lpToasts');
    if (openDlg) {
      host = openDlg.querySelector('.lp-toasts');
      if (!host) {
        host = document.createElement('div');
        host.className = 'lp-toasts';
        host.setAttribute('role', 'status');
        host.setAttribute('aria-live', 'polite');
        openDlg.appendChild(host);
      }
    }
    if (!host) return null;
    const kind = type || 'info';
    const icon = kind === 'error' ? 'alert-circle' : kind === 'success' ? 'check-circle' : 'info';

    while (host.children.length >= 3) host.firstElementChild.remove();

    const el = document.createElement('div');
    el.className = 'lp-toast lp-toast--' + kind;
    el.innerHTML = lp.icon(icon, 'lp-toast__icon') + '<span class="lp-toast__msg"></span>' +
      '<button type="button" class="lp-toast__x" aria-label="বন্ধ করুন">' + lp.icon('x') + '</button>';
    el.querySelector('.lp-toast__msg').textContent = message;

    const life = (opts && opts.duration) || (kind === 'error' ? 6500 : 4200);
    let timer = null;
    const close = () => {
      clearTimeout(timer);
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 180);
    };
    const arm = () => { clearTimeout(timer); timer = setTimeout(close, life); };

    el.querySelector('.lp-toast__x').addEventListener('click', close);
    el.addEventListener('mouseenter', () => clearTimeout(timer));
    el.addEventListener('mouseleave', arm);
    el.addEventListener('focusin', () => clearTimeout(timer));
    el.addEventListener('focusout', arm);

    host.appendChild(el);
    arm();
    return el;
  };

  /* ────────────────────────────────────────────────
     <dialog> খোলা/বন্ধ — পুরনো ব্রাউজারের জন্য ফলব্যাকসহ
     ────────────────────────────────────────────── */
  lp.openDialog = (dlg) => {
    if (!dlg || dlg.open) return;
    dlg._lpReturnFocus = document.activeElement;
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  };
  lp.closeDialog = (dlg) => {
    if (!dlg || !dlg.open) return;
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  };
})(window);
