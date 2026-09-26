import {
  db, collection, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from './firebase.js';
import { toast, confirmDialog, escapeHtml, downloadCSV } from './ui.js';

var STATE = { all: [], search: '', unsub: null };
var METHODS = ['নগদ', 'বিকাশ', 'রকেট', 'নগদ (Nagad)', 'ব্যাংক ট্রান্সফার', 'অন্যান্য'];

function fmtTaka(n) {
  var num = Number(n) || 0;
  return '৳' + num.toLocaleString('en-BD', { maximumFractionDigits: 2 });
}

export function renderMemberDonations(root) {
  root.innerHTML =
    '<div class="stat-grid" id="donationStats"></div>' +
    '<div class="panel">' +
      '<div class="panel-toolbar">' +
        '<div class="toolbar-left">' +
          '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i>' +
            '<input type="text" id="donationSearch" placeholder="নাম, ইমেইল বা আইডি দিয়ে খুঁজুন...">' +
          '</div>' +
        '</div>' +
        '<div style="display:flex; gap:8px;">' +
          '<button class="btn btn-ghost btn-sm" id="exportDonationsBtn"><i class="fa-solid fa-file-arrow-down"></i> CSV এক্সপোর্ট</button>' +
          '<button class="btn btn-primary btn-sm" id="addDonationBtn"><i class="fa-solid fa-plus"></i> নতুন এন্ট্রি যোগ করুন</button>' +
        '</div>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="data-table">' +
          '<thead><tr><th>সদস্য</th><th>পরিমাণ</th><th>খাত</th><th>তারিখ</th><th>স্ট্যাটাস</th><th></th></tr></thead>' +
          '<tbody id="donationRows"><tr class="loading-row"><td colspan="6"><i class="fa-solid fa-spinner spin"></i> লোড হচ্ছে...</td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
    '<div class="overlay" id="donationDrawerOverlay"><div class="drawer" id="donationDrawer"></div></div>';

  document.getElementById('donationSearch').addEventListener('input', function (e) {
    STATE.search = e.target.value.toLowerCase().trim();
    renderTable();
  });
  document.getElementById('addDonationBtn').addEventListener('click', function () { openDrawer(null); });
  document.getElementById('exportDonationsBtn').addEventListener('click', exportCSV);
  document.getElementById('donationDrawerOverlay').addEventListener('click', function (e) {
    if (e.target.id === 'donationDrawerOverlay') closeDrawer();
  });

  if (STATE.unsub) STATE.unsub();
  var q = query(collection(db, 'member_donations'), orderBy('date', 'desc'));
  STATE.unsub = onSnapshot(q, function (snap) {
    STATE.all = snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
    renderStats();
    renderTable();
  }, function (err) {
    console.error(err);
    document.getElementById('donationRows').innerHTML = '<tr class="loading-row"><td colspan="6">ডাটা লোড করা যায়নি।</td></tr>';
  });
}

function renderStats() {
  var total = STATE.all.reduce(function (s, d) { return s + (d.status !== 'due' ? (Number(d.amount) || 0) : 0); }, 0);
  var due = STATE.all.reduce(function (s, d) { return s + (d.status === 'due' ? (Number(d.amount) || 0) : 0); }, 0);
  var box = document.getElementById('donationStats');
  if (!box) return;
  box.innerHTML =
    '<div class="stat-card"><div class="num">' + fmtTaka(total) + '</div><div class="label">সর্বমোট আদায়</div></div>' +
    '<div class="stat-card accent-clay"><div class="num">' + fmtTaka(due) + '</div><div class="label">সর্বমোট বকেয়া</div></div>' +
    '<div class="stat-card accent-moss"><div class="num">' + STATE.all.length + '</div><div class="label">মোট এন্ট্রি</div></div>';
}

function getFiltered() {
  if (!STATE.search) return STATE.all;
  return STATE.all.filter(function (d) {
    var hay = ((d.full_name || '') + ' ' + (d.email || '') + ' ' + (d.member_id || '')).toLowerCase();
    return hay.indexOf(STATE.search) !== -1;
  });
}

function renderTable() {
  var rows = getFiltered();
  var tbody = document.getElementById('donationRows');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="6"><i class="fa-solid fa-hand-holding-heart"></i><br>কোনো এন্ট্রি নেই — "নতুন এন্ট্রি যোগ করুন" চেপে শুরু করুন</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (d) {
    var due = d.status === 'due';
    return (
      '<tr class="row-clickable" data-id="' + d._id + '">' +
        '<td><strong>' + escapeHtml(d.full_name || '—') + '</strong><br><span style="font-size:12px;color:#8b968f;">' + escapeHtml(d.email || '') + '</span></td>' +
        '<td><strong>' + fmtTaka(d.amount) + '</strong></td>' +
        '<td>' + escapeHtml(d.purpose || '—') + '</td>' +
        '<td>' + escapeHtml(d.date || '—') + '</td>' +
        '<td>' + (due ? '<span class="badge badge-pending">বকেয়া</span>' : '<span class="badge badge-approved">গৃহীত</span>') + '</td>' +
        '<td><div class="row-actions"><button class="icon-btn danger" data-del="' + d._id + '"><i class="fa-solid fa-trash"></i></button></div></td>' +
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
      confirmDialog('এন্ট্রি ডিলিট করবেন?', 'এই অনুদান/চাঁদার এন্ট্রি স্থায়ীভাবে মুছে যাবে।').then(function (ok) {
        if (!ok) return;
        deleteDoc(doc(db, 'member_donations', btn.dataset.del)).then(function () {
          toast('ডিলিট করা হয়েছে', 'success');
        }).catch(function (err) { console.error(err); toast('ডিলিট করা যায়নি', 'error'); });
      });
    });
  });
}

function openDrawer(id) {
  var d = id ? STATE.all.filter(function (x) { return x._id === id; })[0] : {};
  var overlay = document.getElementById('donationDrawerOverlay');
  var drawer = document.getElementById('donationDrawer');

  drawer.innerHTML =
    '<div class="drawer-head"><h3>' + (id ? 'এন্ট্রি এডিট করুন' : 'নতুন অনুদান/চাঁদা এন্ট্রি') + '</h3><button class="drawer-close" id="closeDonationDrawer"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="drawer-body">' +
      '<div class="form-section-title">সদস্য</div>' +
      '<div class="form-grid">' +
        '<div class="form-group full"><label>সদস্যের ইমেইল</label><input type="email" id="d_email" value="' + escapeHtml(d.email || '') + '" placeholder="member@example.com"></div>' +
        '<div class="form-group full" id="d_memberFound" style="font-size:13px; color:#5a655e;">' +
          (d.full_name ? '<i class="fa-solid fa-circle-check" style="color:var(--moss);"></i> ' + escapeHtml(d.full_name) + ' (' + escapeHtml(d.member_id || '') + ')' : 'ইমেইল লিখে বাইরে ক্লিক করুন — সদস্য খুঁজে বের হবে') +
        '</div>' +
      '</div>' +

      '<div class="form-section-title">অনুদান/চাঁদার তথ্য</div>' +
      '<div class="form-grid">' +
        '<div class="form-group"><label>পরিমাণ (৳)</label><input type="number" id="d_amount" min="0" step="0.01" value="' + escapeHtml(d.amount || '') + '"></div>' +
        '<div class="form-group"><label>তারিখ</label><input type="date" id="d_date" value="' + escapeHtml(d.date || new Date().toISOString().slice(0, 10)) + '"></div>' +
        '<div class="form-group"><label>খাত / উদ্দেশ্য</label><input type="text" id="d_purpose" value="' + escapeHtml(d.purpose || '') + '" placeholder="যেমন: বার্ষিক চাঁদা, ত্রাণ তহবিল"></div>' +
        '<div class="form-group"><label>মাধ্যম</label><select id="d_method"><option value="">—</option>' +
          METHODS.map(function (m) { return '<option value="' + m + '"' + (m === d.method ? ' selected' : '') + '>' + m + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="form-group"><label>রশিদ নং (ঐচ্ছিক)</label><input type="text" id="d_receipt" value="' + escapeHtml(d.receipt_no || '') + '"></div>' +
        '<div class="form-group"><label>স্ট্যাটাস</label><select id="d_status">' +
          '<option value="received"' + (d.status !== 'due' ? ' selected' : '') + '>গৃহীত (পাওয়া হয়ে গেছে)</option>' +
          '<option value="due"' + (d.status === 'due' ? ' selected' : '') + '>বকেয়া</option>' +
        '</select></div>' +
        '<div class="form-group full"><label>নোট (ঐচ্ছিক)</label><textarea id="d_note" rows="2">' + escapeHtml(d.note || '') + '</textarea></div>' +
      '</div>' +
    '</div>' +
    '<div class="drawer-foot">' +
      '<button class="btn btn-ghost" id="cancelDonationBtn" style="flex:1;">বাতিল</button>' +
      '<button class="btn btn-primary" id="saveDonationBtn" style="flex:2;"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন</button>' +
    '</div>';

  overlay.classList.add('show');

  var resolved = d.full_name ? { email: d.email, full_name: d.full_name, member_id: d.member_id } : null;
  document.getElementById('d_email').addEventListener('blur', function (e) {
    var email = String(e.target.value || '').trim().toLowerCase();
    var box = document.getElementById('d_memberFound');
    if (!email) { box.innerHTML = 'ইমেইল লিখে বাইরে ক্লিক করুন — সদস্য খুঁজে বের হবে'; resolved = null; return; }
    box.innerHTML = '<i class="fa-solid fa-spinner spin"></i> খোঁজা হচ্ছে...';
    lookupMember(email).then(function (m) {
      if (!m) { box.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> এই ইমেইলের কোনো অনুমোদিত সদস্য পাওয়া যায়নি'; resolved = null; return; }
      resolved = m;
      box.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--moss);"></i> ' + escapeHtml(m.full_name) + ' (' + escapeHtml(m.member_id) + ')';
    });
  });

  document.getElementById('closeDonationDrawer').addEventListener('click', closeDrawer);
  document.getElementById('cancelDonationBtn').addEventListener('click', closeDrawer);
  document.getElementById('saveDonationBtn').addEventListener('click', function () { save(id, function () { return resolved; }); });
}

/* member_emails ইনডেক্স → members ডকুমেন্ট, ইমেইলটা বৈধ সদস্যের কিনা যাচাই করে full_name/member_id আনা */
function lookupMember(email) {
  return getDoc(doc(db, 'member_emails', email)).then(function (idx) {
    if (!idx.exists() || !idx.data().member_doc) return null;
    return getDoc(doc(db, 'members', idx.data().member_doc)).then(function (snap) {
      if (!snap.exists()) return null;
      var data = snap.data();
      return { email: email, full_name: data.full_name || '', member_id: data.member_id || '' };
    });
  }).catch(function () { return null; });
}

function closeDrawer() { document.getElementById('donationDrawerOverlay').classList.remove('show'); }

function save(id, getResolved) {
  var email = document.getElementById('d_email').value.trim().toLowerCase();
  var amount = Number(document.getElementById('d_amount').value);
  var date = document.getElementById('d_date').value;
  var purpose = document.getElementById('d_purpose').value.trim();
  var method = document.getElementById('d_method').value;
  var receipt = document.getElementById('d_receipt').value.trim();
  var status = document.getElementById('d_status').value;
  var note = document.getElementById('d_note').value.trim();

  if (!email) { toast('সদস্যের ইমেইল আবশ্যক', 'error'); return; }
  if (!amount || amount <= 0) { toast('সঠিক পরিমাণ দিন', 'error'); return; }
  if (!date) { toast('তারিখ আবশ্যক', 'error'); return; }

  var saveBtn = document.getElementById('saveDonationBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> সংরক্ষণ হচ্ছে...';

  var resolved = getResolved();
  var proceed = resolved && resolved.email === email ? Promise.resolve(resolved) : lookupMember(email);

  proceed.then(function (m) {
    if (!m) throw Object.assign(new Error('no-member'), { code: 'app/no-member' });
    var payload = {
      email: email, full_name: m.full_name, member_id: m.member_id,
      amount: amount, date: date, purpose: purpose, method: method,
      receipt_no: receipt, status: status, note: note
    };
    var promise;
    if (id) {
      promise = updateDoc(doc(db, 'member_donations', id), payload);
    } else {
      payload.created_at = serverTimestamp();
      promise = addDoc(collection(db, 'member_donations'), payload);
    }
    return promise;
  }).then(function () {
    toast('সংরক্ষণ করা হয়েছে', 'success');
    closeDrawer();
  }).catch(function (err) {
    console.error(err);
    if (err && err.code === 'app/no-member') toast('এই ইমেইলের কোনো অনুমোদিত সদস্য পাওয়া যায়নি', 'error');
    else toast('সংরক্ষণ করা যায়নি', 'error');
  }).finally(function () {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন';
  });
}

function exportCSV() {
  var rows = getFiltered().map(function (d) {
    return {
      member_id: d.member_id || '', full_name: d.full_name || '', email: d.email || '',
      amount: d.amount || '', date: d.date || '', purpose: d.purpose || '',
      method: d.method || '', receipt_no: d.receipt_no || '', status: d.status || 'received', note: d.note || ''
    };
  });
  downloadCSV('rjf-donations-' + Date.now() + '.csv', rows);
}
