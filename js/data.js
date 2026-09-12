/* সব লেখা ও কনটেন্ট এক জায়গায় — এই ফাইল বদলে পুরো সাইটের লেখা/লিংক বদলে ফেলা যাবে */
window.RJF = window.RJF || {};

RJF.data = {
  brand: {
    name: "রূপসা জনকল্যাণ ফাউন্ডেশন",
    sub: "RUPSHA JANAKALYAN FOUNDATION",
    logo: "/icons/benar_logo.png", // ব্যানার/নেভবার লোগো এই নামে/পাথে যোগ করুন
    loginLogo: "/icons/logo.webp" // শুধু লগইন পেজের লোগো — খালি/মুছে দিলে (null বা "") icon-512.png ব্যবহার হবে
  },

  nav: [
    { label: "হোম", href: "#hero" },
    { label: "পরিচিতি", href: "#porichiti" },
    { label: "সম্পর্কে", href: "#somporke" },
    { label: "অবস্থান", href: "#অবস্থান" },
    { label: "সদস্যবৃন্দ", href: "#/member" },
    { label: "দাতা সদস্যবৃন্দ", href: "#/donors" },
    { label: "গ্যালারি", href: "#/gallery" },
    { label: "দান করুন", href: "#/donate" },
    { label: "সদস্য আবেদন", href: "#/apply" },
    /* ↓ নতুন: সদস্য লগইন বাটন */
    { label: "সদস্য লগইন", href: "#/login" }
  ],

  hero: {
    eyebrow: "সেবা হোক প্রত্যয়, জনকল্যাণ হোক জয়",
    title: "মানুষের পাশে আমরা সব সময়",
    desc: "আমাদের মূল কাজ আমাদের পারিপার্শ্বিক দিকে থাকা সকল বিষয়ের প্রতি নজরদারি করা এবং অসহায়,দরিদ্র এবং বস্তহীন মানুষের পাশে দাঁড়িয়ে সুন্দর সুশৃঙ্খল দেশ গড়ে তোলাই আমাদের লক্ষ্য। ",

    // গ্যালারি স্লাইডার মেনু ফটো সেকশনে
    slides: [
      { src: "/gallery/win-team.webp", alt: "শিক্ষা কার্যক্রম", icon: "book", label: "শিক্ষা কার্যক্রমের ছবি এখানে যোগ করুন" },
      { src: "/gallery/IMG_20260320_234348.jpg", alt: "ইফতার মাহফিল", icon: "heart", label: "স্বাস্থ্যসেবা কার্যক্রমের ছবি এখানে যোগ করুন" },
      { src: "/gallery/lost-team.webp", alt: "খেলাধুলা", icon: "hand", label: "ত্রাণ বিতরণ কার্যক্রমের ছবি এখানে যোগ করুন" },
      { src: "/gallery/national-anthem-all-team.webp", alt: "জাতীয় সংগীত", icon: "tool", label: "প্রশিক্ষণ কার্যক্রমের ছবি এখানে যোগ করুন" },
      { src: "/gallery/team-trophy.webp", alt: "ট্রফি উদযাপন", icon: "leaf", label: "বৃক্ষরোপণ কার্যক্রমের ছবি এখানে যোগ করুন" },
      { src: "/gallery/member/rafiqul.webp", alt: "member of foundation", icon: "tool", label: "Our special members" },
      { src: "/gallery/member/harrun.webp", alt: "member of foundation", icon: "tool", label: "Our special members" },
      { src: "/gallery/member/humayon1.webp", alt: "member of foundation", icon: "tool", label: "Our special members" },
      { src: "/gallery/member/kawsar.webp", alt: "member of foundation", icon: "tool", label: "Our special members" },
      { src: "/gallery/member/imran_ahmed.webp", alt: "member of foundation", icon: "tool", label: "Our special members" },
      { src: "/gallery/member/naim.webp", alt: "member of foundation", icon: "tool", label: "Our special members" },
      { src: "/gallery/member/kamrul.webp", alt: "member of foundation", icon: "tool", label: "Our special members" },
      { src: "/gallery/member/fahim.webp", alt: "জাতীয় সংগীত", icon: "tool", label: "Our special members" },
      { src: "/gallery/member/omor.webp", alt: "member of foundation", icon: "tool", label: "Our special members" },
      { src: "/gallery/sumon.webp", alt: "member of foundation", icon: "tool", label: "Our special members" }
    ]
  },

  intro: {
    heading: "রূপসা জনকল্যাণ ফাউন্ডেশন",
    body: "রূপসা জনকল্যাণ ফাউন্ডেশন একটি অলাভজনক সামাজিক সংগঠন, যা তৃণমূল পর্যায়ে সাধারণ মানুষের জীবনমান উন্নয়নে কাজ করে যাচ্ছে। আমরা বিশ্বাস করি, প্রতিটি মানুষের সম্মানজনক জীবনযাপনের অধিকার আছে — আর সেই লক্ষ্যেই আমাদের প্রতিটি কার্যক্রম পরিচালিত হয়।",
    stats: [
      { value: "১০০+", label: "উপকারভোগী পরিবার" },
      { value: "৫+", label: "চলমান কার্যক্রম" },
      { value: "২৪/৭", label: "স্বেচ্ছাসেবক দল" }
    ],
    cardTitle: "সংক্ষিপ্ত পরিচিতি:",
    cardBody: "এই অনুচ্ছেদে ফাউন্ডেশনের প্রতিষ্ঠাকাল, নিবন্ধন নম্বর এবং প্রতিষ্ঠার প্রেক্ষাপট যোগ করুন। এটি একটি প্লেসহোল্ডার লেখা — আপনার প্রকৃত তথ্য দিয়ে প্রতিস্থাপন করুন যাতে দর্শনার্থীরা প্রতিষ্ঠানের ইতিহাস সম্পর্কে সঠিক ধারণা পান।"
  },

  about: {
    heading: "আমাদের লক্ষ্য ও কার্যক্রম",
    sub: "আমরা যা বিশ্বাস করি এবং যেভাবে কাজ করি — তারই একটি সংক্ষিপ্ত রূপরেখা।",
    mission: { title: "আমাদের লক্ষ্য", body: "প্রান্তিক জনগোষ্ঠীর শিক্ষা, স্বাস্থ্য ও জীবিকার মান উন্নয়নের মাধ্যমে একটি ন্যায্য ও স্বনির্ভর সমাজ গড়ে তোলা।" },
    vision: { title: "আমাদের ভবিষ্যৎ দৃষ্টিভঙ্গি", body: "এমন একটি বাংলাদেশ, যেখানে সহায়তা পৌঁছাবে সবচেয়ে দূরের ও অবহেলিত মানুষটির কাছেও।" },
    activities: [
      { icon: "book", title: "শিক্ষা সহায়তা", body: "বৃত্তি, বই ও উপকরণ বিতরণের মাধ্যমে ঝরে পড়া রোধ।" },
      { icon: "heart", title: "স্বাস্থ্যসেবা", body: "বিনামূল্যে মেডিকেল ক্যাম্প ও ওষুধ বিতরণ কার্যক্রম।" },
      { icon: "cross", title: "ত্রাণ ও দুর্যোগ সাড়া", body: "বন্যা ও প্রাকৃতিক দুর্যোগে জরুরি খাদ্য ও আশ্রয় সহায়তা।" },
      { icon: "wrench", title: "দক্ষতা উন্নয়ন", body: "তরুণ ও নারীদের জন্য কারিগরি ও পেশাগত প্রশিক্ষণ।" }
    ]
  },

  location: {
    heading: "contact us",
    sub: "আমাদের ঠিকানা ও যোগাযোগ",
    address: "রূপসা,সিরাজগঞ্জ সদর সিরাজগঞ্জ",
    phone: "+8801957329211",
    email: "info.rjfoundation25@gmail.com",
    mapEmbed: "https://www.google.com/maps?q=24.596484,89.76323&output=embed",
    mapLink: "https://maps.google.com/?cid=10520348579752928238"
  },

  footer: {
    about: "রূপসা জনকল্যাণ ফাউন্ডেশন তৃণমূল পর্যায়ে শিক্ষা, স্বাস্থ্য, ত্রাণ ও দক্ষতা উন্নয়নে কাজ করে যাচ্ছে।",
    quickLinks: [
      { label: "হোম", href: "#hero" },
      { label: "পরিচিতি", href: "#porichiti" },
      { label: "সম্পর্কে", href: "#somporke" },
      { label: "অবস্থান", href: "#অবস্থান" },
      { label: "সদস্যবৃন্দ", href: "#/member" },
      { label: "দাতা সদস্যবৃন্দ", href: "#/donors" },
      { label: "দান করুন", href: "#/donate" },
      { label: "সদস্য আবেদন", href: "#/apply" },
      { label: "সদস্য লগইন", href: "#/login" }
    ],
    legalLinks: [
      { label: "প্রাইভেসি পলিসি", href: "#/privacy" },
      { label: "ব্যবহারের শর্তাবলী", href: "#/terms" }
    ],
    social: [
      { label: "Facebook", href: "Https://www.facebook.com/rupshajonokollanfoundation", icon: "facebook" },
      { label: "YouTube", href: "Https://www.YouTube.com/rupshajonokollanfoundation", icon: "youtube" },
      { label: "WhatsApp", href: "https://wa.me/8801957329211?text=%E0%A6%86%E0%A6%AE%E0%A6%BF%20%E0%A6%AB%E0%A6%BE%E0%A6%89%E0%A6%A8%E0%A7%8D%E0%A6%A1%E0%A7%87%E0%A6%B6%E0%A6%A8%20%E0%A6%B8%E0%A6%AE%E0%A7%8D%E0%A6%AA%E0%A6%B0%E0%A7%8D%E0%A6%95%E0%A7%87%20%E0%A6%9C%E0%A6%BE%E0%A6%A8%E0%A6%A4%E0%A7%87%20%E0%A6%9A%E0%A6%BE%E0%A6%87", icon: "whatsapp" }
    ]
  }
};
