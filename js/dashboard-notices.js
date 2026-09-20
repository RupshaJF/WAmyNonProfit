/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — সদস্য ড্যাশবোর্ড: নোটিশ/ঘোষণা
   - Firestore-এর 'notices' কালেকশন থেকে রিয়েল-টাইমে লোড হয়
   - এডমিন প্যানেল থেকে যোগ/এডিট/ডিলিট করা যায়
   - পিন করা নোটিশ সবার উপরে; নতুন নোটিশে "নতুন" চিহ্ন ও ট্যাবে ডট
   - লম্বা নোটিশ "আরও পড়ুন" দিয়ে খোলে; লেখার ভেতরের http/https লিংক ক্লিকযোগ্য
   ========================================================================== */
(function (global) {
  'use strict';

  const RJF = (global.RJF = global.RJF || {});
  const lp = RJF.lp;

  const SEEN_KEY = 'rjf_notice_seen_ts'; /* আগের ভার্সনের সাথে একই key */
  const LONG_TEXT = 200; /* এর চেয়ে লম্বা হলে "আরও পড়ুন" */
  const NEW_WINDOW_MS = 14 * 86400000; /* "নতুন" চিহ্ন শুধু গত ১৪ দিনের নোটিশে */

  const state = (RJF._lpNoticeState = { unsub: null, items: [], token: 0, starting: false, seenAtOpen: 0 });

  const millis = (n) => {
    const d = lp.toDate(n.created_at);
    return d ? d.getTime() : 0;
  };
  const latestMillis = (items) => items.reduce((max, n) => Math.max(max, millis(n)), 0);
  const readSeen = () => parseInt(lp.ls.get(SEEN_KEY) || '0', 10) || 0;

  function emptyHtml(iconName, text, retry) {
    return '<div class="lp-empty">' + lp.icon(iconName) + '<p>' + lp.esc(text) + '</p>' +
      (retry ? '<button type="button" class="lp-btn lp-btn--ghost lp-btn--sm" data-retry>' + lp.icon('refresh') + '<span>আবার চেষ্টা করুন</span></button>' : '') +
      '</div>';
  }

  function render(items) {
    const wrap = lp.byId('lpNoticeList');
    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = emptyHtml('megaphone', 'এই মুহূর্তে কোনো নোটিশ নেই');
      return;
    }

    wrap.innerHTML = items.map((n, i) => {
      const created = lp.toDate(n.created_at);
      const isNew = created && created.getTime() > state.seenAtOpen && (Date.now() - created.getTime()) < NEW_WINDOW_MS;
      const body = String(n.body || '');
      const long = body.length > LONG_TEXT || body.split('\n').length > 4;
      const chips =
        (n.pinned ? '<span class="lp-chip lp-chip--pin">' + lp.icon('pin') + '<span>গুরুত্বপূর্ণ</span></span>' : '') +
        (isNew ? '<span class="lp-chip lp-chip--new">নতুন</span>' : '');

      return '<article class="lp-item lp-notice' + (n.pinned ? ' is-pinned' : '') + '">' +
        (chips ? '<div class="lp-notice__chips">' + chips + '</div>' : '') +
        '<h3 class="lp-notice__title">' + lp.esc(n.title || '') + '</h3>' +
        (body
          ? '<div class="lp-notice__body' + (long ? ' is-clamped' : '') + '" id="lpNoticeBody' + i + '">' + lp.linkify(body) + '</div>' +
            (long ? '<button type="button" class="lp-more" data-more aria-expanded="false" aria-controls="lpNoticeBody' + i + '">আরও পড়ুন</button>' : '')
          : '') +
        (created
          ? '<p class="lp-notice__meta">' + lp.icon('clock') +
            '<time datetime="' + lp.esc(created.toISOString()) + '" title="' + lp.esc(lp.formatDateTime(created)) + '">' + lp.esc(lp.relativeTime(created)) + '</time></p>'
          : '') +
        '</article>';
    }).join('');
  }

  function checkUnread(items) {
    const dot = lp.byId('lpNoticeDot');
    if (!dot) return;
    const latest = latestMillis(items);
    const panelOpen = (() => { const p = lp.byId('lpPanelNotices'); return p && !p.hidden; })();
    dot.hidden = !(latest && latest > readSeen()) || panelOpen;
  }

  function bindList() {
    const wrap = lp.byId('lpNoticeList');
    if (!wrap) return;
    wrap.onclick = (e) => {
      const more = e.target.closest('[data-more]');
      if (more) {
        const body = lp.byId(more.getAttribute('aria-controls'));
        const open = more.getAttribute('aria-expanded') !== 'true';
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
        more.textContent = open ? 'কম দেখুন' : 'আরও পড়ুন';
        if (body) body.classList.toggle('is-clamped', !open);
        return;
      }
      if (e.target.closest('[data-retry]')) {
        wrap.innerHTML = lp.skeleton(3);
        RJF.initDashboardNotices();
      }
    };
  }

  function showError() {
    const wrap = lp.byId('lpNoticeList');
    if (wrap) wrap.innerHTML = emptyHtml('wifi-off', 'নোটিশ লোড করা যায়নি — ইন্টারনেট সংযোগ পরীক্ষা করুন।', true);
  }

  function stop() {
    state.token += 1; /* অপেক্ষমান async কাজ বাতিল */
    if (state.unsub) { try { state.unsub(); } catch (e) { /* উপেক্ষা */ } }
    state.unsub = null;
    state.starting = false;
    state.items = [];
  }

  RJF.initDashboardNotices = function () {
    bindList();
    /* একবার লিসেনার চালু হলে আবার নতুন করে বসানোর দরকার নেই */
    if (state.unsub || state.starting) return;
    state.starting = true;
    state.seenAtOpen = readSeen();
    const token = ++state.token;

    lp.getFirebase().then((firebase) => {
      if (token !== state.token) return;
      const fs = firebase.fs;
      const q = fs.query(fs.collection(firebase.db, 'notices'), fs.orderBy('created_at', 'desc'), fs.limit(20));

      state.unsub = fs.onSnapshot(q, (snapshot) => {
        if (token !== state.token) return;
        const items = snapshot.docs.map((d) => Object.assign({ _id: d.id }, d.data()));
        /* পিন করা নোটিশ সবসময় সবার উপরে (sort স্থিতিশীল, তাই বাকি ক্রম ঠিক থাকে) */
        items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        state.items = items;
        render(items);
        checkUnread(items);
        /* নোটিশ ট্যাব খোলা অবস্থায় নতুন নোটিশ এলে সাথে সাথে "দেখা" ধরে নেওয়া */
        const panel = lp.byId('lpPanelNotices');
        if (panel && !panel.hidden) RJF._lpMarkNoticesSeen();
      }, (err) => {
        if (token !== state.token) return;
        console.error('Notice load error:', err);
        state.unsub = null;
        state.starting = false;
        showError();
      });
    }).catch((err) => {
      if (token !== state.token) return;
      console.error('Notice SDK error:', err);
      state.starting = false;
      showError();
    });
  };

  RJF._lpRenderNotices = render;
  RJF._lpCheckUnreadNotice = checkUnread;

  /* ট্যাব খুললে "দেখা হয়েছে" — লাস্ট-সিন টাইমস্ট্যাম্প সংরক্ষণ, ডট মুছে ফেলা */
  RJF._lpMarkNoticesSeen = function () {
    const latest = latestMillis(state.items || []);
    if (latest) lp.ls.set(SEEN_KEY, String(latest));
    const dot = lp.byId('lpNoticeDot');
    if (dot) dot.hidden = true;
  };

  (lp.teardowns = lp.teardowns || []).push(stop);
})(window);
