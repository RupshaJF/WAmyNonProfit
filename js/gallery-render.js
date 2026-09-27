/* গ্যালারি পেজ — HTML বিল্ড করে #gallery-root এ বসায়
   index.html-এ এই ফাইলের প্রভাব নেই, #/gallery রুটে render হয় (রাউটার দেখুন js/router.js) */
window.RJF = window.RJF || {};

RJF._galleryYearBtnsHtml = function () {
  return RJF.galleryData.years.map(function (y, i) {
    return '<button type="button" class="gallery-chip' + (i === 0 ? ' active' : '') + '" data-year="' + y.value + '">' + y.label + '</button>';
  }).join('');
};

RJF._galleryCategoryBtnsHtml = function () {
  return RJF.galleryData.categories.map(function (c, i) {
    return '<button type="button" class="gallery-chip' + (i === 0 ? ' active' : '') + '" data-filter="' + c.value + '">' + c.label + '</button>';
  }).join('');
};

RJF._galleryPhotoItemHtml = function (p) {
  return (
    '<div class="gallery-item ' + p.category + ' year-' + p.year + '" tabindex="0" role="button" aria-label="' + p.title + '">' +
      '<img src="' + p.src + '" alt="' + p.title + '" loading="lazy">' +
      '<div class="gallery-overlay">' +
        '<i class="fas fa-search-plus"></i>' +
        '<h4>' + p.title + '</h4>' +
        '<p>' + p.caption + '</p>' +
      '</div>' +
    '</div>'
  );
};

RJF._galleryComingSoonHtml = function (yearValue, label) {
  return (
    '<div class="gallery-coming-soon year-' + yearValue + '">' +
      '<div class="gallery-coming-soon-icon"><i class="fa-solid fa-images"></i></div>' +
      '<div class="gallery-coming-soon-text">শীঘ্রই আসছে</div>' +
      '<div class="gallery-coming-soon-sub">' + label + ' এর ছবি শীঘ্রই যুক্ত করা হবে</div>' +
    '</div>'
  );
};

RJF._galleryGridHtml = function () {
  var d = RJF.galleryData;
  var html = d.photos.map(RJF._galleryPhotoItemHtml).join('');
  html += d.comingSoonYears.map(function (yearValue) {
    var yearInfo = d.years.filter(function (y) { return y.value === yearValue; })[0];
    return RJF._galleryComingSoonHtml(yearValue, yearInfo ? yearInfo.label : yearValue);
  }).join('');
  return html;
};

RJF._galleryVideoItemHtml = function (v) {
  return (
    '<div class="gallery-video-block">' +
      '<div class="gallery-video-frame">' +
        '<iframe src="https://www.youtube.com/embed/' + v.youtubeId + '?rel=0" title="' + v.title + '" ' +
          'allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
          'allowfullscreen loading="lazy"></iframe>' +
      '</div>' +
      '<p class="gallery-video-caption">' + v.caption + '</p>' +
    '</div>'
  );
};

RJF.renderGalleryPage = function () {
  var root = document.getElementById('gallery-root');
  if (!root) return;
  var d = RJF.galleryData;

  root.innerHTML =
    '<div class="gallery-page">' +

      '<a class="rjf-back-home" href="#/">' + RJF.iconSvg('up', 'fill="none" stroke="currentColor" stroke-width="2" style="transform:rotate(-90deg)"') + '<span>Go back</span></a>' +

      '<section class="gallery-hero">' +
        '<div class="gallery-hero-particles"><span></span><span></span><span></span></div>' +
        '<div class="gallery-hero-content">' +
          '<span class="eyebrow">' + d.eyebrow + '</span>' +
          '<h1>' + d.title + '</h1>' +
          '<p>' + d.desc + '</p>' +
          '<a class="gallery-subscribe-btn" href="' + d.subscribeHref + '">' +
            '<i class="fa-regular fa-bell"></i>' +
            '<span>' + d.subscribeLabel + '</span>' +
            '<span class="gallery-shimmer"></span>' +
          '</a>' +
        '</div>' +
      '</section>' +

      '<div class="gallery-toggle-wrap">' +
        '<div class="gallery-toggle" id="galleryToggle">' +
          '<div class="gallery-toggle-slider" id="galleryToggleSlider"></div>' +
          '<button type="button" class="gallery-toggle-btn active" data-target="photos">' +
            '<i class="fa-regular fa-images"></i><span>গ্যালারি</span>' +
            '<span class="gallery-badge" id="galleryPhotoCount">0</span>' +
          '</button>' +
          '<button type="button" class="gallery-toggle-btn" data-target="videos">' +
            '<i class="fa-solid fa-circle-play"></i><span>ভিডিও</span>' +
            '<span class="gallery-badge" id="galleryVideoCount">0</span>' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<div class="gallery-body">' +

        '<div class="gallery-media-section" id="galleryPhotosSection">' +
          '<div class="gallery-filters">' +
            '<div class="gallery-filter-group">' +
              '<label class="gallery-filter-label">বছর নির্বাচন করুন</label>' +
              '<div class="gallery-filter-row" id="galleryYearFilter">' + RJF._galleryYearBtnsHtml() + '</div>' +
            '</div>' +
            '<div class="gallery-filter-group">' +
              '<div class="gallery-filter-row" id="galleryCategoryFilter">' + RJF._galleryCategoryBtnsHtml() + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="gallery-grid" id="galleryGrid">' + RJF._galleryGridHtml() + '</div>' +
        '</div>' +

        '<div class="gallery-media-section gallery-hidden" id="galleryVideosSection">' +
          d.videos.map(RJF._galleryVideoItemHtml).join('') +
        '</div>' +

      '</div>' +

      '<div id="galleryLightbox" class="gallery-lightbox">' +
        '<span class="gallery-lightbox-close" id="galleryLightboxClose">&times;</span>' +
        '<img id="galleryLightboxImg" src="" alt="">' +
      '</div>' +

    '</div>';

  RJF._wireGalleryFilters();
  RJF._wireGalleryLightbox();
  RJF._wireGallerySwitcher();
  RJF._wireGalleryReveal();
};
