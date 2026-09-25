import {
  db, collection, doc, getDoc, writeBatch, onSnapshot, query, orderBy, serverTimestamp
} from './firebase.js';
import { toast, confirmDialog, escapeHtml, fmtDate, downloadCSV, copyText } from './ui.js';
import { provisionAccount, authErrorMessage, EMAIL_RE } from './provision.js';
import { lowerEmail, planSync, applyOps, indexOwner, ID_RE } from './sync.js';

var STATE = { all: [], search: '', statusFilter: 'all', typeFilter: 'all', unsub: null };

var STATUS_LABEL = { pending: 'পেন্ডিং', approved: 'অনুমোদিত', blocked: 'ব্লকড' };
var STATUS_BADGE = { pending: 'badge-pending', approved: 'badge-approved', blocked: 'badge-blocked' };

var MEMBERSHIP_TYPES = ["সাধারণ সদস্য", "আজীবন সদস্য", "সম্মানিত সদস্য", "স্বেচ্ছাসেবক"];

/* --- প্রোফাইল আপডেট নোটিফিকেশন ইমেইল (EmailJS) ---
   Service ID ও Public Key registration-data.js-এর একই EmailJS অ্যাকাউন্ট থেকে নেওয়া।
   ⚠️ TEMPLATE_ID নিচে বসাতে হবে — EmailJS ড্যাশবোর্ড → Email Templates-এ আপনার
   "প্রোফাইল আপডেট" টেমপ্লেটের আইডি (যেমন template_xxxxxxx) কপি করে বসান। */
var EMAILJS_SERVICE_ID = 'service_jy11eoh';
var EMAILJS_PUBLIC_KEY = 'YVhcRNK-0_TgFrZCd';
var EMAILJS_UPDATE_TEMPLATE_ID = 'template_xz7utgb';

var FIELD_LABELS = {
  member_id: 'মেম্বার আইডি', full_name: 'পুরো নাম', father_name: 'পিতার নাম', mother_name: 'মাতার নাম',
  date_of_birth: 'জন্ম তারিখ', gender: 'লিঙ্গ', blood_group: 'রক্তের গ্রুপ', mobile_number: 'মোবাইল নম্বর',
  email: 'ইমেইল', present_address: 'বর্তমান ঠিকানা', permanent_address: 'স্থায়ী ঠিকানা',
  education: 'শিক্ষাগত যোগ্যতা', occupation: 'পেশা', membership_type: 'সদস্যপদের ধরন',
  reference_name: 'রেফারেন্স', reference_mobile: 'রেফারেন্সের মোবাইল', photo_url: 'প্রোফাইল ছবি',
  status: 'আবেদনের স্ট্যাটাস'
};

/* EmailJS SDK লোড হয়নি থাকলে একবারই লোড করে init করা */
function loadEmailJS() {
  return new Promise(function (resolve, reject) {
    if (window.emailjs) { resolve(window.emailjs); return; }
    var existing = document.getElementById('emailjs-sdk');
    if (existing) {
      existing.addEventListener('load', function () { resolve(window.emailjs); });
      return;
    }
    var s = document.createElement('script');
    s.id = 'emailjs-sdk';
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = function () {
      try { window.emailjs.init(EMAILJS_PUBLIC_KEY); } catch (err) {}
      resolve(window.emailjs);
    };
    s.onerror = function () { reject(new Error('EmailJS SDK লোড করা যায়নি')); };
    document.head.appendChild(s);
  });
}

function fmtNowBn() {
  try {
    return new Date().toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (err) {
    return new Date().toLocaleString();
  }
}

/* পুরনো ডেটা বনাম নতুন সেভ হতে যাওয়া ডেটা তুলনা করে কী কী পরিবর্তন হলো তার লিস্ট বানানো */
function buildChangeSummary(oldData, newData) {
  var lines = [];
  EDITABLE_FIELDS.forEach(function (key) {
    if (key === 'status') return; // স্ট্যাটাস আলাদাভাবে নিচে হ্যান্ডেল হচ্ছে (লেবেল লাগবে)
    var oldVal = (oldData[key] || '').toString().trim();
    var newVal = (newData[key] || '').toString().trim();
    if (oldVal === newVal) return;
    var label = FIELD_LABELS[key] || key;
    lines.push(label + ': ' + (oldVal || '—') + ' → ' + (newVal || '—'));
  });

  var oldStatus = oldData.status || 'pending';
  var newStatus = newData.status || 'pending';
  if (oldStatus !== newStatus) {
    lines.push('আবেদনের স্ট্যাটাস: ' + (STATUS_LABEL[oldStatus] || oldStatus) + ' → ' + (STATUS_LABEL[newStatus] || newStatus));
  }
  return lines;
}

/* আপডেট নোটিফিকেশন ইমেইল পাঠানো — ব্যর্থ হলেও সেভ প্রক্রিয়া আটকাবে না, শুধু কনসোলে লগ হবে */
function sendUpdateEmail(payload, changes) {
  if (!changes.length || !payload.email) return;
  if (EMAILJS_UPDATE_TEMPLATE_ID === 'REPLACE_WITH_YOUR_TEMPLATE_ID') {
    console.warn('EMAILJS_UPDATE_TEMPLATE_ID এখনো বসানো হয়নি — members.js-এর উপরের দিকে বসান।');
    return;
  }
  loadEmailJS().then(function (emailjs) {
    var params = {
      to_name: payload.full_name || 'সদস্য',
      to_email: payload.email,
      member_id: payload.member_id || '—',
      updated_at: fmtNowBn(),
      changed_fields: changes.join('\n')
    };
    return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_UPDATE_TEMPLATE_ID, params);
  }).catch(function (err) {
    console.error('আপডেট নোটিফিকেশন ইমেইল পাঠানো যায়নি:', err);
  });
}

export function renderMembers(root) {
  root.innerHTML =
    '<div class="stat-grid" id="memberStats"></div>' +
    '<div class="panel">' +
      '<div class="panel-toolbar">' +
        '<div class="toolbar-left">' +
          '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i>' +
            '<input type="text" id="memberSearch" placeholder="নাম, আইডি, মোবাইল বা ইমেইল দিয়ে খুঁজুন...">' +
          '</div>' +
          '<select class="filter-select" id="statusFilter">' +
            '<option value="all">সব স্ট্যাটাস</option>' +
            '<option value="pending">পেন্ডিং</option>' +
            '<option value="approved">অনুমোদিত</option>' +
            '<option value="blocked">ব্লকড</option>' +
          '</select>' +
          '<select class="filter-select" id="typeFilter">' +
            '<option value="all">সব সদস্যপদ</option>' +
            MEMBERSHIP_TYPES.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<button class="btn btn-ghost btn-sm" id="exportBtn"><i class="fa-solid fa-file-arrow-down"></i> CSV এক্সপোর্ট</button>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="data-table">' +
          '<thead><tr>' +
            '<th>আবেদনকারী</th><th>মেম্বার আইডি</th><th>মোবাইল</th><th>সদস্যপদ</th><th>স্ট্যাটাস</th><th>জমা দেওয়ার সময়</th><th></th>' +
          '</tr></thead>' +
          '<tbody id="memberRows"><tr class="loading-row"><td colspan="7"><i class="fa-solid fa-spinner spin"></i> লোড হচ্ছে...</td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
    '<div class="overlay" id="memberDrawerOverlay"><div class="drawer" id="memberDrawer"></div></div>';

  document.getElementById('memberSearch').addEventListener('input', function (e) {
    STATE.search = e.target.value.toLowerCase().trim();
    renderTable();
  });
  document.getElementById('statusFilter').addEventListener('change', function (e) {
    STATE.statusFilter = e.target.value;
    renderTable();
  });
  document.getElementById('typeFilter').addEventListener('change', function (e) {
    STATE.typeFilter = e.target.value;
    renderTable();
  });
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('memberDrawerOverlay').addEventListener('click', function (e) {
    if (e.target.id === 'memberDrawerOverlay') closeDrawer();
  });

  if (STATE.unsub) STATE.unsub();
  var q = query(collection(db, 'members'), orderBy('submittedAt', 'desc'));
  STATE.unsub = onSnapshot(q, function (snap) {
    STATE.all = snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
    renderStats();
    renderTable();
  }, function (err) {
    console.error(err);
    document.getElementById('memberRows').innerHTML =
      '<tr class="loading-row"><td colspan="7">ডাটা লোড করা যায়নি। কনসোল চেক করুন।</td></tr>';
  });
}

function renderStats() {
  var total = STATE.all.length;
  var pending = STATE.all.filter(function (m) { return (m.status || 'pending') === 'pending'; }).length;
  var approved = STATE.all.filter(function (m) { return m.status === 'approved'; }).length;
  var blocked = STATE.all.filter(function (m) { return m.status === 'blocked'; }).length;

  document.getElementById('memberStats').innerHTML =
    statCard('মোট আবেদন', total, '') +
    statCard('পেন্ডিং', pending, 'accent-clay') +
    statCard('অনুমোদিত', approved, 'accent-moss') +
    statCard('ব্লকড', blocked, 'accent-danger');
}

function statCard(label, num, accent) {
  return '<div class="stat-card ' + accent + '"><div class="num">' + num + '</div><div class="label">' + label + '</div></div>';
}

function getFiltered() {
  return STATE.all.filter(function (m) {
    var matchesSearch = !STATE.search ||
      (m.full_name || '').toLowerCase().indexOf(STATE.search) !== -1 ||
      (m.member_id || '').toLowerCase().indexOf(STATE.search) !== -1 ||
      (m.mobile_number || '').toLowerCase().indexOf(STATE.search) !== -1 ||
      (m.email || '').toLowerCase().indexOf(STATE.search) !== -1;
    var matchesStatus = STATE.statusFilter === 'all' || (m.status || 'pending') === STATE.statusFilter;
    var matchesType = STATE.typeFilter === 'all' || m.membership_type === STATE.typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
}

function renderTable() {
  var rows = getFiltered();
  var tbody = document.getElementById('memberRows');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="7"><i class="fa-solid fa-inbox"></i><br>কোনো আবেদন পাওয়া যায়নি</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (m) {
    var status = m.status || 'pending';
    return (
      '<tr class="row-clickable" data-id="' + m._id + '">' +
        '<td><div class="avatar-cell">' +
          '<img src="' + escapeHtml(m.photo_url || '/icons/avatar.webp') + '" onerror="this.src=\'/icons/avatar.webp\'">' +
          '<div class="name-cell"><strong>' + escapeHtml(m.full_name || '—') + '</strong><span>' + escapeHtml(m.email || '') + '</span></div>' +
        '</div></td>' +
        '<td>' + escapeHtml(m.member_id || '—') + '</td>' +
        '<td>' + escapeHtml(m.mobile_number || '—') + '</td>' +
        '<td>' + escapeHtml(m.membership_type || '—') + '</td>' +
        '<td><span class="badge ' + STATUS_BADGE[status] + '">' + STATUS_LABEL[status] + '</span></td>' +
        '<td>' + fmtDate(m.submittedAt) + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="icon-btn danger" data-del="' + m._id + '" title="ডিলিট করুন"><i class="fa-solid fa-trash"></i></button>' +
        '</div></td>' +
      '</tr>'
    );
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      if (e.target.closest('[data-del]')) return;
      openDrawer(tr.dataset.id);
    });
  });
  tbody.querySelectorAll('[data-del]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      handleDelete(btn.dataset.del);
    });
  });
}

function handleDelete(id) {
  var m = STATE.all.filter(function (x) { return x._id === id; })[0];
  confirmDialog('আবেদন ডিলিট করবেন?', (m ? m.full_name : 'এই আবেদন') + ' — এই কাজটি ফিরিয়ে নেওয়া যাবে না।').then(function (ok) {
    if (!ok) return;
    var key = lowerEmail(m && m.email);
    indexOwner(key).then(function (owner) {
      var batch = writeBatch(db);
      batch.delete(doc(db, 'members', id));
      /* ইমেইল-ইনডেক্স মুছি শুধু যদি সেটা এই সদস্যেরই হয় (ডুপ্লিকেট ইমেইল থাকলে অন্যজনেরটা অক্ষত থাকে) */
      if (owner === id) batch.delete(doc(db, 'member_emails', key));
      var pubId = String((m && m.member_id) || '').trim();
      if (ID_RE.test(pubId) && m && (m.status === 'approved' || m.status === 'blocked')) batch.delete(doc(db, 'public_members', pubId));
      return batch.commit();
    }).then(function () {
      toast('ডিলিট করা হয়েছে', 'success');
    }).catch(function (err) {
      console.error(err);
      toast('ডিলিট করা যায়নি', 'error');
    });
  });
}

function openDrawer(id) {
  var m = STATE.all.filter(function (x) { return x._id === id; })[0];
  if (!m) return;
  var overlay = document.getElementById('memberDrawerOverlay');
  var drawer = document.getElementById('memberDrawer');
  var status = m.status || 'pending';
  var verifyLink = window.location.origin + '/verify.html?id=' + (m.member_id || '');

  drawer.innerHTML =
    '<div class="drawer-head"><h3>আবেদনের বিস্তারিত</h3><button class="drawer-close" id="closeDrawerBtn"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="drawer-body">' +

      '<div class="photo-preview-row">' +
        '<img id="photoPreview" src="' + escapeHtml(m.photo_url || '/icons/avatar.webp') + '" onerror="this.src=\'/icons/avatar.webp\'">' +
        '<div style="flex:1;">' +
          '<div class="form-group"><label>প্রোফাইল ছবির লিংক (photo_url)</label>' +
            '<input type="url" id="f_photo_url" value="' + escapeHtml(m.photo_url || '') + '" placeholder="https://...">' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="form-group full" style="margin-bottom:16px;">' +
        '<label>ভেরিফিকেশন লিংক</label>' +
        '<div class="link-copy"><input type="text" readonly value="' + escapeHtml(verifyLink) + '" id="verifyLinkInput"><button class="icon-btn" id="copyLinkBtn"><i class="fa-solid fa-copy"></i></button></div>' +
      '</div>' +

      '<div class="form-section-title">স্ট্যাটাস</div>' +
      '<div class="form-grid">' +
        '<div class="form-group full"><label>আবেদনের স্ট্যাটাস</label>' +
          '<select id="f_status">' +
            '<option value="pending"' + (status === 'pending' ? ' selected' : '') + '>পেন্ডিং</option>' +
            '<option value="approved"' + (status === 'approved' ? ' selected' : '') + '>অনুমোদিত</option>' +
            '<option value="blocked"' + (status === 'blocked' ? ' selected' : '') + '>ব্লকড (verify.html-এ দেখাবে না)</option>' +
          '</select>' +
        '</div>' +
      '</div>' +

      '<div class="form-section-title">সদস্য লগইন</div>' +
      '<div class="form-group full" style="margin-bottom:16px;">' +
        '<p style="font-size:13px;line-height:1.7;margin-bottom:10px;">অনুমোদন করলে ইমেইলে লগইন অ্যাকাউন্ট নিজে থেকেই তৈরি হয় এবং পাসওয়ার্ড সেট করার লিংক চলে যায়। সদস্য লিংক না পেলে এখান থেকে আবার পাঠান।</p>' +
        '<button type="button" class="btn btn-ghost btn-sm" id="sendAccessBtn"><i class="fa-solid fa-envelope"></i> লগইন অ্যাকাউন্ট তৈরি ও পাসওয়ার্ড সেটআপ লিংক পাঠান</button>' +
      '</div>' +

      '<div class="form-section-title">ব্যক্তিগত তথ্য</div>' +
      '<div class="form-grid">' +
        field('member_id', 'মেম্বার আইডি', m.member_id) +
        field('full_name', 'পুরো নাম', m.full_name) +
        field('father_name', 'পিতার নাম', m.father_name) +
        field('mother_name', 'মাতার নাম', m.mother_name) +
        field('date_of_birth', 'জন্ম তারিখ', m.date_of_birth, 'date') +
        selectField('gender', 'লিঙ্গ', m.gender, ['পুরুষ', 'মহিলা', 'অন্যান্য']) +
        selectField('blood_group', 'রক্তের গ্রুপ', m.blood_group, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']) +
      '</div>' +

      '<div class="form-section-title">যোগাযোগ</div>' +
      '<div class="form-grid">' +
        field('mobile_number', 'মোবাইল নম্বর', m.mobile_number) +
        field('email', 'ইমেইল', m.email, 'email') +
      '</div>' +

      '<div class="form-section-title">ঠিকানা</div>' +
      '<div class="form-grid">' +
        textareaField('present_address', 'বর্তমান ঠিকানা', m.present_address) +
        textareaField('permanent_address', 'স্থায়ী ঠিকানা', m.permanent_address) +
      '</div>' +

      '<div class="form-section-title">শিক্ষা, পেশা ও সদস্যপদ</div>' +
      '<div class="form-grid">' +
        field('education', 'শিক্ষাগত যোগ্যতা', m.education) +
        field('occupation', 'পেশা', m.occupation) +
        selectField('membership_type', 'সদস্যপদের ধরন', m.membership_type, MEMBERSHIP_TYPES) +
        field('reference_name', 'রেফারেন্স', m.reference_name) +
        field('reference_mobile', 'রেফারেন্সের মোবাইল', m.reference_mobile) +
      '</div>' +

    '</div>' +
    '<div class="drawer-foot">' +
      '<button class="btn btn-ghost" id="cancelEditBtn" style="flex:1;">বাতিল</button>' +
      '<button class="btn btn-primary" id="saveEditBtn" style="flex:2;"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন</button>' +
    '</div>';

  overlay.classList.add('show');

  document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);
  document.getElementById('cancelEditBtn').addEventListener('click', closeDrawer);
  document.getElementById('copyLinkBtn').addEventListener('click', function () { copyText(verifyLink); });
  document.getElementById('f_photo_url').addEventListener('input', function (e) {
    document.getElementById('photoPreview').src = e.target.value || '/icons/avatar.webp';
  });
  document.getElementById('saveEditBtn').addEventListener('click', function () { saveMember(id); });
  document.getElementById('sendAccessBtn').addEventListener('click', function () { sendAccess(m); });
}

/* সংরক্ষিত (সেভ করা) ডেটা অনুযায়ী: অ্যাকাউন্ট তৈরি + পাসওয়ার্ড সেটআপ লিংক */
function sendAccess(m) {
  var email = lowerEmail(m.email);
  if (m.status !== 'approved') { toast('আগে সদস্যকে "অনুমোদিত" করে সংরক্ষণ করুন', 'error'); return; }
  if (!EMAIL_RE.test(email)) { toast('এই সদস্যের ইমেইল সঠিক নয়', 'error'); return; }
  var btn = document.getElementById('sendAccessBtn');
  btn.disabled = true;
  provisionAccount(email, { sendLink: true }).then(function (r) {
    toast(r.created ? 'লগইন অ্যাকাউন্ট তৈরি হয়েছে ও লিংক পাঠানো হয়েছে' : 'পাসওয়ার্ড সেটআপ লিংক পাঠানো হয়েছে', 'success');
  }).catch(function (err) {
    console.error(err);
    toast('পাঠানো যায়নি: ' + authErrorMessage(err), 'error');
  }).finally(function () { btn.disabled = false; });
}

function field(name, label, value, type) {
  return '<div class="form-group"><label>' + label + '</label><input type="' + (type || 'text') + '" id="f_' + name + '" value="' + escapeHtml(value || '') + '"></div>';
}
function textareaField(name, label, value) {
  return '<div class="form-group full"><label>' + label + '</label><textarea id="f_' + name + '">' + escapeHtml(value || '') + '</textarea></div>';
}
function selectField(name, label, value, options) {
  var opts = options.map(function (o) { return '<option value="' + o + '"' + (o === value ? ' selected' : '') + '>' + o + '</option>'; }).join('');
  return '<div class="form-group"><label>' + label + '</label><select id="f_' + name + '"><option value="">—</option>' + opts + '</select></div>';
}

function closeDrawer() {
  document.getElementById('memberDrawerOverlay').classList.remove('show');
}

var EDITABLE_FIELDS = [
  'member_id', 'full_name', 'father_name', 'mother_name', 'date_of_birth', 'gender', 'blood_group',
  'mobile_number', 'email', 'present_address', 'permanent_address', 'education', 'occupation',
  'membership_type', 'reference_name', 'reference_mobile', 'photo_url', 'status'
];

function saveMember(id) {
  var existing = STATE.all.filter(function (x) { return x._id === id; })[0] || {};
  var payload = {};
  EDITABLE_FIELDS.forEach(function (name) {
    var el = document.getElementById('f_' + name);
    if (el) payload[name] = el.value.trim();
  });
  payload.email = lowerEmail(payload.email); /* ইমেইল সবসময় ছোট হাতের — লগইন ও ইনডেক্সের জন্য */
  payload.updatedAt = serverTimestamp();

  var changes = buildChangeSummary(existing, payload);

  var saveBtn = document.getElementById('saveEditBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> সংরক্ষণ হচ্ছে...';

  var newKey = payload.email;
  var oldKey = lowerEmail(existing.email);
  var conflictCheck = EMAIL_RE.test(newKey)
    ? getDoc(doc(db, 'member_emails', newKey)).then(function (s) { return s.exists() ? (s.data().member_doc || null) : null; })
    : Promise.resolve(null);

  conflictCheck.then(function (holder) {
    /* এই ইমেইল আরেকজন সদস্যের ইনডেক্সে থাকলে সেভ হবে না (ইমেইল ইউনিক থাকতে হবে) */
    if (holder && holder !== id) throw Object.assign(new Error('email-conflict'), { code: 'app/email-conflict' });
    return oldKey && oldKey !== newKey ? indexOwner(oldKey) : null;
  }).then(function (oldOwner) {
    var plan = planSync(existing, payload, id, oldOwner);
    var batch = writeBatch(db);
    batch.update(doc(db, 'members', id), payload);
    applyOps(batch, plan.ops);
    return batch.commit().then(function () { return plan; });
  }).then(function (plan) {
    toast('সংরক্ষণ করা হয়েছে', 'success');
    closeDrawer();
    sendUpdateEmail(payload, changes);
    if (plan.issues.length) toast(plan.issues.join(' — '), 'error');

    /* নতুন করে অনুমোদিত হলে (বা অনুমোদিত সদস্যের ইমেইল বদলালে) লগইন অ্যাকাউন্ট + সেটআপ লিংক */
    var becameApproved = payload.status === 'approved' &&
      (existing.status !== 'approved' || lowerEmail(existing.email) !== payload.email);
    if (becameApproved && EMAIL_RE.test(payload.email)) {
      provisionAccount(payload.email, { sendLink: true }).then(function (r) {
        toast(r.created ? 'লগইন অ্যাকাউন্ট তৈরি হয়েছে; পাসওয়ার্ড সেট করার লিংক ইমেইলে গেছে' : 'পাসওয়ার্ড সেট করার লিংক ইমেইলে পাঠানো হয়েছে', 'success');
      }).catch(function (err) {
        console.error(err);
        toast('অ্যাকাউন্ট/লিংক পাঠানো যায়নি (' + authErrorMessage(err) + ') — ড্রয়ার থেকে আবার চেষ্টা করুন', 'error');
      });
    }
  }).catch(function (err) {
    if (err && err.code === 'app/email-conflict') {
      toast('এই ইমেইল আরেকজন সদস্যের সাথে যুক্ত — সংরক্ষণ হয়নি', 'error');
    } else {
      console.error(err);
      toast('সংরক্ষণ করা যায়নি', 'error');
    }
  }).finally(function () {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন';
  });
}

function exportCSV() {
  var rows = getFiltered().map(function (m) {
    return {
      member_id: m.member_id || '', full_name: m.full_name || '', father_name: m.father_name || '',
      mother_name: m.mother_name || '', date_of_birth: m.date_of_birth || '', gender: m.gender || '',
      blood_group: m.blood_group || '', mobile_number: m.mobile_number || '', email: m.email || '',
      present_address: m.present_address || '', permanent_address: m.permanent_address || '',
      education: m.education || '', occupation: m.occupation || '', membership_type: m.membership_type || '',
      reference_name: m.reference_name || '', reference_mobile: m.reference_mobile || '',
      status: m.status || 'pending', photo_url: m.photo_url || ''
    };
  });
  downloadCSV('rjf-members-' + Date.now() + '.csv', rows);
}
