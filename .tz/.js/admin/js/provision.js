/* admin panel — সদস্যের লগইন অ্যাকাউন্ট (Firebase Authentication) তৈরি ও "পাসওয়ার্ড সেট করার লিংক" পাঠানো

   কেন আলাদা "সেকেন্ডারি" অ্যাপ?
   createUserWithEmailAndPassword() ডাকলে সেই অ্যাপে নতুন ইউজার সাইন-ইন হয়ে যায়। মূল অ্যাপে করলে
   অ্যাডমিন নিজেই লগআউট হয়ে যেত। তাই প্রতিবার একটা সাময়িক আলাদা অ্যাপ বানিয়ে কাজ শেষে মুছে ফেলা হয়।

   নিরাপত্তা:
   - অ্যাকাউন্ট তৈরি হয় একটা র‍্যান্ডম পাসওয়ার্ডে, যা কেউ কখনো দেখে না (ফেলে দেওয়া হয়)
   - সদস্য নিজে "পাসওয়ার্ড সেট করার লিংক" থেকে নিজের পাসওয়ার্ড দেন — Firebase সেই লিংক ইমেইলে পাঠায়
   - ইমেইল ভেরিফাইড না হলে firestore.rules কোনো তথ্যই দেয় না */
import {
  firebaseConfig, initializeApp, deleteApp, getAuth, signOut,
  createUserWithEmailAndPassword, sendPasswordResetEmail
} from './firebase.js';

export var EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

function randomPassword() {
  /* প্রতিটি শ্রেণি (বড়/ছোট হাতের, সংখ্যা, চিহ্ন) থাকবেই — Console-এ কঠিন পাসওয়ার্ড পলিসি চালু থাকলেও মানবে */
  var sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@#$!%*?'];
  var all = sets.join('');
  var buf = new Uint32Array(40);
  crypto.getRandomValues(buf);
  var out = sets.map(function (set, i) { return set[buf[i] % set.length]; });
  for (var i = 4; i < 28; i++) out.push(all[buf[i] % all.length]);
  for (var j = out.length - 1; j > 0; j--) {
    var k = buf[28 + (j % 12)] % (j + 1);
    var tmp = out[j]; out[j] = out[k]; out[k] = tmp;
  }
  return out.join('');
}

/* অ্যাকাউন্ট নিশ্চিত করে (না থাকলে বানায়) এবং চাইলে পাসওয়ার্ড-সেটআপ ইমেইল পাঠায়।
   ফেরত: { created: bool, sent: bool } — ব্যর্থ হলে Error (code সহ) throw করে */
export function provisionAccount(email, opts) {
  var options = opts || {};
  var key = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(key)) return Promise.reject(Object.assign(new Error('অবৈধ ইমেইল'), { code: 'auth/invalid-email' }));

  var app = initializeApp(firebaseConfig, 'rjf-provision-' + Date.now() + '-' + Math.floor(Math.random() * 1e6));
  var auth = getAuth(app);
  var result = { created: false, sent: false };

  function cleanup() {
    return signOut(auth).catch(function () {}).then(function () { return deleteApp(app); }).catch(function () {});
  }

  return createUserWithEmailAndPassword(auth, key, randomPassword())
    .then(function () { result.created = true; return signOut(auth); })
    .catch(function (err) {
      if (err && err.code === 'auth/email-already-in-use') return null; /* আগে থেকেই আছে — ঠিক আছে */
      throw err;
    })
    .then(function () {
      if (!options.sendLink) return null;
      var settings = { url: window.location.origin + '/#/login', handleCodeInApp: false };
      return sendPasswordResetEmail(auth, key, settings).catch(function (err) {
        /* সাইটের ডোমেইন Firebase-এর "Authorized domains"-এ না থাকলে কন্টিনিউ-URL ছাড়াই পাঠানো */
        if (err && /continue-uri/.test(String(err.code))) return sendPasswordResetEmail(auth, key);
        throw err;
      });
    })
    .then(function () { result.sent = !!options.sendLink; return cleanup().then(function () { return result; }); })
    .catch(function (err) { return cleanup().then(function () { throw err; }); });
}

/* Firebase Auth-এর ত্রুটি কোড → বাংলা বার্তা */
export function authErrorMessage(err) {
  var code = err && err.code ? String(err.code) : '';
  if (code === 'auth/too-many-requests') return 'Firebase সাময়িকভাবে অনুরোধ আটকে দিয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন';
  if (code === 'auth/invalid-email') return 'ইমেইল ঠিকানা সঠিক নয়';
  if (code === 'auth/operation-not-allowed') return 'Firebase Console-এ Email/Password সাইন-ইন চালু নেই';
  if (code === 'auth/network-request-failed') return 'ইন্টারনেট সংযোগে সমস্যা';
  if (code === 'auth/weak-password') return 'পাসওয়ার্ড দুর্বল (Console-এর পাসওয়ার্ড পলিসি দেখুন)';
  return code || (err && err.message) || 'অজানা ত্রুটি';
}
