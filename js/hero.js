/* হিরো সেকশন — অটো + ম্যানুয়াল (ড্র্যাগ/সোয়াইপ) ফটো ক্যারোজেল */
window.RJF = window.RJF || {};

RJF.renderHero = function(){
  var root = document.getElementById('hero-root');
  if(!root) return;
  var h = RJF.data.hero;

  var slidesHtml = h.slides.map(function(s, i){
    var lazyAttr = i === 0 ? '' : ' loading="lazy"';
    return '<div class="slide"><img src="' + s.src + '" alt="' + s.alt + '" data-icon="' + s.icon + '" data-label="' + s.label + '"' + lazyAttr + '></div>';
  }).join('');

  root.innerHTML =
    '<header class="hero" id="hero">' +
      '<div class="carousel" id="carousel">' + slidesHtml + '</div>' +
      '<div class="hero-overlay"></div>' +
      '<div class="hero-arrows">' +
        '<button class="hero-arrow" id="prevBtn" aria-label="আগের ছবি">' + RJF.iconSvg('up','fill="none" stroke="currentColor" stroke-width="2" style="transform:rotate(-90deg)"') + '</button>' +
        '<button class="hero-arrow" id="nextBtn" aria-label="পরের ছবি">' + RJF.iconSvg('up','fill="none" stroke="currentColor" stroke-width="2" style="transform:rotate(90deg)"') + '</button>' +
      '</div>' +
      '<div class="hero-content">' +
        '<div class="eyebrow">' + h.eyebrow + '</div>' +
        '<h1>' + h.title + '</h1>' +
        '<p>' + h.desc + '</p>' +
      '</div>' +
      '<div class="hero-dots" id="heroDots"></div>' +
      '<div class="wave"><svg viewBox="0 0 1440 100" preserveAspectRatio="none"><path fill="#FBF5E9" d="M0,40 C240,100 480,0 720,30 C960,60 1200,110 1440,50 L1440,100 L0,100 Z"></path></svg></div>' +
    '</header>';

  /* ছবি না পাওয়া গেলে আইকন-সহ প্লেসহোল্ডার */
  root.querySelectorAll('.slide img').forEach(function(img){
    img.addEventListener('error', function(){
      var fallback = RJF.makeFallbackSlide(img.dataset.label, img.dataset.icon);
      img.replaceWith(fallback);
    });
  });

  var carousel = document.getElementById('carousel');
  var slides = Array.from(carousel.children);
  var dotsWrap = document.getElementById('heroDots');
  var current = 0, autoTimer = null;

  slides.forEach(function(_, i){
    var dot = document.createElement('button');
    if(i === 0) dot.classList.add('active');
    dot.addEventListener('click', function(){ goTo(i); });
    dotsWrap.appendChild(dot);
  });
  var dots = Array.from(dotsWrap.children);

  function render(withTransition){
    carousel.style.transition = withTransition === false ? 'none' : 'transform .6s cubic-bezier(.6,0,.2,1)';
    carousel.style.transform = 'translateX(' + (-current * 100) + '%)';
    dots.forEach(function(d,i){ d.classList.toggle('active', i === current); });
  }
  function goTo(i){ current = (i + slides.length) % slides.length; render(); restartAuto(); }
  function next(){ goTo(current + 1); }
  function prev(){ goTo(current - 1); }

  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('prevBtn').addEventListener('click', prev);

  function startAuto(){ autoTimer = setInterval(next, 4500); }
  function restartAuto(){ clearInterval(autoTimer); startAuto(); }
  startAuto();
  render(false);

  var dragging = false, startX = 0, deltaX = 0, widthPx = 0;
  function dragStart(x){
    dragging = true; startX = x; deltaX = 0;
    widthPx = carousel.parentElement.getBoundingClientRect().width;
    carousel.classList.add('dragging');
    carousel.style.transition = 'none';
    clearInterval(autoTimer);
  }
  function dragMove(x){
    if(!dragging) return;
    deltaX = x - startX;
    var base = -current * widthPx;
    carousel.style.transform = 'translateX(' + (base + deltaX) + 'px)';
  }
  function dragEnd(){
    if(!dragging) return;
    dragging = false;
    carousel.classList.remove('dragging');
    var threshold = widthPx * 0.15;
    if(deltaX < -threshold) current = (current + 1) % slides.length;
    else if(deltaX > threshold) current = (current - 1 + slides.length) % slides.length;
    render();
    restartAuto();
  }
  carousel.addEventListener('mousedown', function(e){ dragStart(e.clientX); });
  window.addEventListener('mousemove', function(e){ dragMove(e.clientX); });
  window.addEventListener('mouseup', dragEnd);
  carousel.addEventListener('touchstart', function(e){ dragStart(e.touches[0].clientX); }, {passive:true});
  carousel.addEventListener('touchmove', function(e){ dragMove(e.touches[0].clientX); }, {passive:true});
  carousel.addEventListener('touchend', dragEnd);
  window.addEventListener('resize', function(){ render(false); });
};
