/* ছোট্ট রাউটার — একটাই index.html ফাইল দিয়ে সব পেজ সুইচ করে।
   #/login রুট যোগ করা হয়েছে member login সিস্টেমের জন্য। */
window.RJF = window.RJF || {};

RJF.HOME_ROOTS = ['hero-root', 'intro-root', 'about-root', 'location-root'];
RJF.LEGAL_PAGES = ['privacy', 'terms'];

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

    if (legalKey)  RJF.renderLegalPage(legalKey);
    if (isDonate)  RJF.renderDonatePage();
    if (isMember) {
      RJF.renderMemberPage();
      if (typeof RJF.refreshMemberListFromFirestore === 'function') RJF.refreshMemberListFromFirestore();
    }
    if (isGallery) RJF.renderGalleryPage();
    if (isDonors) {
      RJF.renderDonorsPage();
      if (typeof RJF.refreshDonorListFromFirestore === 'function') RJF.refreshDonorListFromFirestore();
    }
    if (isApply) RJF.renderRegistrationPage();
    if (isLogin)  RJF.renderLoginPage();           /* ← নতুন */

    window.scrollTo(0, 0);
    return;
  }

  /* হোম-এ ফিরে এলে সব sub-page লুকাও, home দেখাও */
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
