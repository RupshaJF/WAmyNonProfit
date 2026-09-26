/* গ্যালারি পেজ — সব লেখা, ছবি ও ভিডিওর তথ্য এক জায়গায়
   নতুন ছবি/ভিডিও যোগ করতে চাইলে নিচের photos/videos অ্যারেতে একটা লাইন বাড়ালেই হবে,
   HTML কোথাও হাত দেওয়া লাগবে না */
window.RJF = window.RJF || {};

RJF.galleryData = {
  eyebrow: "আমাদের কার্যক্রমের প্রতিচ্ছবি",
  title: "আমাদের ফটো গ্যালারি",
  desc: "মানবিক ও খেলাধুলার কিছু স্মরণীয় মুহূর্ত",
  subscribeHref: "https://rupshajonokollanfoundation.vercel.app/subscribe/",
  subscribeLabel: "সাবস্ক্রাইব করুন",

  years: [
    { value: "all", label: "All years activities" },
    { value: "2025", label: "2025" },
    { value: "2026", label: "2026" },
    { value: "2027", label: "2027" }
  ],

  categories: [
    { value: "all", label: "সকল কিছু" },
    { value: "food", label: "খাদ্য" },
    { value: "health", label: "স্বাস্থ্য সেবা" },
    { value: "sports", label: "খেলাধুলা" }
  ],

  /* year: coming-soon হিসেবে দেখাতে চাইলে বছরটা এখানে যোগ করো, ওই বছরে কোনো ছবি না দিলেও চলবে */
  comingSoonYears: ["2027"],

  videos: [
    {
      youtubeId: "egD2biAoCNE",
      title: "রূপসা জনকল্যাণ ফাউন্ডেশন ইফতার মাহফিল",
      caption: "রূপসা জনকল্যাণ ফাউন্ডেশনের উদ্যোগে ইফতার মাহফিলের আয়োজন"
    },
    {
      youtubeId: "OAAle0P_TGE",
      title: "খেলাধুলার আয়োজন",
      caption: "রূপসা জনকল্যাণ ফাউন্ডেশনের উদ্যোগে চ্যাম্পিয়ান ট্রফির আয়োজন"
    },
    {
      youtubeId: "iWz8ToHtGmM",
      title: "খেলাধুলার আয়োজন",
      caption: "রূপসা জনকল্যাণ ফাউন্ডেশনের উদ্যোগে চ্যাম্পিয়ান ট্রফির আয়োজন"
    }
  ],

  photos: [
    /* ---------- ২০২৫ ---------- */
    { src: "https://i.ibb.co.com/FbSy0KDW/IMG-20260320-163051.jpg", category: "health", year: "2025", title: "পশু-পাখিকে সাহায্য", caption: "রূপসা এলাকা, মার্চ ২০২৫" },
    { src: "https://i.ibb.co.com/q3sgc4T0/IMG-20260320-234348.jpg", category: "food", year: "2025", title: "ইফতার মাহফিলের আয়োজন", caption: "রূপসা ২০ মার্চ ২০২৫" },
    { src: "https://i.ibb.co.com/QFdhY0Vs/1774703908564.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },
    { src: "https://i.ibb.co.com/SDcMby8T/FB-IMG-1759581201690.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },
    { src: "https://i.ibb.co.com/W42sj7DB/1774703841097.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },
    { src: "https://i.ibb.co.com/VYcdptkL/1774703848097.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },
    { src: "https://i.ibb.co.com/sJs56m5B/1774703854674.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },
    { src: "https://i.ibb.co.com/spw2RcFB/1774703869998.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },
    { src: "https://i.ibb.co.com/v4Bvs70v/1774703873979.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },
    { src: "https://i.ibb.co.com/fYr6Y7NR/1774703878305.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },
    { src: "https://i.ibb.co.com/cSTZ0Sp1/1774703885580.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },
    { src: "https://i.ibb.co.com/cRqMDK9/1774703894934.jpg", category: "sports", year: "2025", title: "খেলাধুলা", caption: "রূপসা এলাকা, ২০২৫" },

    /* ---------- ২০২৬ ---------- */
    { src: "gallery/national-anthem-all-team.webp", category: "sports", year: "2026", title: "national anthem", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/lost-team.webp", category: "sports", year: "2026", title: "team 1", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/win-team.webp", category: "sports", year: "2026", title: "team 2", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/team-trophy.webp", category: "sports", year: "2026", title: "trophy celeveration", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/team-win.webp", category: "sports", year: "2026", title: "খেলাধুলা", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/fkk.webp", category: "sports", year: "2026", title: "খেলাধুলা", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/sumon.webp", category: "sports", year: "2026", title: "খেলাধুলা", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/kamrul.webp", category: "sports", year: "2026", title: "খেলাধুলা", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/imran.webp", category: "sports", year: "2026", title: "খেলাধুলা", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/kawsar.webp", category: "sports", year: "2026", title: "খেলাধুলা", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/amjad.webp", category: "sports", year: "2026", title: "খেলাধুলা", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/monir.webp", category: "sports", year: "2026", title: "খেলাধুলা", caption: "রূপসা এলাকা, 2026" },
    { src: "gallery/rifat.webp", category: "sports", year: "2026", title: "খেলাধুলা", caption: "রূপসা এলাকা, 2026" }
  ]
};

/* ---------- এডমিন প্যানেল থেকে যোগ/এডিট করা ডাটা (Firestore) দিয়ে উপরের স্ট্যাটিক ডাটা ওভাররাইড ----------
   এডমিন প্যানেলের 'গ্যালারি' সেকশনে ছবি/ভিডিও/সেটিংস যোগ করা থাকলে সেটাই দেখানো হবে।
   Firestore-এ কিছু না থাকলে (বা ফেচ ব্যর্থ হলে) উপরের ডিফল্ট ডাটাই দেখাবে — তাই এখনই ভাঙার কোনো ঝুঁকি নেই।
   ঠিক js/donors-data.js ও js/member-data.js এর মতো একই প্যাটার্ন। */
RJF._galleryFirestorePromise = null;
RJF.refreshGalleryDataFromFirestore = function () {
  if (RJF._galleryFirestorePromise) return RJF._galleryFirestorePromise;

  RJF._galleryFirestorePromise = Promise.all([
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js')
  ]).then(function (mods) {
    var appMod = mods[0];
    var fsMod = mods[1];
    var cfg = {
      apiKey: "AIzaSyBMfeFWtyE-raexNO8DkpyXBQFvE3yNIRU",
      authDomain: "rupshajf.firebaseapp.com",
      projectId: "rupshajf",
      storageBucket: "rupshajf.firebasestorage.app",
      messagingSenderId: "878760730320",
      appId: "1:878760730320:web:39ef84c2b447e24df5c8d5",
      measurementId: "G-BF5ZPK7NZS"
    };
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(cfg);
    var db = fsMod.getFirestore(app);

    var photosQ = fsMod.query(fsMod.collection(db, 'gallery_photos'), fsMod.orderBy('id', 'asc'));
    var videosQ = fsMod.query(fsMod.collection(db, 'gallery_videos'), fsMod.orderBy('id', 'asc'));
    var settingsRef = fsMod.doc(db, 'gallery_settings', 'main');

    return Promise.all([
      fsMod.getDocs(photosQ).catch(function () { return null; }),
      fsMod.getDocs(videosQ).catch(function () { return null; }),
      fsMod.getDoc(settingsRef).catch(function () { return null; })
    ]).then(function (results) {
      var photosSnap = results[0];
      var videosSnap = results[1];
      var settingsSnap = results[2];
      var changed = false;

      if (settingsSnap && settingsSnap.exists()) {
        var s = settingsSnap.data();
        if (s.eyebrow) RJF.galleryData.eyebrow = s.eyebrow;
        if (s.title) RJF.galleryData.title = s.title;
        if (s.desc) RJF.galleryData.desc = s.desc;
        if (s.subscribeHref) RJF.galleryData.subscribeHref = s.subscribeHref;
        if (s.subscribeLabel) RJF.galleryData.subscribeLabel = s.subscribeLabel;

        if (Array.isArray(s.categories) && s.categories.length) {
          RJF.galleryData.categories = [{ value: "all", label: "সকল কিছু" }].concat(
            s.categories.map(function (c) { return { value: c.value, label: c.label }; })
          );
        }
        if (Array.isArray(s.years) && s.years.length) {
          RJF.galleryData.years = [{ value: "all", label: "All years activities" }].concat(
            s.years.map(function (y) { return { value: y.value, label: y.label }; })
          );
          RJF.galleryData.comingSoonYears = s.years
            .filter(function (y) { return y.comingSoon; })
            .map(function (y) { return y.value; });
        }
        changed = true;
      }

      if (photosSnap && !photosSnap.empty) {
        RJF.galleryData.photos = photosSnap.docs.map(function (d) { return d.data(); });
        changed = true;
      }
      if (videosSnap && !videosSnap.empty) {
        RJF.galleryData.videos = videosSnap.docs.map(function (d) { return d.data(); });
        changed = true;
      }

      if (changed && window.location.hash === '#/gallery' && typeof RJF.renderGalleryPage === 'function') {
        RJF.renderGalleryPage();
      }
    });
  }).catch(function (err) {
    console.warn('গ্যালারি ডাটা Firestore থেকে আনা যায়নি, ডিফল্ট ডাটা দেখানো হচ্ছে:', err);
  });

  return RJF._galleryFirestorePromise;
};
