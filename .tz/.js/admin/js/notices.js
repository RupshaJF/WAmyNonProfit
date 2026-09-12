import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from './firebase.js';
import { toast, confirmDialog, escapeHtml, fmtDate } from './ui.js';

var STATE = { all: [], search: '', unsub: null };

export function renderNotices(root) {
  root.innerHTML =
    '<div class="panel">' +
      '<div class="panel-toolbar">' +
        '<div class="toolbar-left">' +
          '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i>' +
            '<input type="text" id="noticeSearch" placeholder="শিরোনাম দিয়ে খুঁজুন...">' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" id="addNoticeBtn"><i class="fa-solid fa-plus"></i> নতুন নোটিশ যোগ করুন</button>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="data-table">' +
          '<thead><tr><th>শিরোনাম</th><th>পিন</th><th>প্রকাশের তারিখ</th><th></th></tr></thead>' +
          '<tbody id="noticeRows"><tr class="loading-row"><td colspan="4"><i class="fa-solid fa-spinner spin"></i> লোড হচ্ছে...</td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
    '<div class="overlay" id="noticeDrawerOverlay"><div class="drawer" id="noticeDrawer"></div></div>';

  document.getElementById('noticeSearch').addEventListener('input', function (e) {
    STATE.search = e.target.value.toLowerCase().trim();
    renderTable();
  });
  document.getElementById('addNoticeBtn').addEventListener('click', function () { openDrawer(null); });
  document.getElementById('noticeDrawerOverlay').addEventListener('click', function (e) {
    if (e.target.id === 'noticeDrawerOverlay') closeDrawer();
  });

  if (STATE.unsub) STATE.unsub();
  var q = query(collection(db, 'notices'), orderBy('created_at', 'desc'));
  STATE.unsub = onSnapshot(q, function (snap) {
    STATE.all = snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
    renderTable();
  }, function (err) {
    console.error(err);
    document.getElementById('noticeRows').innerHTML = '<tr class="loading-row"><td colspan="4">ডাটা লোড করা যায়নি।</td></tr>';
  });
}

function renderTable() {
  var rows = STATE.all.filter(function (n) {
    if (!STATE.search) return true;
    return (n.title || '').toLowerCase().indexOf(STATE.search) !== -1;
  });

  /* পিন করা নোটিশ তালিকায় উপরে দেখানো */
  rows = rows.slice().sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); });

  var tbody = document.getElementById('noticeRows');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="4"><i class="fa-solid fa-bullhorn"></i><br>কোনো নোটিশ নেই — "নতুন নোটিশ যোগ করুন" চেপে শুরু করুন</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (n) {
    return (
      '<tr class="row-clickable" data-id="' + n._id + '">' +
        '<td><strong>' + escapeHtml(n.title || '—') + '</strong></td>' +
        '<td>' + (n.pinned ? '<span class="badge badge-approved"><i class="fa-solid fa-thumbtack"></i> পিন করা</span>' : '—') + '</td>' +
        '<td>' + fmtDate(n.created_at) + '</td>' +
        '<td><div class="row-actions"><button class="icon-btn danger" data-del="' + n._id + '"><i class="fa-solid fa-trash"></i></button></div></td>' +
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
      var n = STATE.all.filter(function (x) { return x._id === btn.dataset.del; })[0];
      confirmDialog('নোটিশ ডিলিট করবেন?', (n ? n.title : 'এই নোটিশ') + ' — সাইট থেকে সরাসরি মুছে যাবে।').then(function (ok) {
        if (!ok) return;
        deleteDoc(doc(db, 'notices', btn.dataset.del)).then(function () {
          toast('ডিলিট করা হয়েছে', 'success');
        }).catch(function (err) { console.error(err); toast('ডিলিট করা যায়নি', 'error'); });
      });
    });
  });
}

function openDrawer(id) {
  var n = id ? STATE.all.filter(function (x) { return x._id === id; })[0] : {};
  var overlay = document.getElementById('noticeDrawerOverlay');
  var drawer = document.getElementById('noticeDrawer');

  drawer.innerHTML =
    '<div class="drawer-head"><h3>' + (id ? 'নোটিশ এডিট করুন' : 'নতুন নোটিশ') + '</h3><button class="drawer-close" id="closeNoticeDrawer"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="drawer-body">' +
      '<div class="form-grid">' +
        '<div class="form-group full"><label>শিরোনাম</label><input type="text" id="n_title" value="' + escapeHtml(n.title || '') + '"></div>' +
        '<div class="form-group full"><label>বিস্তারিত</label><textarea id="n_body" rows="5">' + escapeHtml(n.body || '') + '</textarea></div>' +
        '<div class="form-group full"><label style="display:flex; align-items:center; gap:8px; cursor:pointer;">' +
          '<input type="checkbox" id="n_pinned"' + (n.pinned ? ' checked' : '') + ' style="width:auto;"> উপরে পিন করে রাখুন (গুরুত্বপূর্ণ নোটিশ)' +
        '</label></div>' +
      '</div>' +
    '</div>' +
    '<div class="drawer-foot">' +
      '<button class="btn btn-ghost" id="cancelNoticeBtn" style="flex:1;">বাতিল</button>' +
      '<button class="btn btn-primary" id="saveNoticeBtn" style="flex:2;"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন</button>' +
    '</div>';

  overlay.classList.add('show');
  document.getElementById('closeNoticeDrawer').addEventListener('click', closeDrawer);
  document.getElementById('cancelNoticeBtn').addEventListener('click', closeDrawer);
  document.getElementById('saveNoticeBtn').addEventListener('click', function () { saveNotice(id); });
}

function closeDrawer() { document.getElementById('noticeDrawerOverlay').classList.remove('show'); }

function saveNotice(id) {
  var title = document.getElementById('n_title').value.trim();
  var body = document.getElementById('n_body').value.trim();
  var pinned = document.getElementById('n_pinned').checked;

  if (!title) { toast('শিরোনাম আবশ্যক', 'error'); return; }

  var saveBtn = document.getElementById('saveNoticeBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> সংরক্ষণ হচ্ছে...';

  var payload = { title: title, body: body, pinned: pinned };
  var promise;
  if (id) {
    promise = updateDoc(doc(db, 'notices', id), payload);
  } else {
    payload.created_at = serverTimestamp();
    promise = addDoc(collection(db, 'notices'), payload);
  }

  promise.then(function () {
    toast('সংরক্ষণ করা হয়েছে', 'success');
    closeDrawer();
  }).catch(function (err) {
    console.error(err);
    toast('সংরক্ষণ করা যায়নি', 'error');
  }).finally(function () {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন';
  });
}
