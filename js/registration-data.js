/* সদস্য আবেদন ফরম পেজের ডাটা ও কনফিগ — #/apply রুটে ব্যবহৃত হয়
   (আপলোড করা standalone আবেদন ফরম থেকে রূপান্তরিত)
   ফরমের লেখা/ধাপ/ফিল্ড বদলাতে চাইলে শুধু এই ফাইলটাই বদলালেই হবে */
window.RJF = window.RJF || {};

RJF.registrationData = {
  formTitle: "সদস্য নির্বাচনী ফরম",
  tagline: "সেবা হোক প্রত্যয়, জনকল্যাণ হোক জয়",
  liveLabel: "LIVE SELECTION",

  agreementText: "আমি ঘোষণা করছি যে, উপরে প্রদত্ত সকল তথ্য সত্য ও সঠিক। আমি রূপসা জনকল্যাণ ফাউন্ডেশনের নিয়মাবলী মেনে চলতে সম্মত আছি।",
  submitLabel: "আবেদন জমা দিন",
  submittingLabel: "জমা হচ্ছে...",

  agreementErrorMsg: "আবেদন জমা দেওয়ার পূর্বে ঘোষণা ও শর্তাবলীতে টিকমার্ক দিতে হবে!",
  duplicateEmailMsg: "এই ইমেইলটি দিয়ে ইতিমধ্যে আবেদন করা হয়েছে!",
  genericErrorMsg: "সমস্যা হয়েছে! ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।",
  successMsgPrefix: "অভিনন্দন! আবেদন সফল হয়েছে। আইডি: ",

  /* বহিরাগত সার্ভিস — ফর্ম সাবমিট হলে এই তিন জায়গায় ডেটা যায় */
    firebaseConfig: {
    apiKey: "AIzaSyBMfeFWtyE-raexNO8DkpyXBQFvE3yNIRU",
    authDomain: "rupshajf.firebaseapp.com",
    projectId: "rupshajf",
    storageBucket: "rupshajf.firebasestorage.app",
    messagingSenderId: "878760730320",
    appId: "1:878760730320:web:39ef84c2b447e24df5c8d5",
    measurementId: "G-BF5ZPK7NZS"
  },
  emailjsPublicKey: "YVhcRNK-0_TgFrZCd",
  emailjsServiceId: "service_jy11eoh",
  emailjsTemplateId: "template_98b72mp",
  formspreeUrl: "https://formspree.io/f/meepqdyk",

  steps: [
    { title: "ব্যক্তিগত তথ্য", short: "ব্যক্তিগত", desc: "আপনার সঠিক তথ্য প্রদান করুন", icon: "fa-user" },
    { title: "পরিচয় ও যোগাযোগ", short: "যোগাযোগ", desc: "যোগাযোগের জন্য সঠিক মাধ্যম দিন", icon: "fa-address-book" },
    { title: "ঠিকানা", short: "ঠিকানা", desc: "আপনার বর্তমান ও স্থায়ী ঠিকানা", icon: "fa-location-dot" },
    { title: "শিক্ষা ও পেশা", short: "শিক্ষা", desc: "শিক্ষাগত যোগ্যতা ও বর্তমান পেশা", icon: "fa-graduation-cap" },
    { title: "সদস্যপদ তথ্য", short: "সদস্যপদ", desc: "ফাউন্ডেশনের সাথে যুক্ত হওয়ার ধরন", icon: "fa-users" },
    { title: "নিশ্চিতকরণ", short: "নিশ্চিত", desc: "আবেদন জমা দেওয়ার পূর্বে শর্তাবলী নিশ্চিত করুন", icon: "fa-circle-check" }
  ]
};

/* প্রতিটি ধাপের ফিল্ড — index মিলে যায় RJF.registrationData.steps[0..4] এর সাথে,
   ৬ষ্ঠ ধাপ (নিশ্চিতকরণ) আলাদাভাবে রেন্ডার হয় registration.js-এ */
RJF.registrationFields = [
  [
    { name: "full_name", label: "পুরো নাম", type: "text", required: true, placeholder: "আপনার পুরো নাম" },
    { name: "father_name", label: "পিতার নাম", type: "text", required: true, placeholder: "পিতার নাম" },
    { name: "mother_name", label: "মাতার নাম", type: "text", required: true, placeholder: "মাতার নাম" },
    { name: "date_of_birth", label: "জন্ম তারিখ", type: "date", required: true },
    { name: "gender", label: "লিঙ্গ", type: "select", required: true, options: ["পুরুষ", "মহিলা", "অন্যান্য"] },
    { name: "blood_group", label: "রক্তের গ্রুপ", type: "select", required: false, options: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] }
  ],
  [
    { name: "mobile_number", label: "মোবাইল নম্বর", type: "tel", required: true, placeholder: "01XXXXXXXXX", pattern: "01[3-9]\\d{8}", maxlength: 11 },
    { name: "email", label: "ইমেইল", type: "email", required: true, placeholder: "example@email.com", full: true }
  ],
  [
    { name: "present_address", label: "বর্তমান ঠিকানা", type: "textarea", required: true, placeholder: "গ্রাম/মহল্লা, ডাকঘর, উপজেলা, জেলা", full: true },
    { name: "permanent_address", label: "স্থায়ী ঠিকানা", type: "textarea", required: true, placeholder: "গ্রাম/মহল্লা, ডাকঘর, উপজেলা, জেলা", full: true }
  ],
  [
    { name: "education", label: "শিক্ষাগত যোগ্যতা", type: "select", required: true, options: ["প্রাথমিক", "মাধ্যমিক (SSC)", "উচ্চ মাধ্যমিক (HSC)", "স্নাতক", "স্নাতকোত্তর", "পিএইচডি", "অন্যান্য"] },
    { name: "occupation", label: "পেশা", type: "text", required: true, placeholder: "আপনার পেশা" }
  ],
  [
    { name: "membership_type", label: "সদস্যপদের ধরন", type: "select", required: true, options: ["সাধারণ সদস্য", "আজীবন সদস্য", "সম্মানিত সদস্য", "স্বেচ্ছাসেবক"] },
    { name: "reference_name", label: "রেফারেন্স (যদি থাকে)", type: "text", required: false, placeholder: "রেফারেন্সের নাম" },
    { name: "reference_mobile", label: "রেফারেন্সের মোবাইল", type: "tel", required: false, placeholder: "রেফারেন্সের মোবাইল নম্বর", full: true }
  ]
];
