/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — Member Login (v2)
   - একটি স্মার্ট ইনপুটে সদস্য আইডি / ইমেইল / মোবাইল — বাংলা অঙ্কও চলে
   - ভুল-চেষ্টার সীমা, সেশন মেয়াদ, নিষ্ক্রিয়তায় অটো-লগআউট, "লগইন থাকুন"
   - ডিজিটাল সদস্য কার্ড + অফলাইন-সক্ষম QR (কোনো লাইব্রেরি ছাড়া)
   - নোটিশ / ইভেন্ট ট্যাব (dashboard-notices.js, dashboard-events.js)
   - পিওর জাভাস্ক্রিপ্ট + পিওর CSS (css/login.css); কোনো গ্লো/লাইটিং ইফেক্ট নেই

   ফাইল ক্রম (index.html-এ): login-core.js → login-auth.js → login-qr.js → login.js
   ========================================================================== */
window.RJF = window.RJF || {};

/* ────────────────────────────────────────────────
   কনফিগ — Firebase ও EmailJS এর key এখানে
   ────────────────────────────────────────────── */
RJF.loginConfig = Object.assign({
  firebaseConfig: {
    apiKey: "AIzaSyC-ke7FIUPX5Ksow8vJQ4axmGAIdiKd49Q",
    authDomain: "member-selection.firebaseapp.com",
    projectId: "member-selection",
    storageBucket: "member-selection.firebasestorage.app",
    messagingSenderId: "434008909239",
    appId: "1:434008909239:web:a790d1e0603ebfdbd27432"
  },
  firebaseSdkVersion: "12.9.0",

  emailjsPublicKey: "dtl9HyOi2wvJEUiRB",
  emailjsServiceId: "service_272nuuq",
  /* EmailJS template variables: {{to_email}}, {{member_id}}, {{password}}, {{to_name}} */
  emailjsPasswordTemplateId: "template_hlm44yd",
  emailjsEndpoint: "https://api.emailjs.com/api/v1.0/email/send",

  /* সেশন storage key */
  sessionKey: "rjf_member_session",
  /* "লগইন থাকুন" চাপলে সদস্য আইডি মনে রাখার key */
  lastIdKey: "rjf_last_member_id",

  /* ডিফল্ট প্রোফাইল ছবি (photo_url না থাকলে) */
  defaultAvatar: "/icons/avatar.webp",
  /* ভেরিফাই পেজের path — QR কোড ও শেয়ার লিংকের জন্য */
  verifyPath: "/verify.html",

  /* ─── নতুন অপশন ─── */
  /* এই status-এর সদস্য লগইন করতে পারবেন না (admin panel-এ "blocked") */
  deniedStatuses: ["blocked", "rejected"],
  /* এই status-এ ড্যাশবোর্ডে "অনুমোদনের অপেক্ষায়" নোটিস দেখাবে */
  pendingStatuses: ["pending"],
  /* সদস্য আইডির সবচেয়ে পুরনো বছর (শুধু "1234" লিখলে কোন কোন বছর খুঁজবে) */
  idMinYear: 2025,

  /* "লগইন থাকুন" সেশন কতদিন থাকবে */
  rememberDays: 30,
  /* সাধারণ সেশনের সর্বোচ্চ মেয়াদ (ঘণ্টা) ও নিষ্ক্রিয়তার সীমা (মিনিট; ০ = বন্ধ) */
  sessionHours: 8,
  idleMinutes: 20,
  idleWarnSeconds: 60,

  /* ভুল-চেষ্টার সীমা: এতবার ভুলের পর লক; লকের সময় (সেকেন্ড) ধাপে ধাপে বাড়ে */
  maxAttempts: 5,
  lockSeconds: [30, 60, 120, 300, 900],

  /* পাসওয়ার্ড রিসেট */
  passwordLength: 12,
  resetCooldownSeconds: 60,
  resetMaxPerHour: 5,

  /* নেটওয়ার্ক টাইমআউট (মিলিসেকেন্ড) */
  sdkTimeoutMs: 15000,
  queryTimeoutMs: 15000,
  emailTimeoutMs: 15000,

  /* ইভেন্টের সময় কোন টাইমজোনে — বাংলাদেশ UTC+6 (মিনিটে) */
  eventTzOffsetMin: 360
}, RJF.loginConfig || {});

(function (global) {
  'use strict';

  const RJF = global.RJF;
  const lp = RJF.lp;
  const cfg = () => RJF.loginConfig;
  const { $, $$, byId, esc, icon } = lp;

  const ORG_FALLBACK = 'রূপসা জনকল্যাণ ফাউন্ডেশন';
  const STATUS_LABEL = { active: 'সক্রিয়', approved: 'অনুমোদিত', pending: 'অপেক্ষমান', blocked: 'নিষ্ক্রিয়', rejected: 'প্রত্যাখ্যাত' };
  const orgName = () => (RJF.data && RJF.data.brand && RJF.data.brand.name) || ORG_FALLBACK;

  let ctrl = null; /* বর্তমানে চালু কন্ট্রোলার (একবারে একটাই) */

  /* ────────────────────────────────────────────────
     HTML টেমপ্লেট
     ────────────────────────────────────────────── */
  function skeleton(n) {
    let out = '';
    for (let i = 0; i < n; i++) out += '<div class="lp-skel" aria-hidden="true"><i></i><i></i><i></i></div>';
    return out + '<span class="lp-sr">লোড হচ্ছে</span>';
  }
  lp.skeleton = skeleton;

  function dialogsTemplate() {
    return `
    <dialog class="lp-dialog" id="lpResetDialog" aria-labelledby="lpResetTitle">
      <div class="lp-dialog__head">
        <span class="lp-dialog__icon">${icon('key')}</span>
        <h2 class="lp-dialog__title" id="lpResetTitle">নতুন পাসওয়ার্ড নিন</h2>
        <button type="button" class="lp-iconbtn" data-close aria-label="বন্ধ করুন">${icon('x')}</button>
      </div>

      <div id="lpResetForm">
        <p class="lp-dialog__desc">সদস্য আইডি, ইমেইল বা মোবাইল নম্বর দিন। নিবন্ধিত ইমেইলে একটি নতুন পাসওয়ার্ড যাবে — আগের পাসওয়ার্ড আর কাজ করবে না।</p>
        <div class="lp-field">
          <label class="lp-label" for="lpResetId">সদস্য আইডি, ইমেইল বা মোবাইল</label>
          <div class="lp-control">
            <span class="lp-control__icon" id="lpResetIdIcon">${icon('id-card')}</span>
            <input class="lp-input" id="lpResetId" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="send" placeholder="RJF-2026-1234" aria-describedby="lpResetIdErr">
          </div>
          <p class="lp-error" id="lpResetIdErr" hidden></p>
        </div>
        <div class="lp-alert lp-alert--error" id="lpResetAlert" role="alert" hidden></div>
        <button type="button" class="lp-btn lp-btn--primary lp-btn--block" id="lpResetSend">
          <span class="lp-btn__label">${icon('mail')}<span>পাসওয়ার্ড পাঠান</span></span>
          <span class="lp-spin" aria-hidden="true"></span>
        </button>
      </div>

      <div id="lpResetDone" hidden>
        <div class="lp-done">
          <span class="lp-done__icon">${icon('check')}</span>
          <h3 class="lp-done__title" id="lpResetDoneTitle">পাসওয়ার্ড পাঠানো হয়েছে</h3>
          <p class="lp-done__msg" id="lpResetDoneMsg"></p>
        </div>
        <div class="lp-alert lp-alert--error" id="lpResetDoneAlert" role="alert" hidden></div>
        <div class="lp-dialog__actions">
          <button type="button" class="lp-btn lp-btn--ghost" id="lpResetResend">আবার পাঠান</button>
          <button type="button" class="lp-btn lp-btn--primary" id="lpResetBack">লগইনে ফিরে যান</button>
        </div>
      </div>
    </dialog>

    <dialog class="lp-dialog lp-dialog--qr" id="lpQrDialog" aria-labelledby="lpQrTitle">
      <div class="lp-dialog__head">
        <span class="lp-dialog__icon">${icon('qr-code')}</span>
        <h2 class="lp-dialog__title" id="lpQrTitle">আমার ভেরিফাই কার্ড</h2>
        <button type="button" class="lp-iconbtn" data-close aria-label="বন্ধ করুন">${icon('x')}</button>
      </div>
      <div class="lp-qrbox" id="lpQrBig"></div>
      <p class="lp-qrname" id="lpQrName"></p>
      <p class="lp-qrid" id="lpQrId"></p>
      <p class="lp-dialog__desc lp-dialog__desc--center">এই QR কোড স্ক্যান করলে যে কেউ আপনার সদস্যপদ যাচাই করতে পারবে।</p>
      <div class="lp-actions-grid">
        <button type="button" class="lp-btn lp-btn--ghost" id="lpQrCopy">${icon('link')}<span>লিংক কপি</span></button>
        <button type="button" class="lp-btn lp-btn--ghost" id="lpQrShare">${icon('share')}<span>শেয়ার</span></button>
        <button type="button" class="lp-btn lp-btn--ghost" id="lpQrSave">${icon('download')}<span>ছবি সেভ</span></button>
        <a class="lp-btn lp-btn--ghost" id="lpQrOpenLink" href="#" target="_blank" rel="noopener">${icon('external-link')}<span>পেজ খুলুন</span></a>
      </div>
    </dialog>

    <dialog class="lp-dialog lp-dialog--sm" id="lpIdleDialog" aria-labelledby="lpIdleTitle" aria-describedby="lpIdleMsg">
      <div class="lp-dialog__head">
        <span class="lp-dialog__icon lp-dialog__icon--warn">${icon('clock')}</span>
        <h2 class="lp-dialog__title" id="lpIdleTitle">আপনি কি এখনো আছেন?</h2>
      </div>
      <p class="lp-dialog__desc" id="lpIdleMsg">নিরাপত্তার জন্য <strong id="lpIdleCount">০</strong> সেকেন্ড পরে স্বয়ংক্রিয়ভাবে লগআউট হবে।</p>
      <div class="lp-dialog__actions">
        <button type="button" class="lp-btn lp-btn--ghost" id="lpIdleOut">এখনই লগআউট</button>
        <button type="button" class="lp-btn lp-btn--primary" id="lpIdleStay">আছি, চালিয়ে যান</button>
      </div>
    </dialog>`;
  }

  function authTemplate() {
    return `
    <div class="lp-auth" id="lpAuth">
      <aside class="lp-aside" aria-label="সদস্য পোর্টালের সুবিধা">
        <ul class="lp-feats">
          <li>
            <span class="lp-feats__icon">${icon('qr-code')}</span>
            <div><strong>ডিজিটাল সদস্য কার্ড</strong><p>নিজের QR কোড দেখান — যে কেউ স্ক্যান করে সদস্যপদ যাচাই করতে পারবে।</p></div>
          </li>
          <li>
            <span class="lp-feats__icon">${icon('megaphone')}</span>
            <div><strong>নোটিশ ও ঘোষণা</strong><p>সংগঠনের গুরুত্বপূর্ণ খবর সবার আগে জানুন।</p></div>
          </li>
          <li>
            <span class="lp-feats__icon">${icon('calendar')}</span>
            <div><strong>আসন্ন ইভেন্ট</strong><p>তারিখ, সময় ও স্থান দেখুন এবং এক ট্যাপে ক্যালেন্ডারে যোগ করুন।</p></div>
          </li>
        </ul>
      </aside>

      <div class="lp-auth__main">
        <h2 class="lp-auth__title" id="lpAuthTitle">সদস্য লগইন</h2>
        <p class="lp-auth__lead">সদস্য আইডি, ইমেইল বা মোবাইল নম্বর দিয়ে প্রবেশ করুন।</p>

        <div class="lp-banner lp-banner--warn" id="lpOffline" hidden>${icon('wifi-off')}<span>আপনি অফলাইনে আছেন। ইন্টারনেট ফিরলে আবার চেষ্টা করুন।</span></div>
        <div class="lp-alert" id="lpAlert" role="alert" hidden></div>

        <form id="lpForm" novalidate>
          <div class="lp-field">
            <label class="lp-label" for="lpId">সদস্য আইডি, ইমেইল বা মোবাইল</label>
            <div class="lp-control">
              <span class="lp-control__icon" id="lpIdIcon">${icon('id-card')}</span>
              <input class="lp-input" id="lpId" name="username" type="text" inputmode="text" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next" placeholder="RJF-2026-1234" aria-describedby="lpIdHint lpIdErr" required>
            </div>
            <p class="lp-hint" id="lpIdHint"></p>
            <p class="lp-error" id="lpIdErr" hidden></p>
          </div>

          <div class="lp-field">
            <div class="lp-label-row">
              <label class="lp-label" for="lpPw">পাসওয়ার্ড</label>
              <button type="button" class="lp-link" id="lpForgot">পাসওয়ার্ড পাননি বা ভুলে গেছেন?</button>
            </div>
            <div class="lp-control">
              <span class="lp-control__icon">${icon('lock')}</span>
              <input class="lp-input lp-input--has-btn" id="lpPw" name="password" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="আপনার পাসওয়ার্ড" aria-describedby="lpCaps lpPwErr" required>
              <button type="button" class="lp-control__btn" id="lpPwToggle" aria-pressed="false" aria-label="পাসওয়ার্ড দেখান">${icon('eye')}</button>
            </div>
            <p class="lp-hint lp-hint--warn" id="lpCaps" hidden>${icon('alert-triangle')}<span>Caps Lock চালু আছে</span></p>
            <p class="lp-error" id="lpPwErr" hidden></p>
          </div>

          <label class="lp-check">
            <input type="checkbox" id="lpRemember" name="remember">
            <span class="lp-check__box">${icon('check')}</span>
            <span class="lp-check__text">
              <strong>এই ডিভাইসে লগইন থাকুন</strong>
              <small>${lp.bn(cfg().rememberDays)} দিন পর্যন্ত। শুধু নিজের ব্যক্তিগত ডিভাইসে বেছে নিন।</small>
            </span>
          </label>

          <button type="submit" class="lp-btn lp-btn--primary lp-btn--block lp-btn--lg" id="lpSubmit">
            <span class="lp-btn__label">${icon('log-in')}<span id="lpSubmitText">লগইন করুন</span></span>
            <span class="lp-spin" aria-hidden="true"></span>
          </button>
        </form>

        <div class="lp-divider"><span>এখনো সদস্য হননি?</span></div>
        <a class="lp-btn lp-btn--ghost lp-btn--block" href="#/apply">${icon('user-plus')}<span>সদস্য হওয়ার আবেদন করুন</span></a>
      </div>
    </div>`;
  }

  function dashTemplate() {
    return `
    <div class="lp-dash" id="lpDash" hidden>
      <aside class="lp-dash__side">
        <article class="lp-idcard" aria-label="ডিজিটাল সদস্য কার্ড">
          <div class="lp-idcard__top">
            <span class="lp-idcard__label">${icon('shield-check')}<span>সদস্য কার্ড</span></span>
            <span class="lp-chip" id="lpStatus">—</span>
          </div>
          <div class="lp-idcard__person">
            <div class="lp-avatar" id="lpAvatar"></div>
            <div class="lp-idcard__who">
              <h2 class="lp-idcard__name" id="lpName" tabindex="-1">—</h2>
              <p class="lp-idcard__type" id="lpType">—</p>
            </div>
          </div>
          <div class="lp-idcard__id">
            <span class="lp-idcard__idtext" id="lpMemberId">—</span>
            <button type="button" class="lp-iconbtn lp-iconbtn--on-dark" data-copy="id" aria-label="সদস্য আইডি কপি করুন">${icon('copy')}</button>
          </div>
          <button type="button" class="lp-idcard__qr" id="lpQrOpenBtn" aria-label="QR কোড বড় করে দেখুন">
            <span class="lp-idcard__qrsvg" id="lpQrInline"></span>
            <span class="lp-idcard__qrcap">স্ক্যান করলে সদস্যপদ যাচাই হবে। বড় করতে ট্যাপ করুন।</span>
          </button>
        </article>
      </aside>

      <div class="lp-dash__main">
        <div class="lp-banner lp-banner--warn" id="lpPendingBanner" hidden>${icon('info')}<span>আপনার সদস্যপদ এখনো অনুমোদনের অপেক্ষায় আছে। অনুমোদিত হলে সব সুবিধা চালু হবে।</span></div>

        <div class="lp-tabs" role="tablist" aria-label="ড্যাশবোর্ড বিভাগ" id="lpTabs">
          <button type="button" class="lp-tab" role="tab" id="lpTabProfile" aria-controls="lpPanelProfile" aria-selected="true" data-tab="profile">${icon('user')}<span>প্রোফাইল</span></button>
          <button type="button" class="lp-tab" role="tab" id="lpTabNotices" aria-controls="lpPanelNotices" aria-selected="false" tabindex="-1" data-tab="notices">${icon('megaphone')}<span>নোটিশ</span><span class="lp-dot" id="lpNoticeDot" hidden><span class="lp-sr">নতুন নোটিশ আছে</span></span></button>
          <button type="button" class="lp-tab" role="tab" id="lpTabEvents" aria-controls="lpPanelEvents" aria-selected="false" tabindex="-1" data-tab="events">${icon('calendar')}<span>ইভেন্ট</span><span class="lp-count" id="lpEventCount" hidden></span></button>
        </div>

        <div class="lp-panel" role="tabpanel" id="lpPanelProfile" aria-labelledby="lpTabProfile" tabindex="0">
          <dl class="lp-info">
            <div class="lp-info__row"><dt>${icon('briefcase')}<span>পেশা</span></dt><dd id="lpOcc">—</dd></div>
            <div class="lp-info__row"><dt>${icon('droplet')}<span>রক্তের গ্রুপ</span></dt><dd id="lpBlood">—</dd></div>
            <div class="lp-info__row"><dt>${icon('user')}<span>লিঙ্গ</span></dt><dd id="lpGender">—</dd></div>
            <div class="lp-info__row"><dt>${icon('phone')}<span>মোবাইল নম্বর</span></dt><dd><span id="lpMobile">—</span><button type="button" class="lp-iconbtn" data-copy="mobile" aria-label="মোবাইল নম্বর কপি করুন">${icon('copy')}</button></dd></div>
            <div class="lp-info__row lp-info__row--wide"><dt>${icon('mail')}<span>ইমেইল</span></dt><dd><span id="lpEmail">—</span><button type="button" class="lp-iconbtn" data-copy="email" aria-label="ইমেইল কপি করুন">${icon('copy')}</button></dd></div>
            <div class="lp-info__row lp-info__row--wide"><dt>${icon('home')}<span>স্থায়ী ঠিকানা</span></dt><dd id="lpAddress">—</dd></div>
          </dl>
        </div>

        <div class="lp-panel" role="tabpanel" id="lpPanelNotices" aria-labelledby="lpTabNotices" tabindex="0" hidden>
          <div class="lp-list" id="lpNoticeList">${skeleton(3)}</div>
        </div>

        <div class="lp-panel" role="tabpanel" id="lpPanelEvents" aria-labelledby="lpTabEvents" tabindex="0" hidden>
          <div class="lp-list" id="lpEventList">${skeleton(3)}</div>
        </div>
      </div>
    </div>`;
  }

  function pageTemplate() {
    const brand = (RJF.data && RJF.data.brand) || {};
    const name = orgName();
    const logo = lp.safeUrl(brand.loginLogo) || '/icons/icon-512.png';
    return `
    <div class="lp" id="lpRoot" data-view="auth">
      <header class="lp-hero" id="lpHero">
        <div class="lp-shell lp-hero__inner">
          <div class="lp-mark" id="lpMark"><img src="${esc(logo)}" alt="" width="64" height="64" decoding="async" fetchpriority="high"></div>
          <div class="lp-hero__text">
            <h1 class="lp-hero__title">${esc(name)}</h1>
            <p class="lp-hero__sub">সদস্য পোর্টাল</p>
          </div>
          <button type="button" class="lp-hero__logout" id="lpLogout" hidden>${icon('log-out')}<span>লগআউট</span></button>
        </div>
        <svg class="lp-hero__edge" viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 24C180 48 360 0 540 16s360 32 540 8 270-24 360-8V48H0z"/></svg>
      </header>

      <main class="lp-shell lp-main" id="lpMain">
        ${authTemplate()}
        ${dashTemplate()}
        <p class="lp-back" id="lpBack"><a href="#/">${icon('arrow-left')}<span>মূল পাতায় ফিরুন</span></a></p>
      </main>

      <div class="lp-toasts" id="lpToasts" role="status" aria-live="polite"></div>
      ${dialogsTemplate()}
    </div>`;
  }

  /* ────────────────────────────────────────────────
     কন্ট্রোলার — একবার mount হয়, বের হলে destroy (সব লিসেনার/টাইমার পরিষ্কার)
     ────────────────────────────────────────────── */
  function createController(root) {
    const cleanups = [];
    const on = (target, type, handler, opts) => {
      target.addEventListener(type, handler, opts);
      cleanups.push(() => target.removeEventListener(type, handler, opts));
    };
    const timers = new Set();
    const setTimer = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

    let session = null;
    let busy = false;
    let lockTimer = null;
    let idleTimer = null;
    let idleWarnOpen = false;
    let lastActivity = Date.now();
    let lastValidated = 0;
    let resetBusy = false;
    let resetCountdown = null;
    let focusPwOnClose = false;
    const prevTitle = document.title;
    let el = {};

    /* ── ছোট হেল্পার ── */
    const setText = (id, text) => { const n = byId(id); if (n) n.textContent = text; };
    const verifyUrl = (id) => global.location.origin + cfg().verifyPath + '?id=' + encodeURIComponent(id);

    function setFieldError(input, errEl, msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      input.closest('.lp-control').classList.add('is-invalid');
    }
    function clearFieldError(input, errEl) {
      errEl.textContent = '';
      errEl.hidden = true;
      input.removeAttribute('aria-invalid');
      input.closest('.lp-control').classList.remove('is-invalid');
    }

    function fillAlert(node, kind, title, detail) {
      node.className = 'lp-alert lp-alert--' + kind;
      node.innerHTML = icon(kind === 'error' ? 'alert-circle' : kind === 'warn' ? 'alert-triangle' : 'info') +
        '<div class="lp-alert__body"><p class="lp-alert__title"></p><p class="lp-alert__detail" hidden></p></div>';
      $('.lp-alert__title', node).textContent = title;
      if (detail) {
        const d = $('.lp-alert__detail', node);
        d.textContent = detail;
        d.hidden = false;
      }
      node.hidden = false;
    }
    const showAlert = (kind, title, detail) => fillAlert(el.alert, kind, title, detail);
    const clearAlert = () => { el.alert.hidden = true; el.alert.textContent = ''; };

    function nudge(node) {
      if (!node) return;
      node.classList.remove('is-nudge');
      void node.offsetWidth; /* অ্যানিমেশন রিস্টার্ট */
      node.classList.add('is-nudge');
    }

    /* ── আইডেন্টিফায়ার টাইপ ডিটেকশন (আইকন + ছোট্ট হিন্ট) ── */
    function detectInto(input, iconEl, hintEl) {
      const parsed = lp.parseIdentifier(input.value);
      const name = parsed.kind === 'email' ? 'mail' : parsed.kind === 'mobile' ? 'phone' : 'id-card';
      if (iconEl.dataset.icon !== name) { iconEl.innerHTML = icon(name); iconEl.dataset.icon = name; }
      if (!hintEl) return parsed;
      let hint = '';
      if (parsed.kind === 'email') hint = 'ইমেইল দিয়ে লগইন';
      else if (parsed.kind === 'mobile') hint = 'মোবাইল নম্বর দিয়ে লগইন';
      else if (parsed.kind === 'id') {
        if (parsed.partial) hint = 'আইডি খোঁজা হবে: ' + parsed.candidates.join(' বা ');
        else if (parsed.display !== input.value.trim()) hint = 'আইডি: ' + parsed.display;
      }
      hintEl.textContent = hint;
      return parsed;
    }

    /* ── ভিউ পরিবর্তন ── */
    function showAuth(opts) {
      el.root.dataset.view = 'auth';
      el.hero.classList.remove('is-compact');
      el.auth.hidden = false;
      el.dash.hidden = true;
      el.back.hidden = false;
      el.logout.hidden = true;
      document.title = 'সদস্য লগইন | ' + orgName();
      if (opts && opts.focus) (el.id.value ? el.pw : el.id).focus();
    }

    function showDash() {
      el.root.dataset.view = 'dash';
      el.hero.classList.add('is-compact');
      el.auth.hidden = true;
      el.dash.hidden = false;
      el.back.hidden = true;
      el.logout.hidden = false;
      document.title = 'আমার ড্যাশবোর্ড | ' + orgName();
      fillDashboard(session.member);
      selectTab('profile');
      if (typeof RJF.initDashboardNotices === 'function') RJF.initDashboardNotices();
      if (typeof RJF.initDashboardEvents === 'function') RJF.initDashboardEvents();
      startIdle();
    }

    /* ── ড্যাশবোর্ড ডেটা ── */
    function renderAvatar(box, member) {
      box.textContent = '';
      const own = lp.safeUrl(member.photo_url);
      const fallback = lp.safeUrl(cfg().defaultAvatar);
      const toInitials = () => {
        box.textContent = '';
        const s = document.createElement('span');
        s.className = 'lp-avatar__ini';
        s.textContent = lp.initials(member.full_name);
        box.appendChild(s);
      };
      const first = own || fallback;
      if (!first) { toInitials(); return; }
      const img = new Image();
      img.alt = '';
      img.width = 72;
      img.height = 72;
      img.decoding = 'async';
      let triedFallback = !own || own === fallback;
      img.addEventListener('error', () => {
        if (!triedFallback && fallback) { triedFallback = true; img.src = fallback; return; }
        toInitials();
      });
      img.src = first;
      box.appendChild(img);
    }

    function fillDashboard(m) {
      setText('lpName', m.full_name);
      setText('lpMemberId', m.member_id);
      setText('lpType', m.membership_type || 'সদস্য');
      setText('lpOcc', m.occupation || '—');
      setText('lpBlood', m.blood_group || '—');
      setText('lpGender', m.gender || '—');
      setText('lpMobile', m.mobile_number || '—');
      setText('lpEmail', m.email || '—');
      setText('lpAddress', m.permanent_address || '—');

      const status = m.status || 'pending';
      const chip = byId('lpStatus');
      const denied = (cfg().deniedStatuses || []).indexOf(status) !== -1;
      const pending = (cfg().pendingStatuses || []).indexOf(status) !== -1;
      chip.textContent = STATUS_LABEL[status] || status;
      chip.className = 'lp-chip ' + (denied ? 'lp-chip--bad' : pending ? 'lp-chip--wait' : 'lp-chip--ok');
      byId('lpPendingBanner').hidden = !pending;

      renderAvatar(byId('lpAvatar'), m);

      try {
        byId('lpQrInline').innerHTML = lp.qr.toSvg(verifyUrl(m.member_id), { margin: 1, label: 'সদস্য যাচাইয়ের QR কোড' });
      } catch (e) {
        byId('lpQrInline').textContent = '';
      }
    }

    /* ── ট্যাব (ARIA + কীবোর্ড) ── */
    function selectTab(name, focus) {
      $$('.lp-tab', el.tabs).forEach((t) => {
        const active = t.dataset.tab === name;
        t.setAttribute('aria-selected', active ? 'true' : 'false');
        t.tabIndex = active ? 0 : -1;
        if (active && focus) t.focus();
      });
      const panelId = 'lpPanel' + name.charAt(0).toUpperCase() + name.slice(1);
      $$('.lp-panel', el.dash).forEach((p) => { p.hidden = p.id !== panelId; });
      if (name === 'notices' && typeof RJF._lpMarkNoticesSeen === 'function') RJF._lpMarkNoticesSeen();
    }

    /* ── লগআউট ── */
    function stopIdle() {
      clearInterval(idleTimer);
      idleTimer = null;
      idleWarnOpen = false;
      if (el.idleDlg) lp.closeDialog(el.idleDlg);
    }

    function teardownLive() {
      if (typeof RJF._lpTeardownDashboard === 'function') RJF._lpTeardownDashboard();
    }

    function logout(reason) {
      stopIdle();
      teardownLive();
      lp.session.clear();
      session = null;
      [el.qrDlg, el.resetDlg].forEach((d) => lp.closeDialog(d));
      el.pw.value = '';
      clearAlert();
      showAuth({ focus: true });
      if (reason === 'idle') showAlert('info', 'নিষ্ক্রিয় থাকায় লগআউট হয়েছে।', 'নিরাপত্তার জন্য আবার লগইন করুন।');
      else if (reason === 'expired') showAlert('info', 'সেশনের মেয়াদ শেষ হয়েছে।', 'আবার লগইন করুন।');
      else if (reason === 'gone') showAlert('warn', 'আপনার সদস্য তথ্য আর পাওয়া যাচ্ছে না।', 'সমস্যা হলে সংগঠনের সাথে যোগাযোগ করুন।');
      else if (reason === 'denied') showAlert('error', 'আপনার সদস্যপদ বর্তমানে নিষ্ক্রিয়।', 'বিস্তারিত জানতে সংগঠনের সাথে যোগাযোগ করুন।');
      else if (reason === 'changed') showAlert('info', 'পাসওয়ার্ড বদলানো হয়েছে।', 'নিরাপত্তার জন্য নতুন পাসওয়ার্ড দিয়ে আবার লগইন করুন।');
      else lp.toast('লগআউট হয়েছে।');
    }

    /* ── নিষ্ক্রিয়তা (idle) ── */
    function idleTick() {
      if (!session || session.remember || cfg().idleMinutes <= 0) return;
      const limit = Math.max(1, Math.round(cfg().idleMinutes * 60));
      const warn = Math.min(cfg().idleWarnSeconds, limit);
      const idleFor = Math.floor((Date.now() - lastActivity) / 1000);
      if (idleFor >= limit) { logout('idle'); return; }
      if (idleFor >= limit - warn) {
        if (!idleWarnOpen) { idleWarnOpen = true; lp.openDialog(el.idleDlg); }
        setText('lpIdleCount', lp.bn(Math.max(0, limit - idleFor)));
      } else if (idleWarnOpen) {
        idleWarnOpen = false;
        lp.closeDialog(el.idleDlg);
      }
    }

    function markActive() {
      if (idleWarnOpen) return; /* সতর্কতা খোলা থাকলে শুধু বাটনে চাপলেই চলবে */
      const now = Date.now();
      lastActivity = now;
      if (session && now - (session.lastActive || 0) > 30000) lp.session.touch(session);
    }

    function startIdle() {
      stopIdle();
      lastActivity = Date.now();
      if (!session || session.remember || cfg().idleMinutes <= 0) return;
      idleTimer = setInterval(idleTick, 1000);
    }

    function onIdleStay() {
      idleWarnOpen = false;
      lp.closeDialog(el.idleDlg);
      lastActivity = Date.now();
      if (session) lp.session.touch(session);
    }

    /* ── লকআউট কাউন্টডাউন ── */
    function startLock(seconds) {
      clearInterval(lockTimer);
      let left = Math.max(1, Math.ceil(seconds));
      el.submit.disabled = true;
      fillAlert(el.alert, 'error', 'অনেকবার ভুল চেষ্টা হয়েছে।', 'নিরাপত্তার জন্য কিছুক্ষণ লগইন বন্ধ থাকবে।');
      el.submitText.textContent = lp.bn(left) + ' সেকেন্ড পরে আবার চেষ্টা করুন';
      lockTimer = setInterval(() => {
        left -= 1;
        if (left <= 0) {
          clearInterval(lockTimer);
          lockTimer = null;
          el.submit.disabled = busy;
          el.submitText.textContent = 'লগইন করুন';
          clearAlert();
          return;
        }
        el.submitText.textContent = lp.bn(left) + ' সেকেন্ড পরে আবার চেষ্টা করুন';
      }, 1000);
    }

    function setBusy(state) {
      busy = state;
      el.submit.classList.toggle('is-busy', state);
      el.submit.setAttribute('aria-busy', state ? 'true' : 'false');
      if (!lockTimer) {
        el.submit.disabled = state;
        el.submitText.textContent = state ? 'যাচাই হচ্ছে…' : 'লগইন করুন';
      }
    }

    /* ── লগইন সাবমিট ── */
    async function onSubmit(e) {
      e.preventDefault();
      if (busy || lockTimer) return;
      clearAlert();
      clearFieldError(el.id, el.idErr);
      clearFieldError(el.pw, el.pwErr);

      const parsed = lp.parseIdentifier(el.id.value);
      const password = el.pw.value.trim();
      let firstBad = null;

      if (parsed.kind === 'empty') {
        setFieldError(el.id, el.idErr, 'সদস্য আইডি, ইমেইল বা মোবাইল নম্বর দিন।');
        firstBad = el.id;
      } else if (parsed.kind === 'invalid') {
        setFieldError(el.id, el.idErr, 'এটি সঠিক আইডি, ইমেইল বা মোবাইল নম্বর মনে হচ্ছে না। যেমন: RJF-2026-1234');
        firstBad = el.id;
      }
      if (!password) {
        setFieldError(el.pw, el.pwErr, 'পাসওয়ার্ড দিন।');
        firstBad = firstBad || el.pw;
      }
      if (firstBad) { firstBad.focus(); return; }

      if (global.navigator && navigator.onLine === false) {
        el.offline.hidden = false;
        nudge(el.offline);
        lp.toast('ইন্টারনেট সংযোগ নেই — সংযোগ ফিরলে আবার চেষ্টা করুন।', 'error');
        return;
      }

      const lock = lp.guard.check();
      if (lock.locked) { startLock(lock.remaining); return; }

      setBusy(true);
      const res = await lp.authenticate(el.id.value, password);
      setBusy(false);
      if (!ctrl || ctrl.api !== api) return; /* অপেক্ষার মধ্যে অন্য পেজে চলে গেলে */

      if (res.ok) { onLoginSuccess(res); return; }

      switch (res.code) {
        case 'INVALID': {
          el.pw.value = '';
          nudge(el.pw.closest('.lp-control'));
          if (res.locked) { startLock(res.retryAfter); return; }
          let detail = 'পাসওয়ার্ড না পেয়ে থাকলে বা ভুলে গেলে “পাসওয়ার্ড পাননি বা ভুলে গেছেন?” চাপুন।';
          if (res.attemptsLeft <= 2) detail = 'আর ' + lp.bn(res.attemptsLeft) + ' বার ভুল হলে কিছুক্ষণের জন্য লগইন বন্ধ হবে। ' + detail;
          showAlert('error', 'আইডি (বা ইমেইল/মোবাইল) অথবা পাসওয়ার্ড সঠিক নয়।', detail);
          el.pw.focus();
          break;
        }
        case 'LOCKED': startLock(res.retryAfter); break;
        case 'DENIED': showAlert('error', 'আপনার সদস্যপদ বর্তমানে নিষ্ক্রিয়।', 'বিস্তারিত জানতে সংগঠনের সাথে যোগাযোগ করুন।'); break;
        case 'TIMEOUT': showAlert('error', 'সার্ভার সাড়া দিচ্ছে না।', 'কিছুক্ষণ পর আবার চেষ্টা করুন।'); break;
        case 'OFFLINE': showAlert('warn', 'আপনি অফলাইনে আছেন।', 'ইন্টারনেট সংযোগ ফিরলে আবার চেষ্টা করুন।'); break;
        case 'NETWORK': showAlert('error', 'সংযোগে সমস্যা হয়েছে।', 'ইন্টারনেট পরীক্ষা করে আবার চেষ্টা করুন।'); break;
        case 'PERMISSION': showAlert('error', 'সার্ভার এই অনুরোধ গ্রহণ করছে না।', 'সমস্যা থাকলে সংগঠনের সাথে যোগাযোগ করুন।'); break;
        case 'BUSY': showAlert('error', 'সার্ভার এখন ব্যস্ত আছে।', 'কিছুক্ষণ পর আবার চেষ্টা করুন।'); break;
        case 'BAD_IDENTIFIER': setFieldError(el.id, el.idErr, 'এটি সঠিক আইডি, ইমেইল বা মোবাইল নম্বর মনে হচ্ছে না।'); el.id.focus(); break;
        default: showAlert('error', 'কিছু একটা সমস্যা হয়েছে।', 'আবার চেষ্টা করুন।');
      }
    }

    function onLoginSuccess(res) {
      const remember = el.remember.checked;
      session = lp.session.save(res.member, remember, res.stamp);
      if (remember) lp.ls.set(cfg().lastIdKey, res.member.member_id);
      else lp.ls.remove(cfg().lastIdKey);
      el.pw.value = '';
      clearAlert();
      lastValidated = Date.now();
      showDash();
      byId('lpName').focus({ preventScroll: true });
      global.scrollTo(0, 0);
      lp.toast('স্বাগতম, ' + res.member.full_name + '!', 'success');
    }

    /* ── পাসওয়ার্ড রিসেট ডায়ালগ ── */
    const resetAlert = (kind, title, detail) => fillAlert(el.resetAlert, kind, title, detail);

    function openReset() {
      el.resetForm.hidden = false;
      el.resetDone.hidden = true;
      el.resetAlert.hidden = true;
      clearFieldError(el.resetId, el.resetIdErr);
      const typed = el.id.value.trim();
      if (typed) el.resetId.value = typed;
      detectInto(el.resetId, byId('lpResetIdIcon'), null);
      const g = lp.reset.guard.check();
      if (!g.allowed) resetAlert('warn', 'কিছুক্ষণ অপেক্ষা করুন।', 'আবার পাঠাতে ' + lp.bn(g.wait) + ' সেকেন্ড বাকি।');
      lp.openDialog(el.resetDlg);
      setTimer(() => el.resetId.focus(), 60);
    }

    function paintResendCountdown() {
      clearInterval(resetCountdown);
      const btn = el.resetResend;
      const tick = () => {
        const g = lp.reset.guard.check();
        if (g.allowed) {
          clearInterval(resetCountdown);
          btn.disabled = false;
          btn.textContent = 'আবার পাঠান';
        } else {
          btn.disabled = true;
          btn.textContent = 'আবার পাঠান (' + lp.bn(g.wait) + ' সে.)';
        }
      };
      tick();
      resetCountdown = setInterval(tick, 1000);
    }

    function resetMessage(res) {
      switch (res.code) {
        case 'COOLDOWN':
          return res.reason === 'hourly'
            ? ['এই ডিভাইস থেকে অনেকবার অনুরোধ হয়েছে।', 'কিছুক্ষণ পর আবার চেষ্টা করুন।']
            : ['কিছুক্ষণ অপেক্ষা করুন।', 'আবার পাঠাতে ' + lp.bn(res.wait) + ' সেকেন্ড বাকি।'];
        case 'BAD_IDENTIFIER': return ['এটি সঠিক আইডি, ইমেইল বা মোবাইল নম্বর মনে হচ্ছে না।', 'যেমন: RJF-2026-1234'];
        case 'NOT_FOUND': return ['এই তথ্যে কোনো সদস্য পাওয়া যায়নি।', 'আইডি, ইমেইল বা মোবাইল নম্বর আবার মিলিয়ে দেখুন।'];
        case 'AMBIGUOUS':
          return res.kind === 'id'
            ? ['এই তথ্যে একাধিক সদস্য পাওয়া গেছে।', 'সংগঠনের সাথে যোগাযোগ করুন।']
            : ['এই তথ্যে একাধিক সদস্য পাওয়া গেছে।', 'সদস্য আইডি দিয়ে চেষ্টা করুন।'];
        case 'DENIED': return ['এই সদস্যপদ বর্তমানে নিষ্ক্রিয়।', 'তাই পাসওয়ার্ড পাঠানো যাবে না। সংগঠনের সাথে যোগাযোগ করুন।'];
        case 'NO_EMAIL': return ['এই সদস্যের নিবন্ধনে বৈধ ইমেইল নেই।', 'সংগঠনের সাথে যোগাযোগ করুন।'];
        case 'NO_CRYPTO': return ['এই ব্রাউজারে নিরাপদ পাসওয়ার্ড তৈরি করা যাচ্ছে না।', 'আপডেটেড ব্রাউজার ব্যবহার করে চেষ্টা করুন।'];
        case 'TIMEOUT': return ['সার্ভার সাড়া দিচ্ছে না।', 'কিছুক্ষণ পর আবার চেষ্টা করুন।'];
        case 'OFFLINE': return ['আপনি অফলাইনে আছেন।', 'ইন্টারনেট সংযোগ ফিরলে আবার চেষ্টা করুন।'];
        case 'NETWORK': return ['সংযোগে সমস্যা হয়েছে।', 'ইন্টারনেট পরীক্ষা করে আবার চেষ্টা করুন।'];
        case 'PERMISSION': return ['পাসওয়ার্ড আপডেট করা যায়নি।', 'সার্ভার অনুমতি দিচ্ছে না। সংগঠনের সাথে যোগাযোগ করুন।'];
        case 'EMAIL_FAILED': return ['ইমেইল পাঠানো যায়নি।', 'নতুন পাসওয়ার্ড তৈরি হয়ে গেছে — “আবার পাঠান” চাপুন।'];
        default: return ['কিছু একটা সমস্যা হয়েছে।', 'আবার চেষ্টা করুন।'];
      }
    }

    function setDoneState(ok) {
      const box = $('.lp-done', el.resetDone);
      box.classList.toggle('is-failed', !ok);
      $('.lp-done__icon', box).innerHTML = icon(ok ? 'check' : 'alert-triangle');
    }

    function showResetDone(res) {
      el.resetForm.hidden = true;
      el.resetDone.hidden = false;
      el.resetDoneAlert.hidden = true;
      setDoneState(true);
      setText('lpResetDoneTitle', 'পাসওয়ার্ড পাঠানো হয়েছে');
      setText('lpResetDoneMsg', res.masked + ' ঠিকানায় ইমেইল গেছে। ইনবক্সে না পেলে স্প্যাম ফোল্ডারও দেখুন।');
      paintResendCountdown();
      if (res.parsedKind === 'id' && res.memberId) el.id.value = res.memberId;
      detectInto(el.id, el.idIcon, el.idHint);
    }

    async function onResetSend() {
      if (resetBusy) return;
      el.resetAlert.hidden = true;
      clearFieldError(el.resetId, el.resetIdErr);
      const parsed = lp.parseIdentifier(el.resetId.value);
      if (parsed.kind === 'empty' || parsed.kind === 'invalid') {
        setFieldError(el.resetId, el.resetIdErr, parsed.kind === 'empty'
          ? 'সদস্য আইডি, ইমেইল বা মোবাইল নম্বর দিন।'
          : 'এটি সঠিক আইডি, ইমেইল বা মোবাইল নম্বর মনে হচ্ছে না।');
        el.resetId.focus();
        return;
      }
      if (global.navigator && navigator.onLine === false) {
        resetAlert('warn', 'আপনি অফলাইনে আছেন।', 'ইন্টারনেট সংযোগ ফিরলে আবার চেষ্টা করুন।');
        return;
      }
      resetBusy = true;
      el.resetSend.classList.add('is-busy');
      el.resetSend.disabled = true;
      const res = await lp.reset.start(el.resetId.value);
      resetBusy = false;
      if (!ctrl || ctrl.api !== api) return;
      el.resetSend.classList.remove('is-busy');
      el.resetSend.disabled = false;

      if (res.ok) { showResetDone(res); return; }
      if (res.code === 'EMAIL_FAILED') {
        /* পাসওয়ার্ড তৈরি হয়েছে, ইমেইল যায়নি — "আবার পাঠান" দেখাই */
        el.resetForm.hidden = true;
        el.resetDone.hidden = false;
        setDoneState(false);
        setText('lpResetDoneTitle', 'ইমেইল যায়নি');
        setText('lpResetDoneMsg', 'নতুন পাসওয়ার্ড তৈরি হয়েছে, কিন্তু ইমেইল পাঠানো যায়নি।');
        const m = resetMessage(res);
        fillAlert(el.resetDoneAlert, 'error', m[0], m[1]);
        paintResendCountdown();
        return;
      }
      const m = resetMessage(res);
      resetAlert(res.code === 'COOLDOWN' || res.code === 'OFFLINE' ? 'warn' : 'error', m[0], m[1]);
    }

    async function onResetResend() {
      if (resetBusy) return;
      resetBusy = true;
      el.resetResend.disabled = true;
      const res = await lp.reset.resend();
      resetBusy = false;
      if (!ctrl || ctrl.api !== api) return;
      if (res.ok) {
        el.resetDoneAlert.hidden = true;
        setDoneState(true);
        setText('lpResetDoneTitle', 'পাসওয়ার্ড পাঠানো হয়েছে');
        setText('lpResetDoneMsg', res.masked + ' ঠিকানায় আবার ইমেইল পাঠানো হয়েছে। স্প্যাম ফোল্ডারও দেখুন।');
        lp.toast('ইমেইল আবার পাঠানো হয়েছে।', 'success');
      } else {
        const m = resetMessage(res);
        fillAlert(el.resetDoneAlert, 'error', m[0], m[1]);
      }
      paintResendCountdown();
    }

    function closeReset() {
      clearInterval(resetCountdown);
      lp.reset.clear();
    }

    /* ── QR ডায়ালগ / কার্ড ছবি ── */
    function openQr() {
      if (!session) return;
      const m = session.member;
      const url = verifyUrl(m.member_id);
      try {
        byId('lpQrBig').innerHTML = lp.qr.toSvg(url, { margin: 2, label: 'সদস্য যাচাইয়ের QR কোড' });
      } catch (e) {
        byId('lpQrBig').textContent = 'QR তৈরি করা যায়নি — লিংক ব্যবহার করুন।';
      }
      setText('lpQrName', m.full_name);
      setText('lpQrId', m.member_id);
      el.qrOpenLink.href = url;
      lp.openDialog(el.qrDlg);
    }

    async function buildCardBlob() {
      const m = session.member;
      const url = verifyUrl(m.member_id);
      const W = 720;
      const H = 980;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      try {
        if (document.fonts && document.fonts.load) {
          await Promise.all([
            document.fonts.load('700 40px "Baloo Da 2"'),
            document.fonts.load('500 30px "Hind Siliguri"'),
            document.fonts.load('600 40px "Work Sans"')
          ]);
        }
      } catch (e) { /* ফন্ট না পেলে সিস্টেম ফন্টে আঁকবে */ }

      const head = '"Baloo Da 2","Hind Siliguri",sans-serif';
      const body = '"Hind Siliguri",sans-serif';
      const num = '"Work Sans","Hind Siliguri",sans-serif';

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#0E3B36';
      ctx.fillRect(0, 0, W, 170);
      ctx.fillStyle = '#E3A73E';
      ctx.fillRect(0, 170, W, 8);

      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 44px ' + head;
      ctx.fillText(orgName(), W / 2, 84, W - 60);
      ctx.fillStyle = '#E3A73E';
      ctx.font = '500 28px ' + body;
      ctx.fillText('সদস্য কার্ড', W / 2, 134);

      const q = 470;
      lp.qr.drawTo(ctx, url, (W - q) / 2, 226, q, { margin: 2, light: '#FFFFFF', dark: '#0E3B36' });

      ctx.fillStyle = '#1A2420';
      ctx.font = '700 46px ' + head;
      ctx.fillText(m.full_name, W / 2, 780, W - 80);
      ctx.fillStyle = '#0E3B36';
      ctx.font = '600 40px ' + num;
      ctx.fillText(m.member_id, W / 2, 840);
      ctx.fillStyle = '#5E6B64';
      ctx.font = '500 28px ' + body;
      ctx.fillText((m.membership_type || 'সদস্য') + ' — স্ক্যান করে সদস্যপদ যাচাই করুন', W / 2, 900, W - 60);

      return new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png-failed'))), 'image/png');
      });
    }

    async function onQrSave() {
      try {
        const blob = await buildCardBlob();
        lp.download(session.member.member_id.replace(/[^A-Za-z0-9-]/g, '') + '-card.png', blob);
        lp.toast('কার্ডের ছবি সেভ হয়েছে।', 'success');
      } catch (e) {
        lp.toast('ছবি তৈরি করা যায়নি।', 'error');
      }
    }

    async function onQrShare() {
      if (!session || !navigator.share) return;
      const m = session.member;
      const url = verifyUrl(m.member_id);
      const data = { title: 'সদস্য যাচাই — ' + m.full_name, text: 'আমার সদস্যপদ যাচাই করুন:', url };
      try {
        try {
          const blob = await buildCardBlob();
          const file = new File([blob], 'member-card.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ title: data.title, text: data.text + ' ' + url, files: [file] });
            return;
          }
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
        await navigator.share(data);
      } catch (err) {
        if (err && err.name !== 'AbortError') lp.toast('শেয়ার করা যায়নি।', 'error');
      }
    }

    /* ── ব্যাকগ্রাউন্ড যাচাই (সেশন এখনো ঠিক আছে তো?) ── */
    async function revalidate() {
      if (!session) return;
      const s = session;
      const res = await lp.revalidate(s);
      if (!session || session !== s) return;
      lastValidated = Date.now();
      if (res.status === 'ok') {
        lp.session.updateMember(session, res.member);
        session.member = res.member;
        fillDashboard(res.member);
      } else if (res.status !== 'offline') {
        logout(res.status); /* gone | denied | changed */
      }
    }

    /* ── ইভেন্ট ওয়্যারিং ── */
    function wire() {
      /* লোগো ছবি লোড না হলে বিকল্প, তারপর মনোগ্রাম */
      const mark = byId('lpMark');
      const logoImg = $('img', mark);
      if (logoImg) {
        logoImg.addEventListener('error', () => {
          if (logoImg.getAttribute('src') !== '/icons/icon-512.png') { logoImg.src = '/icons/icon-512.png'; return; }
          mark.innerHTML = '<span>' + esc(Array.from(orgName())[0]) + '</span>';
        });
      }

      /* আইডি ফিল্ড */
      on(el.id, 'input', () => {
        clearFieldError(el.id, el.idErr);
        detectInto(el.id, el.idIcon, el.idHint);
      });
      on(el.id, 'focus', () => lp.warmUp());
      on(el.pw, 'input', () => clearFieldError(el.pw, el.pwErr));

      /* পাসওয়ার্ড দেখান/লুকান */
      on(el.pwToggle, 'click', () => {
        const show = el.pw.type === 'password';
        el.pw.type = show ? 'text' : 'password';
        el.pwToggle.setAttribute('aria-pressed', show ? 'true' : 'false');
        el.pwToggle.setAttribute('aria-label', show ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান');
        el.pwToggle.innerHTML = icon(show ? 'eye-off' : 'eye');
        el.pw.focus();
      });

      /* Caps Lock সতর্কতা */
      const caps = (e) => {
        if (typeof e.getModifierState !== 'function') return;
        el.caps.hidden = !e.getModifierState('CapsLock');
      };
      on(el.pw, 'keydown', caps);
      on(el.pw, 'keyup', caps);
      on(el.pw, 'blur', () => { el.caps.hidden = true; });

      on(el.form, 'submit', onSubmit);
      on(el.forgot, 'click', openReset);

      /* অফলাইন ব্যানার */
      const net = () => { el.offline.hidden = !(global.navigator && navigator.onLine === false); };
      on(global, 'online', () => { net(); lp.warmUp(); });
      on(global, 'offline', net);
      net();

      /* রিসেট ডায়ালগ */
      on(el.resetId, 'input', () => {
        clearFieldError(el.resetId, el.resetIdErr);
        detectInto(el.resetId, byId('lpResetIdIcon'), null);
      });
      on(el.resetId, 'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onResetSend(); } });
      on(el.resetSend, 'click', onResetSend);
      on(el.resetResend, 'click', onResetResend);
      on(el.resetBack, 'click', () => { focusPwOnClose = true; lp.closeDialog(el.resetDlg); });
      on(el.resetDlg, 'close', () => {
        closeReset();
        if (focusPwOnClose) { focusPwOnClose = false; if (!el.auth.hidden) el.pw.focus(); return; }
        const back = el.resetDlg._lpReturnFocus;
        if (back && document.contains(back) && !el.auth.hidden) back.focus();
      });

      /* সব ডায়ালগ: বাইরে ক্লিক বা [data-close] বাটনে বন্ধ */
      $$('dialog.lp-dialog', root).forEach((dlg) => {
        on(dlg, 'click', (e) => {
          if (e.target === dlg && dlg !== el.idleDlg) {
            /* ডায়ালগের নিজের প্যাডিংয়ে ক্লিক করলে বন্ধ নয় — শুধু বাইরের ব্যাকড্রপে */
            const r = dlg.getBoundingClientRect();
            const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            if (!inside) lp.closeDialog(dlg);
          } else if (e.target.closest && e.target.closest('[data-close]')) {
            lp.closeDialog(dlg);
          }
        });
        if (dlg !== el.resetDlg) {
          on(dlg, 'close', () => {
            const back = dlg._lpReturnFocus;
            if (back && document.contains(back)) back.focus();
          });
        }
      });
      /* নিষ্ক্রিয়তার সতর্কতায় Esc = "চালিয়ে যান" */
      on(el.idleDlg, 'cancel', (e) => { e.preventDefault(); onIdleStay(); });

      /* ট্যাব */
      on(el.tabs, 'click', (e) => {
        const t = e.target.closest('.lp-tab');
        if (t) selectTab(t.dataset.tab);
      });
      on(el.tabs, 'keydown', (e) => {
        const tabs = $$('.lp-tab', el.tabs);
        const i = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
        let n = -1;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') n = 0;
        else if (e.key === 'End') n = tabs.length - 1;
        if (n >= 0) { e.preventDefault(); selectTab(tabs[n].dataset.tab, true); }
      });

      /* কপি বাটন */
      on(root, 'click', async (e) => {
        const btn = e.target.closest('[data-copy]');
        if (!btn || !session) return;
        const m = session.member;
        const value = { id: m.member_id, mobile: m.mobile_number, email: m.email }[btn.dataset.copy];
        if (!value) return;
        const ok = await lp.copy(value);
        lp.toast(ok ? 'কপি হয়েছে।' : 'কপি করা যায়নি।', ok ? 'success' : 'error');
      });

      on(el.logout, 'click', () => logout());
      on(el.qrOpenBtn, 'click', openQr);
      on(el.qrCopy, 'click', async () => {
        if (!session) return;
        const ok = await lp.copy(verifyUrl(session.member.member_id));
        lp.toast(ok ? 'ভেরিফাই লিংক কপি হয়েছে।' : 'কপি করা যায়নি।', ok ? 'success' : 'error');
      });
      on(el.qrShare, 'click', onQrShare);
      on(el.qrSave, 'click', onQrSave);

      /* নিষ্ক্রিয়তা */
      on(el.idleStay, 'click', onIdleStay);
      on(el.idleOut, 'click', () => logout());
      ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach((t) => on(global, t, lp.throttle(markActive, 1000), { passive: true }));

      /* ট্যাবে ফিরলে: মেয়াদ ও সদস্যপদ যাচাই */
      on(document, 'visibilitychange', () => {
        if (document.visibilityState !== 'visible' || !session) return;
        if (!lp.session.load()) { logout(lp.session.endReason || 'remote'); return; }
        idleTick();
        if (Date.now() - lastValidated > 5 * 60000) revalidate();
      });

      /* অন্য ট্যাবে লগআউট/লগইন (localStorage সেশনের ক্ষেত্রে) */
      cleanups.push(lp.session.onRemoteChange(() => {
        const s = lp.session.load();
        if (!s && session) logout('remote');
        else if (s && !session) { session = s; showDash(); }
      }));

      /* অন্য রুটে গেলে সব বন্ধ */
      on(global, 'hashchange', () => { if (global.location.hash !== '#/login') destroy(); });
    }

    /* ── mount / destroy ── */
    function collect() {
      const q = byId;
      el = {
        root: q('lpRoot'), hero: q('lpHero'), auth: q('lpAuth'), dash: q('lpDash'), back: q('lpBack'),
        form: q('lpForm'), id: q('lpId'), idIcon: q('lpIdIcon'), idHint: q('lpIdHint'), idErr: q('lpIdErr'),
        pw: q('lpPw'), pwErr: q('lpPwErr'), pwToggle: q('lpPwToggle'), caps: q('lpCaps'),
        remember: q('lpRemember'), submit: q('lpSubmit'), submitText: q('lpSubmitText'),
        alert: q('lpAlert'), offline: q('lpOffline'), forgot: q('lpForgot'),
        tabs: q('lpTabs'), logout: q('lpLogout'),
        resetDlg: q('lpResetDialog'), resetForm: q('lpResetForm'), resetDone: q('lpResetDone'),
        resetId: q('lpResetId'), resetIdErr: q('lpResetIdErr'), resetAlert: q('lpResetAlert'), resetDoneAlert: q('lpResetDoneAlert'),
        resetSend: q('lpResetSend'), resetResend: q('lpResetResend'), resetBack: q('lpResetBack'),
        qrDlg: q('lpQrDialog'), qrOpenBtn: q('lpQrOpenBtn'), qrOpenLink: q('lpQrOpenLink'),
        qrCopy: q('lpQrCopy'), qrShare: q('lpQrShare'), qrSave: q('lpQrSave'),
        idleDlg: q('lpIdleDialog'), idleStay: q('lpIdleStay'), idleOut: q('lpIdleOut')
      };
    }

    function mount() {
      root.innerHTML = pageTemplate();
      collect();
      wire();

      /* সেশন ফিরিয়ে আনা */
      /* Web Share না থাকলে (বেশিরভাগ ডেস্কটপ) বাটনটাই সরিয়ে ফেলা — গ্রিড গোছানো থাকে */
      if (!(global.navigator && navigator.share) && el.qrShare) { el.qrShare.remove(); el.qrShare = null; }

      session = lp.session.load();
      const endReason = lp.session.endReason;

      if (session) {
        showDash();
        revalidate();
      } else {
        showAuth();
        if (endReason === 'idle') showAlert('info', 'নিষ্ক্রিয় থাকায় লগআউট হয়েছে।', 'নিরাপত্তার জন্য আবার লগইন করুন।');
        else if (endReason === 'expired') showAlert('info', 'সেশনের মেয়াদ শেষ হয়েছে।', 'আবার লগইন করুন।');
        const last = lp.ls.get(cfg().lastIdKey);
        if (last) { el.id.value = last; el.remember.checked = true; detectInto(el.id, el.idIcon, el.idHint); }
        const lock = lp.guard.check();
        if (lock.locked) startLock(lock.remaining);
        lp.warmUp();
      }
    }

    function destroy() {
      cleanups.splice(0).forEach((fn) => { try { fn(); } catch (e) { /* উপেক্ষা */ } });
      timers.forEach(clearTimeout);
      timers.clear();
      clearInterval(lockTimer);
      lockTimer = null;
      clearInterval(resetCountdown);
      stopIdle();
      teardownLive();
      lp.reset.clear();
      document.title = prevTitle;
      if (ctrl && ctrl.api === api) ctrl = null;
    }

    const api = { mount, destroy };
    return { api, mount, destroy };
  }

  /* ────────────────────────────────────────────────
     পাবলিক এন্ট্রি — router.js এটাকেই ডাকে
     ────────────────────────────────────────────── */
  RJF.renderLoginPage = function () {
    const root = byId('login-root');
    if (!root) return;
    if (ctrl) ctrl.destroy();
    ctrl = createController(root);
    ctrl.mount();
  };

  /* ────────────────────────────────────────────────
     আগের কোডের সাথে সামঞ্জস্য (অন্য ফাইল এই নামগুলো ডাকতে পারে)
     ────────────────────────────────────────────── */
  /* নোটিশ/ইভেন্ট মডিউল নিজেদের stop ফাংশন lp.teardowns-এ জমা রাখে — লগআউট/পেজ ছাড়ার সময় সব একসাথে বন্ধ */
  RJF._lpTeardownDashboard = () => (lp.teardowns || []).forEach((fn) => { try { fn(); } catch (e) { /* উপেক্ষা */ } });

  RJF._lpEsc = esc;
  RJF._lpGetFirebase = () => lp.getFirebase();
  RJF._lpGetSession = () => lp.session.load();
  RJF._lpClearSession = () => lp.session.clear();
  RJF._lpToast = (msg, type) => lp.toast(msg, type);
  RJF._lpFmtTimestamp = (ts) => {
    const d = lp.toDate(ts);
    return d ? lp.formatDateTime(d) : '—';
  };
})(window);
