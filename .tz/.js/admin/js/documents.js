import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from './firebase.js';
import { toast, confirmDialog, escapeHtml, fmtDate } from './ui.js';

var STATE = { all: [], search: '', unsub: null };
var CATEGORIES = ['নিয়মাবলী', 'বার্ষিক রিপোর্ট', 'মিটিং মিনিটস', 'ফরম', 'অন্যান্য'];

export function renderDocuments(root) {
  root.innerHTML =
    '<div class="panel">' +
      '<div class="panel-toolbar">' +
        '<div class="toolbar-left">' +
          '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i>' +
            '<input type="text" id="docSearch" placeholder="শিরোনাম দিয়ে খুঁজুন...">' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" id="addDocBtn"><i class="fa-solid fa-plus"></i> নতুন ডকুমেন্ট যোগ করুন</button>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="data-table">' +
          '<thead><tr><th>শিরোনাম</th><th>ক্যাটাগরি</th><th>যোগ করার তারিখ</th><th></th></tr></thead>' +
          '<tbody id="docRows"><tr class="loading-row"><td colspan="4"><i class="fa-solid fa-spinner spin"></i> লোড হচ্ছে...</td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
    '<div class="overlay" id="docDrawerOverlay"><div class="drawer" id="docDrawer"></div></div>';

  document.getElementById('docSearch').addEventListener('input', function (e) {
    STATE.search = e.target.value.toLowerCase().trim();
    renderTable();
  });
  document.getElementById('addDocBtn').addEventListener('click', function () { openDrawer(null); });
  document.getElementById('docDrawerOverlay').addEventListener('click', function (e) {
    if (e.target.id === 'docDrawerOverlay') closeDrawer();
  });

  if (STATE.unsub) STATE.unsub();
  var q = query(collection(db, 'member_documents'), orderBy('created_at', 'desc'));
  STATE.unsub = onSnapshot(q, function (snap) {
    STATE.all = snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
    renderTable();
  }, function (err) {
    console.error(err);
    document.getElementById('docRows').innerHTML = '<tr class="loading-row"><td colspan="4">ডাটা লোড করা যায়নি।</td></tr>';
  });
}

function renderTable() {
  var rows = STATE.all.filter(function (n) {
    if (!STATE.search) return true;
    return (n.title || '').toLowerCase().indexOf(STATE.search) !== -1;
  });

  var tbody = document.getElementById('docRows');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="4"><i class="fa-solid fa-file-lines"></i><br>কোনো ডকুমেন্ট নেই — "নতুন ডকুমেন্ট যোগ করুন" চেপে শুরু করুন</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (n) {
    return (
      '<tr class="row-clickable" data-id="' + n._id + '">' +
        '<td><strong>' + escapeHtml(n.title || '—') + '</strong></td>' +
        '<td>' + (n.category ? '<span class="badge badge-neutral">' + escapeHtml(n.category) + '</span>' : '—') + '</td>' +
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
      confirmDialog('ডকুমেন্ট ডিলিট করবেন?', (n ? n.title : 'এই ডকুমেন্ট') + ' — সদস্য ড্যাশবোর্ড থেকে সরাসরি সরে যাবে।').then(function (ok) {
        if (!ok) return;
        deleteDoc(doc(db, 'member_documents', btn.dataset.del)).then(function () {
          toast('ডিলিট করা হয়েছে', 'success');
        }).catch(function (err) { console.error(err); toast('ডিলিট করা যায়নি', 'error'); });
      });
    });
  });
}

function openDrawer(id) {
  var n = id ? STATE.all.filter(function (x) { return x._id === id; })[0] : {};
  var overlay = document.getElementById('docDrawerOverlay');
  var drawer = document.getElementById('docDrawer');

  drawer.innerHTML =
    '<div class="drawer-head"><h3>' + (id ? 'ডকুমেন্ট এডিট করুন' : 'নতুন ডকুমেন্ট') + '</h3><button class="drawer-close" id="closeDocDrawer"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="drawer-body">' +
      '<div class="form-grid">' +
        '<div class="form-group full"><label>শিরোনাম</label><input type="text" id="doc_title" value="' + escapeHtml(n.title || '') + '"></div>' +
        '<div class="form-group"><label>ক্যাটাগরি</label><select id="doc_category"><option value="">—</option>' +
          CATEGORIES.map(function (c) { return '<option value="' + c + '"' + (c === n.category ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="form-group full"><label>ফাইলের লিংক (Google Drive/PDF ইত্যাদি)</label><input type="text" id="doc_url" value="' + escapeHtml(n.file_url || '') + '" placeholder="https://..."></div>' +
        '<div class="form-group full"><label>সংক্ষিপ্ত বিবরণ (ঐচ্ছিক)</label><textarea id="doc_desc" rows="3">' + escapeHtml(n.description || '') + '</textarea></div>' +
      '</div>' +
    '</div>' +
    '<div class="drawer-foot">' +
      '<button class="btn btn-ghost" id="cancelDocBtn" style="flex:1;">বাতিল</button>' +
      '<button class="btn btn-primary" id="saveDocBtn" style="flex:2;"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন</button>' +
    '</div>';

  overlay.classList.add('show');
  document.getElementById('closeDocDrawer').addEventListener('click', closeDrawer);
  document.getElementById('cancelDocBtn').addEventListener('click', closeDrawer);
  document.getElementById('saveDocBtn').addEventListener('click', function () { saveDoc(id); });
}

function closeDrawer() { document.getElementById('docDrawerOverlay').classList.remove('show'); }

function saveDoc(id) {
  var title = document.getElementById('doc_title').value.trim();
  var category = document.getElementById('doc_category').value;
  var url = document.getElementById('doc_url').value.trim();
  var description = document.getElementById('doc_desc').value.trim();

  if (!title) { toast('শিরোনাম আবশ্যক', 'error'); return; }
  if (url && !/^https?:\/\//i.test(url) && !/^\/[^/]/.test(url)) {
    toast('লিংকটি http(s):// দিয়ে শুরু হতে হবে', 'error');
    return;
  }

  var saveBtn = document.getElementById('saveDocBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> সংরক্ষণ হচ্ছে...';

  var payload = { title: title, category: category, file_url: url, description: description };
  var promise;
  if (id) {
    promise = updateDoc(doc(db, 'member_documents', id), payload);
  } else {
    payload.created_at = serverTimestamp();
    promise = addDoc(collection(db, 'member_documents'), payload);
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
