import {
  db, collection, doc, getDoc, updateDoc, writeBatch, onSnapshot, query, orderBy, serverTimestamp
} from './firebase.js';
import { toast, confirmDialog, escapeHtml, fmtDate } from './ui.js';

var STATE = { all: [], filter: 'pending', unsub: null };

var FIELD_LABEL = { mobile_number: 'মোবাইল নম্বর', permanent_address: 'স্থায়ী ঠিকানা' };
var STATUS_LABEL = { pending: 'পর্যালোচনাধীন', approved: 'অনুমোদিত', rejected: 'প্রত্যাখ্যাত' };
var STATUS_BADGE = { pending: 'badge-pending', approved: 'badge-approved', rejected: 'badge-blocked' };

export function renderRequests(root) {
  root.innerHTML =
    '<div class="panel">' +
      '<div class="panel-toolbar">' +
        '<div class="toolbar-left">' +
          '<select class="filter-select" id="reqFilter">' +
            '<option value="pending">পর্যালোচনাধীন</option>' +
            '<option value="approved">অনুমোদিত</option>' +
            '<option value="rejected">প্রত্যাখ্যাত</option>' +
            '<option value="all">সবগুলো</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="data-table">' +
          '<thead><tr><th>সদস্য</th><th>ফিল্ড</th><th>বর্তমান → নতুন মান</th><th>সময়</th><th>স্ট্যাটাস</th><th></th></tr></thead>' +
          '<tbody id="reqRows"><tr class="loading-row"><td colspan="6"><i class="fa-solid fa-spinner spin"></i> লোড হচ্ছে...</td></tr></tbody>' +
        '</table>' +
      '</div>' +
    '</div>';

  document.getElementById('reqFilter').value = STATE.filter;
  document.getElementById('reqFilter').addEventListener('change', function (e) {
    STATE.filter = e.target.value;
    renderTable();
  });

  if (STATE.unsub) STATE.unsub();
  var q = query(collection(db, 'profile_change_requests'), orderBy('created_at', 'desc'));
  STATE.unsub = onSnapshot(q, function (snap) {
    STATE.all = snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
    renderTable();
  }, function (err) {
    console.error(err);
    document.getElementById('reqRows').innerHTML = '<tr class="loading-row"><td colspan="6">ডাটা লোড করা যায়নি।</td></tr>';
  });
}

function renderTable() {
  var rows = STATE.all.filter(function (r) {
    return STATE.filter === 'all' || (r.status || 'pending') === STATE.filter;
  });

  var tbody = document.getElementById('reqRows');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr class="loading-row"><td colspan="6"><i class="fa-solid fa-pen-to-square"></i><br>এই তালিকায় কোনো অনুরোধ নেই</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(function (r) {
    var status = r.status || 'pending';
    var fieldLabel = FIELD_LABEL[r.field] || r.field || '—';
    var who = escapeHtml(r.full_name || r.member_id || r.email || '—');
    return (
      '<tr>' +
        '<td><strong>' + who + '</strong><br><span style="font-size:12px;color:#8b968f;">' + escapeHtml(r.email || '') + '</span></td>' +
        '<td>' + escapeHtml(fieldLabel) + '</td>' +
        '<td>' + escapeHtml(r.current_value || '—') + ' <i class="fa-solid fa-arrow-right" style="opacity:.5;"></i> <strong>' + escapeHtml(r.new_value || '—') + '</strong>' +
          (r.note ? '<br><span style="font-size:12px;color:#8b968f;">মন্তব্য: ' + escapeHtml(r.note) + '</span>' : '') +
        '</td>' +
        '<td>' + fmtDate(r.created_at) + '</td>' +
        '<td><span class="badge ' + (STATUS_BADGE[status] || 'badge-neutral') + '">' + (STATUS_LABEL[status] || status) + '</span></td>' +
        '<td>' +
          (status === 'pending'
            ? '<div class="row-actions">' +
                '<button class="icon-btn" data-approve="' + r._id + '" title="অনুমোদন করুন"><i class="fa-solid fa-check"></i></button>' +
                '<button class="icon-btn danger" data-reject="' + r._id + '" title="প্রত্যাখ্যান করুন"><i class="fa-solid fa-xmark"></i></button>' +
              '</div>'
            : '—') +
        '</td>' +
      '</tr>'
    );
  }).join('');

  tbody.querySelectorAll('[data-approve]').forEach(function (btn) {
    btn.addEventListener('click', function () { approve(btn.dataset.approve); });
  });
  tbody.querySelectorAll('[data-reject]').forEach(function (btn) {
    btn.addEventListener('click', function () { reject(btn.dataset.reject); });
  });
}

/* অনুমোদন: member_emails ইনডেক্স থেকে আসল members ডকুমেন্ট খুঁজে বের করে ফিল্ডটা আপডেট করা,
   একই ব্যাচে অনুরোধটাকে 'approved' চিহ্নিত করা */
function approve(id) {
  var r = STATE.all.filter(function (x) { return x._id === id; })[0];
  if (!r) return;

  confirmDialog(
    'অনুরোধ অনুমোদন করবেন?',
    (FIELD_LABEL[r.field] || r.field) + ' পরিবর্তন হয়ে যাবে: "' + (r.new_value || '') + '"'
  ).then(function (ok) {
    if (!ok) return;
    getDoc(doc(db, 'member_emails', r.email)).then(function (idx) {
      if (!idx.exists() || !idx.data().member_doc) {
        throw Object.assign(new Error('no-member'), { code: 'app/no-member' });
      }
      var memberDoc = idx.data().member_doc;
      var batch = writeBatch(db);
      var update = {};
      update[r.field] = r.new_value;
      batch.update(doc(db, 'members', memberDoc), update);
      batch.update(doc(db, 'profile_change_requests', id), { status: 'approved', reviewed_at: serverTimestamp() });
      return batch.commit();
    }).then(function () {
      toast('অনুমোদন করা হয়েছে — সদস্যের তথ্য আপডেট হয়ে গেছে', 'success');
    }).catch(function (err) {
      console.error(err);
      if (err && err.code === 'app/no-member') toast('এই ইমেইলের সদস্য খুঁজে পাওয়া যায়নি', 'error');
      else toast('অনুমোদন করা যায়নি', 'error');
    });
  });
}

function reject(id) {
  confirmDialog('অনুরোধ প্রত্যাখ্যান করবেন?', 'সদস্যের তথ্য অপরিবর্তিত থাকবে।').then(function (ok) {
    if (!ok) return;
    updateDoc(doc(db, 'profile_change_requests', id), { status: 'rejected', reviewed_at: serverTimestamp() })
      .then(function () { toast('প্রত্যাখ্যান করা হয়েছে', 'success'); })
      .catch(function (err) { console.error(err); toast('প্রত্যাখ্যান করা যায়নি', 'error'); });
  });
}
