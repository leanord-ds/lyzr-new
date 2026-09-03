
(function(){
  var BAR = document.getElementById("lyzr-ribbon");
  if(!BAR){ return; }

  /* Elementor re-renders widgets in the editor. Never bind twice. */
  if(BAR.getAttribute("data-rb-init") === "1"){ return; }
  BAR.setAttribute("data-rb-init","1");

  /* ── WORDPRESS SAFETY NOTE ────────────────────────────
     WordPress rewrites a bare ampersand into its numeric entity inside
     HTML widgets, which turns a logical-AND into "Invalid or unexpected
     token" and kills this script. There is NO literal ampersand in this
     JavaScript: logical AND is written as nested if-statements. */

  /* ── CONFIG ──────────────────────────────────────────
     KEY: the storage key. Bump it when the announcement changes, so the
     ribbon returns for anyone who dismissed the previous one. */
  var KEY = "lyzr-ribbon-control-plane";

  /* DISMISS_MEMORY: how long a dismissal sticks.

       "none"     the ribbon returns on every page load. Closing it only
                  clears it for the current view.        <-- current
       "session"  stays closed for the rest of the browser tab, returns
                  in a new tab or after the browser is quit.
       "forever"  stays closed on this browser until KEY changes.
       a number   stays closed for that many days, e.g. 7.

     This was "forever" and it is why a dismissed ribbon never came back:
     localStorage survives refreshes and restarts, which is exactly what
     an incognito window does not have, hence the ribbon reappearing
     there. On "none" nothing is ever written, and any flag left behind
     by the previous behaviour is cleared on load, so visitors who
     already dismissed the old build get the ribbon back. */
  var DISMISS_MEMORY = "none";

  /* SCROLL_AWAY: the ribbon slides up once you start scrolling and the
     nav takes back the top of the viewport, so the bar costs its height
     only at the top of the page. Set to false to pin it permanently. */
  var SCROLL_AWAY = true;

  /* The lyzr.ai nav and mobile drawer. Both are matched directly first,
     then a generic probe catches any other theme's fixed top bar. */
  var NAV_SELECTOR = "#lyzr-mega-nav-wrap nav";
  var DRAWER_SELECTOR = "#lmn-mobDraw";

  /* Storage can throw rather than return null: Safari private mode and
     some cookie blockers make the getter itself raise. Every access is
     wrapped, and a failure just means the ribbon shows. */
  function store(){
    try {
      if(DISMISS_MEMORY === "session"){ return window.sessionStorage; }
      return window.localStorage;
    } catch(err){ return null; }
  }

  function forgetFlag(){
    try { window.localStorage.removeItem(KEY); } catch(err){}
    try { window.sessionStorage.removeItem(KEY); } catch(err){}
  }

  function readFlag(){
    if(DISMISS_MEMORY === "none"){ return null; }
    var s = store();
    if(!s){ return null; }
    var v = null;
    try { v = s.getItem(KEY); } catch(err){ return null; }
    if(!v){ return null; }
    if(DISMISS_MEMORY === "forever"){ return v; }
    if(DISMISS_MEMORY === "session"){ return v; }
    if(typeof DISMISS_MEMORY !== "number"){ return v; }

    /* Day-limited: the stored value is the timestamp of the dismissal. */
    var when = parseInt(v, 10);
    if(isNaN(when)){ return null; }
    if(Date.now() - when < DISMISS_MEMORY * 86400000){ return v; }
    try { s.removeItem(KEY); } catch(err){}
    return null;
  }

  function writeFlag(){
    if(DISMISS_MEMORY === "none"){ return; }
    var s = store();
    if(!s){ return; }
    try { s.setItem(KEY, String(Date.now())); }
    catch(err){ /* ribbon simply returns on the next load */ }
  }

  /* Clears the flag written by any earlier build, so the change of
     policy reaches browsers that already dismissed the old ribbon. */
  if(DISMISS_MEMORY === "none"){ forgetFlag(); }

  if(readFlag()){
    BAR.setAttribute("hidden","hidden");
    return;
  }

  /* ── FIND THE BARS WE MUST PUSH DOWN ─────────────────
     The site nav is fixed at top:0. So is the WP admin bar, when a
     logged-in editor is viewing. We move each of them down by the
     ribbon's height, and remember their original inline `top` so a
     dismiss restores the page exactly as it was. */
  var pushed = [];
  var raised = true;         /* inverted: hidden until the page scrolls */
  var barH = 0;
  var ro = null;

  /* Set the instant a dismiss begins. While the bar collapses its height
     runs 46px -> 0, and every observer below would happily "re-apply" the
     offset using that shrinking value, stranding the nav a few pixels down
     the page. Nothing may touch the layout once we are tearing down. */
  var dismissing = false;

  /* The WordPress admin bar outranks the ribbon: it stays where it is and
     the ribbon tucks in underneath it. Logged-out visitors see 0. */
  function adminBarHeight(){
    var ab = document.getElementById("wpadminbar");
    if(!ab){ return 0; }
    var cs = window.getComputedStyle(ab);
    if(cs.position !== "fixed"){ return 0; }
    if(cs.display === "none"){ return 0; }
    return Math.round(ab.getBoundingClientRect().height);
  }

  function isTopFixedBar(el){
    if(!el){ return false; }
    if(el === BAR){ return false; }
    if(BAR.contains(el)){ return false; }
    if(el === document.body){ return false; }
    if(el === document.documentElement){ return false; }
    if(el.id === "wpadminbar"){ return false; }   /* handled separately */
    if(el.id === "lmn-mobDraw"){ return false; }  /* handled separately */
    var cs = window.getComputedStyle(el);
    if(cs.position !== "fixed"){ return false; }
    if(cs.display === "none"){ return false; }
    if(cs.visibility === "hidden"){ return false; }
    var r = el.getBoundingClientRect();
    if(r.height <= 0){ return false; }
    if(r.height > 200){ return false; }        /* not a full-screen overlay */
    if(r.top > adminBarHeight() + 4){ return false; }  /* pinned to the top */
    if(r.bottom <= 0){ return false; }
    if(r.width < window.innerWidth * 0.6){ return false; }
    return true;
  }

  function addBar(list, el){
    if(!el){ return; }
    if(list.indexOf(el) !== -1){ return; }
    list.push(el);
  }

  function collectBars(){
    var found = [];

    /* 1. The known lyzr.ai nav. Cheapest and most reliable. If it
       matches we stop here: the broad selector sweep and the
       elementsFromPoint probes below cost about 3.6ms together on a
       5,000-node page, and they exist only to cover themes we cannot
       name in advance. */
    document.querySelectorAll(NAV_SELECTOR).forEach(function(el){
      if(isTopFixedBar(el)){ addBar(found, el); }
    });
    if(found.length > 0){ return found; }

    /* 2. Common theme headers, for other templates on the site. */
    var sels = "nav, header, .site-header, #masthead, "
             + ".elementor-location-header, [data-elementor-type='header'], "
             + ".ehf-header, .elementor-sticky--effects";
    document.querySelectorAll(sels).forEach(function(el){
      if(isTopFixedBar(el)){ addBar(found, el); }
    });

    /* 3. Probe what actually paints at the top, for anything we missed. */
    var xs = [Math.round(window.innerWidth * 0.5), 14, window.innerWidth - 14];
    xs.forEach(function(x){
      var stack = document.elementsFromPoint(x, 2) || [];
      stack.forEach(function(node){
        var el = node;
        while(el){
          if(el === document.body){ break; }
          if(isTopFixedBar(el)){ addBar(found, el); break; }
          el = el.parentElement;
        }
      });
    });
    return found;
  }

  /* The in-flow page wrapper, so content is not hidden behind the ribbon.

     This widget is meant to live in the global header template, which
     means the script runs while the document is still parsing and the
     wrapper below it does not exist yet. resolveWrapper() would then
     fall through to document.body and pad the wrong element for the rest
     of the page's life. So we resolve again once the DOM is complete and
     hand the padding over if something better turned up. */
  function resolveWrapper(){
    var w = document.querySelector(".wp-site-blocks");
    if(w){ return w; }
    w = document.querySelector(".site");
    if(w){ return w; }
    return document.body;
  }

  var wrapper = resolveWrapper();
  var wrapperPadOriginal = null;

  function releaseWrapper(){
    if(wrapperPadOriginal){ wrapper.style.setProperty("padding-top", wrapperPadOriginal); }
    else { wrapper.style.removeProperty("padding-top"); }
  }

  function retargetWrapper(){
    if(dismissing){ return; }
    var next = resolveWrapper();
    if(next === wrapper){ return; }
    releaseWrapper();
    wrapper = next;
    wrapperPadOriginal = null;
    applyOffset();
  }

  /* Discovery is a DOM sweep. Once the known nav is in hand it never
     needs to run again: bars do not appear or disappear, they only move.
     Every later applyOffset (three retries, window.load, every resize,
     every ResizeObserver tick) then costs a handful of style writes
     instead of a query across the whole document. */
  var discovered = false;

  function setBarTops(topPx){
    if(!discovered){
      collectBars().forEach(function(el){
        var already = false;
        pushed.forEach(function(p){ if(p.el === el){ already = true; } });
        if(already){ return; }
        pushed.push({ el: el, top: el.style.top, trans: el.style.transition });
        if(SCROLL_AWAY){
          el.style.setProperty("transition","top .55s cubic-bezier(.22,1,.36,1)");
        }
      });
      var known = document.querySelector(NAV_SELECTOR);
      if(known){
        pushed.forEach(function(p){ if(p.el === known){ discovered = true; } });
      }
    }
    /* Anything already claimed is updated unconditionally. Discovery only
       ever finds bars still sitting at the top of the viewport, so once a
       bar has been pushed down it can never be re-discovered. Skip this
       and the nav silently stops tracking the ribbon the moment its
       height changes: a rewrap at a breakpoint, or a webfont landing. */
    pushed.forEach(function(p){
      p.el.style.setProperty("top", topPx + "px", "important");
    });
  }

  /* The mobile drawer is `top:var(--nav-h)`, measured from the viewport,
     so it does not follow the nav when the nav moves. Without this the
     drawer opens underneath the pushed-down nav and loses its first row. */
  function syncDrawer(navBottom){
    var d = document.querySelector(DRAWER_SELECTOR);
    if(!d){ return; }
    if(d.getAttribute("data-rb-top") === null){
      d.setAttribute("data-rb-top", d.style.top);
    }
    d.style.setProperty("top", navBottom + "px", "important");
  }

  function navHeight(){
    if(pushed.length === 0){ return 0; }
    return Math.round(pushed[0].el.getBoundingClientRect().height);
  }

  function applyOffset(){
    if(dismissing){ return; }
    if(BAR.hasAttribute("hidden")){ return; }

    /* sit below the WP admin bar, if one is present */
    var adminH = adminBarHeight();
    BAR.style.setProperty("top", adminH + "px", "important");

    var h = BAR.offsetHeight;
    if(h <= 0){ return; }
    barH = h;
    document.documentElement.style.setProperty("--lyzr-ribbon-h", h + "px");

    var navTop = adminH;
    if(!raised){ navTop = adminH + h; }
    setBarTops(navTop);
    syncDrawer(navTop + navHeight());

    /* The wrapper padding is constant whether or not the ribbon is
       raised. It lives at the top of the document, so once you have
       scrolled past it, removing it would only make the page jump. */
    /* inverted mode: the ribbon only appears once scrolled, overlaying the
       fixed nav, so the page never reserves space for it */
  }

  function restoreOffset(){
    pushed.forEach(function(p){
      if(p.top){ p.el.style.setProperty("top", p.top); }
      else { p.el.style.removeProperty("top"); }
      if(p.trans){ p.el.style.setProperty("transition", p.trans); }
      else { p.el.style.removeProperty("transition"); }
    });
    pushed = [];

    var d = document.querySelector(DRAWER_SELECTOR);
    if(d){
      var t = d.getAttribute("data-rb-top");
      if(t){ d.style.setProperty("top", t); }
      else { d.style.removeProperty("top"); }
      d.removeAttribute("data-rb-top");
    }

    if(wrapperPadOriginal){ wrapper.style.setProperty("padding-top", wrapperPadOriginal); }
    else { wrapper.style.removeProperty("padding-top"); }
    document.documentElement.style.removeProperty("--lyzr-ribbon-h");
  }

  /* Apply now, so the nav moves before first paint when the widget sits
     in the header template. Then again at DOMContentLoaded, when the real
     page wrapper exists and the nav is guaranteed to be parsed, and once
     more after fonts and late scripts settle. */
  BAR.classList.add("rb-up");
  applyOffset();
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", function(){
      retargetWrapper();
      applyOffset();
    });
  }
  window.setTimeout(applyOffset, 300);
  window.setTimeout(applyOffset, 1200);
  window.addEventListener("load", function(){
    retargetWrapper();
    applyOffset();
  });

  /* The message can rewrap at an odd width and change the bar's height.
     Re-measure instead of trusting the first reading. */
  if(typeof window.ResizeObserver === "function"){
    ro = new window.ResizeObserver(function(){
      if(dismissing){ return; }
      if(BAR.hasAttribute("hidden")){ return; }
      if(BAR.offsetHeight === barH){ return; }
      applyOffset();
    });
    ro.observe(BAR);
  }

  var ticking = false;
  window.addEventListener("resize", function(){
    if(ticking){ return; }
    ticking = true;
    window.requestAnimationFrame(function(){
      applyOffset();
      ticking = false;
    });
  }, {passive:true});

  /* ── SCROLL AWAY ─────────────────────────────────────
     Above the fold the ribbon owns the top of the screen. The moment
     the page moves, it slides up and hands the top back to the nav. */
  function scrollY(){
    if(typeof window.pageYOffset === "number"){ return window.pageYOffset; }
    return document.documentElement.scrollTop || 0;
  }
  function setRaised(next){
    if(raised === next){ return; }
    raised = next;
    if(raised){ BAR.classList.add("rb-up"); }
    else { BAR.classList.remove("rb-up"); }

    var adminH = adminBarHeight();
    var navTop = adminH;
    if(!raised){ navTop = adminH + barH; }
    pushed.forEach(function(p){
      p.el.style.setProperty("top", navTop + "px", "important");
    });
    syncDrawer(navTop + navHeight());
  }

  var scrollTick = false;
  function onScroll(){
    if(scrollTick){ return; }
    scrollTick = true;
    window.requestAnimationFrame(function(){
      if(!dismissing){
        if(!BAR.hasAttribute("hidden")){
          /* latch: the ribbon appears once the visitor crosses the hero
             and then stays until they dismiss it with the close button */
          if(!window.__rbShown){
            var hero=document.querySelector(".hero-lockup");
            var th=hero?Math.max(hero.offsetHeight-80,200):600;
            if(scrollY() > th){ window.__rbShown=true; setRaised(false); }
          }
        }
      }
      scrollTick = false;
    });
  }
  if(SCROLL_AWAY){
    window.addEventListener("scroll", onScroll, {passive:true});
    onScroll();   /* handle a reload that restores scroll position */
  }

  /* ── DISMISS ─────────────────────────────────────────── */
  function dismiss(){
    if(dismissing){ return; }
    if(BAR.hasAttribute("hidden")){ return; }
    dismissing = true;
    window.removeEventListener("scroll", onScroll);
    if(ro){ ro.disconnect(); ro = null; }

    var h = BAR.offsetHeight;
    BAR.classList.remove("rb-up");
    BAR.style.transition = "height .22s ease, opacity .18s ease";
    BAR.style.transform = "none";
    BAR.style.height = h + "px";
    void BAR.offsetHeight;               /* reflow so the height animates */
    BAR.style.height = "0px";
    BAR.style.opacity = "0";
    restoreOffset();
    window.setTimeout(function(){
      BAR.setAttribute("hidden","hidden");
      BAR.style.removeProperty("height");
      BAR.style.removeProperty("opacity");
      BAR.style.removeProperty("transition");
      BAR.style.removeProperty("transform");
    }, 240);
    writeFlag();
  }

  var btn = document.getElementById("rb-close");
  if(btn){
    btn.addEventListener("click", dismiss);
  }

  /* Escape closes it, the way any dismissible banner should. Ignored
     while the visitor is typing, so it never eats a form keystroke. */
  document.addEventListener("keydown", function(e){
    if(e.key !== "Escape"){ return; }
    if(BAR.hasAttribute("hidden")){ return; }
    var a = document.activeElement;
    if(a){
      var tag = a.tagName;
      if(tag === "INPUT"){ return; }
      if(tag === "TEXTAREA"){ return; }
      if(tag === "SELECT"){ return; }
      if(a.isContentEditable){ return; }
    }
    dismiss();
  });
})();
