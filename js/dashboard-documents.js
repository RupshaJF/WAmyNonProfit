/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — সদস্য ড্যাশবোর্ড: সদস্য-বিশেষ ডকুমেন্ট
   - Firestore-এর 'member_documents' কালেকশন থেকে রিয়েল-টাইমে লোড হয়
   - অ্যাডমিন প্যানেল থেকে যোগ/এডিট/ডিলিট; শুধু অনুমোদিত সদস্যরা দেখতে পারেন (firestore.rules)
   - নিয়মাবলী, বার্ষিক রিপোর্ট, মিটিং মিনিটস ইত্যাদির লিংক এখানে দেখানো যায়
   ========================================================================== */
(function (global) {
  'use strict';

  const RJF = (global.RJF = global.RJF || {});
  const lp = RJF.lp;

  const state = (RJF._lpDocState = { unsub: null, items: [], token: 0, starting: false });

  function emptyHtml(iconName, text, retry) {
    return '<div class="lp-empty">' + lp.icon(iconName) + '<p>' + lp.esc(text) + '</p>' +
      (retry ? '<button type="button" class="lp-btn lp-btn--ghost lp-btn--sm" data-retry>' + lp.icon('refresh') + '<span>আবার চেষ্টা করুন</span></button>' : '') +
      '</div>';
  }

  function render(items) {
    const wrap = lp.byId('lpDocumentList');
    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = emptyHtml('file-text', 'এখনো কোনো ডকুমেন্ট যোগ করা হয়নি।');
      return;
    }

    wrap.innerHTML = items.map((doc) => {
      const url = lp.safeUrl(doc.file_url);
      const created = lp.toDate(doc.created_at);
      return '<article class="lp-item lp-doc">' +
        '<div class="lp-doc__icon">' + lp.icon('file-text') + '</div>' +
        '<div class="lp-doc__body">' +
          '<h3 class="lp-doc__title">' + lp.esc(doc.title || '') + '</h3>' +
          '<div class="lp-doc__meta">' +
            (doc.category ? '<span class="lp-chip lp-chip--ok">' + lp.esc(doc.category) + '</span>' : '') +
            (created ? '<span>' + lp.esc(lp.formatDate(created)) + '</span>' : '') +
          '</div>' +
          (doc.description ? '<p class="lp-doc__desc">' + lp.linkify(doc.description) + '</p>' : '') +
          (url ? '<a class="lp-btn lp-btn--ghost lp-btn--sm lp-doc__open" href="' + lp.esc(url) + '" target="_blank" rel="noopener noreferrer">' + lp.icon('download') + '<span>দেখুন / ডাউনলোড</span></a>' : '') +
        '</div>' +
      '</article>';
    }).join('');
  }

  function bindList() {
    const wrap = lp.byId('lpDocumentList');
    if (!wrap) return;
    wrap.onclick = (e) => {
      if (e.target.closest('[data-retry]')) {
        wrap.innerHTML = lp.skeleton(3);
        RJF.initDashboardDocuments();
      }
    };
  }

  function showError(err) {
    const wrap = lp.byId('lpDocumentList');
    if (!wrap) return;
    if (err && err.code === 'permission-denied') {
      /* firestore.rules: ডকুমেন্ট শুধু অনুমোদিত সদস্যদের জন্য */
      wrap.innerHTML = emptyHtml('lock', 'ডকুমেন্ট শুধু অনুমোদিত সদস্যরা দেখতে পারেন। সদস্যপদ অনুমোদিত হলে এখানে দেখতে পাবেন।', false);
      return;
    }
    wrap.innerHTML = emptyHtml('wifi-off', 'ডকুমেন্ট লোড করা যায়নি — ইন্টারনেট সংযোগ পরীক্ষা করুন।', true);
  }

  function stop() {
    state.token += 1;
    if (state.unsub) { try { state.unsub(); } catch (e) { /* উপেক্ষা */ } }
    state.unsub = null;
    state.starting = false;
    state.items = [];
  }

  RJF.initDashboardDocuments = function () {
    bindList();
    if (state.unsub || state.starting) return;
    state.starting = true;
    const token = ++state.token;

    lp.getFirebase().then((firebase) => {
      if (token !== state.token) return;
      const fs = firebase.fs;
      const q = fs.query(fs.collection(firebase.db, 'member_documents'), fs.orderBy('created_at', 'desc'));

      state.unsub = fs.onSnapshot(q, (snapshot) => {
        if (token !== state.token) return;
        const items = snapshot.docs.map((d) => Object.assign({ _id: d.id }, d.data()));
        state.items = items;
        render(items);
      }, (err) => {
        if (token !== state.token) return;
        console.error('Document load error:', err);
        state.unsub = null;
        state.starting = false;
        showError(err);
      });
    }).catch((err) => {
      if (token !== state.token) return;
      console.error('Document SDK error:', err);
      state.starting = false;
      showError(err);
    });
  };

  (lp.teardowns = lp.teardowns || []).push(stop);
})(window);
