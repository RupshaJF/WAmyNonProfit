import { db, collection, onSnapshot } from './firebase.js';

export function renderDashboard(root) {
  root.innerHTML =
    '<div class="stat-grid" id="dashStats">' +
      loadingCard() + loadingCard() + loadingCard() + loadingCard() + loadingCard() +
    '</div>' +
    '<div class="panel" style="padding:22px;">' +
      '<h3 style="margin-bottom:10px;">দ্রুত গাইড</h3>' +
      '<p style="color:#5a655e; font-size:14px; line-height:1.9;">' +
        '<strong>আবেদন / সদস্য ফরম</strong> — যারা ওয়েবসাইট থেকে আবেদন ফরম সাবমিট করেছেন তাদের তালিকা, স্ট্যাটাস (পেন্ডিং/অনুমোদিত/ব্লকড) ও প্রোফাইল ছবির লিংক (photo_url) এখান থেকে নিয়ন্ত্রণ করুন। ব্লকড করলে সেই সদস্যের আইডি verify.html-এ আর ভেরিফাই হবে না।<br>' +
        '<strong>কমিটি সদস্য</strong> ও <strong>দাতাগণ</strong> — ওয়েবসাইটের #/member ও #/donors পেজে যা দেখানো হয় তা এখান থেকে যোগ, এডিট বা ডিলিট করা যাবে — সরাসরি Firestore-এ, কোনো কোড এডিটের দরকার নেই।<br>' +
        '<strong>গ্যালারি</strong> — #/gallery পেজের ছবি, ভিডিও, ক্যাটাগরি/বছর চিপ ও উপরের লেখা এখন সম্পূর্ণ এখান থেকেই নিয়ন্ত্রণ করা যাবে। প্রথমবার ঢুকলে "ছবি" ট্যাবে পুরনো ডাটা এক ক্লিকে ইম্পোর্ট করার অপশন পাবেন।' +
      '</p>' +
    '</div>';

  var counts = { members: null, team: null, donors: null, pending: null, gallery: null };

  onSnapshot(collection(db, 'members'), function (snap) {
    counts.members = snap.size;
    counts.pending = snap.docs.filter(function (d) { return (d.data().status || 'pending') === 'pending'; }).length;
    paint();
  }, function () { counts.members = 0; counts.pending = 0; paint(); });

  onSnapshot(collection(db, 'team_members'), function (snap) {
    counts.team = snap.size; paint();
  }, function () { counts.team = 0; paint(); });

  onSnapshot(collection(db, 'donors'), function (snap) {
    counts.donors = snap.size; paint();
  }, function () { counts.donors = 0; paint(); });

  onSnapshot(collection(db, 'gallery_photos'), function (snap) {
    counts.gallery = snap.size; paint();
  }, function () { counts.gallery = 0; paint(); });

  function paint() {
    var el = document.getElementById('dashStats');
    if (!el) return;
    el.innerHTML =
      statCard('মোট আবেদন জমা হয়েছে', counts.members, '') +
      statCard('পেন্ডিং আবেদন', counts.pending, 'accent-clay') +
      statCard('কমিটি সদস্য', counts.team, 'accent-moss') +
      statCard('দাতা তালিকাভুক্ত', counts.donors, '') +
      statCard('গ্যালারি ছবি', counts.gallery, 'accent-moss');
  }
}

function statCard(label, num, accent) {
  var display = num === null ? '<i class="fa-solid fa-spinner spin" style="font-size:16px;"></i>' : num;
  return '<div class="stat-card ' + accent + '"><div class="num">' + display + '</div><div class="label">' + label + '</div></div>';
}
function loadingCard() {
  return '<div class="stat-card"><div class="num"><i class="fa-solid fa-spinner spin" style="font-size:16px;"></i></div><div class="label">লোড হচ্ছে...</div></div>';
}
