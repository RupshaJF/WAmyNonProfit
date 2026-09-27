/* Vercel Serverless Function — /api/send-notification
   এডমিন প্যানেল থেকে নতুন নোটিশ/ইভেন্ট যোগ হলে এটাই সব সাবস্ক্রাইবারকে পুশ নোটিফিকেশন পাঠায়।

   এটা Firebase Cloud Functions না — তাই Blaze প্ল্যান/কার্ড লাগে না।
   এটা Vercel-এর নিজস্ব ফ্রি serverless function (Hobby প্ল্যানেও কাজ করে, কার্ড লাগে না)।

   সেটআপে যে এনভায়রনমেন্ট ভ্যারিয়েবলগুলো Vercel ড্যাশবোর্ডে বসাতে হবে
   (বিস্তারিত ধাপ PUSH_NOTIFICATIONS_GUIDE.md ফাইলে):
     FIREBASE_PROJECT_ID
     FIREBASE_CLIENT_EMAIL
     FIREBASE_PRIVATE_KEY
     ADMIN_EMAILS   (কমা দিয়ে আলাদা করা, admin/js/admin-config.js এর মতো একই ইমেইল) */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

const CHUNK_SIZE = 500; // FCM-এর প্রতি কলে সর্বোচ্চ ৫০০ টোকেন পাঠানো যায়

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'শুধু POST রিকোয়েস্ট গ্রহণযোগ্য' });
    return;
  }

  try {
    /* ১) রিকোয়েস্ট আসলেই লগইন করা এডমিনের কাছ থেকে কিনা যাচাই */
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.indexOf('Bearer ') === 0 ? authHeader.slice(7) : '';
    if (!idToken) {
      res.status(401).json({ error: 'অথেনটিকেশন টোকেন পাওয়া যায়নি' });
      return;
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (e) {
      res.status(401).json({ error: 'টোকেন যাচাই ব্যর্থ' });
      return;
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(function (s) { return s.trim().toLowerCase(); })
      .filter(Boolean);

    if (!decoded.email || adminEmails.indexOf(decoded.email.toLowerCase()) === -1) {
      res.status(403).json({ error: 'শুধু এডমিন এই কাজটা করতে পারবেন' });
      return;
    }

    /* ২) বডি থেকে টাইটেল/বডি/লিংক নিন */
    const body = req.body || {};
    const title = (body.title || '').toString().trim();
    const message = (body.body || '').toString().trim();
    const url = (body.url || 'https://rupshajf.vercel.app/').toString();

    if (!title || !message) {
      res.status(400).json({ error: 'title ও body আবশ্যক' });
      return;
    }

    /* ৩) সব সাবস্ক্রাইবারের টোকেন আনুন */
    const db = admin.firestore();
    const snap = await db.collection('push_subscribers').get();
    const tokens = snap.docs.map(function (d) { return d.id; });

    if (!tokens.length) {
      res.status(200).json({ sent: 0, failed: 0, message: 'কোনো সাবস্ক্রাইবার নেই' });
      return;
    }

    /* ৪) FCM-এ পাঠান (৫০০ টোকেন করে ভাগে ভাগে, যত সাবস্ক্রাইবারই থাকুক না কেন) */
    let successCount = 0;
    let failureCount = 0;
    const invalidTokens = [];

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const response = await admin.messaging().sendEachForMulticast({
        notification: { title: title, body: message },
        webpush: {
          fcmOptions: { link: url },
          notification: { icon: 'https://rupshajf.vercel.app/icons/icon-192.png' }
        },
        tokens: chunk
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach(function (r, idx) {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (code === 'messaging/invalid-registration-token' || code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(chunk[idx]);
          }
        }
      });
    }

    /* ৫) মৃত/অকার্যকর টোকেন Firestore থেকে নিজে থেকেই পরিষ্কার করে ফেলুন */
    if (invalidTokens.length) {
      const batch = db.batch();
      invalidTokens.forEach(function (t) { batch.delete(db.collection('push_subscribers').doc(t)); });
      await batch.commit();
    }

    res.status(200).json({ sent: successCount, failed: failureCount, cleaned: invalidTokens.length });
  } catch (err) {
    console.error('send-notification error:', err);
    res.status(500).json({ error: 'সার্ভার এরর', detail: String((err && err.message) || err) });
  }
};
