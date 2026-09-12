import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from './firebase.js';
import { toast, confirmDialog, escapeHtml } from './ui.js';

var STATE = { all: [], search: '', unsub: null };

export function renderEvents(root) {
  root.innerHTML =
    '<div class="panel">' +
      '<div class="panel-toolbar">' +
        '<div class="toolbar-left">' +
          '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i>' +
            '<input type="text" id="eventSearch" placeholder="নাম দিয়ে খুঁজুন...">' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" id="addEventBtn"><i class="fa-solid fa-plus"></i> নতুন ইভেন্ট যোগ করুন</button>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="data-table">' +
          '<thead><tr><th>ইভেন্টের নাম</th><th>তারিখ</th><th>স্থান</th><th></th></tr></thead>' +
          '<tbody id="eventRows"><tr class="loading-row"><td colspan="4"><i class="fa-solid fa-spinner spin"></i> লোড হচ্ছে...</td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
    '<div class="overlay" id="eventDrawerOverlay"><div class="drawer" id="eventDrawer"></div></div>';

  document.getElementById('eventSearch').addEventListener('input', function (e) {
    STATE.search = e.target.value.toLowerCase().trim();
    renderTable();
  });
  document.getElementById('addEventBtn').addEventListener('click', function () { openDrawer(null); });
  document.getElementById('eventDrawerOverlay').addEventListener('click', function (e) {
    if (e.target.id === 'eventDrawerOverlay') closeDrawer();
  });

  if (STATE.unsub) STATE.unsub();
  var q = query(collection(db, 'events'), orderBy('event_date', 'asc'));
  STATE.unsub = onSnapshot(q, function (snap) {
    STATE.all = snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
    renderTable();
  }, function (err) {
    console.error(err);
    document.getElementById('eventRows').innerHTML = '<tr class="loading-row"><td colspan="4">ডাটা লোড করা যায়নি।</td></tr>';
  });
}

function fmtEventDate(dateStr, timeStr) {
  if (!dateStr) return '—';
  var d = new Date(dateStr + 'T' + (timeStr || '00:00'));
  if (isNaN(d.getTime())) return dateStr;
  var out = d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' });
  if (timeStr) out += ' · ' + d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  return out;
}

function renderTable() {
  var rows = STATE.all.filter(function (ev) {
    if (!STATE.search) return true;
    return (ev.title || '').toLowerCase().indexOf(STATE.search) !== -1;
  });

  var tbody = document.getElementById('eventRows');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="4"><i class="fa-solid fa-calendar-days"></i><br>কোনো ইভেন্ট নেই — "নতুন ইভেন্ট যোগ করুন" চেপে শুরু করুন</td></tr>';
    return;
  }

  var today = new Date().toISOString().slice(0, 10);

  tbody.innerHTML = rows.map(function (ev) {
    var past = ev.event_date && ev.event_date < today;
    return (
      '<tr class="row-clickable" data-id="' + ev._id + '"' + (past ? ' style="opacity:.55;"' : '') + '>' +
        '<td><strong>' + escapeHtml(ev.title || '—') + '</strong></td>' +
        '<td>' + fmtEventDate(ev.event_date, ev.event_time) + (past ? ' <span class="badge badge-neutral">সমাপ্ত</span>' : '') + '</td>' +
        '<td>' + escapeHtml(ev.location || '—') + '</td>' +
        '<td><div class="row-actions"><button class="icon-btn danger" data-del="' + ev._id + '"><i class="fa-solid fa-trash"></i></button></div></td>' +
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
      var ev = STATE.all.filter(function (x) { return x._id === btn.dataset.del; })[0];
      confirmDialog('ইভেন্ট ডিলিট করবেন?', (ev ? ev.title : 'এই ইভেন্ট') + ' — সাইট থেকে সরাসরি মুছে যাবে।').then(function (ok) {
        if (!ok) return;
        deleteDoc(doc(db, 'events', btn.dataset.del)).then(function () {
          toast('ডিলিট করা হয়েছে', 'success');
        }).catch(function (err) { console.error(err); toast('ডিলিট করা যায়নি', 'error'); });
      });
    });
  });
}

function openDrawer(id) {
  var ev = id ? STATE.all.filter(function (x) { return x._id === id; })[0] : {};
  var overlay = document.getElementById('eventDrawerOverlay');
  var drawer = document.getElementById('eventDrawer');

  drawer.innerHTML =
    '<div class="drawer-head"><h3>' + (id ? 'ইভেন্ট এডিট করুন' : 'নতুন ইভেন্ট') + '</h3><button class="drawer-close" id="closeEventDrawer"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="drawer-body">' +
      '<div class="form-grid">' +
        '<div class="form-group full"><label>ইভেন্টের নাম</label><input type="text" id="e_title" value="' + escapeHtml(ev.title || '') + '"></div>' +
        '<div class="form-group"><label>তারিখ</label><input type="date" id="e_date" value="' + escapeHtml(ev.event_date || '') + '"></div>' +
        '<div class="form-group"><label>সময় (ঐচ্ছিক)</label><input type="time" id="e_time" value="' + escapeHtml(ev.event_time || '') + '"></div>' +
        '<div class="form-group full"><label>স্থান</label><input type="text" id="e_location" value="' + escapeHtml(ev.location || '') + '"></div>' +
        '<div class="form-group full"><label>বিস্তারিত</label><textarea id="e_desc" rows="4">' + escapeHtml(ev.description || '') + '</textarea></div>' +
      '</div>' +
    '</div>' +
    '<div class="drawer-foot">' +
      '<button class="btn btn-ghost" id="cancelEventBtn" style="flex:1;">বাতিল</button>' +
      '<button class="btn btn-primary" id="saveEventBtn" style="flex:2;"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন</button>' +
    '</div>';

  overlay.classList.add('show');
  document.getElementById('closeEventDrawer').addEventListener('click', closeDrawer);
  document.getElementById('cancelEventBtn').addEventListener('click', closeDrawer);
  document.getElementById('saveEventBtn').addEventListener('click', function () { saveEvent(id); });
}

function closeDrawer() { document.getElementById('eventDrawerOverlay').classList.remove('show'); }

function saveEvent(id) {
  var title = document.getElementById('e_title').value.trim();
  var date = document.getElementById('e_date').value;
  var time = document.getElementById('e_time').value;
  var location = document.getElementById('e_location').value.trim();
  var description = document.getElementById('e_desc').value.trim();

  if (!title) { toast('ইভেন্টের নাম আবশ্যক', 'error'); return; }
  if (!date) { toast('তারিখ আবশ্যক', 'error'); return; }

  var saveBtn = document.getElementById('saveEventBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> সংরক্ষণ হচ্ছে...';

  var payload = { title: title, event_date: date, event_time: time, location: location, description: description };
  var promise;
  if (id) {
    promise = updateDoc(doc(db, 'events', id), payload);
  } else {
    payload.created_at = serverTimestamp();
    promise = addDoc(collection(db, 'events'), payload);
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
