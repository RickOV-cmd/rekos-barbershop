    'use strict';

    /* ─── DYNAMIC COPYRIGHT YEAR ─── */
    (function() {
      const el = document.getElementById('ft-copy-urban');
      if (el) el.textContent = '© ' + new Date().getFullYear() + ' Reko\'s Barber Shop · Nordhorn';
    })();

    /* ─── OPEN / CLOSED STATUS (with today's hours) ─── */
    (function setOpenStatus() {
      const now  = new Date();
      const day  = now.getDay();
      const hour = now.getHours() + now.getMinutes() / 60;
      const dayKeys = ['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag'];
      const dayKey  = dayKeys[day];
      const defaultHours = {
        montag:     { open:'09:00', close:'18:00', closed:false },
        dienstag:   { open:'09:00', close:'18:00', closed:false },
        mittwoch:   { open:'09:00', close:'18:00', closed:false },
        donnerstag: { open:'09:00', close:'18:00', closed:false },
        freitag:    { open:'09:00', close:'18:00', closed:false },
        samstag:    { open:'09:00', close:'15:00', closed:false },
        sonntag:    { open:'', close:'', closed:true }
      };
      let todayH = defaultHours[dayKey] || { closed:true };
      try {
        const saved = localStorage.getItem('rekos-hours');
        if (saved) { const h = JSON.parse(saved); if (h[dayKey]) todayH = h[dayKey]; }
      } catch(e) {}
      let isOpen = false;
      if (!todayH.closed && todayH.open && todayH.close) {
        const t = s => { const [a,b] = s.split(':').map(Number); return a + b/60; };
        if (hour >= t(todayH.open) && hour < t(todayH.close)) isOpen = true;
      }
      const text  = document.getElementById('status-text');
      const dot   = document.getElementById('status-dot');
      const hrsEl = document.getElementById('status-hours');
      if (text) text.textContent = isOpen ? 'Jetzt geöffnet' : 'Aktuell geschlossen';
      if (hrsEl) {
        hrsEl.textContent = todayH.closed
          ? 'Heute geschlossen'
          : (todayH.open + ' – ' + todayH.close + ' Uhr');
      }
      if (dot) {
        dot.style.background = isOpen ? '#3ec46b' : '#e05454';
        dot.style.boxShadow  = isOpen
          ? '0 0 0 0 rgba(62,196,107,.4)'
          : '0 0 0 0 rgba(224,84,84,.4)';
      }
    })();

    /* ─── ÖFFNUNGSZEITEN — localStorage override (Admin Panel) ─── */
    (function loadHours() {
      const saved = localStorage.getItem('rekos-hours');
      if (!saved) return;
      try {
        const h = JSON.parse(saved);
        const days = ['montag','dienstag','mittwoch','donnerstag','freitag','samstag','sonntag'];
        days.forEach(d => {
          const timeEl = document.getElementById('ht-' + d);
          const rowEl  = document.getElementById('hr-' + d);
          if (!timeEl || !h[d]) return;
          if (h[d].closed) {
            timeEl.textContent = 'Geschlossen';
            rowEl.classList.add('closed');
          } else {
            timeEl.textContent = h[d].open + ' – ' + h[d].close;
            rowEl.classList.remove('closed');
          }
        });
      } catch(e) {}
    })();

    /* ─── GALLERY: SECTION SLIDER ─── */
    const GALLERY_DEFAULTS = [
      'High Fade','Taper Fade','Skin Fade','Bart Kontur',
      'Classic Cut','Styling','Kombi-Service','Beard Trim'
    ];
    const GALLERY_INITIAL = 8;
    let _galleryImages = [];
    let _gssActive    = 0;
    let _gssAutoTimer = null;
    let _gssDragX     = 0;
    let _gssDragging  = false;

    function buildGallery(images) {
      _galleryImages = images;
      var container = document.getElementById('gallery-grid');
      var moreWrap  = document.getElementById('gallery-more-wrap');
      var moreCount = document.querySelector('.gmb-count');
      if (!container) return;

      _gssActive = 0;
      clearTimeout(_gssAutoTimer);
      container.innerHTML = '';

      var visibleCount = Math.min(images.length, GALLERY_INITIAL);

      // Build slides (first 8)
      images.slice(0, GALLERY_INITIAL).forEach(function(img, i) {
        var slide  = document.createElement('div');
        slide.className = 'gss-slide';
        slide.dataset.idx = i;
        var isReal = img.href && img.href !== '' && !img.href.startsWith('assets/');
        slide.innerHTML =
          (isReal
            ? '<img src="' + img.href + '" alt="' + (img.title||'') + '" loading="' + (i < 3 ? 'eager':'lazy') + '">'
            : '<div class="gss-ph">' + String(i+1).padStart(2,'0') + '</div>') +
          '<div class="gss-overlay">' +
            '<span class="gss-tag">' + (img.title||'') + '</span>' +
            '<span class="gss-num">' + String(i+1).padStart(2,'0') + ' / ' + String(visibleCount).padStart(2,'0') + '</span>' +
          '</div>' +
          '<div class="gss-progress-bar"></div>';
        slide.addEventListener('click', function(e) {
          e.stopPropagation();
          if (_gssDragging) return;
          var pos = parseInt(slide.dataset.pos || '99', 10);
          if (pos === 0) { openSlider(_gssActive); }
          else if (!isNaN(pos)) { gssGo(_gssActive + pos); }
        });
        container.appendChild(slide);
      });

      // Navigation arrows
      var prevBtn = document.createElement('button');
      prevBtn.className = 'gss-nav gss-prev'; prevBtn.innerHTML = '←';
      prevBtn.addEventListener('click', function(e) { e.stopPropagation(); gssGo(_gssActive - 1); });
      var nextBtn = document.createElement('button');
      nextBtn.className = 'gss-nav gss-next'; nextBtn.innerHTML = '→';
      nextBtn.addEventListener('click', function(e) { e.stopPropagation(); gssGo(_gssActive + 1); });
      container.appendChild(prevBtn);
      container.appendChild(nextBtn);

      // Drag support
      container.addEventListener('mousedown', function(e) { _gssDragX = e.clientX; _gssDragging = false; });
      container.addEventListener('mousemove', function(e) { if (e.buttons && Math.abs(e.clientX - _gssDragX) > 6) _gssDragging = true; });
      container.addEventListener('mouseup',   function(e) { if (!_gssDragging) return; gssGo(_gssActive + (e.clientX - _gssDragX > 0 ? -1 : 1)); });
      container.addEventListener('touchstart', function(e) { _gssDragX = e.touches[0].clientX; _gssDragging = false; }, {passive:true});
      container.addEventListener('touchmove',  function(e) { if (Math.abs(e.touches[0].clientX - _gssDragX) > 6) _gssDragging = true; }, {passive:true});
      container.addEventListener('touchend',   function(e) { if (!_gssDragging) return; gssGo(_gssActive + (e.changedTouches[0].clientX - _gssDragX > 0 ? -1 : 1)); });

      gssUpdate();
      gssStartAuto();

      // Dots — rendered below container (into gallery-more-wrap sibling)
      var dotsEl = document.getElementById('gss-dots');
      if (!dotsEl) {
        dotsEl = document.createElement('div');
        dotsEl.id = 'gss-dots'; dotsEl.className = 'gss-dots';
        container.parentNode.insertBefore(dotsEl, container.nextSibling);
      }
      dotsEl.innerHTML = '';
      images.slice(0, GALLERY_INITIAL).forEach(function(_, i) {
        var dot = document.createElement('span');
        dot.className = 'gss-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', function() { gssGo(i); });
        dotsEl.appendChild(dot);
      });

      // "Mehr" button
      var extra = images.length - GALLERY_INITIAL;
      if (moreWrap) moreWrap.style.display = extra > 0 ? 'flex' : 'none';
      if (moreCount) moreCount.textContent = extra > 0 ? ('+' + extra + ' weitere') : '';
    }

    function gssGo(index) {
      clearTimeout(_gssAutoTimer);
      var total = Math.min(_galleryImages.length, GALLERY_INITIAL);
      _gssActive = ((index % total) + total) % total; // wrap-around
      gssUpdate();
      gssStartAuto();
    }

    function gssStartAuto() {
      clearTimeout(_gssAutoTimer);
      _gssAutoTimer = setTimeout(function() {
        gssGo(_gssActive + 1);
      }, 3800);
    }

    function gssUpdate() {
      var slides = document.querySelectorAll('.gss-slide');
      var dots   = document.querySelectorAll('.gss-dot');
      slides.forEach(function(slide, i) {
        var off = i - _gssActive;
        slide.dataset.pos = Math.max(-3, Math.min(3, off));
        var pb = slide.querySelector('.gss-progress-bar');
        if (pb) { pb.style.transition = 'none'; pb.style.width = '0%'; }
      });
      dots.forEach(function(d, i) { d.classList.toggle('active', i === _gssActive); });
      // Animate progress bar on active
      requestAnimationFrame(function() { requestAnimationFrame(function() {
        var active = document.querySelector('.gss-slide[data-pos="0"] .gss-progress-bar');
        if (active) { active.style.transition = 'width 3.8s linear'; active.style.width = '100%'; }
      }); });
    }

    // Render defaults immediately
    buildGallery(
      Array.from({length: GALLERY_INITIAL}, function(_, i) { return { href: '', title: GALLERY_DEFAULTS[i] || ('Bild ' + (i+1)) }; })
    );

    /* ─── GALLERY SLIDER ─── */
    let _sliderActive = 0;
    let _touchStartX = 0;

    function openSlider(startIndex) {
      _sliderActive = startIndex;
      const slider   = document.getElementById('gallery-slider');
      const track    = document.getElementById('gs-track');
      const total    = document.getElementById('gs-total');
      if (!slider || !track) return;
      if (total) total.textContent = String(_galleryImages.length).padStart(2,'0');
      track.innerHTML = '';
      _galleryImages.forEach(function(img, i) {
        const div = document.createElement('div');
        div.className = 'gs-slide';
        div.dataset.idx = i;
        const isReal = img.href && !img.href.startsWith('assets/') && img.href !== '';
        div.innerHTML = isReal
          ? '<img src="' + img.href + '" alt="' + (img.title||'') + '" loading="lazy">'
          : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.2);font-family:var(--f-disp);font-size:2rem;">' + String(i+1).padStart(2,'0') + '</div>';
        div.addEventListener('click', function() {
          var off = parseInt(div.dataset.off || '99', 10);
          if (off !== 0) {
            _sliderActive = Math.max(0, Math.min(_galleryImages.length - 1, _sliderActive + off));
            updateSlider();
          }
        });
        track.appendChild(div);
      });
      slider.classList.add('open');
      document.body.style.overflow = 'hidden';
      updateSlider();
    }

    function closeSlider() {
      var slider = document.getElementById('gallery-slider');
      if (slider) slider.classList.remove('open');
      document.body.style.overflow = '';
    }

    function navigateSlider(delta) {
      _sliderActive = Math.max(0, Math.min(_galleryImages.length - 1, _sliderActive + delta));
      updateSlider();
    }

    function updateSlider() {
      var slides  = document.querySelectorAll('.gs-slide');
      var curEl   = document.getElementById('gs-cur');
      var titleEl = document.getElementById('gs-title');
      if (curEl) curEl.textContent = String(_sliderActive + 1).padStart(2,'0');
      if (titleEl) titleEl.textContent = (_galleryImages[_sliderActive] || {}).title || '';
      slides.forEach(function(slide, i) {
        var off = i - _sliderActive;
        var clamped = Math.max(-3, Math.min(3, off));
        slide.dataset.off = clamped;
      });
    }

    // Slider controls
    document.addEventListener('DOMContentLoaded', function() {
      var closeBtn = document.getElementById('gs-close');
      var prevBtn  = document.getElementById('gs-prev');
      var nextBtn  = document.getElementById('gs-next');
      var slider   = document.getElementById('gallery-slider');
      if (closeBtn) closeBtn.addEventListener('click', closeSlider);
      if (prevBtn)  prevBtn.addEventListener('click', function() { navigateSlider(-1); });
      if (nextBtn)  nextBtn.addEventListener('click', function() { navigateSlider(1);  });
      if (slider) {
        // Close on backdrop click
        slider.addEventListener('click', function(e) {
          if (e.target === slider || e.target === document.getElementById('gs-stage')) closeSlider();
        });
        // Touch swipe
        slider.addEventListener('touchstart', function(e) { _touchStartX = e.touches[0].clientX; }, {passive:true});
        slider.addEventListener('touchend', function(e) {
          var dx = e.changedTouches[0].clientX - _touchStartX;
          if (Math.abs(dx) > 50) navigateSlider(dx > 0 ? -1 : 1);
        });
      }
      // Keyboard
      document.addEventListener('keydown', function(e) {
        var s = document.getElementById('gallery-slider');
        if (!s || !s.classList.contains('open')) return;
        if (e.key === 'Escape')      closeSlider();
        if (e.key === 'ArrowLeft')   navigateSlider(-1);
        if (e.key === 'ArrowRight')  navigateSlider(1);
      });
    });

    /* ─── STAR RENDERER ─── */
    function renderStars(rating) {
      var html = '';
      for (var i = 1; i <= 5; i++) {
        if (rating >= i) {
          html += '<span class="star full">★</span>';
        } else if (rating >= i - 0.5) {
          html += '<span class="star half">★</span>';
        } else {
          html += '<span class="star empty">☆</span>';
        }
      }
      return html;
    }

        /* ─── ADMIN SETTINGS LOADER ─── */
    function applySettings(s) {
      if (!s || !Object.keys(s).length) return;
        // Rating
        if (s.rating !== undefined) {
          var ratingVal  = parseFloat(s.rating);
          var ratingDisp = ratingVal.toFixed(1);
          document.querySelectorAll('.js-rating-val').forEach(function(el) {
            el.dataset.t   = String(ratingVal);
            el.textContent = ratingDisp;
          });
          var rbNum = document.getElementById('rb-num-val');
          if (rbNum) { rbNum.textContent = ratingDisp; rbNum.setAttribute('aria-label', ratingDisp + ' von 5 Sternen'); }
          // Update stars
          document.querySelectorAll('.rb-stars-row').forEach(function(row) {
            row.innerHTML = renderStars(ratingVal);
          });
        }
        // Years experience
        if (s.years !== undefined) {
          document.querySelectorAll('.js-years-val').forEach(el => {
            el.dataset.t = String(s.years);
            el.textContent = s.years;
          });
          const sub = document.getElementById('stmt-sub-text');
          if (sub && s.stmtSub) sub.textContent = s.stmtSub;
        }
        // Statement text
        if (s.stmtText) {
          const el = document.getElementById('stmt-main-text');
          if (el) el.innerHTML = s.stmtText.replace(/\n/g, '<br>');
        }
        if (s.stmtSub) {
          const el = document.getElementById('stmt-sub-text');
          if (el) el.textContent = s.stmtSub;
        }
        // Phone
        if (s.phone && s.phoneHref) {
          document.getElementById('phone-link-svc') && (document.getElementById('phone-link-svc').href = 'tel:' + s.phoneHref);
          document.getElementById('phone-link-loc') && (document.getElementById('phone-link-loc').href = 'tel:' + s.phoneHref);
          document.getElementById('phone-display-svc') && (document.getElementById('phone-display-svc').textContent = s.phone);
          document.getElementById('phone-display-loc') && (document.getElementById('phone-display-loc').textContent = s.phone);
          // Hero CTA phone button href
          const heroPhoneBtn = document.querySelector('#hero a[href^="tel:"]');
          if (heroPhoneBtn) heroPhoneBtn.href = 'tel:' + s.phoneHref;
          // CTA section phone button
          const ctaPhoneBtn = document.querySelector('#cta-section a[href^="tel:"]');
          if (ctaPhoneBtn) ctaPhoneBtn.href = 'tel:' + s.phoneHref;
          // Mobile sticky bar
          const stickyPhone = document.querySelector('#sticky-bar a[href^="tel:"]');
          if (stickyPhone) stickyPhone.href = 'tel:' + s.phoneHref;
        }
        // Services
        if (s.services && Array.isArray(s.services)) {
          s.services.forEach((svc, i) => {
            const n = i + 1;
            const nameEl  = document.getElementById('svc-' + n + '-name');
            const descEl  = document.getElementById('svc-' + n + '-desc');
            const priceEl = document.getElementById('svc-' + n + '-price');
            if (nameEl  && svc.name)  nameEl.textContent  = svc.name;
            if (descEl  && svc.desc)  descEl.textContent  = svc.desc;
            if (priceEl && svc.price) priceEl.textContent = svc.price;
          });
        }
        // Gallery
        if (s.gallery && Array.isArray(s.gallery)) {
          buildGallery(s.gallery);
        }
        // Reviews
        if (s.reviews && Array.isArray(s.reviews)) {
          s.reviews.forEach((rev, i) => {
            const n = i + 1;
            const textEl = document.getElementById('rev-' + n + '-text');
            const avEl   = document.getElementById('rev-' + n + '-av');
            const nameEl = document.getElementById('rev-' + n + '-name');
            if (textEl && rev.text)     textEl.textContent = rev.text;
            if (avEl   && rev.initials) avEl.textContent   = rev.initials;
            if (nameEl && rev.name)     nameEl.textContent = rev.name;
          });
        }
        // Hours (from Supabase settings.hours — overrides localStorage)
        if (s.hours) {
          const days = ['montag','dienstag','mittwoch','donnerstag','freitag','samstag','sonntag'];
          days.forEach(d => {
            const timeEl = document.getElementById('ht-' + d);
            const rowEl  = document.getElementById('hr-' + d);
            if (!timeEl || !s.hours[d]) return;
            if (s.hours[d].closed) {
              timeEl.textContent = 'Geschlossen';
              rowEl.classList.add('closed');
            } else {
              timeEl.textContent = s.hours[d].open + ' – ' + s.hours[d].close;
              rowEl.classList.remove('closed');
            }
          });
          // Re-run open/closed status with Supabase hours
          const dayKeys = ['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag'];
          const todayH  = s.hours[dayKeys[new Date().getDay()]];
          if (todayH) {
            const hrsEl  = document.getElementById('status-hours');
            const textEl = document.getElementById('status-text');
            const dotEl  = document.getElementById('status-dot');
            const now    = new Date();
            const hour   = now.getHours() + now.getMinutes() / 60;
            let isOpen   = false;
            if (!todayH.closed && todayH.open && todayH.close) {
              const t = s => { const [a,b] = s.split(':').map(Number); return a + b/60; };
              if (hour >= t(todayH.open) && hour < t(todayH.close)) isOpen = true;
            }
            if (hrsEl)  hrsEl.textContent  = todayH.closed ? 'Heute geschlossen' : (todayH.open + ' – ' + todayH.close + ' Uhr');
            if (textEl) textEl.textContent  = isOpen ? 'Jetzt geöffnet' : 'Aktuell geschlossen';
            if (dotEl) {
              dotEl.style.background  = isOpen ? '#3ec46b' : '#e05454';
              dotEl.style.boxShadow   = isOpen ? '0 0 0 0 rgba(62,196,107,.4)' : '0 0 0 0 rgba(224,84,84,.4)';
            }
          }
        }
    }

    // Load from Supabase first, fall back to localStorage
    (async function loadSettings() {
      let s = {};
      if (typeof fetchSiteSettings === 'function') {
        s = await fetchSiteSettings();
      }
      // Fallback: merge localStorage if Supabase empty
      if (!Object.keys(s).length) {
        try { s = JSON.parse(localStorage.getItem('rekos-settings') || '{}'); } catch(e) {}
      }
      applySettings(s);

    })();

    /* ─── TODAY HIGHLIGHT ─── */
    (function highlightToday() {
      const map = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
      const today = map[new Date().getDay()];
      document.querySelectorAll('.hr-day').forEach(el => {
        if (el.textContent.trim() === today) el.closest('.hr-row').classList.add('today');
      });
    })();

    /* ─── MOBILE NAV ─── */
    const ham    = document.getElementById('hamburger');
    const mobNav = document.getElementById('mob-nav');
    ham.addEventListener('click', () => {
      const open = mobNav.classList.toggle('open');
      ham.classList.toggle('open', open);
      ham.setAttribute('aria-expanded', open);
      mobNav.setAttribute('aria-hidden', !open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    document.querySelectorAll('.mob-link').forEach(a => {
      a.addEventListener('click', () => {
        mobNav.classList.remove('open');
        ham.classList.remove('open');
        ham.setAttribute('aria-expanded', 'false');
        mobNav.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });

    /* ─── LENIS SMOOTH SCROLL ─── */
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });

    /* ─── GSAP INIT ─── */
    gsap.registerPlugin(ScrollTrigger);

    // Hide clip-inners immediately so they animate in cleanly
    gsap.set('.clip-inner', { yPercent: 110 });

    // Wire GSAP ticker to Lenis
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Sync ScrollTrigger with Lenis
    lenis.on('scroll', ScrollTrigger.update);

    // Anchor smooth scroll via Lenis
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const tgt = document.querySelector(a.getAttribute('href'));
        if (tgt) {
          e.preventDefault();
          lenis.scrollTo(tgt, { offset: -72, duration: 1.4, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        }
      });
    });

    /* ─── STICKY HEADER ─── */
    const hdr = document.getElementById('hdr');
    lenis.on('scroll', ({ scroll }) => {
      hdr.classList.toggle('scrolled', scroll > 60);
    });

    /* ─── LOADER + HERO ANIMATIONS ─── */
    window.addEventListener('load', () => {
      setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('out');

        // Hero clip-line staggered reveal via GSAP
        const clipLines = document.querySelectorAll('#hero .clip-line .clip-inner');
        gsap.fromTo(clipLines,
          { yPercent: 110 },
          {
            yPercent: 0,
            duration: 1.1,
            ease: 'power4.out',
            stagger: 0.18,
            onComplete: () => {
              // Show status badge after hero text reveals
              const s = document.getElementById('hero-status');
              if (s) s.classList.add('in');
            }
          }
        );

        // Hero bar and tagline fade in
        gsap.fromTo(
          ['.hero-tagline', '.hero-ctas', '.hero-bar'],
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15, delay: 0.6 }
        );

        // Trigger hero counters
        triggerHeroCounters();
      }, 2000);
    });

    /* ─── HERO COUNTERS ─── */
    function triggerHeroCounters() {
      document.querySelectorAll('#hero .c-up').forEach(function(el) {
        var target  = parseFloat(el.dataset.t) || 0;
        var isFloat = String(el.dataset.t).includes('.');
        var current = 0;
        var step    = target / 55;
        var timer   = setInterval(function() {
          current = Math.min(current + step, target);
          el.textContent = isFloat ? current.toFixed(1) : Math.round(current);
          if (current >= target) clearInterval(timer);
        }, 22);
      });
    }

    /* ─── GSAP SCROLL REVEALS ─── */
    document.querySelectorAll('[data-reveal]').forEach(el => {
      if (el.closest('#hero')) return;
      const revealType  = el.dataset.reveal || 'up';
      const revealDelay = parseFloat(el.dataset.delay || 0);
      const fromVars = { opacity: 0 };
      const toVars   = { opacity: 1, duration: 0.95, ease: 'power3.out', delay: revealDelay,
                         scrollTrigger: { trigger: el, start: 'top 88%', once: true } };
      if (revealType === 'up')    { fromVars.y = 48;       toVars.y = 0; }
      if (revealType === 'left')  { fromVars.x = -48;      toVars.x = 0; }
      if (revealType === 'right') { fromVars.x = 48;       toVars.x = 0; }
      if (revealType === 'scale') { fromVars.scale = 0.96; toVars.scale = 1; }
      gsap.fromTo(el, fromVars, toVars);
    });

    // Clip-line reveals for non-hero sections
    document.querySelectorAll('.clip-line').forEach(el => {
      if (el.closest('#hero')) return;
      const inner = el.querySelector('.clip-inner');
      if (!inner) return;
      const delay = el.classList.contains('d2') ? 0.15 : el.classList.contains('d3') ? 0.3 : 0;
      gsap.fromTo(inner,
        { yPercent: 110 },
        { yPercent: 0, duration: 0.9, ease: 'power3.out', delay,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true } }
      );
    });

    /* ─── SECTION COUNT-UP ─── */
    document.querySelectorAll('.c-up').forEach(function(el) {
      if (el.closest('#hero')) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 80%',
        once: true,
        onEnter: function() {
          // Read data-t at trigger time — applySettings may have updated it
          var target  = parseFloat(el.dataset.t) || 0;
          var isFloat = String(el.dataset.t).includes('.');
          var current = 0;
          var step    = target / 50;
          var timer   = setInterval(function() {
            current = Math.min(current + step, target);
            el.textContent = isFloat ? current.toFixed(1) : Math.round(current);
            if (current >= target) clearInterval(timer);
          }, 28);
        }
      });
    });

    /* ─── PARALLAX WHY WATERMARK (GSAP scrub) ─── */
    gsap.to('.why-bg-text', {
      yPercent: -25,
      ease: 'none',
      scrollTrigger: {
        trigger: '#why',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      }
    });

    /* ─── PARALLAX STATEMENT GHOST ─── */
    gsap.to('.stmt-ghost-text', {
      yPercent: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: '#statement',
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      }
    });



    /* ─── CUSTOM CURSOR ─── */
    (function initCursor() {
      const cursor = document.getElementById('cursor');
      if (!cursor) return;
      // Only activate on devices with fine pointer (desktop)
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

      let mx = 0, my = 0;
      document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        gsap.to(cursor, { x: mx, y: my, duration: 0.18, ease: 'power2.out' });
        if (!document.body.classList.contains('cursor-ready')) {
          document.body.classList.add('cursor-ready');
        }
      });

      // Hover state on interactive elements
      const hoverEls = document.querySelectorAll('a, button, .svc-card, .gi');
      hoverEls.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('cursor-hover'));
      });
    })();


