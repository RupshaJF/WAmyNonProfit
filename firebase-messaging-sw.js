/* Firebase Cloud Messaging সার্ভিস ওয়ার্কার — এই ফাইলটার নাম ও রুট লোকেশন (ডোমেইনের একদম মূলে)
   Firebase-এর নিজস্ব নিয়ম, বদলানো যাবে না। সাইট/অ্যাপ বন্ধ বা ব্যাকগ্রাউন্ডে থাকা অবস্থাতেও
   পুশ নোটিফিকেশন দেখানোর কাজ এই ফাইলটাই করে। মূল sw.js (অফলাইন/ক্যাশিং) থেকে এটা সম্পূর্ণ আলাদা,
   দুটো একসাথে পাশাপাশি কাজ করে, একে অন্যকে প্রভাবিত করে না। */

importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBMfeFWtyE-raexNO8DkpyXBQFvE3yNIRU",
  authDomain: "rupshajf.firebaseapp.com",
  projectId: "rupshajf",
  storageBucket: "rupshajf.firebasestorage.app",
  messagingSenderId: "878760730320",
  appId: "1:878760730320:web:39ef84c2b447e24df5c8d5",
  measurementId: "G-BF5ZPK7NZS"
});

var messaging = firebase.messaging();

/* সাইট/ট্যাব বন্ধ বা মিনিমাইজ করা থাকলে এই হ্যান্ডলারটাই নোটিফিকেশন দেখায়
   (ট্যাব খোলা ও ফোকাসে থাকলে js/push-notifications.js এর onMessage হ্যান্ডলার এটা দেখায়, ডাবল দেখাবে না) */
messaging.onBackgroundMessage(function (payload) {
  var title = (payload.notification && payload.notification.title) || 'রূপসা জনকল্যাণ ফাউন্ডেশন';
  var options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: { url: (payload.fcmOptions && payload.fcmOptions.link) || (payload.data && payload.data.url) || '/' }
  };
  self.registration.showNotification(title, options);
});

/* নোটিফিকেশনে ক্লিক করলে সাইটের সংশ্লিষ্ট পেজ খুলুন (আগে থেকে একটা ট্যাব খোলা থাকলে সেটাই ফোকাস করুন) */
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
