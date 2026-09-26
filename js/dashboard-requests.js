/* ==========================================================================
   রূপসা জনকল্যাণ ফাউন্ডেশন — সদস্য ড্যাশবোর্ড: তথ্য পরিবর্তনের অনুরোধ
   - প্রোফাইল ট্যাবে মোবাইল/ঠিকানার পাশে ছোট্ট এডিট বাটন বসায় (কোনো dashTemplate পরিবর্তন লাগে না)
   - বাটনে চাপলে ডায়ালগ খোলে → নতুন মান দিলে 'profile_change_requests'-এ জমা হয়
   - অ্যাডমিন প্যানেল থেকে অনুমোদন করলে members ডকুমেন্ট নিজে থেকেই আপডেট হয়ে যায়
   - নিজের পেন্ডিং অনুরোধ রিয়েল-টাইমে দেখায়; পেন্ডিং থাকা অবস্থায় একই ফিল্ডে আবার অনুরোধ করা যায় না
   ========================================================================== */
(function (global) {
  'use strict';

  const RJF = (global.RJF = global.RJF || {});
  const lp = RJF.lp;

  /* সদস্য ড্যাশবোর্ডে যে দুটি ফিল্ড দেখানো হয়, শুধু সেগুলোর জন্যই পরিবর্তনের অনুরোধ চলবে */
  const FIELDS = {
    mobile_number: { label: 'মোবাইল নম্বর' },
    permanent_address: { label: 'স্থায়ী ঠিকানা' }
  };

  const state = (RJF._lpReqState = { unsub: null, items: [], token: 0, starting: false });
  let activeField = null;
  let busy = false;

  function pendingFor(field) {
    return state.items.some((r) => r.field === field && r.status === 'pending');
  }

  /* ── প্রোফাইলের সারিতে এডিট বাটন/পেন্ডিং-নোট বসানো ── */
  function paintRow(field) {
    const rowId = field === 'mobile_number' ? 'lpMobile' : 'lpAddress';
    const valueEl = lp.byId(rowId);
    if (!valueEl) return;
    const dd = valueEl.closest('dd');
    const row = valueEl.closest('.lp-info__row');
    if (!dd || !row) return;

    let btn = dd.querySelector('[data-req-field="' + field + '"]');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lp-iconbtn';
      btn.dataset.reqField = field;
      btn.setAttribute('aria-label', FIELDS[field].label + ' পরিবর্তনের অনুরোধ পাঠান');
      btn.innerHTML = lp.icon('edit');
      btn.addEventListener('click', () => openDialog(field));
      dd.appendChild(btn);
    }

    const pending = pendingFor(field);
    btn.hidden = pending;

    let hint = row.querySelector('.lp-req-hint');
    if (pending) {
      if (!hint) {
        hint = document.createElement('p');
        hint.className = 'lp-hint lp-hint--warn lp-req-hint';
        row.appendChild(hint);
      }
      hint.innerHTML = lp.icon('clock') + '<span>পরিবর্তনের অনুরোধ পর্যালোচনাধীন</span>';
    } else if (hint) {
      hint.remove();
    }
  }

  function paintAll() { Object.keys(FIELDS).forEach(paintRow); }

  /* ── ডায়ালগ (lpRoot-এর ভেতরে, একবারই বসে — mount() নতুন করে DOM বানালে আবার বসে) ── */
  function ensureDialog() {
    let d = lp.byId('lpReqDialog');
    if (d) return d;
    const root = lp.byId('lpRoot');
    if (!root) return null;

    const wrap = document.createElement('div');
    wrap.innerHTML =
      '<dialog class="lp-dialog" id="lpReqDialog" aria-labelledby="lpReqTitle">' +
        '<div class="lp-dialog__head">' +
          '<span class="lp-dialog__icon">' + lp.icon('edit') + '</span>' +
          '<h2 class="lp-dialog__title" id="lpReqTitle">তথ্য পরিবর্তনের অনুরোধ</h2>' +
          '<button type="button" class="lp-iconbtn" data-close aria-label="বন্ধ করুন">' + lp.icon('x') + '</button>' +
        '</div>' +
        '<div id="lpReqForm">' +
          '<p class="lp-dialog__desc" id="lpReqLabel">—</p>' +
          '<div class="lp-field">' +
            '<label class="lp-label">বর্তমান মান</label>' +
            '<p id="lpReqCurrent" style="font-weight:600;">—</p>' +
          '</div>' +
          '<div class="lp-field">' +
            '<label class="lp-label" for="lpReqNew" id="lpReqNewLabel">নতুন মান</label>' +
            '<div class="lp-control"><input class="lp-input" id="lpReqNew" type="text" autocomplete="off"></div>' +
            '<p class="lp-error" id="lpReqNewErr" hidden></p>' +
          '</div>' +
          '<div class="lp-field">' +
            '<label class="lp-label" for="lpReqNote">কারণ / মন্তব্য (ঐচ্ছিক)</label>' +
            '<div class="lp-control"><textarea class="lp-input" id="lpReqNote" rows="2" maxlength="300"></textarea></div>' +
          '</div>' +
          '<div class="lp-alert lp-alert--error" id="lpReqAlert" role="alert" hidden></div>' +
          '<button type="button" class="lp-btn lp-btn--primary lp-btn--block" id="lpReqSend">' +
            '<span class="lp-btn__label">' + lp.icon('send') + '<span>অনুরোধ পাঠান</span></span>' +
            '<span class="lp-spin" aria-hidden="true"></span>' +
          '</button>' +
        '</div>' +
        '<div id="lpReqDone" hidden>' +
          '<div class="lp-done">' +
            '<span class="lp-done__icon">' + lp.icon('check') + '</span>' +
            '<h3 class="lp-done__title">অনুরোধ পাঠানো হয়েছে</h3>' +
            '<p class="lp-done__msg">অ্যাডমিন পর্যালোচনা করে অনুমোদন করলে তথ্য আপডেট হয়ে যাবে।</p>' +
          '</div>' +
          '<div class="lp-dialog__actions">' +
            '<button type="button" class="lp-btn lp-btn--primary lp-btn--block" data-close>ঠিক আছে</button>' +
          '</div>' +
        '</div>' +
      '</dialog>';

    d = wrap.firstElementChild;
    root.appendChild(d);

    d.addEventListener('click', (e) => {
      if (e.target.closest && e.target.closest('[data-close]')) { lp.closeDialog(d); return; }
      if (e.target === d) lp.closeDialog(d); /* ব্যাকড্রপে ক্লিক */
    });
    lp.byId('lpReqSend').addEventListener('click', submit);
    return d;
  }

  function openDialog(field) {
    activeField = field;
    const d = ensureDialog();
    if (!d) return;
    const conf = FIELDS[field];
    const session = RJF._lpGetSession && RJF._lpGetSession();
    const current = String((session && session.member && session.member[field]) || '').trim();

    lp.byId('lpReqForm').hidden = false;
    lp.byId('lpReqDone').hidden = true;
    lp.byId('lpReqLabel').textContent = conf.label + ' পরিবর্তনের অনুরোধ পাঠাচ্ছেন।';
    lp.byId('lpReqCurrent').textContent = current || 'নেই';
    lp.byId('lpReqNewLabel').textContent = 'নতুন ' + conf.label;
    const input = lp.byId('lpReqNew');
    input.type = field === 'mobile_number' ? 'tel' : 'text';
    input.value = '';
    lp.byId('lpReqNote').value = '';
    lp.byId('lpReqAlert').hidden = true;
    lp.byId('lpReqNewErr').hidden = true;

    lp.openDialog(d);
    setTimeout(() => input.focus(), 60);
  }

  function setBusy(b) {
    busy = b;
    const btn = lp.byId('lpReqSend');
    if (!btn) return;
    btn.classList.toggle('is-busy', b);
    btn.disabled = b;
  }

  function submit() {
    if (busy || !activeField) return;
    const field = activeField;
    const conf = FIELDS[field];
    const input = lp.byId('lpReqNew');
    const errEl = lp.byId('lpReqNewErr');
    const value = lp.cleanInput(input.value);
    errEl.hidden = true;

    if (!value) { errEl.textContent = 'নতুন মান লিখুন।'; errEl.hidden = false; return; }
    if (Array.from(value).length > 300) { errEl.textContent = 'অনেক বড় — ৩০০ অক্ষরের মধ্যে লিখুন।'; errEl.hidden = false; return; }
    if (field === 'mobile_number' && !/^01[3-9][0-9]{8}$/.test(value)) {
      errEl.textContent = 'সঠিক মোবাইল নম্বর দিন (যেমন 01XXXXXXXXX)।';
      errEl.hidden = false;
      return;
    }
    if (field === 'permanent_address' && Array.from(value).length < 3) {
      errEl.textContent = 'ঠিকানা কমপক্ষে ৩ অক্ষরের হতে হবে।';
      errEl.hidden = false;
      return;
    }

    const session = RJF._lpGetSession && RJF._lpGetSession();
    const note = lp.cleanInput(lp.byId('lpReqNote').value).slice(0, 300);
    setBusy(true);
    lp.byId('lpReqAlert').hidden = true;

    lp.getFirebase().then((fb) => {
      const ready = typeof fb.auth.authStateReady === 'function' ? fb.auth.authStateReady() : Promise.resolve();
      return ready.then(() => fb);
    }).then((fb) => {
      const user = fb.auth.currentUser;
      const email = user && user.email ? user.email.toLowerCase() : '';
      if (!email) throw Object.assign(new Error('signedout'), { code: 'app/signedout' });

      const fs = fb.fs;
      const current = String((session && session.member && session.member[field]) || '').trim();
      const payload = {
        email,
        field,
        new_value: value,
        status: 'pending',
        created_at: fs.serverTimestamp()
      };
      if (current) payload.current_value = current.slice(0, 300);
      if (note) payload.note = note;
      if (session && session.member) {
        if (session.member.member_id) payload.member_id = session.member.member_id;
        if (session.member.full_name) payload.full_name = session.member.full_name;
      }
      return fs.addDoc(fs.collection(fb.db, 'profile_change_requests'), payload);
    }).then(() => {
      lp.byId('lpReqForm').hidden = true;
      lp.byId('lpReqDone').hidden = false;
      lp.toast('অনুরোধ পাঠানো হয়েছে।', 'success');
    }).catch((err) => {
      console.error('Change request error:', err);
      const alertEl = lp.byId('lpReqAlert');
      if (err && err.code === 'permission-denied') {
        alertEl.textContent = 'সদস্যপদ এখনো অনুমোদিত না হওয়া পর্যন্ত এই সুবিধা চালু হয় না।';
      } else {
        alertEl.textContent = 'অনুরোধ পাঠানো যায়নি — ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।';
      }
      alertEl.hidden = false;
    }).finally(() => setBusy(false));
  }

  function stop() {
    state.token += 1;
    if (state.unsub) { try { state.unsub(); } catch (e) { /* উপেক্ষা */ } }
    state.unsub = null;
    state.starting = false;
    state.items = [];
    activeField = null;
  }

  RJF.initDashboardRequests = function () {
    paintAll(); /* সেশনের ক্যাশ করা তালিকা দিয়ে সাথে সাথেই বাটন/স্ট্যাটাস দেখানো */

    if (state.unsub || state.starting) return;
    state.starting = true;
    const token = ++state.token;

    lp.getFirebase().then((fb) => {
      const ready = typeof fb.auth.authStateReady === 'function' ? fb.auth.authStateReady() : Promise.resolve();
      return ready.then(() => fb);
    }).then((fb) => {
      if (token !== state.token) return;
      const user = fb.auth.currentUser;
      const email = user && user.email ? user.email.toLowerCase() : '';
      if (!email) { state.starting = false; return; }

      const fs = fb.fs;
      const q = fs.query(fs.collection(fb.db, 'profile_change_requests'), fs.where('email', '==', email));
      state.unsub = fs.onSnapshot(q, (snapshot) => {
        if (token !== state.token) return;
        state.items = snapshot.docs.map((d) => Object.assign({ _id: d.id }, d.data()));
        paintAll();
      }, (err) => {
        if (token !== state.token) return;
        console.error('Change request list error:', err);
        state.unsub = null;
        state.starting = false;
      });
    }).catch((err) => {
      if (token !== state.token) return;
      console.error('Change request SDK error:', err);
      state.starting = false;
    });
  };

  (lp.teardowns = lp.teardowns || []).push(stop);
})(window);
