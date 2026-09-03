
/* ------------------------------------------------------------------
   Lyzr mega nav  ·  featured video lightbox
------------------------------------------------------------------ */
(function () {
  var root = document.getElementById('lyzr-mega-nav-wrap');
  if (!root) { return; }

  var modal = document.getElementById('lmn-vmodal');
  if (!modal) { return; }

  var videoEl = document.getElementById('lmn-vmodal-video');
  var lblEl   = document.getElementById('lmn-vmodal-lbl');
  var titleEl = document.getElementById('lmn-vmodal-title');
  var linkEl  = document.getElementById('lmn-vmodal-link');
  var fallbackEl = document.getElementById('lmn-vmodal-fallback');
  var fallbackLinkEl = document.getElementById('lmn-vmodal-fallback-link');
  var closeBtn = document.getElementById('lmn-vmodal-close');
  var prevBtn  = document.getElementById('lmn-vmodal-prev');
  var nextBtn  = document.getElementById('lmn-vmodal-next');
  var idx = 0;

  /* ---- The two featured videos ---- */
  var VIDEOS = [
    {
      label: 'Founderpath',
      title: "Nathan Latka: Still Shocked Lyzr's Siva Beat Palantir",
      src: 'https://dms.licdn.com/playlist/vid/v2/D4E05AQFzTtB9QKYvJQ/mp4-640p-30fp-crf28/B4EZ9CCUGiKoBo-/0/1783519357349?e=2147483647&v=beta&t=Ku2Rvl-V_dfsryX6xvhVy3I2tL277jiKCEx4zK08bdU',
      link: 'https://www.linkedin.com/posts/nathanlatka_i-just-hung-up-with-siva-still-shocked-he-ugcPost-7480622235620212736-ruZ1'
    },
    {
      label: 'Yahoo Finance',
      title: 'AI Agent Startup Just Let Its Agent Run Its $100M Fundraise',
      src: 'https://dms.licdn.com/playlist/vid/v2/D4D05AQFvHvszPhD0uQ/mp4-720p-30fp-crf28/B4DZ9wZu2hKYB8-/0/1784297230751?e=2147483647&v=beta&t=7cutO-Ol2ZAeYPAmRkJJeTbm7TfgP16DFHr5BuF8YVA',
      link: 'https://finance.yahoo.com/technology/ai/articles/ai-agent-startup-just-let-220858949.html'
    }
  ];

  function showFallback(show) {
    if (show) {
      fallbackEl.classList.add('show');
      videoEl.style.visibility = 'hidden';
    } else {
      fallbackEl.classList.remove('show');
      videoEl.style.visibility = 'visible';
    }
  }

  function render(i) {
    idx = i;
    var v = VIDEOS[idx];
    showFallback(false);
    videoEl.pause();
    videoEl.innerHTML = '';
    var source = document.createElement('source');
    source.src = v.src;
    source.type = 'video/mp4';
    videoEl.appendChild(source);
    lblEl.textContent = v.label;
    titleEl.textContent = v.title;
    linkEl.setAttribute('href', v.link);
    fallbackLinkEl.setAttribute('href', v.link);
  }

  function openModal(i) {
    render(i);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      videoEl.load();
      var p = videoEl.play();
      if (p && p.catch) { p.catch(function () {}); }
    }, 120);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    videoEl.pause();
    videoEl.innerHTML = '';
    videoEl.load();
    showFallback(false);
    document.body.style.overflow = '';
  }

  videoEl.addEventListener('error', function () { showFallback(true); }, true);
  videoEl.addEventListener('stalled', function () {
    setTimeout(function () {
      if (videoEl.readyState === 0) { showFallback(true); }
    }, 4000);
  });

  function step(delta) {
    var n = (idx + delta + VIDEOS.length) % VIDEOS.length;
    openModal(n);
  }

  root.querySelectorAll('[data-video-idx]').forEach(function (card) {
    card.addEventListener('click', function () {
      openModal(parseInt(card.getAttribute('data-video-idx'), 10));
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(parseInt(card.getAttribute('data-video-idx'), 10));
      }
    });
  });

  closeBtn.addEventListener('click', closeModal);
  prevBtn.addEventListener('click', function () { step(-1); });
  nextBtn.addEventListener('click', function () { step(1); });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) { closeModal(); }
  });

  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('open')) { return; }
    if (e.key === 'Escape') { closeModal(); }
    if (e.key === 'ArrowRight') { step(1); }
    if (e.key === 'ArrowLeft') { step(-1); }
  });
})();

;

/* ------------------------------------------------------------------
   Lyzr mega nav  ·  #lyzr-mega-nav-wrap
   WordPress / Elementor safe: no logical-and operators, no bare
   less-than comparisons, everything scoped to the wrapper.
------------------------------------------------------------------ */
(function () {
  var root = document.getElementById('lyzr-mega-nav-wrap');
  if (!root) { return; }

  var IDS = ['solutions', 'platform', 'partners', 'resources'];
  var nav = root.querySelector('nav');
  var cur = null, ct = null;

  var canHover = true;
  if (window.matchMedia) {
    if (window.matchMedia('(hover: none)').matches) { canHover = false; }
  }

  var $ = function (id) { return document.getElementById('lmn-' + id); };

  /* ---------- keep a wide panel inside the viewport ---------- */
  function clamp(drop) {
    if (!drop) { return; }
    drop.style.marginLeft = '0px';
    var pad = 12;
    var vw = document.documentElement.clientWidth;
    var r = drop.getBoundingClientRect();
    var overRight = r.right - (vw - pad);
    var overLeft = pad - r.left;
    if (overRight > 0) { drop.style.marginLeft = (-overRight) + 'px'; return; }
    if (overLeft > 0) { drop.style.marginLeft = overLeft + 'px'; }
  }

  /* ---------- invisible hover bridge ----------
     The panel floats a little below its trigger (margin-top) for a nicer,
     airier look. That gap sits outside both the trigger and the panel, so a
     cursor resting in it would otherwise read as "left the menu". This sizes
     a transparent, hoverable strip to exactly cover that gap (matching the
     panel's real, clamped position) so hovering through it never closes the
     menu, no matter how wide the panel or how slow the mouse. */
  function syncBridge(id) {
    var wrap = $('nit-' + id), trig = $('t-' + id), drop = $('drop-' + id), bridge = $('bridge-' + id);
    if (!wrap || !trig || !drop || !bridge) { return; }
    var wrapR = wrap.getBoundingClientRect();
    var trigR = trig.getBoundingClientRect();
    var dropR = drop.getBoundingClientRect();
    var top = trigR.bottom - wrapR.top;
    var bottom = dropR.top - wrapR.top;
    var height = bottom - top;
    if (height < 0) { height = 0; }
    var left = Math.min(trigR.left, dropR.left) - wrapR.left;
    var right = Math.max(trigR.right, dropR.right) - wrapR.left;
    bridge.style.top = top + 'px';
    bridge.style.left = left + 'px';
    bridge.style.width = (right - left) + 'px';
    bridge.style.height = height + 'px';
  }
  function clearBridge(id) {
    var bridge = $('bridge-' + id);
    if (bridge) { bridge.style.width = '0px'; bridge.style.height = '0px'; }
  }

  function openM(id) {
    if (ct) { clearTimeout(ct); ct = null; }
    if (cur) { if (cur !== id) { forceClose(cur, true); } }
    cur = id;
    var t = $('t-' + id), d = $('drop-' + id);
    if (t) { t.classList.add('active'); t.setAttribute('aria-expanded', 'true'); }
    if (d) {
      clamp(d);
      d.classList.add('open');
      syncBridge(id);
      /* the panel's own open/close transform can nudge its measured rect by a
         pixel or two as it settles; resync once that finishes so the bridge
         stays pixel-accurate. */
      setTimeout(function () { if (cur === id) { syncBridge(id); } }, 430);
    }
  }
  function schedClose(id) { ct = setTimeout(function () { forceClose(id); ct = null; }, 300); }
  /* instant: true means "swap to a different item", not "leaving the menu" —
     panels vary a lot in height (Solutions vs Partners, say), so cross-fading
     the outgoing one while a very differently-sized panel fades in makes the
     whole area visibly grow/shrink as you sweep across the bar. Snapping the
     outgoing panel shut instantly (no transition) and only easing the new one
     in avoids that — the graceful fade is reserved for genuinely leaving the
     menu bar altogether. */
  function forceClose(id, instant) {
    var t = $('t-' + id), d = $('drop-' + id);
    if (t) { t.classList.remove('active'); t.setAttribute('aria-expanded', 'false'); }
    if (d) {
      if (instant) {
        d.classList.add('no-anim');
        d.classList.remove('open');
        void d.offsetHeight; /* flush so the transition is really off for this change */
        d.classList.remove('no-anim');
      } else {
        d.classList.remove('open');
      }
    }
    clearBridge(id);
    if (cur === id) { cur = null; }
  }
  function closeAll() { IDS.forEach(function (id) { forceClose(id); }); }

  IDS.forEach(function (id) {
    var wrap = $('nit-' + id);
    if (!wrap) { return; }
    var drop = $('drop-' + id);
    var trig = $('t-' + id);

    /* create the hover bridge for this item (zero-sized until opened) */
    var bridge = document.createElement('div');
    bridge.className = 'lmn-hover-bridge';
    bridge.id = 'lmn-bridge-' + id;
    bridge.setAttribute('aria-hidden', 'true');
    wrap.appendChild(bridge);

    if (canHover) {
      /* `wrap` (.nit) contains the trigger, the bridge, AND the panel, so its
         own mouseenter/mouseleave already fire exactly when the pointer truly
         enters/exits the whole widget — moving between trigger, bridge and
         panel internally never crosses wrap's boundary, so it never fires
         wrap's mouseleave. That's the only signal that should schedule a
         close. (This used to also live on the bridge/panel themselves, but
         the trigger button has no matching "cancel" listener, so moving from
         the panel/bridge back onto the trigger armed a close timer nothing
         ever cancelled — closing the menu ~300ms later while the mouse was
         still resting right on the trigger. Keeping this solely on `wrap`
         removes that whole class of false closes.) */
      wrap.addEventListener('mouseenter', function () { openM(id); });
      wrap.addEventListener('mouseleave', function () { schedClose(id); });
    }
    /* click / tap / keyboard — works on touch screens and hybrids too */
    if (trig) {
      trig.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (cur === id) { forceClose(id); } else { openM(id); }
      });
    }
  });

  /* hovering anything else in the bar dismisses an open panel */
  root.querySelectorAll('.npln,.bsi,.bdm,.logo,.atrk').forEach(function (el) {
    el.addEventListener('mouseenter', function () { if (cur) { forceClose(cur); } });
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('#lyzr-mega-nav-wrap .nit')) { return; }
    closeAll();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') { return; }
    closeAll();
    if (drawer) { if (drawer.classList.contains('open')) { setDrawer(false); } }
  });

  /* ---------- mobile drawer ---------- */
  var ham = $('ham');
  var drawer = $('mobDraw');

  function setDrawer(open) {
    if (!drawer) { return; }
    drawer.classList.toggle('open', open);
    if (ham) {
      ham.classList.toggle('open', open);
      ham.setAttribute('aria-expanded', open ? 'true' : 'false');
      ham.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    document.documentElement.style.overflow = open ? 'hidden' : '';
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (ham) {
    ham.addEventListener('click', function () {
      setDrawer(!drawer.classList.contains('open'));
    });
  }

  /* accordion: measure real height instead of a hardcoded max-height */
  root.querySelectorAll('[data-mob]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sub = document.getElementById(btn.getAttribute('data-mob'));
      if (!sub) { return; }
      var was = sub.classList.contains('open');
      root.querySelectorAll('.msb').forEach(function (s) {
        s.classList.remove('open');
        s.style.maxHeight = '';
      });
      root.querySelectorAll('.mtr').forEach(function (b) {
        b.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
      });
      if (was) { return; }
      sub.classList.add('open');
      sub.style.maxHeight = sub.scrollHeight + 'px';
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    });
  });

  /* tapping a link inside the drawer closes it */
  root.querySelectorAll('.mml,.mpl,.mbsi,.mbsd').forEach(function (a) {
    a.addEventListener('click', function () { setDrawer(false); });
  });

  /* ---------- viewport changes ---------- */
  var rt = null;
  window.addEventListener('resize', function () {
    if (rt) { clearTimeout(rt); }
    rt = setTimeout(function () {
      /* crossing back to desktop must not leave the page scroll-locked */
      if (document.documentElement.clientWidth > 960) { setDrawer(false); }
      if (cur) { clamp($('drop-' + cur)); syncBridge(cur); }
      var open = root.querySelector('.msb.open');
      if (open) { open.style.maxHeight = open.scrollHeight + 'px'; }
    }, 120);
  }, { passive: true });

  /* ---------- WordPress admin bar offset ---------- */
  function adminBar() {
    var bar = document.getElementById('wpadminbar');
    var h = 0;
    if (bar) { h = bar.offsetHeight || 0; }
    root.style.setProperty('--wpbar', h + 'px');
  }
  adminBar();
  window.addEventListener('resize', adminBar, { passive: true });
  window.addEventListener('load', adminBar);
})();

;

!function(){function e(){try{var e=new URLSearchParams(window.location.search),t={};return["gclid","gbraid","wbraid","dclid","gad_source","fbclid","msclkid","li_fat_id","ttclid"].forEach(function(a){t[a]=e.get(a)||localStorage.getItem("lyzr_"+a)||""}),{utmSource:e.get("utm_source")||localStorage.getItem("lyzr_utm_source")||"",utmMedium:e.get("utm_medium")||localStorage.getItem("lyzr_utm_medium")||"",utmCampaign:e.get("utm_campaign")||localStorage.getItem("lyzr_utm_campaign")||"",firstTouchUrl:localStorage.getItem("lyzr_first_touch_url")||document.referrer||window.location.href,lastTouchPage:window.location.href,referrer:document.referrer||"",hutk:(document.cookie.match(/hubspotutk=([^;]+)/)||[])[1]||"",gclid:t.gclid,gbraid:t.gbraid,wbraid:t.wbraid,gad_source:t.gad_source,fbclid:t.fbclid,msclkid:t.msclkid,li_fat_id:t.li_fat_id}}catch(e){return{}}}window.__lyzrStandaloneInterceptor||(window.__lyzrStandaloneInterceptor=!0,document.addEventListener("mousedown",function(t){for(var a=t.target,r=0;r<5&&a;r++){if("A"===a.tagName){if(-1!==(a.getAttribute("href")||"").indexOf("book-demo")){var o=a.className||"";if(-1!==o.indexOf("elementskit-btn")||-1!==o.indexOf("elementor-button")||-1!==o.indexOf("ue-link")||-1!==o.indexOf("ab-btn-talk")){t.preventDefault(),t.stopImmediatePropagation();var i=document.getElementById("lyzr-modal-iframe"),n=document.getElementById("lyzr-modal-container");if(!i)return;var d=e();n&&(n.style.display="block"),i.style.display="block",i.style.pointerEvents="auto",document.body.style.overflow="hidden",i.contentWindow.postMessage({type:"OPEN_DEMO_MODAL",email:"",source:window.location.href,utmSource:d.utmSource,utmMedium:d.utmMedium,utmCampaign:d.utmCampaign,firstTouchUrl:d.firstTouchUrl,lastTouchPage:d.lastTouchPage,referrer:d.referrer,hutk:d.hutk},"*"),window.dataLayer=window.dataLayer||[],window.dataLayer.push({event:"book_demo_button_click",page_path:window.location.pathname,utm_source:d.utmSource,utm_medium:d.utmMedium,utm_campaign:d.utmCampaign})}}break}a=a.parentElement}},!0))}();    

;

(function(){
  if(window.__lyzrDemoConnector)return;
  window.__lyzrDemoConnector=true;
  var container=document.getElementById('lyzr-modal-container');
  var iframe=document.getElementById('lyzr-modal-iframe');
  var ready=false,pending=null;
  window.addEventListener('message',function(e){
    if(!e.data||!e.data.type)return;
    if(e.data.type==='MODAL_READY'){ready=true;if(pending){iframe.contentWindow.postMessage(pending,'*');pending=null;}}
    else if(e.data.type==='CLOSE_DEMO_MODAL'){hideModal();}
    else if(e.data.type==='OPEN_BOOKING_LINK'){window.open(e.data.url,'_blank');hideModal();}
    else if(e.data.type==='FORM_SUBMITTED'||e.data.type==='GTM_EVENT'){
      window.dataLayer=window.dataLayer||[];
      window.dataLayer.push({event:'book_demo_popup_submit',email:e.data.email||'',page_path:window.location.pathname});
      hideModal();
    }
  });
  function getTracking(){try{var p=new URLSearchParams(window.location.search);var ids=['gclid','gbraid','wbraid','dclid','gad_source','fbclid','msclkid','li_fat_id','ttclid'];var clickIds={};ids.forEach(function(id){clickIds[id]=p.get(id)||localStorage.getItem('lyzr_'+id)||'';});return{utmSource:p.get('utm_source')||localStorage.getItem('lyzr_utm_source')||'',utmMedium:p.get('utm_medium')||localStorage.getItem('lyzr_utm_medium')||'',utmCampaign:p.get('utm_campaign')||localStorage.getItem('lyzr_utm_campaign')||'',firstTouchUrl:localStorage.getItem('lyzr_first_touch_url')||document.referrer||window.location.href,lastTouchPage:window.location.href,referrer:document.referrer||'',hutk:(document.cookie.match(/hubspotutk=([^;]+)/)||[])[1]||'',gclid:clickIds.gclid,gbraid:clickIds.gbraid,wbraid:clickIds.wbraid,gad_source:clickIds.gad_source,fbclid:clickIds.fbclid,msclkid:clickIds.msclkid,li_fat_id:clickIds.li_fat_id,ga4ClientId:localStorage.getItem('lyzr_ga4_client_id')||'',ga4SessionId:localStorage.getItem('lyzr_ga4_session_id')||''};}catch(e){return{};}}
  function openModal(){
    var t=getTracking();
    container.style.display='block';
    iframe.style.display='block';
    document.body.style.overflow='hidden';
    var msg={type:'OPEN_DEMO_MODAL',email:'',source:window.location.href,utmSource:t.utmSource,utmMedium:t.utmMedium,utmCampaign:t.utmCampaign,firstTouchUrl:t.firstTouchUrl,lastTouchPage:t.lastTouchPage,referrer:t.referrer,hutk:t.hutk,gclid:t.gclid,gbraid:t.gbraid,wbraid:t.wbraid,gad_source:t.gad_source,fbclid:t.fbclid,msclkid:t.msclkid,li_fat_id:t.li_fat_id,ga4ClientId:t.ga4ClientId,ga4SessionId:t.ga4SessionId};
    if(ready){iframe.contentWindow.postMessage(msg,'*');}else{pending=msg;}
    window.dataLayer=window.dataLayer||[];
    window.dataLayer.push({event:'book_demo_button_click',page_path:window.location.pathname,utm_source:t.utmSource,utm_medium:t.utmMedium,utm_campaign:t.utmCampaign});
  }
  function hideModal(){container.style.display='none';document.body.style.overflow='';}
  document.addEventListener('mousedown',function(e){
    var el=e.target;
    for(var i=0;i<5;i++){
      if(!el)break;
      if(el.tagName==='A'){
        var href=el.getAttribute('href')||'';
        if(href.indexOf('book-demo')!==-1){e.preventDefault();e.stopImmediatePropagation();openModal();return;}
        break;
      }
      el=el.parentElement;
    }
  },true);
})();

;(function(){
  var w=document.getElementById('lyzr-mega-nav-wrap');
  if(!w){return;}
  var on=false;
  function chk(){
    var s=(window.pageYOffset||document.documentElement.scrollTop||0)>40;
    if(s!==on){on=s;w.classList.toggle('lmn-scrolled',s);}
  }
  window.addEventListener('scroll',chk,{passive:true});
  chk();
})();
