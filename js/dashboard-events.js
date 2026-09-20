/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — সদস্য ড্যাশবোর্ড: আসন্ন ইভেন্ট
   - Firestore-এর 'events' কালেকশন থেকে রিয়েল-টাইমে লোড হয়
   - এডমিন প্যানেল থেকে যোগ/এডিট/ডিলিট করা যায়
   - শুধু আজ ও ভবিষ্যতের ইভেন্ট (লোকাল তারিখ ধরে), তারিখ অনুযায়ী সাজানো
   - "আজ / আগামীকাল / ৩ দিন পর" চিহ্ন এবং "ক্যালেন্ডারে যোগ করুন" (.ics ফাইল, লাইব্রেরি ছাড়া)
   ========================================================================== */
(function (global) {
  'use strict';

  const RJF = (global.RJF = global.RJF || {});
  const lp = RJF.lp;

  const state = (RJF._lpEventState = { unsub: null, items: [], token: 0, starting: false });

  const pad = (n) => String(n).padStart(2, '0');

  const todayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };

  /* 'YYYY-MM-DD' (+ 'HH:MM') → লোকাল Date; ভুল হলে null */
  function parseEventDate(ev) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(ev.event_date || '').trim());
    if (!m) return null;
    const t = /^(\d{1,2}):(\d{2})/.exec(String(ev.event_time || '').trim());
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), t ? Number(t[1]) : 0, t ? Number(t[2]) : 0);
    return isNaN(d.getTime()) ? null : { date: d, hasTime: !!t, y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]), hh: t ? Number(t[1]) : 0, mm: t ? Number(t[2]) : 0 };
  }

  function emptyHtml(iconName, text, retry) {
    return '<div class="lp-empty">' + lp.icon(iconName) + '<p>' + lp.esc(text) + '</p>' +
      (retry ? '<button type="button" class="lp-btn lp-btn--ghost lp-btn--sm" data-retry>' + lp.icon('refresh') + '<span>আবার চেষ্টা করুন</span></button>' : '') +
      '</div>';
  }

  /* ─── .ics তৈরি (RFC 5545) — ইভেন্টের সময় সংগঠনের টাইমজোনে ধরে UTC-তে রূপান্তর ─── */
  function fold(line) {
    /* ৭৫ অক্টেটের সীমা মেনে লাইন ভাঙা (UTF-8 বাইট গুনে) */
    const out = [];
    let cur = '';
    let bytes = 0;
    let limit = 75;
    for (const ch of line) {
      const b = unescape(encodeURIComponent(ch)).length;
      if (bytes + b > limit) { out.push(cur); cur = ' '; bytes = 1; limit = 75; }
      cur += ch;
      bytes += b;
    }
    out.push(cur);
    return out.join('\r\n');
  }

  function buildIcs(ev, info) {
    const tz = (RJF.loginConfig && RJF.loginConfig.eventTzOffsetMin) || 360;
    const stamp = (ms) => {
      const d = new Date(ms);
      return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
    };
    const ymd = (d) => d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
    const escText = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

    let when;
    if (info.hasTime) {
      const startUtc = Date.UTC(info.y, info.mo - 1, info.d, info.hh, info.mm) - tz * 60000;
      when = ['DTSTART:' + stamp(startUtc), 'DTEND:' + stamp(startUtc + 2 * 3600000)];
    } else {
      when = [
        'DTSTART;VALUE=DATE:' + ymd(new Date(Date.UTC(info.y, info.mo - 1, info.d))),
        'DTEND;VALUE=DATE:' + ymd(new Date(Date.UTC(info.y, info.mo - 1, info.d + 1)))
      ];
    }

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rupsha Jonokollan Foundation//Member Portal//BN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + (ev._id || Date.now()) + '@rjf-member-portal',
      'DTSTAMP:' + stamp(Date.now())
    ].concat(when, ['SUMMARY:' + escText(ev.title || 'ইভেন্ট')]);
    if (ev.location) lines.push('LOCATION:' + escText(ev.location));
    if (ev.description) lines.push('DESCRIPTION:' + escText(ev.description));
    lines.push('END:VEVENT', 'END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }

  function whenChip(days) {
    if (days === 0) return '<span class="lp-when lp-when--today">আজ</span>';
    if (days === 1) return '<span class="lp-when lp-when--soon">আগামীকাল</span>';
    if (days > 1 && days <= 60) return '<span class="lp-when">' + lp.bn(days) + ' দিন পর</span>';
    return '';
  }

  function render(items) {
    const wrap = lp.byId('lpEventList');
    const count = lp.byId('lpEventCount');
    if (count) {
      count.hidden = !items.length;
      count.textContent = items.length ? lp.bn(items.length) : '';
    }
    if (!wrap) return;

    if (!items.length) {
      wrap.innerHTML = emptyHtml('calendar', 'আসন্ন কোনো ইভেন্ট নেই');
      return;
    }

    const now = new Date();
    wrap.innerHTML = items.map((ev, i) => {
      const info = parseEventDate(ev);
      const day = info ? lp.bn(info.d) : '—';
      const month = info ? lp.MONTHS_SHORT[info.mo - 1] : '';
      const chip = info ? whenChip(lp.daysBetween(now, info.date)) : '';
      const timeLabel = info && info.hasTime ? lp.formatTime(info.date) : '';
      const dateLabel = info ? lp.WEEKDAYS[info.date.getDay()] + ', ' + lp.formatDate(info.date) : '';

      return '<article class="lp-item lp-event">' +
        '<div class="lp-event__date" aria-hidden="true"><span class="lp-event__day">' + day + '</span><span class="lp-event__month">' + lp.esc(month) + '</span></div>' +
        '<div class="lp-event__body">' +
          '<div class="lp-event__top"><h3 class="lp-event__title">' + lp.esc(ev.title || '') + '</h3>' + chip + '</div>' +
          (dateLabel ? '<p class="lp-event__meta">' + lp.icon('calendar') + '<span>' + lp.esc(dateLabel) + '</span></p>' : '') +
          (timeLabel ? '<p class="lp-event__meta">' + lp.icon('clock') + '<span>' + lp.esc(timeLabel) + '</span></p>' : '') +
          (ev.location ? '<p class="lp-event__meta">' + lp.icon('map-pin') + '<span>' + lp.esc(ev.location) + '</span></p>' : '') +
          (ev.description ? '<p class="lp-event__desc">' + lp.linkify(ev.description) + '</p>' : '') +
          (info ? '<button type="button" class="lp-btn lp-btn--ghost lp-btn--sm lp-event__add" data-ics="' + i + '">' + lp.icon('calendar-plus') + '<span>ক্যালেন্ডারে যোগ করুন</span></button>' : '') +
        '</div>' +
      '</article>';
    }).join('');
  }

  function bindList() {
    const wrap = lp.byId('lpEventList');
    if (!wrap) return;
    wrap.onclick = (e) => {
      const add = e.target.closest('[data-ics]');
      if (add) {
        const ev = state.items[Number(add.dataset.ics)];
        const info = ev && parseEventDate(ev);
        if (!ev || !info) return;
        const blob = new Blob([buildIcs(ev, info)], { type: 'text/calendar;charset=utf-8' });
        lp.download('event-' + String(ev._id || 'rjf').replace(/[^A-Za-z0-9_-]/g, '') + '.ics', blob);
        lp.toast('ক্যালেন্ডার ফাইল নামানো হয়েছে — খুলে যোগ করে নিন।', 'success');
        return;
      }
      if (e.target.closest('[data-retry]')) {
        wrap.innerHTML = lp.skeleton(3);
        RJF.initDashboardEvents();
      }
    };
  }

  function showError() {
    const wrap = lp.byId('lpEventList');
    if (wrap) wrap.innerHTML = emptyHtml('wifi-off', 'ইভেন্ট লোড করা যায়নি — ইন্টারনেট সংযোগ পরীক্ষা করুন।', true);
  }

  function stop() {
    state.token += 1;
    if (state.unsub) { try { state.unsub(); } catch (e) { /* উপেক্ষা */ } }
    state.unsub = null;
    state.starting = false;
    state.items = [];
  }

  RJF.initDashboardEvents = function () {
    bindList();
    if (state.unsub || state.starting) return;
    state.starting = true;
    const token = ++state.token;

    lp.getFirebase().then((firebase) => {
      if (token !== state.token) return;
      const fs = firebase.fs;
      const q = fs.query(fs.collection(firebase.db, 'events'), fs.orderBy('event_date', 'asc'));

      state.unsub = fs.onSnapshot(q, (snapshot) => {
        if (token !== state.token) return;
        const today = todayStr();
        const items = snapshot.docs
          .map((d) => Object.assign({ _id: d.id }, d.data()))
          .filter((ev) => !ev.event_date || ev.event_date >= today)
          /* একই দিনে একাধিক ইভেন্ট হলে সময় অনুযায়ী */
          .sort((a, b) => String(a.event_date || '').localeCompare(String(b.event_date || '')) ||
            String(a.event_time || '').localeCompare(String(b.event_time || '')));
        state.items = items;
        render(items);
      }, (err) => {
        if (token !== state.token) return;
        console.error('Event load error:', err);
        state.unsub = null;
        state.starting = false;
        showError();
      });
    }).catch((err) => {
      if (token !== state.token) return;
      console.error('Event SDK error:', err);
      state.starting = false;
      showError();
    });
  };

  RJF._lpRenderEvents = render;
  RJF._lpBuildIcs = buildIcs;

  (lp.teardowns = lp.teardowns || []).push(stop);
})(window);
