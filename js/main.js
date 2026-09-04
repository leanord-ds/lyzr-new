/* =========================================================================
   Lyzr homepage - behaviour
   No dependencies. Everything degrades to a working static page if JS fails.
   ========================================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 0. Inertial smooth scrolling (wheel only) ----------------- */
  /* Touch, keyboard, and the scrollbar stay native; the wheel gets a
     lerp-smoothed glide, which is what makes the parallax feel liquid. */
  (function () {
    if (reduced) return;
    var fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;

    var target = window.scrollY;
    var current = window.scrollY;
    var animating = false;
    /* the stylesheet's scroll-behavior:smooth would re-animate every
       per-frame scrollTo into a crawl - the smoother needs raw writes */
    document.documentElement.style.scrollBehavior = 'auto';

    function maxScroll() {
      return document.documentElement.scrollHeight - window.innerHeight;
    }
    function loop() {
      current += (target - current) * 0.11;
      if (Math.abs(target - current) < 0.5) {
        current = target;
        animating = false;
      }
      window.scrollTo(0, current);
      if (animating) requestAnimationFrame(loop);
    }
    window.addEventListener('wheel', function (e) {
      /* let pinch-zoom and horizontal wheels through */
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      /* native behaviour inside horizontal rails is vertical page scroll,
         so smoothing it is safe everywhere */
      e.preventDefault();
      var d = e.deltaY;
      if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= window.innerHeight;
      if (!animating) { current = window.scrollY; }
      target = Math.max(0, Math.min(maxScroll(), target + d));
      if (!animating) { animating = true; requestAnimationFrame(loop); }
    }, { passive: false });

    /* external scrolls (anchors, keyboard, scrollbar) re-sync the target */
    window.addEventListener('scroll', function () {
      if (!animating) { target = window.scrollY; current = window.scrollY; }
    }, { passive: true });
  })();

  /* ---------- 1. Sticky header state ---------------------------------- */
  var header = document.getElementById('siteHeader');
  var stickyThreshold = 24;
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (header) header.classList.toggle('is-stuck', window.scrollY > stickyThreshold);
      ticking = false;
    });
  }
  if (header) { window.addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  /* ---------- 1b. Hero parallax ---------------------------------------- */
  var pMedia = document.querySelector('[data-parallax-media]');
  var pType  = document.querySelector('[data-parallax-type]');
  var hero   = document.querySelector('.hero-lockup');

  if (!reduced && pMedia && hero) {
    var pTicking = false;
    function parallax() {
      var y = window.scrollY;
      var limit = hero.offsetHeight;
      if (y <= limit) {
        /* photo drifts at 35% of scroll speed; type leads slightly and fades */
        pMedia.style.transform = 'translate3d(0,' + (y * 0.35) + 'px,0)';
        if (pType) {
          pType.style.transform = 'translate3d(0,' + (y * 0.14) + 'px,0)';
          pType.style.opacity = String(Math.max(0, 1 - y / (limit * 0.9)));
        }
      }
      pTicking = false;
    }
    window.addEventListener('scroll', function () {
      if (pTicking) return;
      pTicking = true;
      requestAnimationFrame(parallax);
    }, { passive: true });
    parallax();
  }

  /* ---------- 2. Mobile menu ------------------------------------------ */
  var toggle = document.getElementById('navToggle');
  var menu = document.getElementById('mobileMenu');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      menu.hidden = open;
      document.body.style.overflow = open ? '' : 'hidden';
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName !== 'A') return;
      toggle.setAttribute('aria-expanded', 'false');
      menu.hidden = true;
      document.body.style.overflow = '';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) toggle.click();
    });
  }

  /* ---------- 3. Scroll reveal ----------------------------------------- */
  var revealables = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, i) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        setTimeout(function () { el.classList.add('is-in'); }, i * 70);
        io.unobserve(el);            /* first entry only, never re-trigger */
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 4. Stat count-up ----------------------------------------- */
  var stats = document.querySelectorAll('[data-count]');

  function runCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var millions = el.getAttribute('data-format') === 'millions';
    var start = performance.now();
    var dur = 1400;

    function frame(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = target * eased;
      el.textContent = (millions ? (v / 1e6).toFixed(v >= 1e6 ? 0 : 1)
                                 : Math.round(v)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (!reduced && 'IntersectionObserver' in window) {
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        runCount(e.target);
        so.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    stats.forEach(function (el) { so.observe(el); });
  }

  /* ---------- 5. Horizontal carousels ---------------------------------- */
  function wireRail(railId, prevSel, nextSel, itemSel) {
    var rail = document.getElementById(railId);
    var prev = document.querySelector(prevSel);
    var next = document.querySelector(nextSel);
    if (!rail || !prev || !next) return;

    function step() {
      var item = rail.querySelector(itemSel);
      if (!item) return rail.clientWidth * 0.8;
      var gap = parseFloat(getComputedStyle(rail).columnGap || '24') || 24;
      return item.getBoundingClientRect().width + gap;
    }
    function sync() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    }
    prev.addEventListener('click', function () { rail.scrollBy({ left: -step(), behavior: reduced ? 'auto' : 'smooth' }); });
    next.addEventListener('click', function () { rail.scrollBy({ left:  step(), behavior: reduced ? 'auto' : 'smooth' }); });
    rail.addEventListener('scroll', function () {
      window.requestAnimationFrame(sync);
    }, { passive: true });
    window.addEventListener('resize', sync);
    sync();

    /* Arrow keys when the rail itself has focus */
    rail.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev.click(); }
    });
  }

  wireRail('ucRail',        '[data-uc-prev]',    '[data-uc-next]',    '.uc-card');

  /* ---------- 5c. Use-case rail: gentle auto-slide ---------------------- */
  var ucRail = document.getElementById('ucRail');
  if (ucRail && !reduced) {
    var ucTimer = null;
    function ucStep() {
      var max = ucRail.scrollWidth - ucRail.clientWidth - 4;
      if (ucRail.scrollLeft >= max) {
        ucRail.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        var card = ucRail.querySelector('.uc-card');
        var gap = parseFloat(getComputedStyle(ucRail).columnGap || '24') || 24;
        ucRail.scrollBy({ left: card.getBoundingClientRect().width + gap, behavior: 'smooth' });
      }
    }
    function ucPlay() { if (!ucTimer) ucTimer = setInterval(ucStep, 4000); }
    function ucStop() { clearInterval(ucTimer); ucTimer = null; }
    ['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) {
      ucRail.addEventListener(ev, ucStop, { passive: true });
    });
    ['pointerleave', 'focusout'].forEach(function (ev) { ucRail.addEventListener(ev, ucPlay); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? ucPlay() : ucStop();
      }, { threshold: 0.25 }).observe(ucRail);
    } else { ucPlay(); }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? ucStop() : ucPlay();
    });
  }

  /* ---------- 5b. Case carousel: centered, auto-advancing ---------------- */
  var cases = document.getElementById('casesViewport');
  if (cases) {
    var realCards = Array.prototype.slice.call(cases.querySelectorAll('.case-card'));
    var N = realCards.length;

    /* Seamless loop: clone the last card to the front and the first to the
       back, so a half-card always peeks on both sides of the centre one. */
    function cloneCard(src) {
      var c = src.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.tabIndex = -1;
      c.classList.add('case-card--clone');
      c.querySelectorAll('a,button').forEach(function (el) { el.tabIndex = -1; });
      return c;
    }
    cases.insertBefore(cloneCard(realCards[N - 1]), realCards[0]);
    cases.appendChild(cloneCard(realCards[0]));
    var caseCards = Array.prototype.slice.call(cases.querySelectorAll('.case-card'));
    /* track positions: 0 = clone of last, 1..N = real, N+1 = clone of first */

    var caseIndex = 0;              /* REAL index 0..N-1 */
    var caseAnimUntil = 0;          /* while a programmatic glide runs, clicks own the index */
    var caseTimer = null;
    var CASE_INTERVAL = 3800;

    function caseCenterOf(el) {
      return el.offsetLeft - (cases.clientWidth - el.clientWidth) / 2;
    }
    function caseGoTo(i, instant) {
      var wrapped = (i + N) % N;
      var goingFwd = i >= caseIndex || i >= N;
      var maxScroll = cases.scrollWidth - cases.clientWidth;
      function to(track, smooth) {
        cases.scrollTo({ left: Math.max(0, Math.min(maxScroll, caseCenterOf(caseCards[track]))),
                         behavior: (smooth && !reduced) ? 'smooth' : 'auto' });
      }
      /* Wrapping never rewinds across the strip: teleport (instantly, and
         invisibly - the clone is pixel-identical) to the matching clone on
         the far side, then glide ONE step in the travel direction. */
      if (i >= N) {            /* forward past the last card */
        to(0, false);          /* clone of last, at the front */
        requestAnimationFrame(function () { to(1, true); });   /* real first */
      } else if (i < 0) {      /* backward past the first card */
        to(N + 1, false);      /* clone of first, at the back */
        requestAnimationFrame(function () { to(N, true); });   /* real last */
      } else {
        to(i + 1, !instant);
      }
      caseIndex = wrapped;
      caseAnimUntil = Date.now() + 600;
    }
    /* highlight whichever card actually sits nearest the viewport centre */
    function caseHighlight() {
      var mid = cases.scrollLeft + cases.clientWidth / 2;
      var best = 0, bestD = Infinity;
      caseCards.forEach(function (card, i) {
        var d = Math.abs(card.offsetLeft + card.clientWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      /* map track position back to the real index (clones mirror the ends);
         while a click-driven glide is in flight, the click owns the index */
      if (Date.now() > caseAnimUntil) {
        caseIndex = (best === 0) ? N - 1 : (best === N + 1) ? 0 : best - 1;
      }
      caseThumbSync();
      caseCards.forEach(function (card, i) {
        card.classList.toggle('is-center', i === best);
      });
    }
    cases.addEventListener('scroll', function () {
      window.requestAnimationFrame(caseHighlight);
    }, { passive: true });

    /* auto-slide: pause while the visitor is on it, never under reduced motion */
    function caseStart() {
      if (reduced || caseTimer) return;
      caseTimer = setInterval(function () { caseGoTo(caseIndex + 1); }, CASE_INTERVAL);
    }
    function caseStop() {
      clearInterval(caseTimer); caseTimer = null;
    }
    ['pointerenter', 'focusin', 'touchstart'].forEach(function (ev) {
      cases.addEventListener(ev, caseStop, { passive: true });
    });
    ['pointerleave', 'focusout'].forEach(function (ev) {
      cases.addEventListener(ev, caseStart);
    });
    /* only run while the section is on screen */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting ? caseStart() : caseStop();
      }, { threshold: 0.25 }).observe(cases);
    } else {
      caseStart();
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? caseStop() : caseStart();
    });

    /* the section's prev/next buttons drive the same index */
    var cPrev = document.querySelector('[data-cases-prev]');
    var cNext = document.querySelector('[data-cases-next]');
    /* the customer logos under the rail are thumbnails for the slides */
    var caseThumbs = Array.prototype.slice.call(document.querySelectorAll('.cases__thumb'));
    function caseThumbSync() {
      caseThumbs.forEach(function (t) {
        var on = parseInt(t.getAttribute('data-cs-index'), 10) === caseIndex;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
    }
    caseThumbs.forEach(function (t) {
      t.addEventListener('click', function () {
        caseStop();
        caseGoTo(parseInt(t.getAttribute('data-cs-index'), 10));
        caseThumbSync();
        caseStart();
      });
    });

    /* a manual click also resets the auto-slide clock, so the timer never
       fires mid-interaction and skips a step under the visitor's feet */
    function caseManual(delta) {
      caseStop();
      caseGoTo(caseIndex + delta);
      caseStart();
    }
    if (cPrev) cPrev.addEventListener('click', function () { caseManual(-1); });
    if (cNext) cNext.addEventListener('click', function () { caseManual(1); });

    caseGoTo(0, true);
    caseHighlight();
    /* card widths settle after images/fonts load - re-centre then */
    window.addEventListener('load', function () {
      caseGoTo(caseIndex, true);
      caseHighlight();
    });
  }

  /* ---------- 6. Product stack accordion (scroll-driven) --------------- */
  var ORDER = ['controller', 'architect', 'studio', 'blocks'];
  var accs   = Array.prototype.slice.call(document.querySelectorAll('.stack-acc .acc'));
  var planes = Array.prototype.slice.call(document.querySelectorAll('.plane'));
  var scene  = document.getElementById('stackScene');

  function accOpen(key) {
    accs.forEach(function (a) {
      var on = a.getAttribute('data-plane') === key;
      if (on) a.setAttribute('data-open', ''); else a.removeAttribute('data-open');
      var btn = a.querySelector('.acc__trigger');
      if (btn) btn.setAttribute('aria-expanded', String(on));
    });
    planes.forEach(function (p) {
      p.setAttribute('data-active', String(p.getAttribute('data-plane') === key));
    });
  }

  function accManual(key) {
    accPause();
    accOpen(key);
    accPlay();
  }
  accs.forEach(function (a) {
    var btn = a.querySelector('.acc__trigger');
    btn.addEventListener('click', function () { accManual(a.getAttribute('data-plane')); });
  });
  planes.forEach(function (p) {
    p.addEventListener('click', function () { accManual(p.getAttribute('data-plane')); });
  });

  /* Auto-advance: each open layer runs a progress bar, then hands over to
     the next - paused while hovered/focused, off under reduced motion. */
  var ACC_INTERVAL = 3500;
  var accTimer = null;
  var accVisible = false;
  var stackAcc = document.querySelector('.stack-acc');
  if (stackAcc) stackAcc.style.setProperty('--acc-interval', ACC_INTERVAL + 'ms');
  function accNext() {
    var cur = document.querySelector('.stack-acc .acc[data-open]');
    var i = cur ? ORDER.indexOf(cur.getAttribute('data-plane')) : -1;
    var key = ORDER[(i + 1) % ORDER.length];
    accOpen(key);
  }
  function accPlay() {
    if (reduced || accTimer || !accVisible) return;
    accTimer = setInterval(accNext, ACC_INTERVAL);
  }
  function accPause() {
    clearInterval(accTimer); accTimer = null;
  }
  if (scene && stackAcc) {
    accOpen(ORDER[0]);                      /* explicit initial state */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        accVisible = entries[0].isIntersecting;
        accVisible ? accPlay() : accPause();
      }, { threshold: 0.3 }).observe(scene);
    } else { accVisible = true; accPlay(); }

    ['pointerenter', 'focusin'].forEach(function (ev) {
      stackAcc.addEventListener(ev, function () { stackAcc.classList.add('is-paused'); accPause(); });
    });
    ['pointerleave', 'focusout'].forEach(function (ev) {
      stackAcc.addEventListener(ev, function () { stackAcc.classList.remove('is-paused'); accPlay(); });
    });
    document.addEventListener('visibilitychange', function () {
      document.hidden ? accPause() : accPlay();
    });
  }

  /* ---------- 6b. Workbench phase tabs -> pointer rows ------------------
     Understand/Design/Prove/Land pick the SAME pointer row (1st..4th) in
     ALL four role cards at once. The tabs auto-advance and pause when the
     section is off screen; a click takes over and resets the clock. */
  var wbTabs  = Array.prototype.slice.call(document.querySelectorAll('.wb-phase'));
  var wbCards = Array.prototype.slice.call(document.querySelectorAll('.wb-card'));
  var WB_ORDER = ['understand', 'design', 'prove', 'land'];

  function wbSelect(phase, focusTab) {
    var idx = WB_ORDER.indexOf(phase);
    if (idx < 0) return;
    wbTabs.forEach(function (t) {
      var on = t.getAttribute('data-phase') === phase;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      if (on && focusTab) t.focus();
    });
    wbCards.forEach(function (card) {
      var lis = card.querySelectorAll('.wb-card__steps li');
      Array.prototype.forEach.call(lis, function (l, n) {
        l.classList.toggle('is-on', n === idx);
      });
    });
  }

  var wbTimer = null;
  function wbNext() {
    var cur = document.querySelector('.wb-phase[aria-selected="true"]');
    var i = cur ? WB_ORDER.indexOf(cur.getAttribute('data-phase')) : -1;
    wbSelect(WB_ORDER[(i + 1) % WB_ORDER.length]);
  }
  function wbPlay() { if (!wbTimer && !reduced) wbTimer = setInterval(wbNext, 3400); }
  function wbPause() { if (wbTimer) { clearInterval(wbTimer); wbTimer = null; } }
  function wbManual(phase, focusTab) {
    wbSelect(phase, focusTab);
    wbPause(); wbPlay();               /* restart the clock after a click */
  }

  wbTabs.forEach(function (t, i) {
    t.addEventListener('click', function () { wbManual(t.getAttribute('data-phase')); });
    t.addEventListener('keydown', function (e) {
      var d = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') d = 1;
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   d = -1;
      if (!d) return;
      e.preventDefault();
      var next = wbTabs[(i + d + wbTabs.length) % wbTabs.length];
      wbManual(next.getAttribute('data-phase'), true);
    });
  });

  wbSelect('understand');

  /* premium floating bar: docked to the browser bottom only while the
     visitor is inside the section; gone the moment its end crosses up */
  var wbPhasesBar = document.querySelector('.wb-phases');
  var wbSecFloat = document.getElementById('solutions');
  if (wbPhasesBar && wbSecFloat) {
    var wbFloatTick = false;
    var wbMqDesk = window.matchMedia('(min-width: 901px)');
    function wbFloatUpd() {
      if (!wbMqDesk.matches) { wbPhasesBar.classList.remove('wb-phases--float'); return; }
      var r = wbSecFloat.getBoundingClientRect();
      var on = r.top < window.innerHeight * 0.55 && r.bottom > window.innerHeight - 40;
      wbPhasesBar.classList.toggle('wb-phases--float', on);
    }
    window.addEventListener('scroll', function () {
      if (wbFloatTick) return;
      wbFloatTick = true;
      requestAnimationFrame(function () { wbFloatUpd(); wbFloatTick = false; });
    }, { passive: true });
    window.addEventListener('resize', wbFloatUpd);
    wbFloatUpd();
  }

  var wbSec = document.getElementById('solutions');
  if (wbSec && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? wbPlay() : wbPause(); });
    }, { threshold: 0.25 }).observe(wbSec);
  } else {
    wbPlay();
  }

  /* ---------- 3b. Section entrances: every section fades in ------------ */
  (function () {
    var secs = document.querySelectorAll('main > section:not(.hero-lockup), .site-footer');
    if (!('IntersectionObserver' in window) || reduced) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(secs, function (s) {
      s.classList.add('sec-fade');
      io.observe(s);
    });
  })();

  /* ---------- 7. Smooth in-page anchors -------------------------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    if (target.hasAttribute('tabindex') === false) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  /* ---------- 8. Scroll FX engine (parallax / zoom) --------------------- */
  var fxEls = Array.prototype.slice.call(document.querySelectorAll('[data-fx]'));
  if (!reduced && fxEls.length) {
    var fxTicking = false;

    function fxFrame() {
      fxTicking = false;
      var vh = window.innerHeight;
      fxEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;      /* off screen */
        /* 0 as the element enters from below -> 1 once it reaches mid-view */
        var raw = (vh - r.top) / (vh * 0.85);
        var p = Math.min(1, Math.max(0, raw));
        var e = 1 - Math.pow(1 - p, 3);                     /* ease-out cubic */
        var type = el.getAttribute('data-fx');

        if (p >= 1 && type !== 'drift') {
          /* done: hand transforms back to CSS so hover states work */
          if (el.__fxDone) return;
          el.__fxDone = true;
          el.style.transform = '';
          el.style.opacity = '';
          return;
        }
        el.__fxDone = false;

        if (type === 'zoom-out') {
          var s0 = parseFloat(el.getAttribute('data-fx-scale')) || 1.15;
          el.style.transform = 'scale(' + (s0 - (s0 - 1) * e) + ')';
        } else if (type === 'zoom-in') {
          var s1 = parseFloat(el.getAttribute('data-fx-scale')) || 0.9;
          el.style.transform = 'scale(' + (s1 + (1 - s1) * e) + ')';
          el.style.opacity = String(0.4 + 0.6 * e);
        } else if (type === 'rise') {
          var y = parseFloat(el.getAttribute('data-fx-y')) || 60;
          el.style.transform = 'translateY(' + (y * (1 - e)) + 'px)';
          el.style.opacity = String(0.25 + 0.75 * e);
        } else if (type === 'drift') {
          /* continuous parallax: the image glides against the scroll while
             its section is in view - oversized so edges never show */
          var st = parseFloat(el.getAttribute('data-fx-drift')) || 40;
          var off = (r.top + r.height / 2 - vh / 2) / vh;   /* -1 .. 1 */
          el.style.transform = 'translateY(' + (off * st) + 'px) scale(1.12)';
          return;
        } else if (type === 'slide-left') {
          var x = parseFloat(el.getAttribute('data-fx-x')) || 80;
          el.style.transform = 'translateX(' + (x * (1 - e)) + 'px) scale(' + (0.96 + 0.04 * e) + ')';
          el.style.opacity = String(0.5 + 0.5 * e);
        }
      });
    }
    window.addEventListener('scroll', function () {
      if (fxTicking) return;
      fxTicking = true;
      requestAnimationFrame(fxFrame);
    }, { passive: true });
    window.addEventListener('resize', fxFrame);
    fxFrame();
  }


  /* ---------- 3b. Section entrances: every section fades in ------------ */
  (function () {
    var secs = document.querySelectorAll('main > section:not(.hero-lockup), .site-footer');
    if (!('IntersectionObserver' in window) || reduced) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    Array.prototype.forEach.call(secs, function (s) {
      s.classList.add('sec-fade');
      io.observe(s);
    });
  })();

  /* ---------- 6c. Workbench step cycler + docked phase tabs ------------ */
  (function () {
    var mqDesk = window.matchMedia('(min-width: 901px)');

    /* one pointer at a time inside the active card */
    var stepTimer = null, stepIdx = 0;
    function stepItems() {
      var card = document.querySelector('.wb-card.is-active');
      return card ? Array.prototype.slice.call(card.querySelectorAll('.wb-card__steps li')) : [];
    }
    function stepShow(i) {
      stepItems().forEach(function (l, n) { l.classList.toggle('is-on', n === i); });
    }
    function stepTick() {
      var ls = stepItems();
      if (!ls.length) return;
      stepIdx = (stepIdx + 1) % ls.length;
      stepShow(stepIdx);
    }
    function stepRestart() {
      if (stepTimer) { clearInterval(stepTimer); stepTimer = null; }
      stepIdx = 0;
      if (!mqDesk.matches || reduced) return;   /* mobile: CSS shows all four */
      stepShow(0);
      stepTimer = setInterval(stepTick, 2600);
    }
    window.wbStepsRestart = stepRestart;
    stepRestart();
    window.addEventListener('resize', stepRestart);

    /* dock the tabs to the browser bottom while inside the section */
    var wbSec = document.getElementById('solutions');
    var phases = document.querySelector('.wb-phases');
    if (wbSec && phases) {
      var floatTick = false;
      function floatUpd() {
        if (!mqDesk.matches) { phases.classList.remove('wb-phases--float'); return; }
        var r = wbSec.getBoundingClientRect();
        /* dock only while truly inside: gone the moment the section's end crosses the viewport bottom */
        var on = r.top < window.innerHeight * 0.55 && r.bottom > window.innerHeight - 40;
        phases.classList.toggle('wb-phases--float', on);
      }
      window.addEventListener('scroll', function () {
        if (floatTick) return;
        floatTick = true;
        requestAnimationFrame(function () { floatUpd(); floatTick = false; });
      }, { passive: true });
      window.addEventListener('resize', floatUpd);
      floatUpd();
    }

    /* mobile scroll spy: as each card crosses mid-viewport its tab lights */
    if ('IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        if (mqDesk.matches) return;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          if (window.wbHighlight) window.wbHighlight(en.target.getAttribute('data-phase'));
        });
      }, { rootMargin: '-35% 0px -45% 0px', threshold: 0 });
      Array.prototype.forEach.call(document.querySelectorAll('.wb-card'), function (c) { spy.observe(c); });
    }
  })();

})();
