/* ছোট্ট রাউটার — একটাই index.html ফাইল দিয়ে সব পেজ সুইচ করে।
   #/login রুট যোগ করা হয়েছে member login সিস্টেমের জন্য। */
window.RJF = window.RJF || {};

RJF.HOME_ROOTS = ['hero-root', 'intro-root', 'about-root', 'location-root'];
RJF.LEGAL_PAGES = ['privacy', 'terms'];

/* প্রতিটা সাব-পেজের জন্য আলাদা ব্রাউজার ট্যাব-টাইটেল ও মেটা-ডেসক্রিপশন —
   পুরো সাইটটাই এক index.html হওয়ায় সার্চ ইঞ্জিনে আলাদা URL হিসেবে indexed হয় না,
   কিন্তু ট্যাব-টাইটেল/হিস্ট্রি/বুকমার্ক এবং JS-চালিত ক্রলারদের জন্য এটা তবু কাজে দেয়। */
RJF.PAGE_META = {
  home:     { title: 'রূপসা জনকল্যাণ ফাউন্ডেশন | অলাভজনক সামাজিক সংগঠন, সিরাজগঞ্জ', desc: 'রূপসা জনকল্যাণ ফাউন্ডেশন একটি অলাভজনক সামাজিক সংগঠন — শিক্ষা, স্বাস্থ্যসেবা, ত্রাণ ও দক্ষতা উন্নয়নের মাধ্যমে সিরাজগঞ্জে তৃণমূল পর্যায়ে কাজ করে যাচ্ছে।' },
  donate:   { title: 'দান করুন — রূপসা জনকল্যাণ ফাউন্ডেশন', desc: 'আপনার সহযোগিতায় আরও বেশি মানুষের পাশে দাঁড়াতে পারি। বিকাশ/নগদ/রকেটে সহজেই দান করুন রূপসা জনকল্যাণ ফাউন্ডেশনে।' },
  member:   { title: 'সদস্যবৃন্দ — রূপসা জনকল্যাণ ফাউন্ডেশন', desc: 'রূপসা জনকল্যাণ ফাউন্ডেশনের কমিটি ও সদস্যদের তালিকা।' },
  gallery:  { title: 'ফটো গ্যালারি — রূপসা জনকল্যাণ ফাউন্ডেশন', desc: 'রূপসা জনকল্যাণ ফাউন্ডেশনের বিভিন্ন কার্যক্রমের ছবি ও ভিডিও — মানবিক ও খেলাধুলার স্মরণীয় মুহূর্ত।' },
  donors:   { title: 'দাতা সদস্যবৃন্দ — রূপসা জনকল্যাণ ফাউন্ডেশন', desc: 'রূপসা জনকল্যাণ ফাউন্ডেশনকে যারা অনুদান দিয়ে পাশে থেকেছেন তাদের তালিকা।' },
  apply:    { title: 'সদস্য নিবন্ধন ফরম — রূপসা জনকল্যাণ ফাউন্ডেশন', desc: 'রূপসা জনকল্যাণ ফাউন্ডেশনের সদস্য হতে আবেদন করুন।' },
  login:    { title: 'সদস্য লগইন — রূপসা জনকল্যাণ ফাউন্ডেশন', desc: 'রূপসা জনকল্যাণ ফাউন্ডেশনের সদস্যদের জন্য লগইন পেজ।' },
  privacy:  { title: 'প্রাইভেসি পলিসি — রূপসা জনকল্যাণ ফাউন্ডেশন', desc: 'রূপসা জনকল্যাণ ফাউন্ডেশনের প্রাইভেসি পলিসি।' },
  terms:    { title: 'ব্যবহারের শর্তাবলী — রূপসা জনকল্যাণ ফাউন্ডেশন', desc: 'রূপসা জনকল্যাণ ফাউন্ডেশনের ওয়েবসাইট ব্যবহারের শর্তাবলী।' }
};

RJF.setPageMeta = function (key) {
  var meta = RJF.PAGE_META[key] || RJF.PAGE_META.home;
  document.title = meta.title;
  var descTag = document.querySelector('meta[name="description"]');
  if (descTag) descTag.setAttribute('content', meta.desc);
};

RJF.renderHome = function () {
  RJF.renderHero();
  RJF.renderIntro();
  RJF.renderAbout();
  RJF.renderLocation();
};

RJF.route = function () {
  var hash = window.location.hash;
  var legalKey    = hash === '#/privacy' ? 'privacy' : hash === '#/terms' ? 'terms' : null;
  var isDonate    = hash === '#/donate';
  var isMember    = hash === '#/member';
  var isGallery   = hash === '#/gallery';
  var isDonors    = hash === '#/donors';
  var isApply     = hash === '#/apply';
  var isLogin     = hash === '#/login';          /* ← নতুন */

  var legalRoot        = document.getElementById('legal-root');
  var donateRoot       = document.getElementById('donate-root');
  var memberRoot       = document.getElementById('member-root');
  var galleryRoot      = document.getElementById('gallery-root');
  var donorsRoot       = document.getElementById('donors-root');
  var registrationRoot = document.getElementById('registration-root');
  var loginRoot        = document.getElementById('login-root');  /* ← নতুন */

  var isSubPage = legalKey || isDonate || isMember || isGallery || isDonors || isApply || isLogin;

  if (isSubPage) {
    /* হোম সেকশন লুকাও */
    RJF.HOME_ROOTS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.hidden = true;
    });

    if (legalRoot)        legalRoot.hidden        = !legalKey;
    if (donateRoot)       donateRoot.hidden        = !isDonate;
    if (memberRoot)       memberRoot.hidden        = !isMember;
    if (galleryRoot)      galleryRoot.hidden       = !isGallery;
    if (donorsRoot)       donorsRoot.hidden        = !isDonors;
    if (registrationRoot) registrationRoot.hidden  = !isApply;
    if (loginRoot)        loginRoot.hidden         = !isLogin;  /* ← নতুন */

    if (legalKey)  { RJF.renderLegalPage(legalKey); RJF.setPageMeta(legalKey); }
    if (isDonate)  { RJF.renderDonatePage(); RJF.setPageMeta('donate'); }
    if (isMember) {
      RJF.renderMemberPage();
      RJF.setPageMeta('member');
      if (typeof RJF.refreshMemberListFromFirestore === 'function') RJF.refreshMemberListFromFirestore();
    }
    if (isGallery) {
      RJF.renderGalleryPage();
      RJF.setPageMeta('gallery');
      if (typeof RJF.refreshGalleryDataFromFirestore === 'function') RJF.refreshGalleryDataFromFirestore();
    }
    if (isDonors) {
      RJF.renderDonorsPage();
      RJF.setPageMeta('donors');
      if (typeof RJF.refreshDonorListFromFirestore === 'function') RJF.refreshDonorListFromFirestore();
    }
    if (isApply) { RJF.renderRegistrationPage(); RJF.setPageMeta('apply'); }
    if (isLogin)  { RJF.renderLoginPage(); RJF.setPageMeta('login'); }           /* ← নতুন */

    window.scrollTo(0, 0);
    return;
  }

  /* হোম-এ ফিরে এলে সব sub-page লুকাও, home দেখাও */
  RJF.setPageMeta('home');
  RJF.HOME_ROOTS.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.hidden = false;
  });
  if (legalRoot)        legalRoot.hidden        = true;
  if (donateRoot)       donateRoot.hidden        = true;
  if (memberRoot)       memberRoot.hidden        = true;
  if (galleryRoot)      galleryRoot.hidden       = true;
  if (donorsRoot)       donorsRoot.hidden        = true;
  if (registrationRoot) registrationRoot.hidden  = true;
  if (loginRoot)        loginRoot.hidden         = true;   /* ← নতুন */

  /* anchor scroll */
  if (hash.length > 1 && hash.indexOf('#/') !== 0) {
    var target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  }
};
