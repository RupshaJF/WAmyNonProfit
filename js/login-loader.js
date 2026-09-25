/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — লগইন লোডার (~২.৫ KB gzip)
   - হোম পেজে লগইনের ভারী কোড (JS + CSS) আর লোড হয় না → বাকি সবার জন্য সাইট হালকা ও দ্রুত
   - #/login খুললে তবেই লোড হয়; ততক্ষণ ছোট্ট "লোড হচ্ছে" দেখায়
   - যাদের দরকার হতে পারে (আগে লগইন করা সদস্য, বা "সদস্য লগইন" লিংকে হাত/মাউস গেছে)
     তাদের জন্য নিঃশব্দে প্রিফেচ করে (Data Saver/2G-তে করে না), তাই লগইন প্রায় সাথে সাথেই খোলে
   - লোড ব্যর্থ হলে "আবার চেষ্টা করুন" বাটন
   ========================================================================== */
(function (global) {
  'use strict';

  var RJF = (global.RJF = global.RJF || {});

  /* এই তালিকার ক্রমই execution ক্রম */
  var SCRIPTS = [
    'js/login-core.js',
    'js/login-auth.js',
    'js/login-qr.js',
    'js/login.js',
    'js/dashboard-notices.js',
    'js/dashboard-events.js'
  ];
  var STYLE = 'css/login.css';

  var loading = null;
  var cssReady = false;
  var scriptsReady = false;

  function loadStyle() {
    if (cssReady) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = STYLE;
      link.onload = function () { cssReady = true; resolve(); };
      link.onerror = function () { link.remove(); reject(new Error('css')); };
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false; /* একসাথে নামলেও ক্রম মেনে চলে */
      s.onload = resolve;
      s.onerror = function () { s.remove(); reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  function loadAll() {
    if (loading) return loading;
    var scripts = scriptsReady ? Promise.resolve() : SCRIPTS.reduce(function (chain, src) {
      return chain.then(function () { return loadScript(src); });
    }, Promise.resolve()).then(function () { scriptsReady = true; });
    loading = Promise.all([loadStyle(), scripts]).catch(function (err) {
      loading = null; /* আবার চেষ্টা করা যাবে */
      throw err;
    });
    return loading;
  }

  function placeholder(html) {
    return '<div style="min-height:70vh;background:#0E3B36;color:#fff;display:flex;flex-direction:column;' +
      'align-items:center;justify-content:center;gap:14px;padding:110px 24px 60px;text-align:center;' +
      'font-family:\'Hind Siliguri\',system-ui,sans-serif;font-size:1.05rem">' + html + '</div>';
  }

  /* router.js এটাকেই ডাকে; লোড শেষে login.js এই ফাংশনটাকেই আসল ফাংশন দিয়ে বদলে দেয় */
  RJF.renderLoginPage = function stub() {
    var root = document.getElementById('login-root');
    if (!root) return;
    root.innerHTML = placeholder('<span>লগইন পেজ লোড হচ্ছে…</span>');

    loadAll().then(function () {
      /* অপেক্ষার মধ্যে অন্য পেজে চলে গেলে আর রেন্ডার নয় */
      if (global.location.hash === '#/login' && RJF.renderLoginPage !== stub) RJF.renderLoginPage();
    }).catch(function () {
      if (global.location.hash !== '#/login') return;
      root.innerHTML = placeholder(
        '<span>লগইন পেজ লোড করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।</span>' +
        '<button type="button" id="lpLoaderRetry" style="min-height:46px;padding:0 22px;border-radius:12px;border:0;' +
        'background:#fff;color:#0E3B36;font:600 1rem \'Hind Siliguri\',system-ui,sans-serif;cursor:pointer">আবার চেষ্টা করুন</button>'
      );
      var btn = document.getElementById('lpLoaderRetry');
      if (btn) btn.addEventListener('click', function () { RJF.renderLoginPage(); });
    });
  };

  /* ── প্রিফেচ: শুধু যাদের দরকার হতে পারে তাদের জন্য ──
     ১) আগে লগইন করেছেন এমন সদস্য (সেশন/আইডি মনে রাখা আছে) → পেজ লোডের পর অলস সময়ে
     ২) বাকি সবাই → "সদস্য লগইন" লিংকে মাউস/আঙুল/ফোকাস গেলে (ইচ্ছা বোঝা গেলে)
     Data Saver বা 2G হলে কখনোই নয় */
  var prefetched = false;

  function prefetch() {
    if (prefetched) return;
    var c = global.navigator && navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
    prefetched = true;
    SCRIPTS.concat([STYLE]).forEach(function (href) {
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = href;
      document.head.appendChild(l);
    });
  }

  function isReturningMember() {
    try {
      return !!(global.localStorage.getItem('rjf_member_session') || global.localStorage.getItem('rjf_last_email'));
    } catch (e) {
      return false;
    }
  }

  function schedule() {
    if (!isReturningMember()) return;
    if (typeof global.requestIdleCallback === 'function') global.requestIdleCallback(prefetch, { timeout: 4000 });
    else setTimeout(prefetch, 2500);
  }
  if (document.readyState === 'complete') schedule();
  else global.addEventListener('load', schedule);

  function onIntent(e) {
    var t = e.target;
    if (t && t.closest && t.closest('a[href="#/login"]')) prefetch();
  }
  ['pointerover', 'touchstart', 'focusin'].forEach(function (type) {
    document.addEventListener(type, onIntent, { passive: true, capture: true });
  });
})(window);
