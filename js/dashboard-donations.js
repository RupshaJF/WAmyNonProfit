/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — সদস্য ড্যাশবোর্ড: চাঁদা/অনুদান হিস্ট্রি
   - Firestore-এর 'member_donations' কালেকশন থেকে রিয়েল-টাইমে লোড হয় (শুধু নিজের ইমেইলের রেকর্ড)
   - অ্যাডমিন প্যানেল থেকে যোগ/এডিট/ডিলিট করা হয়; সদস্য শুধু দেখতে পারেন (firestore.rules নিশ্চিত করে)
   - উপরে সর্বমোট/বকেয়ার সারাংশ, নিচে তারিখ অনুযায়ী (নতুন আগে) তালিকা
   ========================================================================== */
(function (global) {
  'use strict';

  const RJF = (global.RJF = global.RJF || {});
  const lp = RJF.lp;

  const state = (RJF._lpDonationState = { unsub: null, items: [], token: 0, starting: false });

  function fmtTaka(n) {
    const num = Number(n) || 0;
    return '৳' + lp.bn(num.toLocaleString('en-US', { maximumFractionDigits: 2 }));
  }

  /* 'YYYY-MM-DD' → লোকাল Date; ভুল হলে null (dashboard-events.js-এর parseEventDate-এর ধাঁচে) */
  function parseYmd(s) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim());
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function emptyHtml(iconName, text, retry) {
    return '<div class="lp-empty">' + lp.icon(iconName) + '<p>' + lp.esc(text) + '</p>' +
      (retry ? '<button type="button" class="lp-btn lp-btn--ghost lp-btn--sm" data-retry>' + lp.icon('refresh') + '<span>আবার চেষ্টা করুন</span></button>' : '') +
      '</div>';
  }

  function renderSummary(items) {
    const box = lp.byId('lpDonationSummary');
    if (!box) return;
    if (!items.length) { box.hidden = true; return; }

    const total = items.reduce((sum, d) => sum + (d.status !== 'due' ? (Number(d.amount) || 0) : 0), 0);
    const due = items.reduce((sum, d) => sum + (d.status === 'due' ? (Number(d.amount) || 0) : 0), 0);

    box.hidden = false;
    box.innerHTML =
      '<div><div class="lp-donation-summary__num">' + fmtTaka(total) + '</div><div class="lp-donation-summary__label">সর্বমোট প্রদত্ত</div></div>' +
      (due > 0 ? '<div><div class="lp-donation-summary__num">' + fmtTaka(due) + '</div><div class="lp-donation-summary__label">বকেয়া</div></div>' : '') +
      '<div><div class="lp-donation-summary__num">' + lp.bn(items.length) + '</div><div class="lp-donation-summary__label">মোট এন্ট্রি</div></div>';
  }

  function render(items) {
    const wrap = lp.byId('lpDonationList');
    if (!wrap) return;
    renderSummary(items);

    if (!items.length) {
      wrap.innerHTML = emptyHtml('heart', 'এখনো কোনো অনুদান/চাঁদার হিসাব যোগ করা হয়নি।');
      return;
    }

    wrap.innerHTML = items.map((d) => {
      const dt = parseYmd(d.date);
      const dateLabel = dt ? lp.WEEKDAYS[dt.getDay()] + ', ' + lp.formatDate(dt) : '';
      const due = d.status === 'due';
      return '<article class="lp-item lp-donation">' +
        '<div class="lp-donation__top">' +
          '<span class="lp-donation__amount">' + fmtTaka(d.amount) + '</span>' +
          '<span class="lp-chip ' + (due ? 'lp-chip--wait' : 'lp-chip--ok') + '">' + (due ? 'বকেয়া' : 'গৃহীত') + '</span>' +
        '</div>' +
        (d.purpose ? '<p class="lp-donation__purpose">' + lp.esc(d.purpose) + '</p>' : '') +
        '<div class="lp-donation__meta">' +
          (dateLabel ? '<span>' + lp.icon('calendar') + '<span>' + lp.esc(dateLabel) + '</span></span>' : '') +
          (d.method ? '<span>' + lp.icon('id-card') + '<span>' + lp.esc(d.method) + '</span></span>' : '') +
          (d.receipt_no ? '<span>' + lp.icon('file-text') + '<span>রশিদ: ' + lp.esc(d.receipt_no) + '</span></span>' : '') +
        '</div>' +
        (d.note ? '<p class="lp-donation__note">' + lp.linkify(d.note) + '</p>' : '') +
      '</article>';
    }).join('');
  }

  function bindList() {
    const wrap = lp.byId('lpDonationList');
    if (!wrap) return;
    wrap.onclick = (e) => {
      if (e.target.closest('[data-retry]')) {
        wrap.innerHTML = lp.skeleton(3);
        RJF.initDashboardDonations();
      }
    };
  }

  function showError(err) {
    const wrap = lp.byId('lpDonationList');
    const box = lp.byId('lpDonationSummary');
    if (box) box.hidden = true;
    if (!wrap) return;
    if (err && err.code === 'permission-denied') {
      /* firestore.rules: অনুদানের হিসাব শুধু অনুমোদিত সদস্যদের জন্য */
      wrap.innerHTML = emptyHtml('lock', 'অনুদান/চাঁদার হিসাব শুধু অনুমোদিত সদস্যরা দেখতে পারেন। সদস্যপদ অনুমোদিত হলে এখানে দেখতে পাবেন।', false);
      return;
    }
    wrap.innerHTML = emptyHtml('wifi-off', 'তথ্য লোড করা যায়নি — ইন্টারনেট সংযোগ পরীক্ষা করুন।', true);
  }

  function stop() {
    state.token += 1;
    if (state.unsub) { try { state.unsub(); } catch (e) { /* উপেক্ষা */ } }
    state.unsub = null;
    state.starting = false;
    state.items = [];
  }

  RJF.initDashboardDonations = function () {
    bindList();
    if (state.unsub || state.starting) return;
    state.starting = true;
    const token = ++state.token;

    lp.getFirebase().then((fb) => {
      /* সেশন পুনরুদ্ধারের সময় currentUser আসতে সামান্য দেরি হতে পারে — নিশ্চিত হয়ে নেওয়া */
      const ready = typeof fb.auth.authStateReady === 'function' ? fb.auth.authStateReady() : Promise.resolve();
      return ready.then(() => fb);
    }).then((fb) => {
      if (token !== state.token) return;
      const user = fb.auth.currentUser;
      const email = user && user.email ? user.email.toLowerCase() : '';
      if (!email) { state.starting = false; showError({}); return; }

      const fs = fb.fs;
      /* orderBy না দিয়ে সাজানো হচ্ছে ক্লায়েন্ট সাইডে — কম্পোজিট ইনডেক্স তৈরির দরকার এড়াতে */
      const q = fs.query(fs.collection(fb.db, 'member_donations'), fs.where('email', '==', email));

      state.unsub = fs.onSnapshot(q, (snapshot) => {
        if (token !== state.token) return;
        const items = snapshot.docs.map((d) => Object.assign({ _id: d.id }, d.data()));
        items.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
        state.items = items;
        render(items);
      }, (err) => {
        if (token !== state.token) return;
        console.error('Donation load error:', err);
        state.unsub = null;
        state.starting = false;
        showError(err);
      });
    }).catch((err) => {
      if (token !== state.token) return;
      console.error('Donation SDK error:', err);
      state.starting = false;
      showError(err);
    });
  };

  (lp.teardowns = lp.teardowns || []).push(stop);
})(window);
