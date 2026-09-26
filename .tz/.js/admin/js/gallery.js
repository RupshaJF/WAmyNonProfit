/* admin panel — গ্যালারি (#/gallery পেজ) ম্যানেজমেন্ট
   এখান থেকে ছবি, ভিডিও, ক্যাটাগরি/বছর চিপ এবং পেজের উপরের লেখা — সবকিছু নিয়ন্ত্রণ করা যাবে,
   ঠিক team.js/donors.js এর মতো একই প্যাটার্নে (Firestore + রিয়েল-টাইম আপডেট)।

   Firestore গঠন:
     gallery_photos/{docId}   → { id, src, category, year, title, caption }
     gallery_videos/{docId}   → { id, youtubeId, title, caption }
     gallery_settings/main    → { eyebrow, title, desc, subscribeHref, subscribeLabel, categories:[{value,label}], years:[{value,label,comingSoon}] }

   কোনো কিছু Firestore-এ না থাকলে সাইট js/gallery-data.js এর ডিফল্ট ডাটা দেখাবে (ভাঙার ঝুঁকি নেই)। */
import {
  db, collection, doc, addDoc, updateDoc, deleteDoc, setDoc, getDoc, onSnapshot, query, orderBy, writeBatch
} from './firebase.js';
import { toast, confirmDialog, escapeHtml } from './ui.js';

/* সাইটের বর্তমান js/gallery-data.js এর সাথে হুবহু মিলিয়ে রাখা ডিফল্ট মান —
   Firestore-এ gallery_settings/main তৈরি না হওয়া পর্যন্ত ক্যাটাগরি/বছর ড্রপডাউনে এগুলোই দেখাবে */
var DEFAULT_SETTINGS = {
  "eyebrow": "আমাদের কার্যক্রমের প্রতিচ্ছবি",
  "title": "আমাদের ফটো গ্যালারি",
  "desc": "মানবিক ও খেলাধুলার কিছু স্মরণীয় মুহূর্ত",
  "subscribeHref": "https://rupshajonokollanfoundation.vercel.app/subscribe/",
  "subscribeLabel": "সাবস্ক্রাইব করুন",
  "categories": [
    {
      "value": "food",
      "label": "খাদ্য"
    },
    {
      "value": "health",
      "label": "স্বাস্থ্য সেবা"
    },
    {
      "value": "sports",
      "label": "খেলাধুলা"
    }
  ],
  "years": [
    {
      "value": "2025",
      "label": "2025",
      "comingSoon": false
    },
    {
      "value": "2026",
      "label": "2026",
      "comingSoon": false
    },
    {
      "value": "2027",
      "label": "2027",
      "comingSoon": true
    }
  ]
};

/* এডমিন প্যানেলে এক ক্লিকে পুরনো স্ট্যাটিক ডাটা (js/gallery-data.js) Firestore-এ ইম্পোর্ট করার জন্য —
   একবার ইম্পোর্ট হয়ে গেলে এই তালিকার আর দরকার নেই; তখন থেকে সব এডিট/যোগ/ডিলিট এই প্যানেল থেকেই হবে।
   "ছবি" ট্যাব খালি থাকা অবস্থাতেই কেবল এই ইম্পোর্ট বাটন দেখানো হয় (ডুপ্লিকেট এড়াতে)। */
var LEGACY_PHOTOS = [
  {
    "src": "https://i.ibb.co.com/FbSy0KDW/IMG-20260320-163051.jpg",
    "category": "health",
    "year": "2025",
    "title": "পশু-পাখিকে সাহায্য",
    "caption": "রূপসা এলাকা, মার্চ ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/q3sgc4T0/IMG-20260320-234348.jpg",
    "category": "food",
    "year": "2025",
    "title": "ইফতার মাহফিলের আয়োজন",
    "caption": "রূপসা ২০ মার্চ ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/QFdhY0Vs/1774703908564.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/SDcMby8T/FB-IMG-1759581201690.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/W42sj7DB/1774703841097.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/VYcdptkL/1774703848097.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/sJs56m5B/1774703854674.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/spw2RcFB/1774703869998.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/v4Bvs70v/1774703873979.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/fYr6Y7NR/1774703878305.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/cSTZ0Sp1/1774703885580.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "https://i.ibb.co.com/cRqMDK9/1774703894934.jpg",
    "category": "sports",
    "year": "2025",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, ২০২৫"
  },
  {
    "src": "gallery/national-anthem-all-team.webp",
    "category": "sports",
    "year": "2026",
    "title": "national anthem",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/lost-team.webp",
    "category": "sports",
    "year": "2026",
    "title": "team 1",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/win-team.webp",
    "category": "sports",
    "year": "2026",
    "title": "team 2",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/team-trophy.webp",
    "category": "sports",
    "year": "2026",
    "title": "trophy celeveration",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/team-win.webp",
    "category": "sports",
    "year": "2026",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/fkk.webp",
    "category": "sports",
    "year": "2026",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/sumon.webp",
    "category": "sports",
    "year": "2026",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/kamrul.webp",
    "category": "sports",
    "year": "2026",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/imran.webp",
    "category": "sports",
    "year": "2026",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/kawsar.webp",
    "category": "sports",
    "year": "2026",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/amjad.webp",
    "category": "sports",
    "year": "2026",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/monir.webp",
    "category": "sports",
    "year": "2026",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, 2026"
  },
  {
    "src": "gallery/rifat.webp",
    "category": "sports",
    "year": "2026",
    "title": "খেলাধুলা",
    "caption": "রূপসা এলাকা, 2026"
  }
];

var LEGACY_VIDEOS = [
  {
    "youtubeId": "egD2biAoCNE",
    "title": "রূপসা জনকল্যাণ ফাউন্ডেশন ইফতার মাহফিল",
    "caption": "রূপসা জনকল্যাণ ফাউন্ডেশনের উদ্যোগে ইফতার মাহফিলের আয়োজন"
  },
  {
    "youtubeId": "OAAle0P_TGE",
    "title": "খেলাধুলার আয়োজন",
    "caption": "রূপসা জনকল্যাণ ফাউন্ডেশনের উদ্যোগে চ্যাম্পিয়ান ট্রফির আয়োজন"
  },
  {
    "youtubeId": "iWz8ToHtGmM",
    "title": "খেলাধুলার আয়োজন",
    "caption": "রূপসা জনকল্যাণ ফাউন্ডেশনের উদ্যোগে চ্যাম্পিয়ান ট্রফির আয়োজন"
  }
];

var STATE = {
  tab: 'photos',
  photos: [], photosUnsub: null, photoSearch: '',
  videos: [], videosUnsub: null,
  settings: null
};

var EDIT_CATS = null;
var EDIT_YEARS = null;

export function renderGallery(root) {
  STATE.settings = STATE.settings || cloneSettings(DEFAULT_SETTINGS);
  EDIT_CATS = null;
  EDIT_YEARS = null;

  root.innerHTML =
    '<div class="gallery-tabs">' +
      '<button type="button" class="gtab-btn' + (STATE.tab === 'photos' ? ' active' : '') + '" data-tab="photos"><i class="fa-regular fa-images"></i> ছবি</button>' +
      '<button type="button" class="gtab-btn' + (STATE.tab === 'videos' ? ' active' : '') + '" data-tab="videos"><i class="fa-solid fa-circle-play"></i> ভিডিও</button>' +
      '<button type="button" class="gtab-btn' + (STATE.tab === 'settings' ? ' active' : '') + '" data-tab="settings"><i class="fa-solid fa-sliders"></i> সেটিংস ও ক্যাটাগরি</button>' +
    '</div>' +
    '<div id="galleryTabRoot"><div class="empty-state"><i class="fa-solid fa-spinner spin"></i><p>লোড হচ্ছে...</p></div></div>' +
    '<div class="overlay" id="galDrawerOverlay"><div class="drawer" id="galDrawer"></div></div>';

  root.querySelectorAll('.gtab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      root.querySelectorAll('.gtab-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      STATE.tab = btn.dataset.tab;
      paintTab();
    });
  });

  document.getElementById('galDrawerOverlay').addEventListener('click', function (e) {
    if (e.target.id === 'galDrawerOverlay') closeGalDrawer();
  });

  ensureListeners();
  fetchSettingsOnce();
  paintTab();
}

/* ---------- সেটিংস হেল্পার ---------- */

function cloneSettings(s) {
  return {
    eyebrow: s.eyebrow, title: s.title, desc: s.desc,
    subscribeHref: s.subscribeHref, subscribeLabel: s.subscribeLabel,
    categories: s.categories.map(function (c) { return Object.assign({}, c); }),
    years: s.years.map(function (y) { return Object.assign({}, y); })
  };
}

function mergeSettings(s) {
  return {
    eyebrow: s.eyebrow || DEFAULT_SETTINGS.eyebrow,
    title: s.title || DEFAULT_SETTINGS.title,
    desc: s.desc || DEFAULT_SETTINGS.desc,
    subscribeHref: s.subscribeHref || DEFAULT_SETTINGS.subscribeHref,
    subscribeLabel: s.subscribeLabel || DEFAULT_SETTINGS.subscribeLabel,
    categories: (Array.isArray(s.categories) && s.categories.length) ? s.categories : DEFAULT_SETTINGS.categories,
    years: (Array.isArray(s.years) && s.years.length) ? s.years : DEFAULT_SETTINGS.years
  };
}

function labelFor(list, value) {
  var m = list.filter(function (x) { return x.value === value; })[0];
  return m ? m.label : (value || '—');
}

/* ---------- ডাটা লোড (ছবি/ভিডিও লাইভ, সেটিংস একবার) ---------- */

function ensureListeners() {
  if (STATE.photosUnsub) STATE.photosUnsub();
  if (STATE.videosUnsub) STATE.videosUnsub();

  var pq = query(collection(db, 'gallery_photos'), orderBy('id', 'asc'));
  STATE.photosUnsub = onSnapshot(pq, function (snap) {
    STATE.photos = snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
    if (STATE.tab === 'photos') paintTab();
  }, function (err) {
    console.error(err);
    var tbody = document.getElementById('photoRows');
    if (tbody) tbody.innerHTML = '<tr class="loading-row"><td colspan="4">ডাটা লোড করা যায়নি।</td></tr>';
  });

  var vq = query(collection(db, 'gallery_videos'), orderBy('id', 'asc'));
  STATE.videosUnsub = onSnapshot(vq, function (snap) {
    STATE.videos = snap.docs.map(function (d) { return Object.assign({ _id: d.id }, d.data()); });
    if (STATE.tab === 'videos') paintTab();
  }, function (err) {
    console.error(err);
    var tbody = document.getElementById('videoRows');
    if (tbody) tbody.innerHTML = '<tr class="loading-row"><td colspan="3">ডাটা লোড করা যায়নি।</td></tr>';
  });
}

function fetchSettingsOnce() {
  getDoc(doc(db, 'gallery_settings', 'main')).then(function (snap) {
    if (snap.exists()) {
      STATE.settings = mergeSettings(snap.data());
      EDIT_CATS = null;
      EDIT_YEARS = null;
      paintTab();
    }
  }).catch(function (err) { console.warn('gallery settings load failed, ডিফল্ট মান ব্যবহার হচ্ছে:', err); });
}

function paintTab() {
  var tabRoot = document.getElementById('galleryTabRoot');
  if (!tabRoot) return;
  if (STATE.tab === 'videos') renderVideosTab(tabRoot);
  else if (STATE.tab === 'settings') renderSettingsTab(tabRoot);
  else renderPhotosTab(tabRoot);
}

function closeGalDrawer() {
  var overlay = document.getElementById('galDrawerOverlay');
  if (overlay) overlay.classList.remove('show');
}

/* ================= ছবি ট্যাব ================= */

function renderPhotosTab(root) {
  root.innerHTML =
    '<div class="panel">' +
      '<div class="panel-toolbar">' +
        '<div class="toolbar-left">' +
          '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i>' +
            '<input type="text" id="photoSearch" placeholder="নাম দিয়ে খুঁজুন..." value="' + escapeHtml(STATE.photoSearch) + '"></div>' +
        '</div>' +
        '<button class="btn btn-primary btn-sm" id="addPhotoBtn"><i class="fa-solid fa-plus"></i> নতুন ছবি যোগ করুন</button>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="data-table">' +
          '<thead><tr><th>ছবি</th><th>ক্যাটাগরি</th><th>বছর</th><th></th></tr></thead>' +
          '<tbody id="photoRows">' + photoRowsHtml() + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';

  document.getElementById('photoSearch').addEventListener('input', function (e) {
    STATE.photoSearch = e.target.value.toLowerCase().trim();
    document.getElementById('photoRows').innerHTML = photoRowsHtml();
    wirePhotoRows();
  });
  document.getElementById('addPhotoBtn').addEventListener('click', function () { openPhotoDrawer(null); });
  wirePhotoRows();
}

function photoRowsHtml() {
  if (!STATE.photos.length) {
    return (
      '<tr class="loading-row"><td colspan="4">' +
        '<i class="fa-regular fa-images"></i><br>এখনো কোনো ছবি যোগ করা হয়নি।<br>' +
        '<button class="btn btn-ghost btn-sm" id="importGalleryBtn" style="margin-top:12px;">' +
          '<i class="fa-solid fa-file-import"></i> পুরনো ওয়েবসাইট থেকে ' + LEGACY_PHOTOS.length + 'টি ছবি ও ' + LEGACY_VIDEOS.length + 'টি ভিডিও একসাথে ইম্পোর্ট করুন' +
        '</button>' +
      '</td></tr>'
    );
  }

  var rows = STATE.photos.filter(function (p) {
    if (!STATE.photoSearch) return true;
    return (p.title || '').toLowerCase().indexOf(STATE.photoSearch) !== -1 ||
      (p.caption || '').toLowerCase().indexOf(STATE.photoSearch) !== -1;
  });

  if (!rows.length) {
    return '<tr class="loading-row"><td colspan="4"><i class="fa-solid fa-magnifying-glass"></i><br>কিছু পাওয়া যায়নি।</td></tr>';
  }

  return rows.map(function (p) {
    return (
      '<tr class="row-clickable" data-id="' + p._id + '">' +
        '<td><div class="avatar-cell"><img src="' + escapeHtml(p.src || '') + '" style="border-radius:8px;" onerror="this.src=\'/icons/favicon.png\'">' +
          '<div class="name-cell"><strong>' + escapeHtml(p.title || '—') + '</strong><br><span>' + escapeHtml(p.caption || '') + '</span></div></div></td>' +
        '<td><span class="badge badge-neutral">' + escapeHtml(labelFor(STATE.settings.categories, p.category)) + '</span></td>' +
        '<td><span class="badge badge-neutral">' + escapeHtml(labelFor(STATE.settings.years, p.year)) + '</span></td>' +
        '<td><div class="row-actions"><button class="icon-btn danger" data-del="' + p._id + '"><i class="fa-solid fa-trash"></i></button></div></td>' +
      '</tr>'
    );
  }).join('');
}

function wirePhotoRows() {
  var tbody = document.getElementById('photoRows');
  if (!tbody) return;

  var importBtn = document.getElementById('importGalleryBtn');
  if (importBtn) importBtn.addEventListener('click', runLegacyImport);

  tbody.querySelectorAll('tr[data-id]').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      if (e.target.closest('[data-del]')) return;
      openPhotoDrawer(tr.dataset.id);
    });
  });
  tbody.querySelectorAll('[data-del]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var p = STATE.photos.filter(function (x) { return x._id === btn.dataset.del; })[0];
      confirmDialog('ছবি ডিলিট করবেন?', (p ? p.title : 'এই ছবি') + ' — সাইট থেকে সরাসরি মুছে যাবে।').then(function (ok) {
        if (!ok) return;
        deleteDoc(doc(db, 'gallery_photos', btn.dataset.del)).then(function () {
          toast('ডিলিট করা হয়েছে', 'success');
        }).catch(function (err) { console.error(err); toast('ডিলিট করা যায়নি', 'error'); });
      });
    });
  });
}

function openPhotoDrawer(id) {
  var p = id ? STATE.photos.filter(function (x) { return x._id === id; })[0] : {};
  var cats = STATE.settings.categories;
  var yrs = STATE.settings.years;
  var overlay = document.getElementById('galDrawerOverlay');
  var drawer = document.getElementById('galDrawer');

  drawer.innerHTML =
    '<div class="drawer-head"><h3>' + (id ? 'ছবি এডিট করুন' : 'নতুন ছবি') + '</h3><button class="drawer-close" id="closeGalDrawer"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="drawer-body">' +
      '<div class="photo-preview-row">' +
        '<img id="galPhotoPreview" src="' + escapeHtml(p.src || '/icons/favicon.png') + '" style="border-radius:10px;" onerror="this.src=\'/icons/favicon.png\'">' +
        '<div class="form-group" style="flex:1;"><label>ছবির লিংক (src)</label><input type="url" id="p_src" value="' + escapeHtml(p.src || '') + '" placeholder="https://..."></div>' +
      '</div>' +
      '<div class="form-grid">' +
        '<div class="form-group full"><label>শিরোনাম (title)</label><input type="text" id="p_title" value="' + escapeHtml(p.title || '') + '"></div>' +
        '<div class="form-group"><label>ক্যাটাগরি</label><select id="p_category">' +
          cats.map(function (c) { return '<option value="' + escapeHtml(c.value) + '"' + (c.value === p.category ? ' selected' : '') + '>' + escapeHtml(c.label) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="form-group"><label>বছর</label><select id="p_year">' +
          yrs.map(function (y) { return '<option value="' + escapeHtml(y.value) + '"' + (y.value === p.year ? ' selected' : '') + '>' + escapeHtml(y.label) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="form-group full"><label>ক্যাপশন</label><input type="text" id="p_caption" value="' + escapeHtml(p.caption || '') + '"></div>' +
      '</div>' +
    '</div>' +
    '<div class="drawer-foot">' +
      '<button class="btn btn-ghost" id="cancelGalBtn" style="flex:1;">বাতিল</button>' +
      '<button class="btn btn-primary" id="saveGalBtn" style="flex:2;"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন</button>' +
    '</div>';

  overlay.classList.add('show');
  document.getElementById('closeGalDrawer').addEventListener('click', closeGalDrawer);
  document.getElementById('cancelGalBtn').addEventListener('click', closeGalDrawer);
  document.getElementById('p_src').addEventListener('input', function (e) {
    document.getElementById('galPhotoPreview').src = e.target.value || '/icons/favicon.png';
  });
  document.getElementById('saveGalBtn').addEventListener('click', function () { savePhoto(id); });
}

function savePhoto(id) {
  var payload = {
    src: document.getElementById('p_src').value.trim(),
    title: document.getElementById('p_title').value.trim(),
    category: document.getElementById('p_category').value,
    year: document.getElementById('p_year').value,
    caption: document.getElementById('p_caption').value.trim()
  };
  if (!payload.src) { toast('ছবির লিংক আবশ্যক', 'error'); return; }
  if (!payload.title) { toast('শিরোনাম আবশ্যক', 'error'); return; }

  var saveBtn = document.getElementById('saveGalBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> সংরক্ষণ হচ্ছে...';

  var promise;
  if (id) {
    promise = updateDoc(doc(db, 'gallery_photos', id), payload);
  } else {
    payload.id = (STATE.photos.reduce(function (max, x) { return Math.max(max, x.id || 0); }, 0)) + 1;
    promise = addDoc(collection(db, 'gallery_photos'), payload);
  }

  promise.then(function () {
    toast('সংরক্ষণ করা হয়েছে', 'success');
    closeGalDrawer();
  }).catch(function (err) {
    console.error(err);
    toast('সংরক্ষণ করা যায়নি', 'error');
  }).finally(function () {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন';
  });
}

/* ================= ভিডিও ট্যাব ================= */

function renderVideosTab(root) {
  root.innerHTML =
    '<div class="panel">' +
      '<div class="panel-toolbar">' +
        '<div class="toolbar-left"><strong style="font-size:13.5px; color:#5a655e;">মোট ' + STATE.videos.length + 'টি ভিডিও</strong></div>' +
        '<button class="btn btn-primary btn-sm" id="addVideoBtn"><i class="fa-solid fa-plus"></i> নতুন ভিডিও যোগ করুন</button>' +
      '</div>' +
      '<div class="table-wrap">' +
        '<table class="data-table">' +
          '<thead><tr><th>ভিডিও</th><th>ইউটিউব আইডি</th><th></th></tr></thead>' +
          '<tbody id="videoRows">' + videoRowsHtml() + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';

  document.getElementById('addVideoBtn').addEventListener('click', function () { openVideoDrawer(null); });
  wireVideoRows();
}

function videoRowsHtml() {
  if (!STATE.videos.length) {
    return '<tr class="loading-row"><td colspan="3"><i class="fa-solid fa-circle-play"></i><br>এখনো কোনো ভিডিও যোগ করা হয়নি — "নতুন ভিডিও যোগ করুন" চাপুন, অথবা "ছবি" ট্যাবের ইম্পোর্ট বাটন থেকে পুরনো ভিডিওসহ সবকিছু আনুন।</td></tr>';
  }
  return STATE.videos.map(function (v) {
    return (
      '<tr class="row-clickable" data-id="' + v._id + '">' +
        '<td><div class="avatar-cell"><img src="https://img.youtube.com/vi/' + encodeURIComponent(v.youtubeId || '') + '/mqdefault.jpg" style="width:64px; height:36px; border-radius:6px; object-fit:cover;" onerror="this.src=\'/icons/favicon.png\'">' +
          '<div class="name-cell"><strong>' + escapeHtml(v.title || '—') + '</strong><br><span>' + escapeHtml(v.caption || '') + '</span></div></div></td>' +
        '<td>' + escapeHtml(v.youtubeId || '—') + '</td>' +
        '<td><div class="row-actions"><button class="icon-btn danger" data-del="' + v._id + '"><i class="fa-solid fa-trash"></i></button></div></td>' +
      '</tr>'
    );
  }).join('');
}

function wireVideoRows() {
  var tbody = document.getElementById('videoRows');
  if (!tbody) return;
  tbody.querySelectorAll('tr[data-id]').forEach(function (tr) {
    tr.addEventListener('click', function (e) {
      if (e.target.closest('[data-del]')) return;
      openVideoDrawer(tr.dataset.id);
    });
  });
  tbody.querySelectorAll('[data-del]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var v = STATE.videos.filter(function (x) { return x._id === btn.dataset.del; })[0];
      confirmDialog('ভিডিও ডিলিট করবেন?', (v ? v.title : 'এই ভিডিও') + ' — সাইট থেকে সরাসরি মুছে যাবে।').then(function (ok) {
        if (!ok) return;
        deleteDoc(doc(db, 'gallery_videos', btn.dataset.del)).then(function () {
          toast('ডিলিট করা হয়েছে', 'success');
        }).catch(function (err) { console.error(err); toast('ডিলিট করা যায়নি', 'error'); });
      });
    });
  });
}

function openVideoDrawer(id) {
  var v = id ? STATE.videos.filter(function (x) { return x._id === id; })[0] : {};
  var overlay = document.getElementById('galDrawerOverlay');
  var drawer = document.getElementById('galDrawer');
  var previewSrc = v.youtubeId ? 'https://img.youtube.com/vi/' + encodeURIComponent(v.youtubeId) + '/mqdefault.jpg' : '/icons/favicon.png';

  drawer.innerHTML =
    '<div class="drawer-head"><h3>' + (id ? 'ভিডিও এডিট করুন' : 'নতুন ভিডিও') + '</h3><button class="drawer-close" id="closeGalDrawer"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="drawer-body">' +
      '<div class="photo-preview-row">' +
        '<img id="galVideoPreview" src="' + previewSrc + '" style="width:96px; height:54px; border-radius:8px; object-fit:cover;" onerror="this.src=\'/icons/favicon.png\'">' +
        '<div class="form-group" style="flex:1;"><label>ইউটিউব ভিডিও আইডি</label><input type="text" id="v_ytid" value="' + escapeHtml(v.youtubeId || '') + '" placeholder="যেমনঃ egD2biAoCNE"></div>' +
      '</div>' +
      '<div class="form-grid">' +
        '<div class="form-group full"><label>শিরোনাম (title)</label><input type="text" id="v_title" value="' + escapeHtml(v.title || '') + '"></div>' +
        '<div class="form-group full"><label>ক্যাপশন</label><input type="text" id="v_caption" value="' + escapeHtml(v.caption || '') + '"></div>' +
      '</div>' +
      '<p class="gal-hint">টিপসঃ পুরো ইউটিউব লিংক পেস্ট করলেও চলবে (যেমনঃ youtube.com/watch?v=egD2biAoCNE) — সেভ করার সময় নিজে থেকেই শুধু আইডি অংশটা রেখে দেবে।</p>' +
    '</div>' +
    '<div class="drawer-foot">' +
      '<button class="btn btn-ghost" id="cancelGalBtn" style="flex:1;">বাতিল</button>' +
      '<button class="btn btn-primary" id="saveGalBtn" style="flex:2;"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন</button>' +
    '</div>';

  overlay.classList.add('show');
  document.getElementById('closeGalDrawer').addEventListener('click', closeGalDrawer);
  document.getElementById('cancelGalBtn').addEventListener('click', closeGalDrawer);
  document.getElementById('v_ytid').addEventListener('input', function (e) {
    var val = e.target.value.trim();
    document.getElementById('galVideoPreview').src = val ? 'https://img.youtube.com/vi/' + encodeURIComponent(val) + '/mqdefault.jpg' : '/icons/favicon.png';
  });
  document.getElementById('saveGalBtn').addEventListener('click', function () { saveVideo(id); });
}

function extractYoutubeId(raw) {
  var val = (raw || '').trim();
  var stripped = val.replace(/^https?:\/\/.*(?:v=|youtu\.be\/|embed\/)/, '');
  return stripped.split(/[&?]/)[0].trim();
}

function saveVideo(id) {
  var payload = {
    youtubeId: extractYoutubeId(document.getElementById('v_ytid').value),
    title: document.getElementById('v_title').value.trim(),
    caption: document.getElementById('v_caption').value.trim()
  };
  if (!payload.youtubeId) { toast('ইউটিউব আইডি আবশ্যক', 'error'); return; }
  if (!payload.title) { toast('শিরোনাম আবশ্যক', 'error'); return; }

  var saveBtn = document.getElementById('saveGalBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> সংরক্ষণ হচ্ছে...';

  var promise;
  if (id) {
    promise = updateDoc(doc(db, 'gallery_videos', id), payload);
  } else {
    payload.id = (STATE.videos.reduce(function (max, x) { return Math.max(max, x.id || 0); }, 0)) + 1;
    promise = addDoc(collection(db, 'gallery_videos'), payload);
  }

  promise.then(function () {
    toast('সংরক্ষণ করা হয়েছে', 'success');
    closeGalDrawer();
  }).catch(function (err) {
    console.error(err);
    toast('সংরক্ষণ করা যায়নি', 'error');
  }).finally(function () {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন';
  });
}

/* ================= সেটিংস ট্যাব (হেডার লেখা + ক্যাটাগরি + বছর) ================= */

function renderSettingsTab(root) {
  var s = STATE.settings;
  if (!EDIT_CATS) EDIT_CATS = s.categories.map(function (c) { return Object.assign({}, c); });
  if (!EDIT_YEARS) EDIT_YEARS = s.years.map(function (y) { return Object.assign({}, y); });

  root.innerHTML =
    '<div class="panel" style="padding:22px; margin-bottom:18px;">' +
      '<h3 style="margin-bottom:14px;">পেজের উপরের লেখা</h3>' +
      '<div class="form-grid">' +
        '<div class="form-group full"><label>Eyebrow (ছোট শিরোনাম)</label><input type="text" id="s_eyebrow" value="' + escapeHtml(s.eyebrow) + '"></div>' +
        '<div class="form-group full"><label>মূল শিরোনাম (title)</label><input type="text" id="s_title" value="' + escapeHtml(s.title) + '"></div>' +
        '<div class="form-group full"><label>বিবরণ (desc)</label><input type="text" id="s_desc" value="' + escapeHtml(s.desc) + '"></div>' +
        '<div class="form-group"><label>সাবস্ক্রাইব বাটনের লেখা</label><input type="text" id="s_subLabel" value="' + escapeHtml(s.subscribeLabel) + '"></div>' +
        '<div class="form-group"><label>সাবস্ক্রাইব লিংক</label><input type="url" id="s_subHref" value="' + escapeHtml(s.subscribeHref) + '"></div>' +
      '</div>' +
      '<button class="btn btn-primary btn-sm" id="saveHeaderBtn" style="margin-top:14px;"><i class="fa-solid fa-floppy-disk"></i> সংরক্ষণ করুন</button>' +
    '</div>' +

    '<div class="panel" style="padding:22px; margin-bottom:18px;">' +
      '<h3 style="margin-bottom:6px;">ক্যাটাগরি (ফিল্টার চিপ)</h3>' +
      '<p class="gal-hint">প্রতিটা ছবি এই ক্যাটাগরিগুলোর একটায় থাকবে। "Value" ইংরেজি ছোট হাতের অক্ষরে স্পেস ছাড়া লিখুন (যেমনঃ food) — "Label" ভিজিটর যা দেখবে সেটা।</p>' +
      '<div id="catRows" class="chip-editor">' + rowsEditorHtml(EDIT_CATS, 'cat') + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="addCatRow" style="margin-top:10px;"><i class="fa-solid fa-plus"></i> নতুন ক্যাটাগরি</button>' +
      '<div style="margin-top:14px;"><button class="btn btn-primary btn-sm" id="saveCatsBtn"><i class="fa-solid fa-floppy-disk"></i> ক্যাটাগরি সংরক্ষণ করুন</button></div>' +
    '</div>' +

    '<div class="panel" style="padding:22px;">' +
      '<h3 style="margin-bottom:6px;">বছর (ফিল্টার চিপ)</h3>' +
      '<p class="gal-hint">"শীঘ্রই আসছে" টিক দিলে ওই বছরে ছবি না থাকলেও গ্যালারি পেজে একটা "শীঘ্রই আসছে" বক্স দেখাবে।</p>' +
      '<div id="yearRows" class="chip-editor">' + rowsEditorHtml(EDIT_YEARS, 'year') + '</div>' +
      '<button type="button" class="btn btn-ghost btn-sm" id="addYearRow" style="margin-top:10px;"><i class="fa-solid fa-plus"></i> নতুন বছর</button>' +
      '<div style="margin-top:14px;"><button class="btn btn-primary btn-sm" id="saveYearsBtn"><i class="fa-solid fa-floppy-disk"></i> বছর সংরক্ষণ করুন</button></div>' +
    '</div>';

  wireSettingsTab();
}

function rowsEditorHtml(list, kind) {
  if (!list.length) {
    return '<p class="gal-hint" style="margin:0;">কোনো ' + (kind === 'cat' ? 'ক্যাটাগরি' : 'বছর') + ' নেই — নিচে থেকে একটা যোগ করুন।</p>';
  }
  return list.map(function (item, i) {
    return (
      '<div class="chip-row" data-i="' + i + '">' +
        '<input type="text" class="' + kind + '-value" value="' + escapeHtml(item.value) + '" placeholder="value">' +
        '<input type="text" class="' + kind + '-label" value="' + escapeHtml(item.label) + '" placeholder="label">' +
        (kind === 'year' ?
          '<label class="chip-row-check"><input type="checkbox" class="year-soon"' + (item.comingSoon ? ' checked' : '') + '> শীঘ্রই আসছে</label>' :
          '') +
        '<button type="button" class="icon-btn danger chip-row-del" data-i="' + i + '"><i class="fa-solid fa-trash"></i></button>' +
      '</div>'
    );
  }).join('');
}

function wireSettingsTab() {
  document.getElementById('saveHeaderBtn').addEventListener('click', saveHeader);

  document.getElementById('addCatRow').addEventListener('click', function () {
    EDIT_CATS.push({ value: '', label: '' });
    document.getElementById('catRows').innerHTML = rowsEditorHtml(EDIT_CATS, 'cat');
    wireRowDeletes('catRows', EDIT_CATS, 'cat');
  });
  document.getElementById('addYearRow').addEventListener('click', function () {
    EDIT_YEARS.push({ value: '', label: '', comingSoon: false });
    document.getElementById('yearRows').innerHTML = rowsEditorHtml(EDIT_YEARS, 'year');
    wireRowDeletes('yearRows', EDIT_YEARS, 'year');
  });

  document.getElementById('saveCatsBtn').addEventListener('click', function () { saveTaxonomy('cat'); });
  document.getElementById('saveYearsBtn').addEventListener('click', function () { saveTaxonomy('year'); });

  wireRowDeletes('catRows', EDIT_CATS, 'cat');
  wireRowDeletes('yearRows', EDIT_YEARS, 'year');
}

function wireRowDeletes(containerId, list, kind) {
  var container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.chip-row-del').forEach(function (btn) {
    btn.addEventListener('click', function () {
      list.splice(Number(btn.dataset.i), 1);
      container.innerHTML = rowsEditorHtml(list, kind);
      wireRowDeletes(containerId, list, kind);
    });
  });
}

function saveHeader() {
  var payload = {
    eyebrow: document.getElementById('s_eyebrow').value.trim(),
    title: document.getElementById('s_title').value.trim(),
    desc: document.getElementById('s_desc').value.trim(),
    subscribeLabel: document.getElementById('s_subLabel').value.trim(),
    subscribeHref: document.getElementById('s_subHref').value.trim()
  };
  if (!payload.title) { toast('শিরোনাম আবশ্যক', 'error'); return; }

  var btn = document.getElementById('saveHeaderBtn');
  var original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> সংরক্ষণ হচ্ছে...';

  setDoc(doc(db, 'gallery_settings', 'main'), payload, { merge: true }).then(function () {
    Object.assign(STATE.settings, payload);
    toast('সংরক্ষণ করা হয়েছে', 'success');
  }).catch(function (err) {
    console.error(err); toast('সংরক্ষণ করা যায়নি', 'error');
  }).finally(function () {
    btn.disabled = false;
    btn.innerHTML = original;
  });
}

function saveTaxonomy(kind) {
  var containerId = kind === 'cat' ? 'catRows' : 'yearRows';
  var container = document.getElementById(containerId);
  var rowEls = container.querySelectorAll('.chip-row');
  var list = [];
  var seen = {};
  var bad = false;

  rowEls.forEach(function (row) {
    var value = row.querySelector('.' + kind + '-value').value.trim().toLowerCase().replace(/\s+/g, '-');
    var label = row.querySelector('.' + kind + '-label').value.trim();
    if (!value || !label || seen[value]) { bad = true; return; }
    seen[value] = true;
    var item = { value: value, label: label };
    if (kind === 'year') item.comingSoon = row.querySelector('.year-soon').checked;
    list.push(item);
  });

  if (bad) { toast('প্রতিটা সারিতে Value ও Label আবশ্যক, এবং Value ইউনিক হতে হবে', 'error'); return; }

  var btn = document.getElementById(kind === 'cat' ? 'saveCatsBtn' : 'saveYearsBtn');
  var original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> সংরক্ষণ হচ্ছে...';

  var payload = {};
  payload[kind === 'cat' ? 'categories' : 'years'] = list;

  setDoc(doc(db, 'gallery_settings', 'main'), payload, { merge: true }).then(function () {
    if (kind === 'cat') { STATE.settings.categories = list; EDIT_CATS = list; }
    else { STATE.settings.years = list; EDIT_YEARS = list; }
    toast('সংরক্ষণ করা হয়েছে', 'success');
  }).catch(function (err) {
    console.error(err); toast('সংরক্ষণ করা যায়নি', 'error');
  }).finally(function () {
    btn.disabled = false;
    btn.innerHTML = original;
  });
}

/* ================= পুরনো ডাটা এক ক্লিকে ইম্পোর্ট ================= */

function runLegacyImport() {
  confirmDialog(
    'পুরনো ডাটা ইম্পোর্ট করবেন?',
    LEGACY_PHOTOS.length + 'টি ছবি, ' + LEGACY_VIDEOS.length + 'টি ভিডিও এবং পেজের লেখা/ক্যাটাগরি/বছর — সবকিছু একসাথে Firestore-এ যোগ হবে। এটা শুধু একবারই করবেন (দ্বিতীয়বার চাপলে ছবিগুলো দুইবার যোগ হয়ে যাবে)।'
  ).then(function (ok) {
    if (!ok) return;
    var btn = document.getElementById('importGalleryBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner spin"></i> ইম্পোর্ট হচ্ছে...'; }

    var batch = writeBatch(db);

    LEGACY_PHOTOS.forEach(function (p, i) {
      var ref = doc(collection(db, 'gallery_photos'));
      batch.set(ref, Object.assign({}, p, { id: i + 1 }));
    });
    LEGACY_VIDEOS.forEach(function (v, i) {
      var ref = doc(collection(db, 'gallery_videos'));
      batch.set(ref, Object.assign({}, v, { id: i + 1 }));
    });
    batch.set(doc(db, 'gallery_settings', 'main'), DEFAULT_SETTINGS, { merge: true });

    batch.commit().then(function () {
      STATE.settings = cloneSettings(DEFAULT_SETTINGS);
      EDIT_CATS = null;
      EDIT_YEARS = null;
      toast('ইম্পোর্ট সম্পন্ন হয়েছে — এখন থেকে সব এই প্যানেল থেকেই ম্যানেজ করুন', 'success');
    }).catch(function (err) {
      console.error(err);
      toast('ইম্পোর্ট ব্যর্থ হয়েছে', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-file-import"></i> পুরনো ওয়েবসাইট থেকে ' + LEGACY_PHOTOS.length + 'টি ছবি ও ' + LEGACY_VIDEOS.length + 'টি ভিডিও একসাথে ইম্পোর্ট করুন'; }
    });
  });
}
