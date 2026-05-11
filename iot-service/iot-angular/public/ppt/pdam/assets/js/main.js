(function () {
  'use strict';

  const TOTAL = 13;
  let current = 1;
  let overviewOpen = false;

  const stage         = document.getElementById('stage');
  const canvas        = document.getElementById('canvas');
  const progressBar   = document.getElementById('progress-bar');
  const counter       = document.getElementById('slide-counter');
  const dotTrack      = document.getElementById('dot-track');
  const btnPrev       = document.getElementById('nav-prev');
  const btnNext       = document.getElementById('nav-next');
  const btnOverview   = document.getElementById('overview-btn');
  const btnFs         = document.getElementById('fs-btn');
  const overview      = document.getElementById('overview');
  const overviewClose = document.getElementById('overview-close');
  const overviewGrid  = document.getElementById('overview-grid');

  /* Scale canvas to 16:9 */
  function scaleCanvas() {
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    canvas.style.transform = 'scale(' + s + ')';
  }
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);

  /* Progress dots */
  const dots = [];
  for (let i = 1; i <= TOTAL; i++) {
    const d = document.createElement('div');
    d.className = 'nav-dot' + (i === 1 ? ' active' : '');
    d.title = 'Slide ' + i;
    d.addEventListener('click', () => goTo(i));
    dotTrack.appendChild(d);
    dots.push(d);
  }

  /* Overview thumbnails */
  function buildOverview() {
    const slides = document.querySelectorAll('.slide');
    slides.forEach((slide, i) => {
      const n     = i + 1;
      const title = slide.getAttribute('data-title') || 'Slide ' + n;
      const type  = slide.getAttribute('data-type') || '';
      const isDark = slide.classList.contains('slide-dark') || !slide.classList.contains('slide-light');
      const thumb = document.createElement('div');
      thumb.className = 'overview-thumb' + (n === current ? ' active' : '');
      thumb.style.background = isDark ? '#0A1628' : '#0D3B6E';
      thumb.innerHTML =
        '<div class="thumb-num">SLIDE ' + String(n).padStart(2, '0') + '</div>' +
        '<div class="thumb-title">' + title + '</div>' +
        '<div class="thumb-type">' + type + '</div>';
      thumb.addEventListener('click', () => { goTo(n); closeOverview(); });
      overviewGrid.appendChild(thumb);
    });
  }

  function updateOverviewActive() {
    overviewGrid.querySelectorAll('.overview-thumb').forEach((t, i) => {
      t.classList.toggle('active', i + 1 === current);
    });
  }

  /* Navigate */
  function goTo(n, dir) {
    if (n < 1 || n > TOTAL || n === current) return;
    const prev = current;
    current = n;

    const prevSlide = document.getElementById('slide-' + prev);
    const nextSlide = document.getElementById('slide-' + current);

    prevSlide.classList.remove('active');
    nextSlide.classList.remove('animate-enter', 'animate-enter-back');
    void nextSlide.offsetWidth;

    const direction = dir !== undefined ? dir : (current > prev ? 1 : -1);
    nextSlide.classList.add(direction > 0 ? 'animate-enter' : 'animate-enter-back');
    nextSlide.classList.add('active');

    updateUI();
  }

  function next() { goTo(current + 1, 1);  }
  function prev() { goTo(current - 1, -1); }

  function updateUI() {
    progressBar.style.width = (current / TOTAL * 100) + '%';
    counter.textContent = String(current).padStart(2, '0') + ' / ' + String(TOTAL).padStart(2, '0');
    dots.forEach((d, i) => d.classList.toggle('active', i + 1 === current));
    updateOverviewActive();
    btnPrev.disabled = current === 1;
    btnNext.disabled = current === TOTAL;
  }

  /* Overview */
  function openOverview()  { overviewOpen = true;  overview.classList.add('active');    updateOverviewActive(); }
  function closeOverview() { overviewOpen = false; overview.classList.remove('active'); }

  /* Fullscreen */
  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }

  /* Keyboard */
  document.addEventListener('keydown', function (e) {
    if (overviewOpen) {
      if (e.key === 'Escape' || e.key === 'g' || e.key === 'G') closeOverview();
      return;
    }
    switch (e.key) {
      case 'ArrowRight': case ' ': e.preventDefault(); next(); break;
      case 'ArrowLeft':            e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); goTo(1, -1);     break;
      case 'End':  e.preventDefault(); goTo(TOTAL, 1);  break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'g': case 'G': openOverview();     break;
      case 'Escape': if (document.fullscreenElement) document.exitFullscreen(); break;
    }
  });

  /* Buttons */
  btnPrev.addEventListener('click', prev);
  btnNext.addEventListener('click', next);
  btnOverview.addEventListener('click', () => overviewOpen ? closeOverview() : openOverview());
  overviewClose.addEventListener('click', closeOverview);
  btnFs.addEventListener('click', toggleFullscreen);

  /* PDF Export */
  const btnPdf = document.getElementById('pdf-btn');
  function exportPDF() {
    btnPdf.disabled = true;
    btnPdf.textContent = 'Menyiapkan…';
    // Small delay to allow button state to render
    setTimeout(function () {
      window.print();
      btnPdf.disabled = false;
      btnPdf.innerHTML = '<iconify-icon icon="fa6-solid:file-pdf" width="13"></iconify-icon> PDF';
    }, 200);
  }
  btnPdf.addEventListener('click', exportPDF);

  /* Keyboard — add P for PDF */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); exportPDF(); }
  }, true);

  /* Touch swipe */
  let touchX = 0;
  document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  }, { passive: true });

  /* Init */
  buildOverview();
  updateUI();

})();
