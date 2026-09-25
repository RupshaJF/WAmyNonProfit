/* দাতা সদস্যবৃন্দ পেজের ডাটাবেস — #/donors রুটে ব্যবহৃত হয়
   নতুন দাতা যোগ/এডিট করতে চাইলে শুধু RJF.donorList বদলালেই হবে
   rank: 'gold' | 'silver' | 'heart' — কার্ডের ওপরের ব্যাজ আইকন ঠিক করে */
window.RJF = window.RJF || {};

RJF.donorList = [
  { id: 1, name: "ইঞ্জিনিয়ার রফিকুল ইসলাম", title: "Advisor", rank: "gold",
    image: "/gallery/member/rafiqul.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 2, name: "হারুনর রশিদ", title: "Advisor", rank: "silver",
    image: "/gallery/member/harrun.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 3, name: "ওমর ফারুক", title: "সভাপতি", rank: "heart",
    image: "/gallery/member/omor.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 4, name: "কাওসার আহমেদ", title: "সাধারণ সম্পাদক", rank: "heart",
    image: "/gallery/member/kawsar.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 5, name: "ইমরান আহমেদ", title: "প্রচার সম্পাদক", rank: "heart",
    image: "/gallery/member/imran_ahmed.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 6, name: "আবু সিয়াম", title: "সহ-সভাপতি", rank: "heart",
    image: "/gallery/member/siam.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 7, name: "কামরুল শেখ", title: "সহ-সভাপতি", rank: "heart",
    image: "/gallery/member/kamrul.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 8, name: "আব্দুল্লাহ্‌ আল ফাহিম", title: "সহ-সভাপতি", rank: "heart",
    image: "/gallery/member/fahim.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 9, name: "নাঈম ইসলাম", title: "সাংগঠনিক সম্পাদক", rank: "heart",
    image: "/gallery/member/naim.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 10, name: "সুমন আহমেদ", title: "দপ্তর সম্পাদক", rank: "heart",
    image: "/gallery/member/sumon.webp", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" },

  { id: 11, name: "শাহাদৎ হোসেন", title: "সমাজ সেবা বিষয়ক সম্পাদক", rank: "heart",
    image: "https://via.placeholder.com/150", since: "০৭ মাস", contribution: "ফাউন্ডেশন কার্যক্রম" }
];

/* ---------- এডমিন প্যানেল থেকে যোগ/এডিট করা ডাটা (Firestore) দিয়ে উপরের স্ট্যাটিক তালিকা ওভাররাইড ---------
   এডমিন প্যানেলে 'donors' কালেকশনে কোনো ডকুমেন্ট থাকলে সেটাই দেখানো হবে (না থাকলে উপরের ডিফল্ট তালিকা থাকবে) */
RJF._donorsFirestorePromise = null;
RJF.refreshDonorListFromFirestore = function () {
  if (RJF._donorsFirestorePromise) return RJF._donorsFirestorePromise;

  RJF._donorsFirestorePromise = Promise.all([
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js')
  ]).then(function (mods) {
    var appMod = mods[0];
    var fsMod = mods[1];
    var cfg = { apiKey: "AIzaSyBMfeFWtyE-raexNO8DkpyXBQFvE3yNIRU", authDomain: "rupshajf.firebaseapp.com", projectId: "rupshajf", storageBucket: "rupshajf.firebasestorage.app", messagingSenderId: "878760730320", appId: "1:878760730320:web:39ef84c2b447e24df5c8d5", measurementId: "G-BF5ZPK7NZS" };
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(cfg);
    var db = fsMod.getFirestore(app);
    var q = fsMod.query(fsMod.collection(db, 'donors'), fsMod.orderBy('id', 'asc'));
    return fsMod.getDocs(q).then(function (snapshot) {
      if (snapshot.empty) return;
      RJF.donorList = snapshot.docs.map(function (d) { return d.data(); });
      if (window.location.hash === '#/donors' && typeof RJF.renderDonorsPage === 'function') {
        RJF.renderDonorsPage();
      }
    });
  }).catch(function (err) { console.warn('donors Firestore fetch failed, using static fallback:', err); });

  return RJF._donorsFirestorePromise;
};
