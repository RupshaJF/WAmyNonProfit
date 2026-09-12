/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — সদস্য ড্যাশবোর্ড: নোটিশ/ঘোষণা
   - Firestore-এর 'notices' কালেকশন থেকে রিয়েল-টাইমে লোড হয়
   - এডমিন প্যানেল থেকে যোগ/এডিট/ডিলিট করা যায়
   - পিন করা নোটিশ সবার উপরে থাকে, নতুন নোটিশ এলে ট্যাবে লাল ডট দেখায়
   ========================================================================== */
window.RJF = window.RJF || {};

RJF._lpNoticeState = { unsub: null, items: [] };

RJF.initDashboardNotices = function () {
  /* একবার লিসেনার চালু হলে আবার নতুন করে বসানোর দরকার নেই */
  if (RJF._lpNoticeState.unsub) return;

  RJF._lpGetFirebase().then(function (firebase) {
    var fs = firebase.fs;
    var db = firebase.db;

    var q = fs.query(
      fs.collection(db, 'notices'),
      fs.orderBy('created_at', 'desc'),
      fs.limit(20)
    );

    RJF._lpNoticeState.unsub = fs.onSnapshot(q, function (snapshot) {
      var items = snapshot.docs.map(function (d) {
        return Object.assign({ _id: d.id }, d.data());
      });

      /* পিন করা নোটিশ সবসময় সবার উপরে */
      items.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });

      RJF._lpNoticeState.items = items;
      RJF._lpRenderNotices(items);
      RJF._lpCheckUnreadNotice(items);
    }, function (err) {
      console.error('Notice load error:', err);
      var wrap = document.getElementById('lpNoticeList');
      if (wrap) {
        wrap.innerHTML = '<div class="lp-list-empty"><i class="fa-solid fa-triangle-exclamation"></i><br>নোটিশ লোড করা যায়নি — ইন্টারনেট সংযোগ পরীক্ষা করুন।</div>';
      }
    });
  });
};

RJF._lpRenderNotices = function (items) {
  var wrap = document.getElementById('lpNoticeList');
  if (!wrap) return;

  if (!items.length) {
    wrap.innerHTML = '<div class="lp-list-empty"><i class="fa-solid fa-bullhorn"></i><br>এই মুহূর্তে কোনো নোটিশ নেই</div>';
    return;
  }

  wrap.innerHTML = items.map(function (n) {
    return (
      '<div class="lp-notice-item' + (n.pinned ? ' pinned' : '') + '">' +
        (n.pinned
          ? '<div class="lp-notice-pin"><i class="fa-solid fa-thumbtack"></i> গুরুত্বপূর্ণ নোটিশ</div>'
          : '') +
        '<div class="lp-notice-title">' + RJF._lpEsc(n.title || '') + '</div>' +
        (n.body ? '<div class="lp-notice-body">' + RJF._lpEsc(n.body) + '</div>' : '') +
        '<div class="lp-notice-date"><i class="fa-solid fa-clock"></i> ' + RJF._lpFmtTimestamp(n.created_at) + '</div>' +
      '</div>'
    );
  }).join('');
};

/* ─── নতুন নোটিশ এলে ট্যাবে ছোট্ট লাল ডট দেখানো (localStorage-এ লাস্ট দেখা টাইমস্ট্যাম্প রাখা হয়) ─── */
RJF._lpCheckUnreadNotice = function (items) {
  var dot = document.getElementById('lpNoticeDot');
  if (!dot || !items.length) return;

  var latest = items.reduce(function (max, n) {
    var t = (n.created_at && n.created_at.toMillis) ? n.created_at.toMillis() : 0;
    return t > max ? t : max;
  }, 0);
  if (!latest) return;

  var seen = 0;
  try { seen = parseInt(localStorage.getItem('rjf_notice_seen_ts') || '0', 10); } catch (e) {}

  dot.hidden = !(latest > seen);
};

RJF._lpMarkNoticesSeen = function () {
  var items = RJF._lpNoticeState.items || [];
  var latest = items.reduce(function (max, n) {
    var t = (n.created_at && n.created_at.toMillis) ? n.created_at.toMillis() : 0;
    return t > max ? t : max;
  }, 0);

  if (latest) {
    try { localStorage.setItem('rjf_notice_seen_ts', String(latest)); } catch (e) {}
  }

  var dot = document.getElementById('lpNoticeDot');
  if (dot) dot.hidden = true;
};
