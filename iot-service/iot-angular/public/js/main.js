/* ============================================================
   DEVETEK HELIOS — Main JavaScript
   Navbar, Scroll Animations, Lightbox, Back-to-top, Testimonial
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── Navbar Scroll Effect ─────────────────────────
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ─── Mobile Menu Toggle ───────────────────────────
  const hamburger = document.querySelector('.navbar__hamburger');
  const mobileMenu = document.querySelector('.navbar__mobile');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ─── Scroll Animations (IntersectionObserver) ─────
  const animElements = document.querySelectorAll('.fade-in, .scale-in, .slide-left, .slide-right, .stagger');
  if (animElements.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    animElements.forEach(el => observer.observe(el));
  } else {
    // Fallback: show all
    animElements.forEach(el => el.classList.add('visible'));
  }

  // ─── Count-Up Animation ───────────────────────────
  const countElements = document.querySelectorAll('[data-count]');
  if (countElements.length && 'IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    countElements.forEach(el => countObserver.observe(el));
  }

  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * target;
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // ─── Lightbox ─────────────────────────────────────
  const lightbox = document.querySelector('.lightbox');
  const galleryItems = document.querySelectorAll('.gallery-item[data-full]');
  let currentLightboxIndex = 0;
  const lightboxImages = [];

  if (lightbox && galleryItems.length) {
    galleryItems.forEach((item, i) => {
      lightboxImages.push({
        src: item.dataset.full,
        caption: item.dataset.caption || ''
      });
      item.addEventListener('click', () => openLightbox(i));
    });

    const img = lightbox.querySelector('.lightbox__img');
    const caption = lightbox.querySelector('.lightbox__caption');
    const closeBtn = lightbox.querySelector('.lightbox__close');
    const prevBtn = lightbox.querySelector('.lightbox__nav--prev');
    const nextBtn = lightbox.querySelector('.lightbox__nav--next');

    function openLightbox(index) {
      currentLightboxIndex = index;
      updateLightbox();
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    function updateLightbox() {
      const data = lightboxImages[currentLightboxIndex];
      if (img) img.src = data.src;
      if (caption) caption.textContent = data.caption;
    }

    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', () => {
      currentLightboxIndex = (currentLightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
      updateLightbox();
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      currentLightboxIndex = (currentLightboxIndex + 1) % lightboxImages.length;
      updateLightbox();
    });

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft' && prevBtn) prevBtn.click();
      if (e.key === 'ArrowRight' && nextBtn) nextBtn.click();
    });
  }

  // ─── Gallery Filter ───────────────────────────────
  const filterBtns = document.querySelectorAll('.gallery-filter');
  const galleryAll = document.querySelectorAll('.gallery-item[data-category]');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      galleryAll.forEach(item => {
        item.style.display = (cat === 'all' || item.dataset.category === cat) ? '' : 'none';
      });
    });
  });

  // ─── Back-to-Top ──────────────────────────────────
  const backTop = document.querySelector('.back-to-top');
  if (backTop) {
    window.addEventListener('scroll', () => {
      backTop.classList.toggle('visible', window.scrollY > 300);
    }, { passive: true });
    backTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ─── Testimonial Slider ───────────────────────────
  const testimonials = document.querySelectorAll('.testimonial');
  const dots = document.querySelectorAll('.testimonial-dot');
  let currentTestimonial = 0;
  let testimonialTimer;

  function showTestimonial(index) {
    testimonials.forEach(t => t.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    if (testimonials[index]) testimonials[index].classList.add('active');
    if (dots[index]) dots[index].classList.add('active');
    currentTestimonial = index;
  }

  if (testimonials.length > 1) {
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        showTestimonial(i);
        clearInterval(testimonialTimer);
        startTestimonialTimer();
      });
    });

    function startTestimonialTimer() {
      testimonialTimer = setInterval(() => {
        showTestimonial((currentTestimonial + 1) % testimonials.length);
      }, 5000);
    }
    startTestimonialTimer();
  }

  // ─── FAQ Accordion ────────────────────────────────
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      // Close all
      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-answer').style.maxHeight = '0';
      });

      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // ─── Cookie Consent ───────────────────────────────
  const cookieBanner = document.querySelector('.cookie-banner');
  if (cookieBanner && !localStorage.getItem('cookie-consent')) {
    cookieBanner.classList.add('show');
  }
  document.querySelectorAll('[data-cookie-accept]').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('cookie-consent', btn.dataset.cookieAccept);
      if (cookieBanner) cookieBanner.classList.remove('show');
    });
  });

  // ─── Active Nav Link ──────────────────────────────
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar__links a, .navbar__mobile a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === 'index.html' && href === '/')) {
      link.classList.add('active');
    }
  });

});
