/* Hero water-ripple on hover.
   Classic two-buffer height-map ripple, run at half resolution on a canvas
   laid over the hero image. Desktop pointers only; skipped entirely under
   reduced motion. The canvas fades in while the pointer is over the hero
   and fades back out once the water settles. */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var media = document.querySelector('.hero-lockup__media');
  var hero = document.querySelector('.hero-lockup');
  if (!media || !hero) return;
  var img = media.querySelector('img');
  if (!img) return;
  /* prefer the embedded data: copy - it can never taint the canvas */
  var simImg = img;
  if (window.__waterHeroDataURI) {
    simImg = new Image();
    simImg.src = window.__waterHeroDataURI;
  }

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-water';
  canvas.setAttribute('aria-hidden', 'true');
  media.appendChild(canvas);
  var ctx = canvas.getContext('2d', { alpha: true });
  /* mode 'refract' reads the photo's pixels and bends them (needs the page
     to be served over http/https). Opened straight from disk the browser
     blocks pixel reads of local images, so we fall back to 'rings':
     translucent ripple rings drawn over the photo. */
  var mode = 'refract';
  var rings = [];

  /* full-resolution sim keeps the photo sharp; falls back to half-res
     only when the hero is very large */
  var SCALE = 1;
  var W = 0, H = 0;              /* sim size */
  var buf1, buf2, srcData, outData;
  var ready = false;

  function coverDraw(c2d, w, h) {
    /* mirror the CSS object-fit:cover / object-position:50% 38% */
    var iw = simImg.naturalWidth, ih = simImg.naturalHeight;
    if (!iw || !ih) return false;
    var s = Math.max(w / iw, h / ih);
    var dw = iw * s, dh = ih * s;
    var dx = (w - dw) * 0.5;
    var dy = (h - dh) * 0.38;
    c2d.drawImage(simImg, dx, dy, dw, dh);
    return true;
  }

  function build() {
    var r = media.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    SCALE = (r.width * r.height > 1700000) ? 2 : 1;
    W = Math.max(2, Math.round(r.width / SCALE));
    H = Math.max(2, Math.round(r.height / SCALE));
    canvas.width = W; canvas.height = H;
    var off = document.createElement('canvas');
    off.width = W; off.height = H;
    var octx = off.getContext('2d', { alpha: false });
    if (!coverDraw(octx, W, H)) { if (!img.naturalWidth) return; }
    try {
      srcData = octx.getImageData(0, 0, W, H);
      outData = ctx.createImageData(W, H);
      buf1 = new Int16Array(W * H);
      buf2 = new Int16Array(W * H);
      ctx.putImageData(srcData, 0, 0);
      mode = 'refract';
    } catch (err) {
      /* canvas tainted (file:// origin) - draw ripple rings instead */
      mode = 'rings';
      rings = [];
      ctx.clearRect(0, 0, W, H);
    }
    ready = true;
  }

  function drop(x, y, strength) {
    if (!ready) return;
    var sx = Math.round(x / SCALE), sy = Math.round(y / SCALE);
    if (mode === 'rings') {
      rings.push({ x: sx, y: sy, r: 4, a: Math.min(strength / 1800, 0.5) });
      if (rings.length > 40) rings.shift();
      return;
    }
    var rad = SCALE === 1 ? 5 : 3;
    for (var j = -rad; j <= rad; j++) {
      for (var i = -rad; i <= rad; i++) {
        if (i * i + j * j > rad * rad) continue;
        var px = sx + i, py = sy + j;
        if (px < 1 || py < 1 || px >= W - 1 || py >= H - 1) continue;
        buf1[py * W + px] = strength;
      }
    }
  }

  var running = false, rafId = 0, calm = 0;

  function frame() {
    if (!ready) { running = false; return; }
    if (mode === 'rings') { return ringsFrame(); }
    var src = srcData.data, out = outData.data;
    var energy = 0;
    var x, y, i;
    for (y = 1; y < H - 1; y++) {
      var row = y * W;
      for (x = 1; x < W - 1; x++) {
        i = row + x;
        var v = ((buf1[i - 1] + buf1[i + 1] + buf1[i - W] + buf1[i + W]) >> 1) - buf2[i];
        v -= v >> 6;                        /* damping */
        buf2[i] = v;
        if (v > 4 || v < -4) energy++;
        /* refraction: sample the source shifted by the local slope */
        var dx = buf1[i - 1] - buf1[i + 1];
        var dy = buf1[i - W] - buf1[i + W];
        var sx = x + (dx >> 5), sy = y + (dy >> 5);
        if (sx < 0) sx = 0; else if (sx >= W) sx = W - 1;
        if (sy < 0) sy = 0; else if (sy >= H) sy = H - 1;
        var si = (sy * W + sx) << 2, oi = i << 2;
        var lum = v >> 6;                    /* faint highlight on crests */
        out[oi] = src[si] + lum;
        out[oi + 1] = src[si + 1] + lum;
        out[oi + 2] = src[si + 2] + lum;
        out[oi + 3] = 255;
      }
    }
    var t = buf1; buf1 = buf2; buf2 = t;
    ctx.putImageData(outData, 0, 0);

    if (energy === 0) { calm++; } else { calm = 0; }
    if (calm > 30 && !over) {                /* water settled, pointer gone */
      canvas.classList.remove('is-on');
      running = false;
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function ringsFrame() {
    ctx.clearRect(0, 0, W, H);
    var alive = [];
    for (var k = 0; k < rings.length; k++) {
      var g = rings[k];
      g.r += 2.4; g.a *= 0.945;
      if (g.a < 0.018) continue;
      alive.push(g);
      /* crest highlight and a fainter trailing ring */
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, 6.2832);
      ctx.strokeStyle = 'rgba(255,255,255,' + g.a.toFixed(3) + ')';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r * 0.72, 0, 6.2832);
      ctx.strokeStyle = 'rgba(190,215,255,' + (g.a * 0.55).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
    rings = alive;
    if (!rings.length) { calm++; } else { calm = 0; }
    if (calm > 30 && !over) {
      canvas.classList.remove('is-on');
      running = false;
      return;
    }
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (!ready) build();
    if (!ready) return;
    canvas.classList.add('is-on');
    if (!running) { running = true; calm = 0; rafId = requestAnimationFrame(frame); }
  }

  var over = false, lastDrop = 0;
  hero.addEventListener('pointerenter', function (e) {
    over = true; start();
    var r = media.getBoundingClientRect();
    drop(e.clientX - r.left, e.clientY - r.top, 900);
  });
  hero.addEventListener('pointermove', function (e) {
    if (!over) return;
    var now = performance.now();
    if (now - lastDrop < 45) return;         /* throttle drops */
    lastDrop = now;
    var r = media.getBoundingClientRect();
    drop(e.clientX - r.left, e.clientY - r.top, 520);
  });
  hero.addEventListener('pointerleave', function () { over = false; });

  var rsz;
  window.addEventListener('resize', function () {
    clearTimeout(rsz);
    rsz = setTimeout(function () { ready = false; if (running) build(); }, 200);
  });

  if (img.complete) { /* buffers built lazily on first hover */ }
  else img.addEventListener('load', function () { ready = false; });
})();
