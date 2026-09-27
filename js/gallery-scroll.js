/* গ্যালারি — স্ক্রল করলে "উপরে যান" বাটন দেখানো */
window.RJF = window.RJF || {};

RJF._wireGalleryScrollTop = function () {
  var btn = document.getElementById('galleryScrollTop');

  function onScroll() {
    btn.classList.toggle('show', window.pageYOffset > 300);
  }
  window.addEventListener('scroll', onScroll);
  onScroll();

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
};

/* ম্যাসনরি গ্রিডের ছবি/"শীঘ্রই আসছে" বক্স স্ক্রল করে কাছে গেলে একে একে fade-up করে দেখানো —
   donors পেজে (js/donors.js) যে IntersectionObserver প্যাটার্ন আছে, ঠিক সেটাই এখানে —
   কোনো লাইব্রেরি ছাড়া, pure JS + CSS transition (গ্যালারির filter/hide সিস্টেমের সাথে সংঘর্ষ এড়াতে
   এখানে একটা আলাদা ক্লাস ব্যবহার করা হয়েছে, যেটা রিভিল হওয়ার পর সম্পূর্ণ সরিয়ে ফেলা হয়) */
RJF._wireGalleryReveal = function () {
  var items = document.querySelectorAll('#galleryGrid .gallery-item, #galleryGrid .gallery-coming-soon');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.remove('gallery-reveal-pending'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('gallery-reveal-pending');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  items.forEach(function (el, i) {
    el.classList.add('gallery-reveal-pending');
    el.style.transitionDelay = Math.min(i * 40, 400) + 'ms';
    observer.observe(el);
  });
};
