/* নতুন নোটিশ/ইভেন্ট যোগ হলে সব সাবস্ক্রাইবারকে পুশ নোটিফিকেশন পাঠানোর জন্য।
   ব্রাউজার থেকে সরাসরি Firebase Cloud Messaging-এ পাঠানো নিরাপদ নয় (সিক্রেট কী এক্সপোজ হয়ে যায়),
   তাই এই ফাংশনটা /api/send-notification নামের একটা ছোট্ট Vercel function কল করে — সেটাই
   Firebase Admin SDK দিয়ে (সার্ভার সাইডে, সিক্রেট কী লুকানো অবস্থায়) আসল পাঠানোর কাজ করে।
   বিস্তারিত সেটআপ ধাপ: প্রজেক্টের রুটে PUSH_NOTIFICATIONS_GUIDE.md ফাইল দেখুন।

   এই ফাংশন fail করলেও নোটিশ/ইভেন্ট সেভ হওয়া আটকাবে না — শুধু console-এ চুপচাপ লগ হবে,
   কারণ নোটিশ/ইভেন্ট সেভ হওয়াটাই মূল কাজ, পুশ পাঠানো একটা বোনাস পদক্ষেপ। */
import { auth } from './firebase.js';

export function sendPushNotification(title, body, url) {
  if (!auth.currentUser) return;

  auth.currentUser.getIdToken().then(function (idToken) {
    return fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify({ title: title, body: body, url: url })
    });
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (res.ok) {
        console.log('পুশ নোটিফিকেশন পাঠানো হয়েছে:', data);
      } else {
        console.warn('পুশ নোটিফিকেশন পাঠানো যায়নি:', data);
      }
    });
  }).catch(function (err) {
    console.warn('পুশ নোটিফিকেশন রিকোয়েস্ট ব্যর্থ (এখনো /api/send-notification সেটআপ না হয়ে থাকলে এটাই স্বাভাবিক):', err);
  });
}
