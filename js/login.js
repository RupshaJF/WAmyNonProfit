/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — Member Login System
   - Firestore থেকে member_id ও email যাচাই করে লগইন
   - নতুন সদস্য: আবেদন ফর্মে redirect
   - পাসওয়ার্ড ভুলে গেলে: member_id দিয়ে EmailJS-এ পাঠানো হয়
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
  sessionKey: "rjf_member_session"
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
          '<div class="login-logo-ring"><i class="fa-solid fa-shield-halved"></i></div>' +
          '<h1>রূপসা জনকল্যাণ ফাউন্ডেশন</h1>' +
          '<p class="login-subtitle">সদস্য পোর্টাল</p>' +
          '<div class="login-badge"><span class="pulse"></span>সদস্যদের জন্য</div>' +
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
            '<div class="lp-dash-greeting">স্বাগতম</div>' +
            '<div class="lp-dash-name" id="lpDashName">—</div>' +
            '<div class="lp-dash-id" id="lpDashId">—</div>' +
            '<button type="button" class="lp-dash-logout" id="lpLogout">' +
              '<i class="fa-solid fa-right-from-bracket"></i> লগআউট' +
            '</button>' +
          '</div>' +
          '<div class="lp-info-grid">' +
            '<div class="lp-info-card">' +
              '<div class="lp-info-card-label">সদস্যপদ</div>' +
              '<div class="lp-info-card-value" id="lpDashType">—</div>' +
            '</div>' +
            '<div class="lp-info-card">' +
              '<div class="lp-info-card-label">অবস্থা</div>' +
              '<div class="lp-info-card-value" id="lpDashStatus">—</div>' +
            '</div>' +
          '</div>' +
          '<div class="lp-info-full">' +
            '<div class="lp-info-card-label">মোবাইল নম্বর</div>' +
            '<div class="lp-info-card-value" id="lpDashMobile">—</div>' +
          '</div>' +
          '<div class="lp-info-full">' +
            '<div class="lp-info-card-label">ইমেইল</div>' +
            '<div class="lp-info-card-value" id="lpDashEmail">—</div>' +
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

        /* ✅ Login success */
        var sessionData = {
          member_id: data.member_id || memberId,
          full_name: data.full_name || 'সদস্য',
          email: data.email || '',
          mobile_number: data.mobile_number || '',
          membership_type: data.membership_type || '—',
          status: data.status || 'pending'
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
    dashboard.classList.remove('visible');
    formCard.style.display = '';
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
};

/* ────────────────────────────────────────────────
   Dashboard render
   ────────────────────────────────────────────── */
RJF._lpShowDashboard = function (data, formCard, dashboard) {
  if (formCard) formCard.style.display = 'none';
  if (!dashboard) return;

  var statusLabel = data.status === 'active' ? 'সক্রিয়' : data.status === 'approved' ? 'অনুমোদিত' : 'অপেক্ষমান';
  var statusClass = (data.status === 'active' || data.status === 'approved') ? 'status-active' : 'status-pending';

  var nameEl   = document.getElementById('lpDashName');
  var idEl     = document.getElementById('lpDashId');
  var typeEl   = document.getElementById('lpDashType');
  var statusEl = document.getElementById('lpDashStatus');
  var mobileEl = document.getElementById('lpDashMobile');
  var emailEl  = document.getElementById('lpDashEmail');

  if (nameEl)   nameEl.textContent   = data.full_name;
  if (idEl)     idEl.textContent     = 'আইডি: ' + data.member_id;
  if (typeEl)   typeEl.textContent   = data.membership_type;
  if (statusEl) { statusEl.textContent = statusLabel; statusEl.className = 'lp-info-card-value ' + statusClass; }
  if (mobileEl) mobileEl.textContent = data.mobile_number || '—';
  if (emailEl)  emailEl.textContent  = data.email || '—';

  dashboard.classList.add('visible');
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
