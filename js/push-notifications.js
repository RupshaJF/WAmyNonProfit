/* পুশ নোটিফিকেশন — সাবস্ক্রাইব বাটন + FCM টোকেন সংরক্ষণ + ফোরগ্রাউন্ড/ব্যাকগ্রাউন্ড মেসেজ হ্যান্ডলিং।
   সেটআপ করতে PUSH_NOTIFICATIONS_GUIDE.md দেখুন — মূলত নিচের VAPID_KEY-টা বসাতে হবে
   (Firebase Console → Project settings → Cloud Messaging → Web Push certificates)। */
window.RJF = window.RJF || {};

var VAPID_KEY = "BOArKKWaPKLPOVF089XZF3Q7tW8vRkyj3LUZnXU3RuprkyKza_92a9t9SCAOxb3lo3DAbUi3ApJy0-2fBLGOh-k";

var FIREBASE_CONFIG = {
  apiKey: "AIzaSyBMfeFWtyE-raexNO8DkpyXBQFvE3yNIRU",
  authDomain: "rupshajf.firebaseapp.com",
  projectId: "rupshajf",
  storageBucket: "rupshajf.firebasestorage.app",
  messagingSenderId: "878760730320",
  appId: "1:878760730320:web:39ef84c2b447e24df5c8d5",
  measurementId: "G-BF5ZPK7NZS"
};

var LS_KEY = 'rjf_push_subscribed';
var btn = null;
var messagingWrap = null;

function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function createButton() {
  if (btn) return btn;
  btn = document.createElement('button');
  btn.id = 'pushSubscribeBtn';
  btn.type = 'button';
  btn.innerHTML = '<i class="fa-regular fa-bell"></i> নোটিফিকেশন চালু করুন';
  btn.style.cssText =
    'position:fixed; right:26px; bottom:104px; z-index:600;' +
    'display:none; align-items:center; gap:8px;' +
    'background:var(--river-deep,#0E3B36); color:#fff; border:none;' +
    'font-weight:700; font-size:.9rem; padding:12px 18px; border-radius:30px;' +
    'box-shadow:0 8px 24px rgba(0,0,0,0.25); cursor:pointer;';
  document.body.appendChild(btn);
  btn.addEventListener('click', subscribe);
  return btn;
}

function showButton() { createButton(); btn.style.display = 'flex'; }
function hideButton() { if (btn) btn.style.display = 'none'; }

function setButtonSubscribed() {
  if (!btn) return;
  btn.innerHTML = '<i class="fa-solid fa-bell"></i> নোটিফিকেশন চালু আছে';
  btn.disabled = true;
  btn.style.opacity = '0.75';
  btn.style.cursor = 'default';
  setTimeout(hideButton, 2500);
}

function loadMessaging() {
  if (messagingWrap) return Promise.resolve(messagingWrap);
  return Promise.all([
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging.js')
  ]).then(function (mods) {
    var appMod = mods[0];
    var msgMod = mods[1];
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
    messagingWrap = { mod: msgMod, instance: msgMod.getMessaging(app) };
    return messagingWrap;
  });
}

function saveTokenToFirestore(token) {
  return Promise.all([
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js')
  ]).then(function (mods) {
    var appMod = mods[0];
    var fsMod = mods[1];
    var app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(FIREBASE_CONFIG);
    var db = fsMod.getFirestore(app);
    return fsMod.setDoc(fsMod.doc(db, 'push_subscribers', token), {
      subscribedAt: fsMod.serverTimestamp(),
      userAgent: navigator.userAgent
    });
  });
}

function subscribe() {
  if (!isPushSupported()) {
    alert('দুঃখিত, এই ব্রাউজারে পুশ নোটিফিকেশন সাপোর্ট করে না।');
    return;
  }
  if (VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
    console.warn('VAPID_KEY এখনো বসানো হয়নি — js/push-notifications.js ফাইলে বসান (দেখুন PUSH_NOTIFICATIONS_GUIDE.md)।');
    alert('নোটিফিকেশন সিস্টেমটা এখনো সম্পূর্ণ সেটআপ হয়নি।');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> চালু হচ্ছে...';

  Promise.all([
    navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    loadMessaging()
  ]).then(function (results) {
    var registration = results[0];
    var messaging = results[1];
    return Notification.requestPermission().then(function (permission) {
      if (permission !== 'granted') throw new Error('permission-denied');
      return messaging.mod.getToken(messaging.instance, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
    });
  }).then(function (token) {
    if (!token) throw new Error('no-token');
    return saveTokenToFirestore(token).then(function () {
      localStorage.setItem(LS_KEY, '1');
      setButtonSubscribed();
      wireForegroundMessages();
    });
  }).catch(function (err) {
    if (err && err.message === 'permission-denied') {
      alert('নোটিফিকেশনের অনুমতি দেওয়া হয়নি। ব্রাউজার সেটিংস থেকে পরে চালু করা যাবে।');
    } else {
      console.error('পুশ সাবস্ক্রাইব করা যায়নি:', err);
      alert('নোটিফিকেশন চালু করা যায়নি, একটু পর আবার চেষ্টা করুন।');
    }
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-regular fa-bell"></i> নোটিফিকেশন চালু করুন';
  });
}

/* ট্যাব খোলা ও ফোকাসে থাকা অবস্থায় পুশ এলে ব্রাউজারের সিস্টেম নোটিফিকেশনের বদলে হালকা ইন-পেজ টোস্ট দেখানো */
function wireForegroundMessages() {
  loadMessaging().then(function (messaging) {
    messaging.mod.onMessage(messaging.instance, function (payload) {
      var title = (payload.notification && payload.notification.title) || 'নতুন আপডেট';
      var body = (payload.notification && payload.notification.body) || '';
      showInPageToast(title, body);
    });
  }).catch(function () { /* সাইলেন্টলি ইগনোর — মূল সাইটের কাজে বাধা দেবে না */ });
}

function showInPageToast(title, body) {
  var el = document.createElement('div');
  el.style.cssText =
    'position:fixed; top:20px; right:20px; left:20px; max-width:360px; margin-left:auto; z-index:999;' +
    'background:#fff; border-left:4px solid var(--turmeric,#E3A73E); border-radius:12px;' +
    'box-shadow:0 12px 30px rgba(0,0,0,0.18); padding:16px 18px;' +
    'opacity:0; transform:translateY(-12px); transition:opacity .35s ease, transform .35s ease; cursor:pointer;';
  el.innerHTML =
    '<div style="display:flex; gap:10px; align-items:flex-start;">' +
      '<i class="fa-solid fa-bell" style="color:var(--turmeric,#E3A73E); margin-top:2px;"></i>' +
      '<div><strong style="display:block; color:var(--river-deep,#0E3B36); font-size:14px;"></strong>' +
      '<span style="font-size:13px; color:#555;"></span></div>' +
    '</div>';
  el.querySelector('strong').textContent = title;
  el.querySelector('span').textContent = body;
  document.body.appendChild(el);

  function dismiss() {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-12px)';
    setTimeout(function () { el.remove(); }, 350);
  }

  requestAnimationFrame(function () {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });
  el.addEventListener('click', dismiss);
  setTimeout(dismiss, 6000);
}

document.addEventListener('DOMContentLoaded', function () {
  if (!isPushSupported()) return;

  if (Notification.permission === 'granted' && localStorage.getItem(LS_KEY) === '1') {
    /* আগেই সাবস্ক্রাইব করা — বাটন দেখানোর দরকার নেই, শুধু ফোরগ্রাউন্ড মেসেজ লিসেনার চালু রাখুন */
    wireForegroundMessages();
  } else if (Notification.permission === 'default') {
    /* এখনো জিজ্ঞেস করা হয়নি — পেজ খোলার সাথে সাথেই বিরক্ত না করে একটু দেরিতে বাটন দেখান */
    setTimeout(showButton, 3500);
  }
  /* permission === 'denied' হলে কিছুই দেখানো হবে না — ব্যবহারকারীর সিদ্ধান্তকে সম্মান জানানো */
});

RJF.pushNotifications = { subscribe: subscribe };
