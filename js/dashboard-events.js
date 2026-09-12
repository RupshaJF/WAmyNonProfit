/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — সদস্য ড্যাশবোর্ড: আসন্ন ইভেন্ট
   - Firestore-এর 'events' কালেকশন থেকে রিয়েল-টাইমে লোড হয়
   - এডমিন প্যানেল থেকে যোগ/এডিট/ডিলিট করা যায়
   - শুধু আজ ও ভবিষ্যতের ইভেন্ট দেখায়, তারিখ অনুযায়ী সাজানো
   ========================================================================== */
window.RJF = window.RJF || {};

RJF._lpEventState = { unsub: null, items: [] };

RJF._lpMonthsBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্ট', 'অক্টো', 'নভে', 'ডিসে'];

RJF.initDashboardEvents = function () {
  if (RJF._lpEventState.unsub) return;

  RJF._lpGetFirebase().then(function (firebase) {
    var fs = firebase.fs;
    var db = firebase.db;

    var q = fs.query(
      fs.collection(db, 'events'),
      fs.orderBy('event_date', 'asc')
    );

    RJF._lpEventState.unsub = fs.onSnapshot(q, function (snapshot) {
      var today = new Date().toISOString().slice(0, 10);

      var items = snapshot.docs
        .map(function (d) { return Object.assign({ _id: d.id }, d.data()); })
        .filter(function (ev) { return !ev.event_date || ev.event_date >= today; });

      RJF._lpEventState.items = items;
      RJF._lpRenderEvents(items);
    }, function (err) {
      console.error('Event load error:', err);
      var wrap = document.getElementById('lpEventList');
      if (wrap) {
        wrap.innerHTML = '<div class="lp-list-empty"><i class="fa-solid fa-triangle-exclamation"></i><br>ইভেন্ট লোড করা যায়নি — ইন্টারনেট সংযোগ পরীক্ষা করুন।</div>';
      }
    });
  });
};

RJF._lpRenderEvents = function (items) {
  var wrap = document.getElementById('lpEventList');
  if (!wrap) return;

  if (!items.length) {
    wrap.innerHTML = '<div class="lp-list-empty"><i class="fa-solid fa-calendar-days"></i><br>আসন্ন কোনো ইভেন্ট নেই</div>';
    return;
  }

  wrap.innerHTML = items.map(function (ev) {
    var d = ev.event_date ? new Date(ev.event_date + 'T' + (ev.event_time || '00:00')) : null;
    var valid = d && !isNaN(d.getTime());
    var day = valid ? d.getDate() : '—';
    var month = valid ? RJF._lpMonthsBn[d.getMonth()] : '';
    var timeLabel = (ev.event_time && valid) ? d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '';

    return (
      '<div class="lp-event-item">' +
        '<div class="lp-event-date-badge"><span class="lp-event-day">' + day + '</span><span class="lp-event-month">' + month + '</span></div>' +
        '<div class="lp-event-body">' +
          '<div class="lp-event-title">' + RJF._lpEsc(ev.title || '') + '</div>' +
          (ev.location ? '<div class="lp-event-meta"><i class="fa-solid fa-location-dot"></i> ' + RJF._lpEsc(ev.location) + '</div>' : '') +
          (timeLabel ? '<div class="lp-event-meta"><i class="fa-solid fa-clock"></i> ' + timeLabel + '</div>' : '') +
          (ev.description ? '<div class="lp-event-desc">' + RJF._lpEsc(ev.description) + '</div>' : '') +
        '</div>' +
      '</div>'
    );
  }).join('');
};
