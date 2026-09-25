/* admin panel — সদস্যের প্রতিটি পরিবর্তনের সাথে দুটো সহায়ক কালেকশন সিঙ্কে রাখা

   members/{id}          → সম্পূর্ণ ব্যক্তিগত তথ্য (শুধু অ্যাডমিন + সংশ্লিষ্ট সদস্য পড়তে পারে)
   member_emails/{email} → { member_doc, status } — ইমেইল ইউনিক রাখে; সদস্য নিজের ডকুমেন্ট খুঁজে পায়;
                           নোটিশ/ইভেন্ট দেখার অনুমতি যাচাই হয় এখানকার status দিয়ে
   public_members/{id}   → verify.html-এর জন্য ছোট্ট পাবলিক অংশ (শুধু approved; blocked হলে শুধু আইডি+status)

   ⚠️ এই দুটো সিঙ্কে না থাকলে সদস্য লগইন/ভেরিফাই ঠিকমতো কাজ করবে না।
   নতুন ফিল্ড পাবলিক করতে চাইলে এখানকার publicView() ও firestore.rules-এর isValidPublicDoc() — দুটোই বদলাতে হবে। */
import { db, doc, getDoc } from './firebase.js';
import { EMAIL_RE } from './provision.js';

export var ID_RE = /^[A-Za-z0-9._-]{3,40}$/;

export function lowerEmail(v) {
  return String(v == null ? '' : v).trim().toLowerCase();
}

function clip(v, n) {
  return Array.from(String(v == null ? '' : v)).slice(0, n).join('');
}

/* 01712345678 → 017*****678 (শুধু ডিজিট ধরে; ১১ ডিজিটের কম হলে কিছুই দেখানো হয় না) */
export function maskMobile(v) {
  var d = String(v == null ? '' : v).replace(/\D/g, '');
  return d.length < 11 ? '' : d.slice(0, 3) + '*****' + d.slice(-3);
}

export function safePhoto(url) {
  var u = String(url == null ? '' : url).trim();
  /* "/"-এর পর সরাসরি আরেকটা "/" থাকলে সেটা protocol-relative URL (যেমন //evil.com/x —
     ব্রাউজার এটাকে https://evil.com/x হিসেবে লোড করে) — সাইট-রিলেটিভ পাথ নয়, তাই বাতিল */
  return u.length <= 600 && /^(https:\/\/|\/(?!\/))/.test(u) ? u : '';
}

/* verify.html-এ যা দেখানো হয় — আর কিছু নয় */
export function publicView(m) {
  var id = String(m.member_id == null ? '' : m.member_id).trim();
  if (!ID_RE.test(id)) return null;
  var status = m.status || 'pending';
  if (status === 'approved') {
    return {
      member_id: id, status: 'approved',
      full_name: clip(m.full_name, 100), occupation: clip(m.occupation, 100),
      membership_type: clip(m.membership_type, 60), blood_group: clip(m.blood_group, 4),
      gender: clip(m.gender, 20), mobile_number: maskMobile(m.mobile_number),
      permanent_address: clip(m.permanent_address, 300), photo_url: safePhoto(m.photo_url)
    };
  }
  if (status === 'blocked' || status === 'rejected') return { member_id: id, status: 'blocked' };
  return null; /* pending — পাবলিক ডকুমেন্ট থাকবে না */
}

/* prev = আগের ডেটা (বা null), next = নতুন ডেটা, oldIndexOwner = আগের ইমেইল-ইনডেক্স যে ডকুমেন্টকে নির্দেশ করত
   ফেরত: { ops: [{op, col, id, data}], issues: [...] } */
export function planSync(prev, next, docId, oldIndexOwner) {
  var ops = [];
  var issues = [];
  var status = next.status || 'pending';
  var newKey = lowerEmail(next.email);
  var oldKey = lowerEmail(prev && prev.email);
  /* prev.status ছিল approved/blocked/rejected মানেই একটা পাবলিক ডকুমেন্ট থাকার কথা —
     নতুন (prev=null) বা আগে থেকেই pending সদস্যের জন্য অহেতুক delete পাঠানো এড়ানো (মাইগ্রেশনে অনেক বাঁচে) */
  var hadPublicBefore = !!(prev && ['approved', 'blocked', 'rejected'].indexOf(prev.status) !== -1);

  if (EMAIL_RE.test(newKey) && newKey.length <= 254) {
    ops.push({ op: 'set', col: 'member_emails', id: newKey, data: { member_doc: docId, status: status } });
  } else {
    issues.push('ইমেইল নেই বা সঠিক নয় — এই সদস্য লগইন করতে পারবেন না');
  }
  /* ইমেইল বদলালে আগের ইনডেক্স মুছে ফেলা — শুধু যদি সেটা এই সদস্যেরই হয় */
  if (oldKey && oldKey !== newKey && EMAIL_RE.test(oldKey) && oldIndexOwner === docId) {
    ops.push({ op: 'delete', col: 'member_emails', id: oldKey });
  }

  var newPub = String(next.member_id == null ? '' : next.member_id).trim();
  var oldPub = String((prev && prev.member_id) == null ? '' : prev.member_id).trim();
  var pv = publicView(next);
  if (pv) ops.push({ op: 'set', col: 'public_members', id: newPub, data: pv });
  else if (hadPublicBefore && ID_RE.test(newPub)) ops.push({ op: 'delete', col: 'public_members', id: newPub });
  else if (status === 'approved') issues.push('মেম্বার আইডি সঠিক নয় — verify.html-এ দেখাবে না');
  if (hadPublicBefore && oldPub && oldPub !== newPub && ID_RE.test(oldPub)) ops.push({ op: 'delete', col: 'public_members', id: oldPub });

  return { ops: ops, issues: issues };
}

export function applyOps(batch, ops) {
  ops.forEach(function (o) {
    var ref = doc(db, o.col, o.id);
    if (o.op === 'set') batch.set(ref, o.data);
    else batch.delete(ref);
  });
}

/* আগের ইমেইল-ইনডেক্স কার ছিল — মুছে ফেলার আগে যাচাই */
export function indexOwner(emailKey) {
  if (!EMAIL_RE.test(emailKey || '')) return Promise.resolve(null);
  return getDoc(doc(db, 'member_emails', emailKey)).then(function (s) {
    return s.exists() ? (s.data().member_doc || null) : null;
  });
}
