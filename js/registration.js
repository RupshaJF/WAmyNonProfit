/* সদস্য আবেদন ফরম পেজ — index.html-এ এই ফাইলের প্রভাব নেই, #/apply রুটে render হয়
   (আপলোড করা standalone আবেদন ফরম থেকে সাইটের donate/donors পেজের প্যাটার্নে রূপান্তরিত —
   পাশের মেন্যু, সাবস্ক্রাইব বাটন, স্নো/ফিল্ম-গ্রেইন ইফেক্ট বাদ দেওয়া হয়েছে যেহেতু সাইটে
   আগে থেকেই নেভিগেশন আছে এবং এগুলো ফরমের কাজের সাথে সম্পর্কিত নয়) */
window.RJF = window.RJF || {};

RJF._regState = { currentStep: 0 };

RJF._regToBn = function (num) {
  var bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).split('').map(function (d) { return /\d/.test(d) ? bn[d] : d; }).join('');
};

/* ---------- ফিল্ড/সেকশন/স্টেপার HTML তৈরি ---------- */

RJF._regFieldHtml = function (f) {
  var reqMark = f.required ? ' <span class="req">*</span>' : '';
  var colClass = f.full ? ' field-group full' : ' field-group';
  var input;

  if (f.type === 'select') {
    var opts = '<option value="">নির্বাচন করুন</option>' + f.options.map(function (o) {
      return '<option value="' + o + '">' + o + '</option>';
    }).join('');
    input = '<select name="' + f.name + '"' + (f.required ? ' required' : '') + ' class="form-input">' + opts + '</select>';
  } else if (f.type === 'textarea') {
    input = '<textarea name="' + f.name + '"' + (f.required ? ' required' : '') + ' rows="2" class="form-input" placeholder="' + (f.placeholder || '') + '"></textarea>';
  } else {
    var extra = '';
    if (f.pattern) extra += ' pattern="' + f.pattern + '"';
    if (f.maxlength) extra += ' maxlength="' + f.maxlength + '"';
    if (f.type === 'tel') extra += ' inputmode="numeric"';
    if (f.type === 'date') extra += ' data-role="dob"';
    input = '<input type="' + f.type + '" name="' + f.name + '"' + (f.required ? ' required' : '') + extra + ' class="form-input" placeholder="' + (f.placeholder || '') + '">';
  }

  return '<div class="' + colClass + '"><label>' + f.label + reqMark + '</label>' + input + '<div class="error-hint"></div></div>';
};

RJF._regSectionHtml = function (stepIndex, step) {
  if (stepIndex < RJF.registrationFields.length) {
    var fieldsHtml = RJF.registrationFields[stepIndex].map(RJF._regFieldHtml).join('');
    return (
      '<div class="reg-section" data-step="' + stepIndex + '"' + (stepIndex !== 0 ? ' hidden' : '') + '>' +
        '<div class="reg-section-head">' +
          '<div class="reg-section-icon"><i class="fa-solid ' + step.icon + '"></i></div>' +
          '<div><h2>' + step.title + '</h2><p>' + step.desc + '</p></div>' +
        '</div>' +
        '<div class="field-grid">' + fieldsHtml + '</div>' +
      '</div>'
    );
  }

  return (
    '<div class="reg-section" data-step="' + stepIndex + '" hidden>' +
      '<div class="reg-section-head">' +
        '<div class="reg-section-icon"><i class="fa-solid ' + step.icon + '"></i></div>' +
        '<div><h2>' + step.title + '</h2><p>' + step.desc + '</p></div>' +
      '</div>' +
      '<div class="reg-review" id="regReview"></div>' +
      '<label class="agree-row" id="regAgreeRow">' +
        '<input type="checkbox" id="regAgree">' +
        '<span>' + RJF.registrationData.agreementText + ' <span class="req">*</span></span>' +
      '</label>' +
      '<div class="error-hint" id="regAgreeError"></div>' +
    '</div>'
  );
};

RJF._regStepperHtml = function () {
  var stepsHtml = RJF.registrationData.steps.map(function (s, i) {
    return (
      '<div class="reg-step" data-step="' + i + '">' +
        '<div class="reg-step-circle">' + RJF._regToBn(i + 1) + '</div>' +
        '<span class="reg-step-label">' + s.short + '</span>' +
      '</div>'
    );
  }).join('');

  return (
    '<div class="reg-stepper" id="regStepper">' +
      '<div class="reg-stepper-line"><div class="reg-stepper-line-fill" id="regStepperFill"></div></div>' +
      stepsHtml +
    '</div>' +
    '<div class="reg-stepper-mobile" id="regStepperMobile">' +
      '<div class="reg-stepper-mobile-top">' +
        '<span id="regMobStepText"></span>' +
        '<span id="regMobStepPercent"></span>' +
      '</div>' +
      '<div class="reg-mob-progress"><div class="reg-mob-progress-fill" id="regMobProgressFill"></div></div>' +
    '</div>'
  );
};

/* ---------- পেজ রেন্ডার ---------- */

RJF.renderRegistrationPage = function () {
  var root = document.getElementById('registration-root');
  if (!root) return;
  var d = RJF.registrationData;
  RJF._regState.currentStep = 0;

  var sectionsHtml = d.steps.map(function (s, i) { return RJF._regSectionHtml(i, s); }).join('');

  root.innerHTML =
    '<div class="registration-page">' +

      '<a class="rjf-back-home" href="#/">' + RJF.iconSvg('up', 'fill="none" stroke="currentColor" stroke-width="2" style="transform:rotate(-90deg)"') + '<span>Go back</span></a>' +

      '<header class="reg-header">' +
        '<div class="reg-header-icon"><i class="fa-solid fa-user-plus"></i></div>' +
        '<h1>রূপসা জনকল্যাণ ফাউন্ডেশন</h1>' +
        '<h2>' + d.formTitle + '</h2>' +
        '<p class="reg-tagline">"' + d.tagline + '"</p>' +
        '<div class="reg-live-badge"><span class="pulse"></span>' + d.liveLabel + '</div>' +
      '</header>' +

      '<main class="reg-container">' +
        '<div class="reg-card">' +

          RJF._regStepperHtml() +

          '<form id="regForm" class="reg-form" novalidate>' +
            '<input type="hidden" name="member_id" id="regMemberId">' +
            sectionsHtml +

            '<div class="reg-nav">' +
              '<button type="button" id="regPrevBtn" class="reg-btn reg-btn-ghost" hidden><i class="fa-solid fa-arrow-left"></i> আগের ধাপ</button>' +
              '<button type="button" id="regNextBtn" class="reg-btn reg-btn-primary">পরের ধাপ <i class="fa-solid fa-arrow-right"></i></button>' +
              '<button type="submit" id="regSubmitBtn" class="reg-btn reg-btn-primary" hidden>' +
                '<span id="regSubmitText">' + d.submitLabel + '</span>' +
                '<i class="fa-solid fa-paper-plane" id="regSubmitIcon"></i>' +
                '<div class="reg-spinner" id="regSpinner"></div>' +
              '</button>' +
            '</div>' +
          '</form>' +
        '</div>' +
      '</main>' +

      '<div id="regToast" class="reg-toast"><span id="regToastMsg"></span></div>' +

    '</div>';

  RJF._loadScriptOnce('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js', 'emailjs');

  RJF._wireRegistrationPage();
};

/* ---------- ফায়ারবেস (Firestore) — শুধু এই পেজেই দরকার, তাই ডাইনামিক ইম্পোর্ট ---------- */

RJF._regFirebasePromise = null;
RJF._getRegFirebase = function () {
  if (RJF._regFirebasePromise) return RJF._regFirebasePromise;
  RJF._regFirebasePromise = Promise.all([
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js')
  ]).then(function (mods) {
    var appMod = mods[0];
    var fsMod = mods[1];
    var app = appMod.initializeApp(RJF.registrationData.firebaseConfig);
    var db = fsMod.getFirestore(app);
    return { fs: fsMod, db: db };
  });
  return RJF._regFirebasePromise;
};

RJF._waitForEmailjs = function () {
  return new Promise(function (resolve) {
    (function check() {
      if (typeof window.emailjs !== 'undefined') { resolve(window.emailjs); return; }
      setTimeout(check, 150);
    })();
  });
};

/* ---------- ওয়্যারিং: স্টেপার নেভিগেশন, ভ্যালিডেশন, রিভিউ, সাবমিট ---------- */

RJF._wireRegistrationPage = function () {
  var d = RJF.registrationData;
  var s = RJF._regState;
  var form = document.getElementById('regForm');
  var sections = document.querySelectorAll('#regForm .reg-section');
  var prevBtn = document.getElementById('regPrevBtn');
  var nextBtn = document.getElementById('regNextBtn');
  var submitBtn = document.getElementById('regSubmitBtn');
  var totalSteps = sections.length;

  var dobInput = form.querySelector('input[data-role="dob"]');
  if (dobInput) dobInput.setAttribute('max', new Date().toISOString().split('T')[0]);

  var mobileInput = form.querySelector('input[name="mobile_number"]');
  if (mobileInput) {
    mobileInput.addEventListener('input', function () { this.value = this.value.replace(/[^0-9]/g, ''); });
  }

  function updateStepperUI() {
    var pct = ((s.currentStep + 1) / totalSteps) * 100;
    var linePct = (s.currentStep / (totalSteps - 1)) * 100;

    var fill = document.getElementById('regStepperFill');
    if (fill) fill.style.width = linePct + '%';

    document.querySelectorAll('.reg-step').forEach(function (item, i) {
      item.classList.remove('active', 'completed');
      if (i < s.currentStep) item.classList.add('completed');
      else if (i === s.currentStep) item.classList.add('active');
    });

    var mobText = document.getElementById('regMobStepText');
    var mobPercent = document.getElementById('regMobStepPercent');
    var mobFill = document.getElementById('regMobProgressFill');
    if (mobText) mobText.textContent = 'ধাপ ' + RJF._regToBn(s.currentStep + 1) + ' / ' + RJF._regToBn(totalSteps) + ' — ' + d.steps[s.currentStep].title;
    if (mobPercent) mobPercent.textContent = Math.round(pct) + '%';
    if (mobFill) mobFill.style.width = pct + '%';
  }

  function updateButtons() {
    prevBtn.hidden = s.currentStep === 0;
    var isLast = s.currentStep === totalSteps - 1;
    nextBtn.hidden = isLast;
    submitBtn.hidden = !isLast;
  }

  function clearErrors(section) {
    section.querySelectorAll('.error-hint').forEach(function (el) { el.textContent = ''; });
    section.querySelectorAll('.form-input').forEach(function (el) { el.classList.remove('invalid-signal'); });
  }

  function validateSection(section) {
    var inputs = section.querySelectorAll('.form-input[required]');
    var isValid = true;
    var firstInvalid = null;
    clearErrors(section);

    inputs.forEach(function (input) {
      if (!input.checkValidity()) {
        isValid = false;
        input.classList.add('invalid-signal');
        var hint = input.parentElement.querySelector('.error-hint');
        var msg = 'এই তথ্যটি প্রদান করা আবশ্যক।';
        if (input.type === 'email' && input.value !== '') msg = 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা দিন।';
        if (input.type === 'tel' && input.value !== '') msg = 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন।';
        if (hint) hint.textContent = msg;
        if (!firstInvalid) firstInvalid = input;
      }
    });

    if (!isValid && firstInvalid) {
      firstInvalid.focus();
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return isValid;
  }

  function buildReview() {
    var reviewRoot = document.getElementById('regReview');
    if (!reviewRoot) return;
    var fd = new FormData(form);
    var val = function (name) {
      var v = fd.get(name);
      return (v && String(v).trim() !== '') ? v : '<span class="empty">প্রদান করা হয়নি</span>';
    };

    function row(label, name) {
      return '<div class="reg-review-row"><span>' + label + '</span><strong>' + val(name) + '</strong></div>';
    }

    reviewRoot.innerHTML =
      '<div class="reg-review-block">' +
        '<h4><i class="fa-solid fa-user"></i> ব্যক্তিগত বিবরণ</h4>' +
        row('পুরো নাম', 'full_name') + row('পিতার নাম', 'father_name') + row('মাতার নাম', 'mother_name') +
        row('জন্ম তারিখ', 'date_of_birth') + row('লিঙ্গ', 'gender') + row('রক্তের গ্রুপ', 'blood_group') +
      '</div>' +
      '<div class="reg-review-block">' +
        '<h4><i class="fa-solid fa-address-book"></i> যোগাযোগ</h4>' +
        row('মোবাইল নম্বর', 'mobile_number') + row('ইমেইল', 'email') +
      '</div>' +
      '<div class="reg-review-block">' +
        '<h4><i class="fa-solid fa-location-dot"></i> ঠিকানা</h4>' +
        row('বর্তমান ঠিকানা', 'present_address') + row('স্থায়ী ঠিকানা', 'permanent_address') +
      '</div>' +
      '<div class="reg-review-block">' +
        '<h4><i class="fa-solid fa-graduation-cap"></i> শিক্ষা, পেশা ও সদস্যপদ</h4>' +
        row('শিক্ষাগত যোগ্যতা', 'education') + row('পেশা', 'occupation') + row('সদস্যপদের ধরন', 'membership_type') +
      '</div>';
  }

  function goToStep(index, animDir) {
    sections[s.currentStep].hidden = true;
    s.currentStep = index;
    sections[s.currentStep].hidden = false;
    sections[s.currentStep].classList.remove('slide-right', 'slide-left');
    void sections[s.currentStep].offsetWidth;
    sections[s.currentStep].classList.add(animDir === 'left' ? 'slide-left' : 'slide-right');

    if (s.currentStep === totalSteps - 1) buildReview();

    updateStepperUI();
    updateButtons();
    document.querySelector('.reg-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  nextBtn.addEventListener('click', function () {
    if (!validateSection(sections[s.currentStep])) return;
    if (s.currentStep < totalSteps - 1) goToStep(s.currentStep + 1, 'right');
  });

  prevBtn.addEventListener('click', function () {
    if (s.currentStep > 0) goToStep(s.currentStep - 1, 'left');
  });

  document.querySelectorAll('.reg-step').forEach(function (stepEl) {
    stepEl.addEventListener('click', function () {
      var target = Number(stepEl.dataset.step);
      if (target === s.currentStep) return;
      if (target > s.currentStep && !validateSection(sections[s.currentStep])) return;
      goToStep(target, target < s.currentStep ? 'left' : 'right');
    });
  });

  form.querySelectorAll('.form-input').forEach(function (input) {
    input.addEventListener('input', function () {
      if (this.checkValidity()) {
        this.classList.remove('invalid-signal');
        var hint = this.parentElement.querySelector('.error-hint');
        if (hint) hint.textContent = '';
      }
    });
  });

  function resetForm() {
    form.reset();
    s.currentStep = 0;
    sections.forEach(function (sec, i) { sec.hidden = i !== 0; sec.classList.remove('slide-left', 'slide-right'); });
    updateStepperUI();
    updateButtons();
    var submitText = document.getElementById('regSubmitText');
    var submitIcon = document.getElementById('regSubmitIcon');
    var spinner = document.getElementById('regSpinner');
    submitBtn.disabled = false;
    submitText.hidden = false;
    submitIcon.hidden = false;
    spinner.classList.remove('show');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var agree = document.getElementById('regAgree');
    var agreeError = document.getElementById('regAgreeError');
    if (!agree.checked) {
      agreeError.textContent = d.agreementErrorMsg;
      agree.focus();
      return;
    }
    agreeError.textContent = '';

    var emailInput = form.email.value.trim().toLowerCase();
    var submitText = document.getElementById('regSubmitText');
    var submitIcon = document.getElementById('regSubmitIcon');
    var spinner = document.getElementById('regSpinner');

    submitBtn.disabled = true;
    submitText.hidden = true;
    submitIcon.hidden = true;
    spinner.classList.add('show');

    function fail(msg) {
      RJF._regToast(msg, true);
      submitBtn.disabled = false;
      submitText.hidden = false;
      submitIcon.hidden = false;
      spinner.classList.remove('show');
    }

    /* ── আবেদনের তথ্য: শুধু নির্দিষ্ট ফিল্ড (firestore.rules-এর তালিকার সাথে মেলে) ── */
    var APPLICANT_FIELDS = ['member_id', 'full_name', 'father_name', 'mother_name', 'date_of_birth', 'gender',
      'blood_group', 'mobile_number', 'email', 'present_address', 'permanent_address', 'education',
      'occupation', 'membership_type', 'reference_name', 'reference_mobile'];

    function buildPayload(formData, fs) {
      var p = {};
      APPLICANT_FIELDS.forEach(function (k) {
        var v = formData.get(k);
        p[k] = (v === null || v === undefined) ? '' : String(v).trim();
      });
      p.email = emailInput;                 /* সবসময় ছোট হাতের — ইমেইল ইনডেক্স ও লগইনের জন্য */
      p.status = 'pending';
      p.submittedAt = fs.serverTimestamp();  /* rules: সার্ভারের সময়ই দিতে হবে */
      return p;
    }

    /* firestore.rules যেসব শর্তে আবেদন নেয়, ব্রাউজারেই সেগুলো আগে মিলিয়ে ভুল হলে পরিষ্কার বার্তা দেখানো */
    function checkLimits(p) {
      var len = function (v) { return Array.from(v).length; };
      if (len(p.full_name) < 2 || len(p.full_name) > 100 || len(p.father_name) < 2 || len(p.father_name) > 100 ||
          len(p.mother_name) < 2 || len(p.mother_name) > 100) return 'নাম কমপক্ষে ২ ও সর্বোচ্চ ১০০ অক্ষরের হতে হবে।';
      if (len(p.present_address) < 3 || len(p.present_address) > 300 || len(p.permanent_address) < 3 || len(p.permanent_address) > 300)
        return 'ঠিকানা কমপক্ষে ৩ ও সর্বোচ্চ ৩০০ অক্ষরের হতে হবে।';
      if (len(p.occupation) < 1 || len(p.occupation) > 100 || len(p.education) > 60 || len(p.membership_type) > 60 ||
          len(p.reference_name) > 100 || len(p.reference_mobile) > 20) return 'কোনো ঘরের লেখা অনুমোদিত সীমার চেয়ে বড়।';
      if (!/^01[3-9][0-9]{8}$/.test(p.mobile_number)) return 'মোবাইল নম্বর সঠিক নয় (যেমন 01XXXXXXXXX)।';
      if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(p.email) || p.email.length > 254) return 'ইমেইল ঠিকানা সঠিক নয়।';
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(p.date_of_birth)) return 'জন্ম তারিখ সঠিক নয়।';
      return null;
    }

    RJF._getRegFirebase().then(function (firebase) {
      var fs = firebase.fs;
      var db = firebase.db;

      var year = new Date().getFullYear();
      var random = Math.floor(1000 + Math.random() * 9000);
      var generatedId = 'RJF-' + year + '-' + random;
      document.getElementById('regMemberId').value = generatedId;

      var formData = new FormData(form);
      var payload = buildPayload(formData, fs);
      var problem = checkLimits(payload);
      if (problem) { fail(problem); return null; }

      /* একই ব্যাচে: আবেদন + ইমেইল-ইনডেক্স। ইনডেক্স আগে থেকে থাকলে পুরো ব্যাচ বাতিল হয় =
         একই ইমেইলে দুইবার আবেদন সম্ভব নয় (কাউকে কিছু না পড়িয়েই, সার্ভার-সাইডে নিশ্চিত) */
      var memberRef = fs.doc(fs.collection(db, 'members'));
      var indexRef = fs.doc(db, 'member_emails', emailInput);
      var batch = fs.writeBatch(db);
      batch.set(memberRef, payload);
      batch.set(indexRef, { member_doc: memberRef.id, status: 'pending' });

      return batch.commit().then(function () {
        var formspreePromise = fetch(d.formspreeUrl, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        }).catch(function () {});

        var emailjsPromise = RJF._waitForEmailjs().then(function (emailjs) {
          try { emailjs.init(d.emailjsPublicKey); } catch (err) {}
          return emailjs.sendForm(d.emailjsServiceId, d.emailjsTemplateId, form).catch(function () {});
        });

        return Promise.allSettled([formspreePromise, emailjsPromise]).then(function () {
          RJF._regToast(d.successMsgPrefix + generatedId, false);
          resetForm();
        });
      }).catch(function (err) {
        console.error(err);
        /* permission-denied = ইমেইল ইনডেক্স আগে থেকেই আছে (ডুপ্লিকেট আবেদন) */
        if (err && err.code === 'permission-denied') fail(d.duplicateEmailMsg);
        else fail(d.genericErrorMsg);
      });
    }).catch(function (err) {
      console.error(err);
      fail(d.genericErrorMsg);
    });
  });

  updateStepperUI();
  updateButtons();
};

RJF._regToast = function (message, isError) {
  var toast = document.getElementById('regToast');
  var msgEl = document.getElementById('regToastMsg');
  if (!toast || !msgEl) return;
  msgEl.textContent = message;
  toast.classList.toggle('error', !!isError);
  toast.classList.add('show');
  clearTimeout(RJF._regToastTimer);
  RJF._regToastTimer = setTimeout(function () { toast.classList.remove('show'); }, 5000);
};
