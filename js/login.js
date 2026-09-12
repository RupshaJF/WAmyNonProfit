/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — Member Login System
   - Firestore থেকে member_id ও email যাচাই করে লগইন
   - নতুন সদস্য: আবেদন ফর্মে redirect
   - পাসওয়ার্ড ভুলে গেলে: member_id দিয়ে EmailJS-এ পাঠানো হয়
   - লগইনের পর: প্রোফাইল / নোটিশ / ইভেন্ট — ট্যাব-ভিত্তিক স্মার্ট ড্যাশবোর্ড
   ========================================================================== */
window.RJF = window.RJF || {};

/* ────────────────────────────────────────────────
   Config — Firebase ও EmailJS এর key এখানে
   ────────────────────────────────────────────── */
RJF.loginConfig = {
  firebaseConfig: {
    apiKey: "AIzaSyC-ke7FIUPX5Ksow8vJQ4axmGAIdiKd49Q",
    authDomain: "member-selection.firebaseapp.com",
    projectId: "member-selection",
    storageBucket: "member-selection.firebasestorage.app",
    messagingSenderId: "434008909239",
    appId: "1:434008909239:web:a790d1e0603ebfdbd27432"
  },
  emailjsPublicKey: "dtl9HyOi2wvJEUiRB",
  emailjsServiceId: "service_272nuuq",
  /* আলাদা template তৈরি করুন EmailJS-এ — variables: {{to_email}}, {{member_id}}, {{password}}, {{to_name}} */
  emailjsPasswordTemplateId: "template_hlm44yd",

  /* Session storage key */
  sessionKey: "rjf_member_session",

  /* ডিফল্ট প্রোফাইল ছবি (photo_url না থাকলে) */
  defaultAvatar: "/icons/avatar.webp",

  /* ভেরিফাই পেজের path — QR কোড ও শেয়ার লিংকের জন্য */
  verifyPath: "/verify.html"
};

/* ────────────────────────────────────────────────
   Utilities
   ────────────────────────────────────────────── */
RJF._lpFirebasePromise = null;
RJF._lpGetFirebase = function () {
  if (RJF._lpFirebasePromise) return RJF._lpFirebasePromise;
  RJF._lpFirebasePromise = Promise.all([
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js')
  ]).then(function (mods) {
    var appMod = mods[0];
    var fsMod = mods[1];
    /* multiple initializeApp এড়ানো */
    var app;
    try {
      app = appMod.getApp('rjf-login');
    } catch (e) {
      app = appMod.initializeApp(RJF.loginConfig.firebaseConfig, 'rjf-login');
    }
    var db = fsMod.getFirestore(app);
    return { fs: fsMod, db: db };
  });
  return RJF._lpFirebasePromise;
};

RJF._lpWaitEmailjs = function () {
  return new Promise(function (resolve) {
    (function check() {
      if (typeof window.emailjs !== 'undefined') { resolve(window.emailjs); return; }
      setTimeout(check, 150);
    })();
  });
};

/* ─── বাইরের স্ক্রিপ্ট একবারই লোড করার হেল্পার (QRCode লাইব্রেরির জন্য) ─── */
RJF._lpLoadScriptOnce = function (src, key) {
  return new Promise(function (resolve, reject) {
    if (window['_lpLoaded_' + key]) { resolve(); return; }
    var existing = document.querySelector('script[data-lp-lib="' + key + '"]');
    if (existing) {
      existing.addEventListener('load', function () { resolve(); });
      return;
    }
    var s = document.createElement('script');
    s.src = src;
    s.setAttribute('data-lp-lib', key);
    s.onload = function () { window['_lpLoaded_' + key] = true; resolve(); };
    s.onerror = function () { reject(new Error('লোড করা যায়নি: ' + src)); };
    document.head.appendChild(s);
  });
};

/* ─── HTML escape — নোটিশ/ইভেন্ট মডিউলগুলোও এটা ব্যবহার করে ─── */
RJF._lpEsc = function (str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};

/* ─── Firestore Timestamp/তারিখ বাংলায় ফরম্যাট — নোটিশ/ইভেন্ট মডিউলও শেয়ার করে ─── */
RJF._lpFmtTimestamp = function (ts) {
  if (!ts) return '—';
  var d = ts.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
};

/* ─── Password generator ─── */
RJF._lpGeneratePassword = function () {
  var upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  var lower = 'abcdefghjkmnpqrstuvwxyz';
  var digits = '23456789';
  var special = '@#$!';
  var all = upper + lower + digits + special;
  var pw = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)]
  ];
  for (var i = 0; i < 6; i++) {
    pw.push(all[Math.floor(Math.random() * all.length)]);
  }
  /* shuffle */
  return pw.sort(function () { return Math.random() - 0.5; }).join('');
};

/* ────────────────────────────────────────────────
   Session helpers
   ────────────────────────────────────────────── */
RJF._lpSaveSession = function (memberData) {
  try {
    sessionStorage.setItem(RJF.loginConfig.sessionKey, JSON.stringify(memberData));
  } catch (e) {}
};
RJF._lpGetSession = function () {
  try {
    var raw = sessionStorage.getItem(RJF.loginConfig.sessionKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
};
RJF._lpClearSession = function () {
  try { sessionStorage.removeItem(RJF.loginConfig.sessionKey); } catch (e) {}
};

/* ────────────────────────────────────────────────
   Toast
   ────────────────────────────────────────────── */
RJF._lpToast = function (msg, type) {
  var toast = document.getElementById('lpToast');
  if (!toast) return;
  toast.className = 'lp-toast';
  toast.innerHTML = '<i class="fa-solid ' + (type === 'error' ? 'fa-circle-xmark' : type === 'success' ? 'fa-circle-check' : 'fa-circle-info') + '"></i><span>' + msg + '</span>';
  if (type) toast.classList.add(type);
  toast.classList.add('show');
  clearTimeout(RJF._lpToastTimer);
  RJF._lpToastTimer = setTimeout(function () { toast.classList.remove('show'); }, 4500);
};

/* ────────────────────────────────────────────────
   Render
   ────────────────────────────────────────────── */
RJF.renderLoginPage = function () {
  var root = document.getElementById('login-root');
  if (!root) return;

  root.innerHTML =
    '<div class="login-page">' +

      /* decorative orbs */
      '<div class="login-bg-orb login-bg-orb-1"></div>' +
      '<div class="login-bg-orb login-bg-orb-2"></div>' +

      '<div class="login-wrapper">' +

        /* ─── Brand header ─── */
        '<div class="login-header">' +
          '<div class="login-logo-ring">' +
            '<img class="login-logo-img" src="' + ((window.RJF && RJF.data && RJF.data.brand && RJF.data.brand.logo) ? RJF.data.brand.logo : '/icons/benar_logo.png') + '" alt="রূপসা জনকল্যাণ ফাউন্ডেশন">' +
          '</div>' +
          '<div class="login-header-text" id="lpHeaderText">' +
            '<h1>রূপসা জনকল্যাণ ফাউন্ডেশন</h1>' +
            '<p class="login-subtitle">সদস্য পোর্টাল</p>' +
            '<div class="login-badge"><span class="dot"></span>সদস্যদের জন্য</div>' +
          '</div>' +
        '</div>' +

        /* ─── Login form card ─── */
        '<div class="login-card" id="lpFormCard">' +
          '<h2 class="login-card-title">সদস্য লগইন</h2>' +
          '<p class="login-card-desc">আপনার সদস্য আইডি ও পাসওয়ার্ড দিয়ে প্রবেশ করুন</p>' +

          '<form id="lpForm" novalidate>' +

            /* Member ID */
            '<div class="lp-field">' +
              '<label class="lp-label" for="lpMemberId">সদস্য আইডি <span class="req">*</span></label>' +
              '<div class="lp-input-wrap">' +
                '<input class="lp-input" type="text" id="lpMemberId" name="member_id" placeholder="RJF-2025-XXXX" autocomplete="username" spellcheck="false" required>' +
                '<i class="fa-solid fa-id-card lp-input-icon"></i>' +
              '</div>' +
              '<div class="lp-error-hint" id="lpIdError"></div>' +
            '</div>' +

            /* Password */
            '<div class="lp-field">' +
              '<label class="lp-label" for="lpPassword">পাসওয়ার্ড <span class="req">*</span></label>' +
              '<div class="lp-input-wrap">' +
                '<input class="lp-input" type="password" id="lpPassword" name="password" placeholder="••••••••" autocomplete="current-password" required>' +
                '<i class="fa-solid fa-lock lp-input-icon"></i>' +
                '<button type="button" class="lp-pw-toggle" id="lpPwToggle" aria-label="পাসওয়ার্ড দেখুন">' +
                  '<i class="fa-solid fa-eye" id="lpPwEyeIcon"></i>' +
                '</button>' +
              '</div>' +
              '<div class="lp-error-hint" id="lpPwError"></div>' +
            '</div>' +

            /* Submit */
            '<button type="submit" class="lp-submit" id="lpSubmit">' +
              '<span id="lpSubmitText"><i class="fa-solid fa-right-to-bracket"></i> লগইন করুন</span>' +
              '<div class="lp-spinner" id="lpSpinner"></div>' +
            '</button>' +

          '</form>' +

          /* Password request link */
          '<div class="lp-pw-request-wrap">' +
            '<button type="button" class="lp-pw-request-btn" id="lpPwRequestBtn">পাসওয়ার্ড পাননি বা ভুলে গেছেন?</button>' +
          '</div>' +

          /* New user area */
          '<div class="lp-new-user">' +
            '<p class="lp-new-user-text">এখনও আমাদের সদস্য হননি?</p>' +
            '<a href="#/apply" class="lp-new-user-btn" id="lpApplyLink">' +
              '<i class="fa-solid fa-user-plus"></i>' +
              'সদস্য হওয়ার আবেদন করুন' +
            '</a>' +
          '</div>' +

        '</div>' +

        /* ─── Dashboard (shown after login) ─── */
        '<div class="lp-dashboard" id="lpDashboard">' +

          '<div class="lp-dash-header">' +
            '<button type="button" class="lp-dash-logout" id="lpLogout" title="লগআউট">' +
              '<i class="fa-solid fa-right-from-bracket"></i><span class="lp-dash-logout-text">লগআউট</span>' +
            '</button>' +
            '<div class="lp-dash-top">' +
              '<div class="lp-dash-avatar-wrap">' +
                '<img class="lp-dash-avatar" id="lpDashAvatar" src="' + RJF.loginConfig.defaultAvatar + '" alt="প্রোফাইল ছবি" onerror="this.src=\'' + RJF.loginConfig.defaultAvatar + '\'">' +
              '</div>' +
              '<div class="lp-dash-top-text">' +
                '<div class="lp-dash-greeting">স্বাগতম</div>' +
                '<div class="lp-dash-name" id="lpDashName">—</div>' +
                '<div class="lp-dash-id" id="lpDashId">—</div>' +
              '</div>' +
            '</div>' +
            '<div class="lp-dash-badges">' +
              '<span class="lp-dash-badge" id="lpDashType"><i class="fa-solid fa-star"></i> —</span>' +
              '<span class="lp-dash-badge" id="lpDashStatus">—</span>' +
            '</div>' +
          '</div>' +

          /* Tabs */
          '<div class="lp-dash-tabs" id="lpDashTabs">' +
            '<button type="button" class="lp-dash-tab active" data-tab="profile"><i class="fa-solid fa-id-badge"></i> প্রোফাইল</button>' +
            '<button type="button" class="lp-dash-tab" data-tab="notices"><i class="fa-solid fa-bullhorn"></i> নোটিশ<span class="lp-tab-dot" id="lpNoticeDot" hidden></span></button>' +
            '<button type="button" class="lp-dash-tab" data-tab="events"><i class="fa-solid fa-calendar-days"></i> ইভেন্ট</button>' +
          '</div>' +

          /* Profile panel */
          '<div class="lp-dash-panel visible" id="lpPanelProfile" data-panel="profile">' +
            '<div class="lp-info-grid">' +
              '<div class="lp-info-card">' +
                '<div class="lp-info-card-label">পেশা</div>' +
                '<div class="lp-info-card-value" id="lpDashOccupation">—</div>' +
              '</div>' +
              '<div class="lp-info-card">' +
                '<div class="lp-info-card-label">রক্তের গ্রুপ</div>' +
                '<div class="lp-info-card-value lp-blood" id="lpDashBlood">—</div>' +
              '</div>' +
              '<div class="lp-info-card">' +
                '<div class="lp-info-card-label">লিঙ্গ</div>' +
                '<div class="lp-info-card-value" id="lpDashGender">—</div>' +
              '</div>' +
              '<div class="lp-info-card">' +
                '<div class="lp-info-card-label">মোবাইল নম্বর</div>' +
                '<div class="lp-info-card-value" id="lpDashMobile">—</div>' +
              '</div>' +
            '</div>' +
            '<div class="lp-info-full">' +
              '<div class="lp-info-card-label">ইমেইল</div>' +
              '<div class="lp-info-card-value" id="lpDashEmail">—</div>' +
            '</div>' +
            '<div class="lp-info-full">' +
              '<div class="lp-info-card-label">স্থায়ী ঠিকানা</div>' +
              '<div class="lp-info-card-value" id="lpDashAddress">—</div>' +
            '</div>' +

            '<button type="button" class="lp-qr-open-btn" id="lpQrOpenBtn">' +
              '<span class="lp-qr-open-icon"><i class="fa-solid fa-qrcode"></i></span>' +
              '<span class="lp-qr-open-text">' +
                '<strong>নিজের ভেরিফাই কার্ড ও QR কোড দেখুন</strong>' +
                '<small>যে কেউ স্ক্যান করে আপনার সদস্যপদ যাচাই করতে পারবে</small>' +
              '</span>' +
              '<i class="fa-solid fa-chevron-right"></i>' +
            '</button>' +
          '</div>' +

          /* Notices panel */
          '<div class="lp-dash-panel" id="lpPanelNotices" data-panel="notices" hidden>' +
            '<div class="lp-list-wrap" id="lpNoticeList">' +
              '<div class="lp-list-empty"><i class="fa-solid fa-spinner fa-spin"></i> লোড হচ্ছে...</div>' +
            '</div>' +
          '</div>' +

          /* Events panel */
          '<div class="lp-dash-panel" id="lpPanelEvents" data-panel="events" hidden>' +
            '<div class="lp-list-wrap" id="lpEventList">' +
              '<div class="lp-list-empty"><i class="fa-solid fa-spinner fa-spin"></i> লোড হচ্ছে...</div>' +
            '</div>' +
          '</div>' +

        '</div>' +

        /* Toast */
        '<div class="lp-toast" id="lpToast"></div>' +

        /* Password request modal */
        '<div class="lp-modal-overlay" id="lpModalOverlay">' +
          '<div class="lp-modal">' +
            '<button type="button" class="lp-modal-close" id="lpModalClose"><i class="fa-solid fa-xmark"></i> বন্ধ করুন</button>' +
            '<div class="lp-modal-icon"><i class="fa-solid fa-envelope-open-text"></i></div>' +
            '<h3>পাসওয়ার্ড পাঠানো হবে</h3>' +
            '<p class="lp-modal-desc">' +
              'আপনার সদস্য আইডি লিখুন। সিস্টেম আপনার নিবন্ধিত ইমেইলে' +
              ' নতুন পাসওয়ার্ড পাঠিয়ে দেবে।' +
            '</p>' +
            '<div class="lp-field">' +
              '<label class="lp-label" for="lpModalId">সদস্য আইডি <span class="req">*</span></label>' +
              '<div class="lp-input-wrap">' +
                '<input class="lp-input" type="text" id="lpModalId" placeholder="RJF-2025-XXXX" spellcheck="false">' +
                '<i class="fa-solid fa-id-card lp-input-icon"></i>' +
              '</div>' +
              '<div class="lp-error-hint" id="lpModalIdError"></div>' +
            '</div>' +
            '<button type="button" class="lp-modal-send" id="lpModalSend">' +
              '<span id="lpModalSendText"><i class="fa-solid fa-paper-plane"></i> পাসওয়ার্ড পাঠান</span>' +
              '<div class="lp-spinner" id="lpModalSpinner"></div>' +
            '</button>' +
          '</div>' +
        '</div>' +

        /* QR verify modal */
        '<div class="lp-qr-modal-overlay" id="lpQrModalOverlay">' +
          '<div class="lp-qr-modal">' +
            '<button type="button" class="lp-modal-close" id="lpQrModalClose"><i class="fa-solid fa-xmark"></i> বন্ধ করুন</button>' +
            '<div class="lp-qr-modal-photo-wrap"><img id="lpQrModalPhoto" src="' + RJF.loginConfig.defaultAvatar + '" alt="" onerror="this.src=\'' + RJF.loginConfig.defaultAvatar + '\'"></div>' +
            '<h3 id="lpQrModalName">—</h3>' +
            '<p class="lp-qr-modal-id" id="lpQrModalId">—</p>' +
            '<div class="lp-qr-code-box" id="lpQrCodeBox"></div>' +
            '<p class="lp-qr-modal-hint">এই QR কোড স্ক্যান করলে বা নিচের লিংকে গেলে যে কেউ আপনার সদস্যপদ সরাসরি যাচাই করতে পারবে</p>' +
            '<div class="lp-qr-modal-actions">' +
              '<button type="button" class="lp-qr-action-btn" id="lpQrCopyBtn"><i class="fa-solid fa-link"></i> লিংক কপি করুন</button>' +
              '<a class="lp-qr-action-btn" id="lpQrOpenLink" href="#" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> পেজ খুলুন</a>' +
            '</div>' +
          '</div>' +
        '</div>' +

    '</div>';

  /* Load EmailJS */
  RJF._loadScriptOnce('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js', 'emailjs');

  RJF._wireLoginPage();
};

/* ────────────────────────────────────────────────
   Wire — form interactions
   ────────────────────────────────────────────── */
RJF._wireLoginPage = function () {

  var formCard   = document.getElementById('lpFormCard');
  var dashboard  = document.getElementById('lpDashboard');
  var form       = document.getElementById('lpForm');
  var idInput    = document.getElementById('lpMemberId');
  var pwInput    = document.getElementById('lpPassword');
  var idError    = document.getElementById('lpIdError');
  var pwError    = document.getElementById('lpPwError');
  var submitBtn  = document.getElementById('lpSubmit');
  var submitText = document.getElementById('lpSubmitText');
  var spinner    = document.getElementById('lpSpinner');
  var pwToggle   = document.getElementById('lpPwToggle');
  var eyeIcon    = document.getElementById('lpPwEyeIcon');
  var pwReqBtn   = document.getElementById('lpPwRequestBtn');
  var applyLink  = document.getElementById('lpApplyLink');
  var logoutBtn  = document.getElementById('lpLogout');

  var modal      = document.getElementById('lpModalOverlay');
  var modalClose = document.getElementById('lpModalClose');
  var modalIdIn  = document.getElementById('lpModalId');
  var modalIdErr = document.getElementById('lpModalIdError');
  var modalSend  = document.getElementById('lpModalSend');
  var modalSendTxt = document.getElementById('lpModalSendText');
  var modalSpinner = document.getElementById('lpModalSpinner');

  /* ─── Check active session ─── */
  var session = RJF._lpGetSession();
  if (session) {
    RJF._lpShowDashboard(session, formCard, dashboard);
  }

  /* ─── Password visibility toggle ─── */
  pwToggle.addEventListener('click', function () {
    if (pwInput.type === 'password') {
      pwInput.type = 'text';
      eyeIcon.className = 'fa-solid fa-eye-slash';
    } else {
      pwInput.type = 'password';
      eyeIcon.className = 'fa-solid fa-eye';
    }
  });

  /* ─── Inline validation clear ─── */
  idInput.addEventListener('input', function () {
    idInput.classList.remove('invalid');
    idError.textContent = '';
  });
  pwInput.addEventListener('input', function () {
    pwInput.classList.remove('invalid');
    pwError.textContent = '';
  });

  /* ─── Apply link → redirect to registration ─── */
  applyLink.addEventListener('click', function (e) {
    e.preventDefault();
    window.location.hash = '#/apply';
    /* hide login-root if on same page */
    var lr = document.getElementById('login-root');
    if (lr) lr.hidden = true;
    if (typeof RJF.route === 'function') RJF.route();
  });

  /* ─── Login form submit ─── */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var memberId = idInput.value.trim().toUpperCase();
    var password = pwInput.value.trim();
    var valid = true;

    idError.textContent = '';
    pwError.textContent = '';
    idInput.classList.remove('invalid');
    pwInput.classList.remove('invalid');

    if (!memberId) {
      idError.textContent = 'সদস্য আইডি দিতে হবে।';
      idInput.classList.add('invalid');
      valid = false;
    }
    if (!password) {
      pwError.textContent = 'পাসওয়ার্ড দিতে হবে।';
      pwInput.classList.add('invalid');
      valid = false;
    }
    if (!valid) return;

    /* loading */
    submitBtn.disabled = true;
    submitText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> যাচাই হচ্ছে...';
    spinner.classList.remove('show');

    RJF._lpGetFirebase().then(function (firebase) {
      var fs = firebase.fs;
      var db = firebase.db;

      /* member_id দিয়ে খোঁজ */
      var q = fs.query(
        fs.collection(db, 'members'),
        fs.where('member_id', '==', memberId)
      );

      return fs.getDocs(q).then(function (snapshot) {
        if (snapshot.empty) {
          idError.textContent = 'এই আইডিতে কোনো সদস্য পাওয়া যায়নি।';
          idInput.classList.add('invalid');
          RJF._lpResetSubmit(submitBtn, submitText, spinner);
          return;
        }

        var doc = snapshot.docs[0];
        var data = doc.data();

        /* পাসওয়ার্ড যাচাই — Firestore-এ stored_password ফিল্ডের বিপরীতে */
        if (!data.stored_password || data.stored_password !== password) {
          pwError.textContent = 'পাসওয়ার্ড সঠিক নয়।';
          pwInput.classList.add('invalid');
          pwInput.value = '';
          RJF._lpResetSubmit(submitBtn, submitText, spinner);
          return;
        }

        /* ✅ Login success — সম্পূর্ণ প্রোফাইল তথ্য সেশনে সংরক্ষণ */
        var sessionData = {
          member_id: data.member_id || memberId,
          full_name: data.full_name || 'সদস্য',
          email: data.email || '',
          mobile_number: data.mobile_number || '',
          membership_type: data.membership_type || '—',
          status: data.status || 'pending',
          photo_url: data.photo_url || '',
          occupation: data.occupation || '',
          blood_group: data.blood_group || '',
          gender: data.gender || '',
          permanent_address: data.permanent_address || ''
        };

        RJF._lpSaveSession(sessionData);
        RJF._lpToast('স্বাগতম, ' + sessionData.full_name + '!', 'success');
        RJF._lpResetSubmit(submitBtn, submitText, spinner);
        form.reset();
        RJF._lpShowDashboard(sessionData, formCard, dashboard);
      });

    }).catch(function (err) {
      console.error('Login error:', err);
      RJF._lpToast('সমস্যা হয়েছে! ইন্টারনেট সংযোগ পরীক্ষা করুন।', 'error');
      RJF._lpResetSubmit(submitBtn, submitText, spinner);
    });
  });

  /* ─── Logout ─── */
  logoutBtn.addEventListener('click', function () {
    RJF._lpClearSession();
    RJF._lpTeardownDashboard();
    dashboard.classList.remove('visible');
    formCard.style.display = '';
    var headerTextEl = document.getElementById('lpHeaderText');
    if (headerTextEl) headerTextEl.classList.remove('visible');
    RJF._lpToast('সফলভাবে লগআউট হয়েছেন।');
  });

  /* ─── Password request modal ─── */
  pwReqBtn.addEventListener('click', function () {
    /* pre-fill if already typed an ID */
    var typed = idInput.value.trim().toUpperCase();
    if (typed) modalIdIn.value = typed;
    modal.classList.add('open');
    setTimeout(function () { modalIdIn.focus(); }, 300);
  });
  modalClose.addEventListener('click', function () { modal.classList.remove('open'); });
  modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('open'); });

  modalSend.addEventListener('click', function () {
    var reqId = modalIdIn.value.trim().toUpperCase();
    modalIdErr.textContent = '';
    modalIdIn.classList.remove('invalid');

    if (!reqId) {
      modalIdErr.textContent = 'সদস্য আইডি দিতে হবে।';
      modalIdIn.classList.add('invalid');
      return;
    }

    modalSend.disabled = true;
    modalSendTxt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    modalSpinner.classList.remove('show');

    RJF._lpGetFirebase().then(function (firebase) {
      var fs = firebase.fs;
      var db = firebase.db;

      var q = fs.query(
        fs.collection(db, 'members'),
        fs.where('member_id', '==', reqId)
      );

      return fs.getDocs(q).then(function (snapshot) {
        if (snapshot.empty) {
          modalIdErr.textContent = 'এই আইডিতে কোনো সদস্য পাওয়া যায়নি।';
          modalIdIn.classList.add('invalid');
          RJF._lpResetModalSend(modalSend, modalSendTxt, modalSpinner);
          return;
        }

        var doc = snapshot.docs[0];
        var data = doc.data();
        var newPw = RJF._lpGeneratePassword();

        /* Firestore-এ নতুন password আপডেট */
        return fs.updateDoc(doc.ref, { stored_password: newPw })
          .then(function () {
            return RJF._lpWaitEmailjs().then(function (emailjs) {
              try { emailjs.init(RJF.loginConfig.emailjsPublicKey); } catch (err) {}
              return emailjs.send(
                RJF.loginConfig.emailjsServiceId,
                RJF.loginConfig.emailjsPasswordTemplateId,
                {
                  to_email: data.email,
                  to_name: data.full_name || 'সদস্য',
                  member_id: reqId,
                  password: newPw
                }
              );
            });
          })
          .then(function () {
            modal.classList.remove('open');
            modalIdIn.value = '';
            RJF._lpToast('পাসওয়ার্ড ইমেইলে পাঠানো হয়েছে!', 'success');
            RJF._lpResetModalSend(modalSend, modalSendTxt, modalSpinner);
          });

      });

    }).catch(function (err) {
      console.error('Password send error:', err);
      RJF._lpToast('ইমেইল পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
      RJF._lpResetModalSend(modalSend, modalSendTxt, modalSpinner);
    });
  });

  /* ─── ট্যাব সুইচিং (প্রোফাইল / নোটিশ / ইভেন্ট) ─── */
  var tabButtons = document.querySelectorAll('#lpDashTabs .lp-dash-tab');
  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.tab;

      tabButtons.forEach(function (b) { b.classList.toggle('active', b === btn); });
      document.querySelectorAll('.lp-dash-panel').forEach(function (panel) {
        var isTarget = panel.dataset.panel === target;
        panel.hidden = !isTarget;
        panel.classList.toggle('visible', isTarget);
      });

      if (target === 'notices') {
        RJF.initDashboardNotices();
        RJF._lpMarkNoticesSeen();
      } else if (target === 'events') {
        RJF.initDashboardEvents();
      }
    });
  });

  /* ─── QR ভেরিফাই মডাল ─── */
  var qrOpenBtn   = document.getElementById('lpQrOpenBtn');
  var qrOverlay   = document.getElementById('lpQrModalOverlay');
  var qrClose     = document.getElementById('lpQrModalClose');

  qrOpenBtn.addEventListener('click', function () {
    RJF._lpOpenQrModal();
  });
  qrClose.addEventListener('click', function () { qrOverlay.classList.remove('open'); });
  qrOverlay.addEventListener('click', function (e) { if (e.target === qrOverlay) qrOverlay.classList.remove('open'); });

  document.getElementById('lpQrCopyBtn').addEventListener('click', function () {
    var link = document.getElementById('lpQrOpenLink').href;
    navigator.clipboard.writeText(link).then(function () {
      RJF._lpToast('ভেরিফাই লিংক কপি করা হয়েছে!', 'success');
    }).catch(function () {
      RJF._lpToast('কপি করা যায়নি।', 'error');
    });
  });
};

/* ────────────────────────────────────────────────
   Dashboard render
   ────────────────────────────────────────────── */
RJF._lpShowDashboard = function (data, formCard, dashboard) {
  if (formCard) formCard.style.display = 'none';
  if (!dashboard) return;

  var statusLabel = data.status === 'active' ? 'সক্রিয়' : data.status === 'approved' ? 'অনুমোদিত' : data.status === 'blocked' ? 'নিষ্ক্রিয়' : 'অপেক্ষমান';
  var statusClass = (data.status === 'active' || data.status === 'approved') ? 'status-active' : data.status === 'blocked' ? 'status-blocked' : 'status-pending';

  var avatarEl  = document.getElementById('lpDashAvatar');
  var nameEl    = document.getElementById('lpDashName');
  var idEl      = document.getElementById('lpDashId');
  var typeEl    = document.getElementById('lpDashType');
  var statusEl  = document.getElementById('lpDashStatus');
  var occEl     = document.getElementById('lpDashOccupation');
  var bloodEl   = document.getElementById('lpDashBlood');
  var genderEl  = document.getElementById('lpDashGender');
  var mobileEl  = document.getElementById('lpDashMobile');
  var emailEl   = document.getElementById('lpDashEmail');
  var addressEl = document.getElementById('lpDashAddress');

  if (avatarEl) avatarEl.src = data.photo_url || RJF.loginConfig.defaultAvatar;
  if (nameEl)   nameEl.textContent   = data.full_name;
  if (idEl)     idEl.textContent     = 'আইডি: ' + data.member_id;
  if (typeEl)   typeEl.innerHTML     = '<i class="fa-solid fa-star"></i> ' + RJF._lpEsc(data.membership_type);
  if (statusEl) { statusEl.textContent = statusLabel; statusEl.className = 'lp-dash-badge ' + statusClass; }
  if (occEl)     occEl.textContent     = data.occupation || '—';
  if (bloodEl)   bloodEl.textContent   = data.blood_group || '—';
  if (genderEl)  genderEl.textContent  = data.gender || '—';
  if (mobileEl)  mobileEl.textContent  = data.mobile_number || '—';
  if (emailEl)   emailEl.textContent   = data.email || '—';
  if (addressEl) addressEl.textContent = data.permanent_address || '—';

  dashboard.classList.add('visible');

  /* লগইনের পরে ব্র্যান্ড হেডার (নাম/সাবটাইটেল/ব্যাজ) দেখানো */
  var headerTextEl = document.getElementById('lpHeaderText');
  if (headerTextEl) headerTextEl.classList.add('visible');

  /* প্রথম ট্যাব (প্রোফাইল) নিশ্চিত করে দেখানো */
  document.querySelectorAll('#lpDashTabs .lp-dash-tab').forEach(function (b) {
    b.classList.toggle('active', b.dataset.tab === 'profile');
  });
  document.querySelectorAll('.lp-dash-panel').forEach(function (panel) {
    var isProfile = panel.dataset.panel === 'profile';
    panel.hidden = !isProfile;
    panel.classList.toggle('visible', isProfile);
  });

  /* নোটিশে নতুন কিছু আছে কিনা — ব্যাকগ্রাউন্ডে চেক করে ড্যাশবোর্ড ওপেন হওয়ার সাথে সাথেই */
  RJF.initDashboardNotices();
};

/* ─── লগআউট করলে চলমান নোটিশ/ইভেন্ট রিয়েল-টাইম লিসেনার বন্ধ করে দেওয়া ─── */
RJF._lpTeardownDashboard = function () {
  if (RJF._lpNoticeState && RJF._lpNoticeState.unsub) {
    RJF._lpNoticeState.unsub();
    RJF._lpNoticeState.unsub = null;
  }
  if (RJF._lpEventState && RJF._lpEventState.unsub) {
    RJF._lpEventState.unsub();
    RJF._lpEventState.unsub = null;
  }
};

/* ────────────────────────────────────────────────
   QR ভেরিফাই মডাল — লগইনকৃত সদস্যের নিজের verify কার্ড ও QR
   ────────────────────────────────────────────── */
RJF._lpOpenQrModal = function () {
  var session = RJF._lpGetSession();
  if (!session) return;

  var overlay  = document.getElementById('lpQrModalOverlay');
  var photoEl  = document.getElementById('lpQrModalPhoto');
  var nameEl   = document.getElementById('lpQrModalName');
  var idEl     = document.getElementById('lpQrModalId');
  var linkEl   = document.getElementById('lpQrOpenLink');
  var codeBox  = document.getElementById('lpQrCodeBox');

  var verifyUrl = window.location.origin + RJF.loginConfig.verifyPath + '?id=' + encodeURIComponent(session.member_id);

  photoEl.src = session.photo_url || RJF.loginConfig.defaultAvatar;
  nameEl.textContent = session.full_name;
  idEl.textContent = session.member_id;
  linkEl.href = verifyUrl;

  overlay.classList.add('open');
  codeBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  RJF._lpLoadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', 'qrcodejs')
    .then(function () {
      codeBox.innerHTML = '';
      /* eslint-disable-next-line no-undef */
      new QRCode(codeBox, {
        text: verifyUrl,
        width: 176,
        height: 176,
        colorDark: '#0A4A40',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    })
    .catch(function () {
      codeBox.innerHTML = '<p style="font-size:0.8rem; color:var(--danger);">QR কোড লোড করা যায়নি — লিংকটি ব্যবহার করুন।</p>';
    });
};

/* ────────────────────────────────────────────────
   Reset helpers
   ────────────────────────────────────────────── */
RJF._lpResetSubmit = function (btn, textEl, spinner) {
  btn.disabled = false;
  textEl.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> লগইন করুন';
  spinner.classList.remove('show');
};
RJF._lpResetModalSend = function (btn, textEl, spinner) {
  btn.disabled = false;
  textEl.innerHTML = '<i class="fa-solid fa-paper-plane"></i> পাসওয়ার্ড পাঠান';
  spinner.classList.remove('show');
};
