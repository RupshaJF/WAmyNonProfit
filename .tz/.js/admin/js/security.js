/* admin panel — "নিরাপত্তা আপগ্রেড" পেজ: পুরনো সদস্য-ডেটা নতুন নিরাপদ ব্যবস্থায় আনার এককালীন টুল

   ধাপ ১: স্ক্যান (কিছু বদলায় না)       → কী কী ঠিক করা দরকার তার রিপোর্ট
   ধাপ ২: ইনডেক্স তৈরি/সিঙ্ক               → ইমেইল ছোট হাতের করা + member_emails + public_members
   ধাপ ৩: লগইন অ্যাকাউন্ট তৈরি             → অনুমোদিত প্রতিটি সদস্যের জন্য Firebase Auth অ্যাকাউন্ট (ইমেইল পাঠায় না)
   ধাপ ৪: পুরনো পাসওয়ার্ড মুছুন            → members থেকে stored_password ফিল্ড (নতুন লগইন ঠিক চললে তবেই)

   সব ধাপ নিরাপদে বারবার চালানো যায় (idempotent)। */
import { db, collection, doc, getDocs, writeBatch, deleteField } from './firebase.js';
import { toast, confirmDialog, escapeHtml } from './ui.js';
import { provisionAccount, authErrorMessage, EMAIL_RE } from './provision.js';
import { lowerEmail, planSync, applyOps, publicView, ID_RE } from './sync.js';

var STATE = { running: false, scan: null };

function step(no, title, desc, buttons) {
  return '<div class="sec-step"><div class="sec-step-no">' + no + '</div><div class="sec-step-body">' +
    '<h3>' + title + '</h3><p>' + desc + '</p><div class="sec-actions">' + buttons + '</div></div></div>';
}

export function renderSecurity(root) {
  root.innerHTML =
    '<div class="panel sec-panel">' +
      '<div class="sec-intro">' +
        '<strong>এটা এককালীন মাইগ্রেশন টুল।</strong> নতুন নিরাপদ ব্যবস্থায় (Firebase Authentication + কঠোর Firestore rules) ' +
        'যাওয়ার আগে পুরনো সদস্যদের ডেটা এখান থেকে প্রস্তুত করুন। নিচের ধাপগুলো ক্রমানুসারে চালান; ' +
        'প্রতিটি ধাপ নিরাপদে বারবার চালানো যায়।' +
      '</div>' +
      '<div class="stat-grid" id="secStats"></div>' +
      step(1, 'স্ক্যান', 'কিছু না বদলিয়ে দেখে নেয় — কতজন সদস্য, কতজনের ইমেইল ঠিক/ডুপ্লিকেট, কতজনের ইনডেক্স বাকি।',
        '<button class="btn btn-ghost btn-sm" id="secScanBtn"><i class="fa-solid fa-magnifying-glass"></i> স্ক্যান করুন</button>') +
      step(2, 'ইনডেক্স তৈরি ও সিঙ্ক', 'ইমেইল ছোট হাতের করে, প্রতিটি সদস্যের জন্য <code>member_emails</code> ও (অনুমোদিতদের) <code>public_members</code> ডকুমেন্ট বানায়। ' +
        'একই ইমেইলে একাধিক আবেদন থাকলে সেগুলো বাদ রেখে রিপোর্ট করে — হাতে ঠিক করতে হবে।',
        '<button class="btn btn-ghost btn-sm" id="secSyncBtn"><i class="fa-solid fa-rotate"></i> ইনডেক্স সিঙ্ক করুন</button>') +
      step(3, 'লগইন অ্যাকাউন্ট তৈরি', 'প্রতিটি অনুমোদিত সদস্যের ইমেইলে Firebase লগইন অ্যাকাউন্ট বানায় (র‍্যান্ডম গোপন পাসওয়ার্ডে)। <b>কাউকে ইমেইল পাঠায় না</b> — ' +
        'সদস্য লগইন পেজে "পাসওয়ার্ড পাননি বা ভুলে গেছেন?" চেপে নিজে পাসওয়ার্ড সেট করবেন।',
        '<button class="btn btn-ghost btn-sm" id="secProvisionBtn"><i class="fa-solid fa-user-plus"></i> অ্যাকাউন্ট তৈরি করুন</button>') +
      step(4, 'পুরনো পাসওয়ার্ড মুছুন', '<b>নতুন লগইন ঠিকমতো চলছে নিশ্চিত হয়ে তবেই।</b> ডেটাবেস থেকে সব <code>stored_password</code> ফিল্ড (সাধারণ টেক্সট পাসওয়ার্ড) চিরতরে মুছে ফেলে।',
        '<button class="btn btn-danger btn-sm" id="secCleanBtn"><i class="fa-solid fa-broom"></i> পুরনো পাসওয়ার্ড মুছুন</button>') +
      '<pre class="sec-log" id="secLog" aria-live="polite">ধাপ ১ দিয়ে শুরু করুন — "স্ক্যান করুন" চাপুন।</pre>' +
    '</div>';

  document.getElementById('secScanBtn').addEventListener('click', function () { guard(runScan); });
  document.getElementById('secSyncBtn').addEventListener('click', function () { guard(runSync); });
  document.getElementById('secProvisionBtn').addEventListener('click', function () { guard(runProvision); });
  document.getElementById('secCleanBtn').addEventListener('click', function () { guard(runClean); });
}

/* ---------- হেল্পার ---------- */
function log(line) {
  var el = document.getElementById('secLog');
  if (!el) return;
  el.textContent += (el.textContent ? '\n' : '') + line;
  el.scrollTop = el.scrollHeight;
}
function resetLog(first) {
  var el = document.getElementById('secLog');
  if (el) el.textContent = first || '';
}
function setBusy(b) {
  STATE.running = b;
  document.querySelectorAll('.sec-actions .btn').forEach(function (x) { x.disabled = b; });
}
function guard(fn) {
  if (STATE.running) return;
  setBusy(true);
  Promise.resolve().then(fn).catch(function (err) {
    console.error(err);
    log('✗ ত্রুটি: ' + (err && err.code ? err.code + ' — ' : '') + (err && err.message ? err.message : err));
    toast('ধাপটি সম্পূর্ণ হয়নি — লগ দেখুন', 'error');
  }).finally(function () { setBusy(false); });
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

function loadCol(name) {
  return getDocs(collection(db, name)).then(function (snap) {
    return snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
  });
}

/* কোন সদস্য কোন ইমেইল-ইনডেক্সের "মালিক" হবে: অনুমোদিত আগে, তারপর নতুন আবেদন */
function pickWinners(members) {
  var groups = {};
  members.forEach(function (m) {
    var key = lowerEmail(m.email);
    if (!EMAIL_RE.test(key)) return;
    (groups[key] = groups[key] || []).push(m);
  });
  var winners = {};
  var conflicts = [];
  Object.keys(groups).forEach(function (key) {
    var arr = groups[key].slice().sort(function (a, b) {
      var rank = function (m) { return m.status === 'approved' ? 0 : (m.status === 'blocked' ? 1 : 2); };
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      var ta = a.submittedAt && a.submittedAt.seconds ? a.submittedAt.seconds : 0;
      var tb = b.submittedAt && b.submittedAt.seconds ? b.submittedAt.seconds : 0;
      return tb - ta;
    });
    winners[key] = arr[0]._id;
    if (arr.length > 1) conflicts.push({ key: key, keep: arr[0], skipped: arr.slice(1) });
  });
  return { winners: winners, conflicts: conflicts };
}

/* ---------- ধাপ ১: স্ক্যান ----------
   doScan() লগে যোগ করে (মোছে না) — অন্য ধাপের পরের "আবার স্ক্যান করে যাচাই" এতে আগের ইতিহাস মুছে যায় না।
   শুধু বাটনে চেপে সরাসরি স্ক্যান করলে (runScan) আগে লগ পরিষ্কার করা হয়। */
function doScan(silent) {
  log('\n── স্ক্যান হচ্ছে ──');
  return Promise.all([loadCol('members'), loadCol('member_emails'), loadCol('public_members')]).then(function (res) {
    var members = res[0], idx = res[1], pub = res[2];
    var idxByKey = {}; idx.forEach(function (d) { idxByKey[d._id] = d; });
    var pubById = {}; pub.forEach(function (d) { pubById[d._id] = d; });
    var picked = pickWinners(members);

    var s = { total: members.length, approved: 0, pending: 0, blocked: 0, noEmail: 0, mixedCase: 0, badId: 0,
              missingIndex: 0, missingPublic: 0, withPassword: 0, conflicts: picked.conflicts.length };
    members.forEach(function (m) {
      var st = m.status || 'pending';
      if (st === 'approved') s.approved++; else if (st === 'blocked' || st === 'rejected') s.blocked++; else s.pending++;
      var key = lowerEmail(m.email);
      if (!EMAIL_RE.test(key)) s.noEmail++;
      else {
        if (m.email !== key) s.mixedCase++;
        var owner = picked.winners[key] === m._id;
        var ix = idxByKey[key];
        if (owner && (!ix || ix.member_doc !== m._id || ix.status !== st)) s.missingIndex++;
      }
      if ((st === 'approved' || st === 'blocked' || st === 'rejected')) {
        if (!ID_RE.test(String(m.member_id || '').trim())) s.badId++;
        else {
          var p = pubById[String(m.member_id).trim()];
          var want = publicView(m);
          if (want && (!p || p.status !== want.status)) s.missingPublic++;
        }
      }
      if (m.stored_password) s.withPassword++;
    });
    STATE.scan = { members: members, picked: picked, stats: s };
    renderStats(s);

    log('── স্ক্যান রিপোর্ট ──');
    log('মোট সদস্য/আবেদন: ' + s.total + '  (অনুমোদিত ' + s.approved + ', পেন্ডিং ' + s.pending + ', ব্লকড ' + s.blocked + ')');
    log('ইমেইল নেই/ভুল: ' + s.noEmail + '   বড় হাতের অক্ষরসহ ইমেইল (ঠিক করা হবে): ' + s.mixedCase);
    log('ইমেইল-ইনডেক্স বাকি: ' + s.missingIndex + '   পাবলিক ডকুমেন্ট বাকি: ' + s.missingPublic + '   আইডি সঠিক নয় (অনুমোদিত/ব্লকড): ' + s.badId);
    log('এখনো stored_password আছে: ' + s.withPassword);
    if (picked.conflicts.length) {
      log('\n⚠️ একই ইমেইলে একাধিক আবেদন (' + picked.conflicts.length + 'টি ইমেইল) — শুধু একটা ইনডেক্স পাবে, বাকিগুলো হাতে ঠিক করুন:');
      picked.conflicts.forEach(function (c) {
        log('  ' + c.key + ' → রাখা হবে: ' + (c.keep.full_name || '—') + ' [' + (c.keep.member_id || '—') + ']; বাদ: ' +
          c.skipped.map(function (x) { return (x.full_name || '—') + ' [' + (x.member_id || '—') + ']'; }).join(', '));
      });
    }
    if (!s.missingIndex && !s.missingPublic && !s.mixedCase) log('\n✓ ইনডেক্স সব সিঙ্কে আছে।');
    if (!silent) toast('স্ক্যান সম্পূর্ণ', 'success');
  });
}

/* বাটনে সরাসরি "স্ক্যান করুন" চাপলে: আগের লগ পরিষ্কার করে নতুন করে দেখানো, এবং শেষে টোস্ট */
function runScan() {
  resetLog('স্ক্যান চলছে...');
  return doScan(false);
}

function renderStats(s) {
  var card = function (label, num, accent) { return '<div class="stat-card ' + accent + '"><div class="num">' + num + '</div><div class="label">' + label + '</div></div>'; };
  document.getElementById('secStats').innerHTML =
    card('মোট সদস্য', s.total, '') +
    card('ইনডেক্স বাকি', s.missingIndex, s.missingIndex ? 'accent-clay' : 'accent-moss') +
    card('পাবলিক ডক বাকি', s.missingPublic, s.missingPublic ? 'accent-clay' : 'accent-moss') +
    card('পুরনো পাসওয়ার্ড', s.withPassword, s.withPassword ? 'accent-danger' : 'accent-moss');
}

function ensureScan() {
  return STATE.scan ? Promise.resolve(STATE.scan) : doScan(true).then(function () { return STATE.scan; });
}

/* ---------- ধাপ ২: ইনডেক্স সিঙ্ক ---------- */
function runSync() {
  return doScan(true).then(function () {
    var scan = STATE.scan;
    var batches = [];
    var cur = writeBatch(db);
    var count = 0;
    function flush() { if (count) { batches.push(cur); cur = writeBatch(db); count = 0; } }
    var planned = 0;

    scan.members.forEach(function (m) {
      var key = lowerEmail(m.email);
      var next = Object.assign({}, m, { email: key });
      var plan = planSync(null, next, m._id, null);
      var isOwner = EMAIL_RE.test(key) && scan.picked.winners[key] === m._id;
      var ops = plan.ops.filter(function (o) { return o.col !== 'member_emails' || isOwner; });

      var needEmailFix = m.email && m.email !== key;
      var need = ops.length + (needEmailFix ? 1 : 0);
      if (count + need > 450) flush();
      if (needEmailFix) { cur.update(doc(db, 'members', m._id), { email: key }); count++; }
      applyOps(cur, ops);
      count += ops.length;
      planned += ops.length + (needEmailFix ? 1 : 0);
    });
    flush();

    log('\nসিঙ্ক শুরু: ' + planned + 'টি লেখা, ' + batches.length + 'টি ব্যাচে...');
    var chain = Promise.resolve();
    batches.forEach(function (b, i) {
      chain = chain.then(function () { return b.commit(); }).then(function () { log('  ব্যাচ ' + (i + 1) + '/' + batches.length + ' ✓'); });
    });
    return chain.then(function () {
      log('✓ ইনডেক্স সিঙ্ক সম্পূর্ণ। আবার স্ক্যান করে যাচাই হচ্ছে...');
      STATE.scan = null;
      return doScan(true);
    });
  });
}

/* ---------- ধাপ ৩: লগইন অ্যাকাউন্ট ---------- */
function runProvision() {
  return ensureScan().then(function (scan) {
    var targets = [];
    scan.members.forEach(function (m) {
      var key = lowerEmail(m.email);
      if (m.status === 'approved' && EMAIL_RE.test(key) && scan.picked.winners[key] === m._id) targets.push({ key: key, name: m.full_name });
    });
    if (!targets.length) { log('\nকোনো অনুমোদিত সদস্য (সঠিক ইমেইলসহ) পাওয়া যায়নি।'); return null; }
    return confirmDialog('লগইন অ্যাকাউন্ট তৈরি করবেন?', targets.length + ' জন অনুমোদিত সদস্যের জন্য Firebase লগইন অ্যাকাউন্ট তৈরি হবে। কাউকে ইমেইল যাবে না।').then(function (ok) {
      if (!ok) return null;
      log('\nঅ্যাকাউন্ট তৈরি শুরু: ' + targets.length + ' জন...');
      var created = 0, existed = 0, failed = 0, stop = false;
      var chain = Promise.resolve();
      targets.forEach(function (t, i) {
        chain = chain.then(function () {
          if (stop) return null;
          return provisionAccount(t.key, { sendLink: false }).then(function (r) {
            if (r.created) created++; else existed++;
          }).catch(function (err) {
            failed++;
            log('  ✗ ' + t.key + ' — ' + authErrorMessage(err));
            if (err && err.code === 'auth/too-many-requests') { stop = true; log('  Firebase অনুরোধ আটকেছে — কিছুক্ষণ পর এই ধাপ আবার চালান (যাদের হয়ে গেছে তাদের বাদ দেবে)।'); }
          }).then(function () {
            if ((i + 1) % 10 === 0) log('  ' + (i + 1) + '/' + targets.length + ' ...');
            return sleep(250);
          });
        });
      });
      return chain.then(function () {
        log('✓ শেষ: নতুন তৈরি ' + created + ', আগে থেকেই ছিল ' + existed + ', ব্যর্থ ' + failed);
        toast('অ্যাকাউন্ট ধাপ শেষ', failed ? 'error' : 'success');
      });
    });
  });
}

/* ---------- ধাপ ৪: পুরনো পাসওয়ার্ড মুছুন ---------- */
function runClean() {
  return doScan(true).then(function () {
    var withPw = STATE.scan.members.filter(function (m) { return m.stored_password; });
    if (!withPw.length) { log('\n✓ কোনো stored_password নেই — কিছু মোছার দরকার নেই।'); return null; }
    return confirmDialog('পুরনো পাসওয়ার্ড মুছবেন?', withPw.length + 'টি ডকুমেন্ট থেকে stored_password চিরতরে মুছে যাবে। নতুন লগইন কাজ করছে নিশ্চিত তো?').then(function (ok) {
      if (!ok) return null;
      var batches = [], cur = writeBatch(db), n = 0;
      withPw.forEach(function (m) {
        cur.update(doc(db, 'members', m._id), { stored_password: deleteField() });
        if (++n === 400) { batches.push(cur); cur = writeBatch(db); n = 0; }
      });
      if (n) batches.push(cur);
      log('\nপাসওয়ার্ড মোছা শুরু: ' + withPw.length + 'টি, ' + batches.length + 'টি ব্যাচে...');
      var chain = Promise.resolve();
      batches.forEach(function (b, i) {
        chain = chain.then(function () { return b.commit(); }).then(function () { log('  ব্যাচ ' + (i + 1) + '/' + batches.length + ' ✓'); });
      });
      return chain.then(function () {
        log('✓ সব stored_password মুছে গেছে।');
        STATE.scan = null;
        return doScan(true);
      });
    });
  });
}
