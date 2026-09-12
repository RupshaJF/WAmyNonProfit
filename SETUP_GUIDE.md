# রূপসা জনকল্যাণ ফাউন্ডেশন — সেটআপ গাইড
## Member Login System যোগ করার পরে সম্পূর্ণ নির্দেশিকা

---

## ✅ নতুন যা যোগ হয়েছে

| ফাইল | পরিবর্তন |
|---|---|
| `css/login.css` | নতুন — সদস্য লগইন পেজের সম্পূর্ণ CSS |
| `js/login.js` | নতুন — লগইন লজিক, পাসওয়ার্ড রিসেট |
| `js/router.js` | আপডেট — `#/login` রুট যোগ |
| `js/data.js` | আপডেট — nav-এ "সদস্য লগইন" লিংক |
| `index.html` | আপডেট — `login-root` div + CSS/JS import |
| `firestore.rules` | আপডেট — `stored_password` update অনুমতি |
| `emailjs-templates/` | নতুন — ২টো HTML email template |

---

## 🔥 Firestore Setup

### ধাপ ১ — firestore.rules আপলোড করুন
Firebase Console → Firestore → Rules → Edit → সম্পূর্ণ `firestore.rules` paste করুন → Publish

### ধাপ ২ — প্রতিটি approved member-এর document-এ যোগ করুন
Firebase Console → Firestore → members collection → member document খুলুন → Add field:

```
stored_password  (string)  ""   ← খালি রাখুন (প্রথমে)
```

সদস্য নিজেই পোর্টাল থেকে "পাসওয়ার্ড পাননি?" চেপে পাসওয়ার্ড পাবে।

---

## 📧 EmailJS Setup

### Template 1 — Registration (আগে থেকে আছে)
Template ID: `template_98b72mp` — পরিবর্তন দরকার নেই।

### Template 2 — Login Password ★ নতুন
1. EmailJS Dashboard → Email Templates → **Create New Template**
2. Template Name: `Login Password`
3. **Subject:** `রূপসা জনকল্যাণ ফাউন্ডেশন — আপনার লগইন পাসওয়ার্ড`
4. **To Email:** `{{to_email}}`
5. **Content:** `emailjs-templates/template_login_password.html` ফাইলের HTML পুরোটা paste করুন
6. Save করুন → Template ID কপি করুন (যেমন: `template_abc12345`)
7. `js/login.js` ফাইল খুলুন → এই লাইন খুঁজুন:
   ```js
   emailjsPasswordTemplateId: "template_login_pw",
   ```
   আপনার Template ID বসান:
   ```js
   emailjsPasswordTemplateId: "template_abc12345",
   ```

---

## 🚀 Deploy

```bash
# Vercel (যদি vercel CLI থাকে)
vercel --prod

# অথবা GitHub-এ push করলে Vercel auto deploy হবে
git add .
git commit -m "feat: member login system"
git push
```

---

## 🔗 লগইন পেজের URL
```
https://আপনার-ডোমেইন/#/login
```

---

## 🔄 সম্পূর্ণ লগইন Flow

```
সদস্য → #/apply ফর্ম পূরণ → Firestore-এ document তৈরি (status: pending)
                ↓
       Admin Panel → approved করুন + stored_password="" যোগ করুন
                ↓
সদস্য → #/login → "পাসওয়ার্ড পাননি?" → member_id দিন
                ↓
   সিস্টেম নতুন পাসওয়ার্ড generate করে Firestore-এ save করে
   এবং EmailJS দিয়ে সদস্যের ইমেইলে পাঠায়
                ↓
সদস্য → ইমেইল থেকে পাসওয়ার্ড নিয়ে → #/login → লগইন সফল → Dashboard
```

---

## ⚙️ Admin দিয়ে সরাসরি পাসওয়ার্ড সেট করা
Admin Panel → Members → সদস্যের drawer খুলুন → `stored_password` field-এ পাসওয়ার্ড দিন → Save
তারপর সদস্যকে manually জানান।

