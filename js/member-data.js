/* সদস্য পাতার ডাটাবেস — #/member রুটে ব্যবহৃত হয়
   নতুন সদস্য যোগ/এডিট করতে চাইলে শুধু RJF.memberList বদলালেই হবে */
window.RJF = window.RJF || {};

RJF.MEMBER_CATEGORY_ORDER = [
  "প্রতিষ্ঠাতা পরিচালক",
  "সভাপতি",
  "সিনিয়র সহ-সভাপতি",
  "সহ-সভাপতি",
  "সাধারণ সম্পাদক",
  "যুগ্ম সাধারণ সম্পাদক",
  "কোষাধ্যক্ষ",
  "প্রচার সম্পাদক",
  "সাংগঠনিক সম্পাদক",
  "দপ্তর সম্পাদক",
  "ক্রিয়া সম্পাদক",
  "সংস্কৃতি বিষয়ক সম্পাদক",
  "সমাজসেবা বিষয়ক সম্পাদক",
  "উপদেষ্টা",
  "সাধারণ সদস্য"
];

RJF.memberList = [
  { id: 1, name: "ইঞ্জিনিয়ার রফিকুল ইসলাম", role: "প্রতিষ্ঠাতা পরিচালক", category: "প্রতিষ্ঠাতা পরিচালক", status: "active",
    image: "/gallery/member/rafiqul.webp", desc: "ফাউন্ডেশনের সামগ্রিক কার্যক্রম পরিচালনা এবং দিকনির্দেশনা প্রদান করেন।",
    memberid: "", profileUrl: "#", facebook: "https://www.facebook.com/engrrafiqulislam.rafiq.18", whatsapp: "https://wa.me/" },

  { id: 2, name: "হারুন অর রশিদ", role: "প্রতিষ্ঠাতা পরিচালক", category: "প্রতিষ্ঠাতা পরিচালক", status: "active",
    image: "/gallery/member/harrun.webp", desc: "মাঠ পর্যায়ের সার্বিক ব্যবস্থাপনা এবং সদস্যদের মাঝে সমন্বয় সাধন করেন।",
    memberid: "", profileUrl: "#", facebook: "https://www.facebook.com/harunor.roshid.195011", whatsapp: "https://wa.me/" },

  { id: 3, name: "মো: ওমর ফারুক", role: "সভাপতি", category: "সভাপতি", status: "active",
    image: "/gallery/member/omor.webp", desc: "ফাউন্ডেশনের উদ্যোগ গ্রহণ ও বিভিন্ন বিষয়ে আলোচনা ও পরামর্শ করা।",
    memberid: "RJF-2026-1390", profileUrl: "/verify.html?id=RJF-2026-1390", facebook: "https://www.facebook.com/fa.ruqe.75", whatsapp: "https://wa.me/" },

  { id: 4, name: "মনিরুল ইসলাম মনির", role: "সিনিয়র সহ-সভাপতি", category: "সিনিয়র সহ-সভাপতি", status: "active",
    image: "/gallery/member/monir.webp", desc: "জরুরি সেবা এবং প্রজেক্ট বাস্তবায়নে সরাসরি ভূমিকা পালন করেন।",
    memberid: "", profileUrl: "#", facebook: "https://www.facebook.com/md.monirulislammoon.71", whatsapp: "https://wa.me/" },

  { id: 5, name: "নাঈম ইসলাম", role: "সাংগঠনিক সম্পাদক", category: "সাংগঠনিক সম্পাদক", status: "active",
    image: "/gallery/member/naim.webp", desc: "জরুরি সেবা এবং প্রজেক্ট বাস্তবায়নে সরাসরি ভূমিকা পালন করেন।",
    memberid: "RJF-2026-2843", profileUrl: "/verify.html?id=RJF-2026-2843", facebook: "https://www.facebook.com/nayeem94170", whatsapp: "https://wa.me/" },

  { id: 6, name: "কাওসার আহমেদ", role: "সাধারণ সম্পাদক", category: "সাধারণ সম্পাদক", status: "active",
    image: "/gallery/member/kawsar.webp", desc: "সংগঠনের দৈনন্দিন কার্যক্রম তদারকি ও সমন্বয় করেন।",
    memberid: "RJF-2026-8214", profileUrl: "/verify.html?id=RJF-2026-8214", facebook: "https://www.facebook.com/kawsar.ahmed.481662", whatsapp: "https://wa.me/" },

  { id: 7, name: "ইমরান আহমেদ", role: "প্রচার সম্পাদক", category: "প্রচার সম্পাদক", status: "active",
    image: "/gallery/member/imran_ahmed.webp",
    desc: "ইনি ফাউন্ডেশনের ওয়েবসাইট তৈরি করা সহ ফেসবুকে অ্যানাউন্সমেন্ট এবং ইউটিউবে ভিডিও আপলোড সহ সকল টেকনিক্যাল বিষয়ে এক্সপার্ট। ফাউন্ডেশনের কার্যক্রম বিভিন্ন মানুষের মধ্যে ছড়িয়ে দেন।",
    memberid: "RJF-2026-9689", profileUrl: "/verify.html?id=RJF-2026-9689", facebook: "https://facebook.com/imran.ahmedddddd",
    whatsapp: "https://wa.me/8801957329211", github: "https://github.com/imran-s-project" },

  { id: 8, name: "আব্দুল্লাহ্‌ আল ফাহিম", role: "সহ-সভাপতি", category: "সহ-সভাপতি", status: "active",
    image: "/gallery/member/fahim.webp", desc: "কমিটির বিভিন্ন সিদ্ধান্ত গ্রহণে সভাপতিকে সহায়তা করেন।",
    memberid: "RJF-2026-4412", profileUrl: "/verify.html?id=RJF-2026-4412", facebook: "https://www.facebook.com/profile.php?id=100080505806242", whatsapp: "https://wa.me/" },

  { id: 9, name: "আবু সিয়াম", role: "সহ-সভাপতি", category: "সহ-সভাপতি", status: "inactive",
    image: "/gallery/member/siam.webp", desc: "কমিটির বিভিন্ন সিদ্ধান্ত গ্রহণে সভাপতিকে সহায়তা করেন।",
    memberid: "", profileUrl: "#", facebook: "https://www.facebook.com/Siamphoria", whatsapp: "https://wa.me/" },

  { id: 10, name: "কামরুল শেখ", role: "সহ-সভাপতি", category: "সহ-সভাপতি", status: "active",
    image: "/gallery/member/kamrul.webp", desc: "কমিটির বিভিন্ন সিদ্ধান্ত গ্রহণে সভাপতিকে সহায়তা করেন।",
    memberid: "RJF-2026-3428", profileUrl: "/verify.html?id=RJF-2026-3428", facebook: "https://www.facebook.com/md.kamrul.hasan.972559", whatsapp: "https://wa.me/" },

  { id: 11, name: "রায়হান খোকা", role: "সহ-সভাপতি", category: "সহ-সভাপতি", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 12, name: "শামিম", role: "সহ-সভাপতি", category: "সহ-সভাপতি", status: "active",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 13, name: "হুমায়ন আহমেদ", role: "ক্রিয়া সম্পাদক", category: "ক্রিয়া সম্পাদক", status: "active",
    image: "/gallery/member/humayon.webp", desc: "খেলাধুলা এবং তার পাশাপাশি বিভিন্ন ধরনের ক্রিয়ায় অংশগ্রহণ করেন।",
    memberid: "RJF-2026-6659", profileUrl: "/verify.html?id=RJF-2026-6659", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 14, name: "সুমন আহমেদ", role: "দপ্তর সম্পাদক", category: "দপ্তর সম্পাদক", status: "active",
    image: "/gallery/member/sumon.webp", desc: "ফাউন্ডেশনের কাগজপত্র এবং সকল দাপ্তরিক বিষয়ক জিনিসপত্র তার কাছে গচ্ছিত থাকে।",
    memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 15, name: "মো: শামিম আহমেদ", role: "যুগ্ম সাধারণ সম্পাদক", category: "যুগ্ম সাধারণ সম্পাদক", status: "active",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 16, name: "হুমায়ন কবির", role: "সংস্কৃতি বিষয়ক সম্পাদক", category: "সংস্কৃতি বিষয়ক সম্পাদক", status: "active",
    image: "/gallery/member/humayon1.webp", desc: "ইনি বিভিন্ন ধরনের সাংস্কৃতিক অনুষ্ঠান এবং খেলাধুলায় অবদান রাখেন।",
    memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 17, name: "মো আব্দুস সাত্তার", role: "কোষাধ্যক্ষ", category: "কোষাধ্যক্ষ", status: "active",
    image: "https://i.ibb.co.com/ynnR8jyV/img-2-1771574187607.jpg", desc: "ফাউন্ডেশনের সকল হিসাব এবং অর্থ উত্তোলন করে থাকেন।",
    memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 18, name: "মো মুন্না", role: "সাধারণ সদস্য", category: "সাধারণ সদস্য", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 19, name: "মো সেলিম রেজা", role: "সমাজসেবা বিষয়ক সম্পাদক", category: "সমাজসেবা বিষয়ক সম্পাদক", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 20, name: "মো শাহাদৎ হোসেন", role: "সমাজসেবা বিষয়ক সম্পাদক", category: "সমাজসেবা বিষয়ক সম্পাদক", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 21, name: "ছফের তালুকদার", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 22, name: "আসলাম তালুকদার", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 23, name: "মোস্তাফিজুর রহমান", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "active",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 24, name: "তরিকুল ইসলাম", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "active",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 25, name: "মিনু মিয়া", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "active",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 26, name: "আমজাদ", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "inactive",
    image: "/gallery/amjad.webp", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 27, name: "লোমান", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 28, name: "উল্লাস সরকার", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 29, name: "ইসাছিন আরাফাত", role: "সাধারণ সদস্য", category: "সাধারণ সদস্য", status: "active",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 30, name: "জুয়েল", role: "সাধারণ সদস্য", category: "সাধারণ সদস্য", status: "active",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 31, name: "সোহাগ", role: "সাধারণ সদস্য", category: "সাধারণ সদস্য", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 32, name: "মুসলিম", role: "সাধারণ সদস্য", category: "সাধারণ সদস্য", status: "active",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 33, name: "রাজ্জাক", role: "সাধারণ সদস্য", category: "সাধারণ সদস্য", status: "active",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 34, name: "শাহাদৎ", role: "সাধারণ সদস্য", category: "সাধারণ সদস্য", status: "inactive",
    image: "https://via.placeholder.com/150", desc: "none", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 35, name: "মো সাইদুল ইসলাম", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "active",
    image: "https://via.placeholder.com/150", desc: "সহকারি প্রধান উপদেষ্টা", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" },

  { id: 36, name: "আবুল কালাম আজাদ", role: "উপদেষ্টা", category: "উপদেষ্টা", status: "active",
    image: "https://via.placeholder.com/150", desc: "প্রধান শিক্ষক,রূপসা উচ্চ বিদ্যালয়", memberid: "", profileUrl: "#", facebook: "https://facebook.com", whatsapp: "https://wa.me/1234567890" }
];

/* ---------- এডমিন প্যানেল থেকে যোগ/এডিট করা ডাটা (Firestore) দিয়ে উপরের স্ট্যাটিক তালিকা ওভাররাইড ---------
   এডমিন প্যানেলে 'team_members' কালেকশনে কোনো ডকুমেন্ট থাকলে সেটাই দেখানো হবে (না থাকলে উপরের ডিফল্ট তালিকা থাকবে) */
RJF._teamFirestorePromise = null;
RJF.refreshMemberListFromFirestore = function () {
  if (RJF._teamFirestorePromise) return RJF._teamFirestorePromise;

  RJF._teamFirestorePromise = Promise.all([
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js')
  ]).then(function (mods) {
    var appMod = mods[0];
    var fsMod = mods[1];
    var cfg = { apiKey: "AIzaSyBMfeFWtyE-raexNO8DkpyXBQFvE3yNIRU", authDomain: "rupshajf.firebaseapp.com", projectId: "rupshajf", storageBucket: "rupshajf.firebasestorage.app", messagingSenderId: "878760730320", appId: "1:878760730320:web:39ef84c2b447e24df5c8d5", measurementId: "G-BF5ZPK7NZS" };
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(cfg);
    var db = fsMod.getFirestore(app);
    var q = fsMod.query(fsMod.collection(db, 'team_members'), fsMod.orderBy('id', 'asc'));
    return fsMod.getDocs(q).then(function (snapshot) {
      if (snapshot.empty) return;
      RJF.memberList = snapshot.docs.map(function (d) { return d.data(); });
      if (window.location.hash === '#/member' && typeof RJF.renderMemberPage === 'function') {
        RJF.renderMemberPage();
      }
    });
  }).catch(function (err) { console.warn('team_members Firestore fetch failed, using static fallback:', err); });

  return RJF._teamFirestorePromise;
};
