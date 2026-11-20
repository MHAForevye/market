/* Hediye kartı çizimi: 15 şablon, ön ve arka yüz. Hepsi canvas'a çizilir; ekrandaki kart ile indirilen resim birebir aynıdır.
   Arka plan (desen) her şablon için bir kez çizilip saklanır; yazılar her değişiklikte üstüne yeniden yazılır.
   Çizim koordinatları 1012x638'dir (kredi kartı oranı); canvas ne kadar büyük olursa olsun ölçeklenir. */
(function (root) {
  'use strict';
  var W = 1012, H = 638, RAD = 46;
  var SANS = 'Oswald, "Arial Narrow", Impact, sans-serif', DISP = '"Bebas Neue", Oswald, Impact, "Arial Narrow", sans-serif';
  var GOLD = '#ffd34d';

  function rng(seed) { var s = (seed || 1) >>> 0; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s >>>= 0; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function lg(c, x0, y0, x1, y1, stops) { var g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s, i) { g.addColorStop(stops.length === 1 ? 0 : (s.length > 1 && typeof s[0] === 'number' ? s[0] : i / (stops.length - 1)), typeof s === 'string' ? s : s[s.length - 1]); }); return g; }
  function rg(c, x, y, r0, r1, a, b) { var g = c.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ---- Desen parçaları ---- */
  function rosette(c, cx, cy, R, r, d, col, alpha, lw) {   // banknot tarzı ince çizgili rozet
    d = Math.min(d, (R - r) * .94); var turns = r, steps = turns * 56, k = (R - r) / r;
    c.save(); c.strokeStyle = col; c.globalAlpha = alpha; c.lineWidth = lw; c.beginPath();
    for (var i = 0; i <= steps; i++) {
      var t = i / steps * Math.PI * 2 * turns, x = cx + (R - r) * Math.cos(t) + d * Math.cos(k * t), y = cy + (R - r) * Math.sin(t) - d * Math.sin(k * t);
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.stroke(); c.restore();
  }
  var PO = new Path2D('M16 2C17 9 26 13 26 25C26 33 21 38 16 38C11 38 6 33 6 25C6 20 9 17 10 12C12 15 13 17 14 17C14 11 14 6 16 2Z');
  var PM = new Path2D('M16 16C17 21 22 23 22 29C22 33.5 19.5 36 16 36C12.5 36 10 33.5 10 29C10 25 13 24 13.5 20C14.5 21 15.5 21 16 16Z');
  var PC = new Path2D('M16 26C17 29 19 30 19 32.5C19 34.5 17.7 35.5 16 35.5C14.3 35.5 13 34.5 13 32.5C13 30 15 29 16 26Z');
  function flame(c, x, baseY, h, cols, alpha, glow) {      // alev: seri ateşinin şekli (x: orta, baseY: alt)
    var k = h / 40; c.save(); c.translate(x - 16 * k, baseY - 38 * k); c.scale(k, k); c.globalAlpha = alpha;
    if (glow) { c.shadowColor = cols[1]; c.shadowBlur = glow; }
    c.fillStyle = cols[0]; c.fill(PO); c.shadowBlur = 0; c.fillStyle = cols[1]; c.fill(PM); c.fillStyle = cols[2]; c.fill(PC); c.restore();
  }
  function waves(c, y0, amp, len, n, gap, col, alpha, lw) {
    c.save(); c.strokeStyle = col; c.lineWidth = lw; c.globalAlpha = alpha;
    for (var j = 0; j < n; j++) { c.beginPath(); for (var x = 0; x <= W; x += 8) { var y = y0 + j * gap + Math.sin(x / len + j * .7) * amp * (1 + j * .12); if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); }
    c.restore();
  }
  function stars(c, seed, n, col, maxR) {
    var r = rng(seed); c.save(); c.fillStyle = col;
    for (var i = 0; i < n; i++) { c.globalAlpha = .25 + r() * .75; c.beginPath(); c.arc(r() * W, r() * H, .6 + r() * maxR, 0, 7); c.fill(); }
    c.restore();
  }
  function sparkle(c, x, y, s, col, alpha) {
    c.save(); c.globalAlpha = alpha; c.fillStyle = col; c.beginPath();
    c.moveTo(x, y - s); c.quadraticCurveTo(x, y, x + s, y); c.quadraticCurveTo(x, y, x, y + s); c.quadraticCurveTo(x, y, x - s, y); c.quadraticCurveTo(x, y, x, y - s); c.fill(); c.restore();
  }
  function hexes(c, size, col, alpha) {
    c.save(); c.strokeStyle = col; c.globalAlpha = alpha; c.lineWidth = 1.6; var h = size * Math.sqrt(3) / 2;
    for (var row = -1; row < H / h + 1; row++) for (var q = -1; q < W / (size * 1.5) + 1; q++) {
      var x = q * size * 1.5, y = row * h * 2 + (q % 2 ? h : 0); c.beginPath();
      for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i; c.lineTo(x + size * Math.cos(a), y + size * Math.sin(a)); }
      c.closePath(); c.stroke();
    }
    c.restore();
  }
  function facets(c, seed, cell, light, dark) {            // kesme taş yüzeyi: kayık üçgenler
    var r = rng(seed), cols = Math.ceil(W / cell) + 2, rows = Math.ceil(H / cell) + 2, P = [];
    for (var j = 0; j < rows; j++) { P[j] = []; for (var i = 0; i < cols; i++) P[j][i] = [i * cell - cell + (r() - .5) * cell * .7, j * cell - cell + (r() - .5) * cell * .7]; }
    for (var y = 0; y < rows - 1; y++) for (var x = 0; x < cols - 1; x++) {
      var a = P[y][x], b = P[y][x + 1], d = P[y + 1][x], e = P[y + 1][x + 1];
      [[a, b, d], [b, e, d]].forEach(function (t) { c.fillStyle = r() > .5 ? light : dark; c.globalAlpha = r() * .14; c.beginPath(); c.moveTo(t[0][0], t[0][1]); c.lineTo(t[1][0], t[1][1]); c.lineTo(t[2][0], t[2][1]); c.closePath(); c.fill(); });
    }
    c.globalAlpha = 1;
  }
  function snow(c, x, y, s, col, alpha) {
    c.save(); c.translate(x, y); c.strokeStyle = col; c.globalAlpha = alpha; c.lineWidth = 2.2; c.lineCap = 'round';
    for (var i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s); c.moveTo(0, -s * .55); c.lineTo(s * .22, -s * .8); c.moveTo(0, -s * .55); c.lineTo(-s * .22, -s * .8); c.stroke(); }
    c.restore();
  }

  /* ---- 15 şablon: bg(c) arka planı ve deseni çizer; ink yazı rengi, ink2 silik yazı, chip çip rengi, light=koyu yazı ---- */
  var T = [
    { // 0 Gece Moru: Mağaza'nın moru + altın rozet
      ink: '#ffffff', ink2: '#d9d2ff', chip: 'gold',
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, W, H, ['#5b3fd0', '#2c1d6b', '#150d38']); c.fillRect(0, 0, W, H);
        c.fillStyle = rg(c, 180, 80, 10, 620, 'rgba(160,130,255,.45)', 'rgba(160,130,255,0)'); c.fillRect(0, 0, W, H);
        rosette(c, 760, 330, 360, 77, 400, GOLD, .16, 1.1); rosette(c, 760, 330, 300, 61, 300, '#ffffff', .1, 1);
      }
    },
    { // 1 Altın Çağ: fırçalı altın folyo
      ink: '#3a2203', ink2: 'rgba(58,34,3,.7)', chip: 'dark', light: true,
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, W, H, [[0, '#fff3b0'], [.28, '#e8b73a'], [.5, '#fbe38a'], [.74, '#b97a12'], [1, '#8a5508']]); c.fillRect(0, 0, W, H);
        c.save(); c.strokeStyle = '#5a3504'; c.globalAlpha = .1; c.lineWidth = 1.2;
        for (var a = 0; a < 360; a += 2.5) { var t = a * Math.PI / 180; c.beginPath(); c.moveTo(W * .82, H * .1); c.lineTo(W * .82 + Math.cos(t) * 1400, H * .1 + Math.sin(t) * 1400); c.stroke(); }
        c.restore(); rosette(c, 250, 460, 330, 71, 400, '#5a3504', .13, 1);
        c.fillStyle = lg(c, 0, 0, W, 0, ['rgba(255,255,255,0)', 'rgba(255,255,255,.28)', 'rgba(255,255,255,0)']); c.save(); c.translate(W * .55, 0); c.transform(1, 0, -.4, 1, 0, 0); c.fillRect(-90, 0, 180, H); c.restore();
      }
    },
    { // 2 Kamp Ateşi: alt kenardan yükselen alevler
      ink: '#fff7e6', ink2: 'rgba(255,240,215,.78)', chip: 'gold',
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, 0, H, ['#240805', '#7c1d08', '#d9480f']); c.fillRect(0, 0, W, H);
        var r = rng(7), tones = [['#991b1b', '#dc2626', '#f97316'], ['#dc2626', '#f97316', '#fde047'], ['#ea580c', '#fb923c', '#fde68a']];
        for (var i = 0; i < 15; i++) { var h = 150 + r() * 330; flame(c, (i + .5) * (W / 15) + (r() - .5) * 40, H + 40, h, tones[i % 3], .2 + r() * .22, 0); }
        flame(c, 830, H + 20, 400, ['#ea580c', '#fbbf24', '#fff7cc'], .5, 60); stars(c, 3, 40, '#ffd9a0', 2.2);
      }
    },
    { // 3 Mavi Alev: petek ağı + parlayan mavi alev
      ink: '#eaf6ff', ink2: 'rgba(214,236,255,.75)', chip: 'silver',
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, W, H, ['#02183f', '#0a3a94', '#1f6feb']); c.fillRect(0, 0, W, H);
        hexes(c, 44, '#bde3ff', .13); c.fillStyle = rg(c, 800, 340, 10, 420, 'rgba(56,189,248,.5)', 'rgba(56,189,248,0)'); c.fillRect(0, 0, W, H);
        flame(c, 810, 560, 470, ['#2563eb', '#38bdf8', '#e0f2fe'], .85, 70);
      }
    },
    { // 4 Zümrüt: kesme taş yüzeyi
      ink: '#eafff6', ink2: 'rgba(215,255,238,.78)', chip: 'gold',
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, W, H, ['#03261b', '#0b6746', '#23c488']); c.fillRect(0, 0, W, H);
        facets(c, 11, 120, '#ffffff', '#00130c');
        c.fillStyle = rg(c, 760, 120, 10, 520, 'rgba(180,255,225,.4)', 'rgba(180,255,225,0)'); c.fillRect(0, 0, W, H);
      }
    },
    { // 5 Buz Alevi: cam kırıkları + kar tanesi
      ink: '#10294d', ink2: 'rgba(16,41,77,.7)', chip: 'silver', light: true,
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, W, H, ['#f4fbff', '#c4e6fb', '#8eb4e6']); c.fillRect(0, 0, W, H);
        var r = rng(21); for (var i = 0; i < 9; i++) { var x = r() * W, y = r() * H, a = r() * 6; c.fillStyle = r() > .5 ? 'rgba(255,255,255,.35)' : 'rgba(70,120,200,.1)'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 520, y + Math.sin(a) * 520); c.lineTo(x + Math.cos(a + .35) * 420, y + Math.sin(a + .35) * 420); c.closePath(); c.fill(); }
        snow(c, 790, 330, 190, '#ffffff', .75); snow(c, 920, 540, 70, '#3b6fb8', .4); snow(c, 600, 110, 60, '#3b6fb8', .35); snow(c, 560, 540, 45, '#ffffff', .6);
      }
    },
    { // 6 Gül Alevi: yarım ton noktalar + ışık halkaları
      ink: '#fff0f6', ink2: 'rgba(255,225,238,.8)', chip: 'gold',
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, W, H, ['#3f0826', '#be185d', '#f472b6']); c.fillRect(0, 0, W, H);
        c.fillStyle = '#fff'; for (var y = 0; y < H + 30; y += 26) for (var x = (y / 26 % 2) * 13; x < W + 30; x += 26) { var d = Math.max(0, (x / W + y / H) / 2 - .25); c.globalAlpha = .22; c.beginPath(); c.arc(x, y, d * 15, 0, 7); c.fill(); }
        c.globalAlpha = 1; var r = rng(5); for (var i = 0; i < 7; i++) { c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; c.beginPath(); c.arc(600 + r() * 380, 80 + r() * 480, 30 + r() * 80, 0, 7); c.stroke(); }
        flame(c, 840, 600, 360, ['#9d174d', '#f472b6', '#fff1f2'], .45, 50);
      }
    },
    { // 7 Gökkuşağı: holografik folyo (CSS parıltısı da buna bakar)
      ink: '#ffffff', ink2: 'rgba(255,255,255,.82)', chip: 'silver', holo: true,
      bg: function (c) {
        c.fillStyle = '#1a1238'; c.fillRect(0, 0, W, H);
        if (c.createConicGradient) { var g = c.createConicGradient(Math.PI * .15, W * .7, H * .35); ['#ff4d6d', '#ffd23f', '#5eead4', '#60a5fa', '#c084fc', '#ff4d6d'].forEach(function (col, i) { g.addColorStop(i / 5, col); }); c.fillStyle = g; }
        else c.fillStyle = lg(c, 0, 0, W, H, ['#ff4d6d', '#ffd23f', '#5eead4', '#60a5fa', '#c084fc']);
        c.globalAlpha = .9; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
        c.save(); c.strokeStyle = '#fff'; c.globalAlpha = .16; c.lineWidth = 1.4; for (var i = 1; i < 26; i++) { c.beginPath(); c.arc(W * .7, H * .35, i * 34, 0, 7); c.stroke(); } c.restore();
        c.fillStyle = lg(c, 0, 0, 0, H, ['rgba(20,8,50,.1)', 'rgba(20,8,50,.5)']); c.fillRect(0, 0, W, H);
      }
    },
    { // 8 Obsidyen: siyah cam + ince altın rozet
      ink: '#f6e6b8', ink2: 'rgba(246,230,184,.66)', chip: 'gold',
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, W, H, ['#1d1d27', '#0a0a0f', '#15151d']); c.fillRect(0, 0, W, H);
        rosette(c, 700, 320, 380, 79, 400, '#d9a93a', .34, 1); rosette(c, 700, 320, 280, 53, 300, '#d9a93a', .2, 1);
        c.fillStyle = lg(c, 0, 0, W, H, ['rgba(255,255,255,0)', 'rgba(255,255,255,.07)', 'rgba(255,255,255,0)']); c.save(); c.transform(1, 0, -.6, 1, 0, 0); c.fillRect(380, 0, 240, H); c.restore();
      }
    },
    { // 9 Okyanus: üst üste dalga çizgileri
      ink: '#e9fcff', ink2: 'rgba(214,246,252,.78)', chip: 'silver',
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, 0, H, ['#021a33', '#04507a', '#0ea5b7']); c.fillRect(0, 0, W, H);
        for (var k = 0; k < 4; k++) { c.fillStyle = 'rgba(255,255,255,' + (.03 + k * .015) + ')'; c.beginPath(); c.moveTo(0, H); for (var x = 0; x <= W; x += 8) c.lineTo(x, 330 + k * 70 + Math.sin(x / (90 + k * 20) + k) * 26); c.lineTo(W, H); c.fill(); }
        waves(c, 300, 22, 80, 12, 28, '#d8fbff', .2, 1.6);
        c.fillStyle = rg(c, 880, 90, 5, 260, 'rgba(255,255,255,.35)', 'rgba(255,255,255,0)'); c.fillRect(0, 0, W, H);
      }
    },
    { // 10 Gün Batımı: retro güneş ve ufuk ızgarası
      scrim: true, ink: '#fff4e0', ink2: 'rgba(255,236,210,.8)', chip: 'gold',
      bg: function (c) {
        var hy = H * .66;
        c.fillStyle = lg(c, 0, 0, 0, hy, ['#24093f', '#9d1d96', '#ff5d5d', '#ffc371']); c.fillRect(0, 0, W, hy);
        c.fillStyle = lg(c, 0, hy, 0, H, ['#2a0d4a', '#12051f']); c.fillRect(0, hy, W, H - hy);
        c.save(); c.beginPath(); c.arc(730, hy, 190, Math.PI, 0); c.clip();
        c.fillStyle = lg(c, 0, hy - 190, 0, hy, ['#fff1a8', '#ff9e5e', '#ff4f7b']); c.fillRect(540, hy - 190, 380, 190);
        c.fillStyle = '#2a0d4a'; for (var i = 0; i < 7; i++) c.fillRect(540, hy - 14 - i * 22 + (i * 1.6), 380, 3 + i * 1.8); c.restore();
        c.strokeStyle = 'rgba(255,120,220,.5)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, hy); c.lineTo(W, hy); c.stroke();
        for (var j = 1; j < 8; j++) { var y = hy + (j * j) * 3.4; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        for (var k = -12; k <= 12; k++) { c.beginPath(); c.moveTo(W / 2 + k * 28, hy); c.lineTo(W / 2 + k * 160, H); c.stroke(); }
      }
    },
    { // 11 Aurora: kuzey ışığı şeritleri
      ink: '#e8fff8', ink2: 'rgba(210,255,240,.78)', chip: 'silver',
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, 0, H, ['#030816', '#0a1c3e', '#0c3b4a']); c.fillRect(0, 0, W, H);
        stars(c, 17, 140, '#ffffff', 1.4);
        [['#34d399', 200, 60, .55], ['#22d3ee', 270, 50, .4], ['#a78bfa', 330, 44, .32]].forEach(function (b, k) {
          c.beginPath(); c.moveTo(0, H); for (var x = 0; x <= W; x += 6) c.lineTo(x, b[1] + Math.sin(x / (150 + k * 40) + k * 2) * b[2] + Math.sin(x / 47) * 8); c.lineTo(W, H); c.closePath();
          var g = c.createLinearGradient(0, b[1] - b[2], 0, b[1] + 260); g.addColorStop(0, b[0]); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = b[3]; c.fillStyle = g; c.fill();
        });
        c.globalAlpha = 1;
      }
    },
    { // 12 Fırtına: bulut, yağmur, yıldırım
      ink: '#eef3ff', ink2: 'rgba(226,234,255,.76)', chip: 'silver',
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, W, H, ['#0a0f1c', '#262f4a', '#475776']); c.fillRect(0, 0, W, H);
        [[200, 90, 330], [620, 40, 360], [930, 150, 300], [420, 230, 280]].forEach(function (p) { c.fillStyle = rg(c, p[0], p[1], 10, p[2], 'rgba(190,205,235,.22)', 'rgba(190,205,235,0)'); c.fillRect(0, 0, W, H); });
        var r = rng(9); c.strokeStyle = 'rgba(210,225,255,.2)'; c.lineWidth = 1.6; for (var i = 0; i < 150; i++) { var x = r() * (W + 200), y = r() * H; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 22, y + 62); c.stroke(); }
        c.save(); c.shadowColor = '#ffe680'; c.shadowBlur = 40; c.fillStyle = '#fff6b8'; c.beginPath();
        c.moveTo(800, 190); c.lineTo(740, 340); c.lineTo(790, 340); c.lineTo(730, 520); c.lineTo(880, 310); c.lineTo(826, 310); c.lineTo(884, 190); c.closePath(); c.fill(); c.restore();
      }
    },
    { // 13 Galaksi: bulutsu, yıldız tozu, halkalı gezegen
      ink: '#ffffff', ink2: 'rgba(228,220,255,.8)', chip: 'gold',
      bg: function (c) {
        c.fillStyle = '#07041a'; c.fillRect(0, 0, W, H);
        [[760, 200, 420, 'rgba(124,58,237,.55)'], [300, 520, 380, 'rgba(236,72,153,.32)'], [980, 520, 300, 'rgba(56,189,248,.3)'], [140, 80, 260, 'rgba(99,102,241,.3)']].forEach(function (p) { c.fillStyle = rg(c, p[0], p[1], 5, p[2], p[3], 'rgba(0,0,0,0)'); c.fillRect(0, 0, W, H); });
        stars(c, 33, 260, '#ffffff', 1.6);
        var r = rng(2); for (var i = 0; i < 6; i++) sparkle(c, r() * W, r() * H, 8 + r() * 10, '#fff', .8);
        c.save(); c.translate(790, 250); c.fillStyle = rg(c, -30, -30, 6, 90, '#ffd9a8', '#b4572d'); c.beginPath(); c.arc(0, 0, 84, 0, 7); c.fill();
        c.strokeStyle = 'rgba(255,230,190,.8)'; c.lineWidth = 9; c.beginPath(); c.ellipse(0, 0, 170, 36, -.38, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
        c.beginPath(); c.ellipse(0, 0, 170, 36, -.38, .05 * Math.PI, .95 * Math.PI); c.stroke(); c.restore();
      }
    },
    { // 14 Kum ve Bakır: kum tepeleri + yükselti çizgileri
      ink: '#3b1d08', ink2: 'rgba(59,29,8,.72)', chip: 'dark', light: true,
      bg: function (c) {
        c.fillStyle = lg(c, 0, 0, W, H, ['#f6dfae', '#dba462', '#a8622a']); c.fillRect(0, 0, W, H);
        for (var k = 0; k < 5; k++) { c.fillStyle = 'rgba(94,44,10,' + (.06 + k * .05) + ')'; c.beginPath(); c.moveTo(0, H); for (var x = 0; x <= W; x += 8) c.lineTo(x, 250 + k * 70 + Math.sin(x / (130 + k * 30) + k * 1.3) * (40 + k * 6)); c.lineTo(W, H); c.fill(); }
        waves(c, 120, 30, 140, 9, 54, '#7a3d12', .22, 1.4);
        c.fillStyle = rg(c, 840, 90, 5, 160, 'rgba(255,250,220,.9)', 'rgba(255,250,220,0)'); c.fillRect(0, 0, W, H);
      }
    }
  ];

  /* ---- Ortak parçalar ---- */
  function gem(c, x, y, s, alpha) {
    var k = s / 48; c.save(); c.translate(x, y); c.scale(k, k); c.globalAlpha = alpha == null ? 1 : alpha;
    c.lineJoin = 'round'; c.lineWidth = 2.6; c.strokeStyle = '#1e3a5f';
    c.fillStyle = '#7dd3fc'; var body = new Path2D('M14 6h20l10 12-20 26L4 18z'); c.fill(body); c.stroke(body);
    c.fillStyle = '#e0f2fe'; var top = new Path2D('M14 6h20l10 12H4z'); c.fill(top); c.stroke(top);
    c.lineWidth = 2.2; c.stroke(new Path2D('M19 6l-3 12M29 6l3 12M16 18l8 26M32 18l-8 26'));
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(10, 14); c.lineTo(12, 11); c.stroke(); c.restore();
  }
  function chip(c, x, y, kind) {
    var cols = { gold: ['#fff1b0', '#e0a928', '#94600a'], silver: ['#ffffff', '#c9d0dc', '#7c8798'], dark: ['#f2cf86', '#b98a3a', '#5e3d0b'] }[kind] || [];
    c.save(); c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 10; c.shadowOffsetY = 3; rr(c, x, y, 124, 96, 16); c.fillStyle = lg(c, x, y, x + 124, y + 96, cols); c.fill(); c.restore();
    c.save(); rr(c, x, y, 124, 96, 16); c.clip(); c.strokeStyle = 'rgba(70,40,0,.45)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y + 32); c.lineTo(x + 124, y + 32); c.moveTo(x, y + 64); c.lineTo(x + 124, y + 64); c.moveTo(x + 41, y); c.lineTo(x + 41, y + 96); c.moveTo(x + 83, y); c.lineTo(x + 83, y + 96); c.stroke();
    rr(c, x + 38, y + 26, 48, 44, 9); c.fillStyle = 'rgba(255,255,255,.18)'; c.fill(); c.stroke(); c.restore();
    rr(c, x, y, 124, 96, 16); c.strokeStyle = 'rgba(60,35,0,.55)'; c.lineWidth = 2; c.stroke();
  }
  function wireless(c, x, y, col) {
    c.save(); c.strokeStyle = col; c.lineWidth = 5; c.lineCap = 'round';
    for (var i = 0; i < 4; i++) { c.globalAlpha = .9 - i * .15; c.beginPath(); c.arc(x - 18, y, 16 + i * 14, -.9, .9); c.stroke(); }
    c.restore();
  }
  function txt(c, s, x, y, font, col, align, ls) {
    c.font = font; c.fillStyle = col; c.textAlign = align || 'left'; c.textBaseline = 'alphabetic';
    if ('letterSpacing' in c) { c.letterSpacing = (ls || 0) + 'px'; c.fillText(s, x, y); c.letterSpacing = '0px'; return; }
    if (!ls) { c.fillText(s, x, y); return; }
    var w = 0, i; for (i = 0; i < s.length; i++) w += c.measureText(s.charAt(i)).width + ls;
    var cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x; c.textAlign = 'left';
    for (i = 0; i < s.length; i++) { c.fillText(s.charAt(i), cx, y); cx += c.measureText(s.charAt(i)).width + ls; }
  }
  function fitText(c, s, maxW, size, weight, fam, min) { do { c.font = weight + ' ' + size + 'px ' + fam; size -= 2; } while (c.measureText(s).width > maxW && size > (min || 18)); return c.font; }
  function wrap(c, s, maxW, maxLines) {
    var words = String(s).split(' '), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…'; }
    return lines;
  }
  function dotRow(c, x, y, n, col, adv) { c.save(); c.fillStyle = col; c.globalAlpha = .62; for (var i = 0; i < n; i++) { c.beginPath(); c.arc(x + i * adv + adv / 2 - 6, y - 32, 9, 0, 7); c.fill(); } c.restore(); }

  /* ---- Arka plan önbelleği ---- */
  var cache = {};
  function bgOf(tpl, side) {
    var key = tpl + side; if (cache[key]) return cache[key];
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d'), t = T[tpl] || T[0];
    t.bg(c);
    if (side === 'back') { c.fillStyle = t.light ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.26)'; c.fillRect(0, 0, W, H); }
    if (t.scrim && side === 'front') { c.fillStyle = lg(c, 0, 330, 0, 560, ['rgba(18,4,36,0)', 'rgba(18,4,36,.55)']); c.fillRect(0, 330, W, H - 330); }
    c.fillStyle = lg(c, 0, 0, W * .7, H * .8, ['rgba(255,255,255,.2)', 'rgba(255,255,255,0)']); c.fillRect(0, 0, W, H);   // üst sol parlama
    var r = rng(tpl + 99); c.fillStyle = '#000'; for (var i = 0; i < 2600; i++) { c.globalAlpha = r() * .05; c.fillRect(r() * W, r() * H, 1.4, 1.4); }
    c.globalAlpha = 1;
    return (cache[key] = cv);
  }

  /* ---- Ön yüz ---- */
  function front(c, t, d) {
    var ink = t.ink, ink2 = t.ink2;
    txt(c, 'FOREVYE', 70, 104, '400 58px ' + DISP, ink, 'left', 3);
    txt(c, 'Kristal hediye kartı', 72, 142, '300 27px ' + SANS, ink2, 'left', .4);
    var amt = d.n ? String(d.n) : '—', gs = 66;
    c.save(); c.shadowColor = 'rgba(0,0,0,.28)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
    var f = fitText(c, amt, 300, 112, 400, DISP, 56);
    txt(c, amt, W - 70, 120, f, ink, 'right', 1);
    var aw = c.measureText(amt).width + amt.length; c.restore(); gem(c, W - 70 - aw - gs - 14, 52, gs);
    txt(c, 'kristal', W - 70, 162, '300 28px ' + SANS, ink2, 'right', .5);

    chip(c, 70, 232, t.chip); wireless(c, 250, 280, ink2);

    // numara: sabit aralıklı hanelere kabartma etkisi
    var adv = 74, gap = 52, x0 = 70, y = 440, no = String(d.no || '');
    for (var i = 0; i < 8; i++) {
      var x = x0 + i * adv + (i >= 4 ? gap : 0), ch = no.charAt(i);
      if (ch) {
        c.save(); c.textAlign = 'center';
        txt(c, ch, x + adv / 2 - 6, y + 3, '400 124px ' + SANS, t.light ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.4)', 'center');
        txt(c, ch, x + adv / 2 - 6, y, '400 124px ' + SANS, ink, 'center'); c.restore();
      } else dotRow(c, x, y + 36, 1, ink, adv);
    }

    txt(c, 'Son kullanma', 70, 530, '300 22px ' + SANS, ink2, 'left', .4);
    var ex = d.ex || ''; if (ex.length < 5) ex = ex + '••/••'.slice(ex.length);
    txt(c, ex, 70, 586, '400 54px ' + SANS, ink, 'left', 3);
    txt(c, 'Gönderen', 330, 530, '300 22px ' + SANS, ink2, 'left', .4);
    c.font = fitText(c, d.frm || 'Forevye Mağaza', 400, 48, 400, SANS, 26); c.fillStyle = ink; c.textAlign = 'left'; c.fillText(d.frm || 'Forevye Mağaza', 330, 586);
    txt(c, 'tek kullanımlık', W - 70, 586, '300 26px ' + SANS, ink2, 'right', .5);
  }

  /* ---- Arka yüz ---- */
  function back(c, t, d) {
    var ink = t.ink, ink2 = t.ink2;
    c.fillStyle = '#0b0b0f'; c.fillRect(0, 62, W, 112);
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, 62, W, 14);
    // mesaj şeridi
    c.fillStyle = '#f7f3e8'; c.fillRect(70, 218, 600, 104);
    c.save(); c.beginPath(); c.rect(70, 218, 600, 104); c.clip(); c.strokeStyle = 'rgba(120,100,60,.14)'; c.lineWidth = 2;
    for (var i = -10; i < 40; i++) { c.beginPath(); c.moveTo(70 + i * 22, 322); c.lineTo(70 + i * 22 + 104, 218); c.stroke(); } c.restore();
    var m = d.msg || '';
    c.fillStyle = '#26210f'; c.textAlign = 'left'; c.font = 'italic 300 34px ' + SANS;
    wrap(c, m, 560, 2).forEach(function (l, k) { c.fillText(l, 88, 262 + k * 44); });
    // CVV
    txt(c, 'CVV', 706, 206, '300 24px ' + SANS, ink2, 'left', 1);
    c.fillStyle = '#ffffff'; rr(c, 700, 218, 242, 104, 10); c.fill();
    if (d.cvv) txt(c, d.cvv.slice(0, 3), 900, 294, 'italic 400 76px ' + SANS, '#16120a', 'right', 6);
    else { c.fillStyle = '#16120a'; c.globalAlpha = .55; for (var j = 0; j < 3; j++) { c.beginPath(); c.arc(786 + j * 52, 270, 11, 0, 7); c.fill(); } c.globalAlpha = 1; }
    // alt yazı
    txt(c, d.n ? d.n + ' kristal' : 'Kristal', 70, 420, '400 64px ' + DISP, ink, 'left', 2);
    var from = d.frm ? 'Gönderen: ' + d.frm : '';
    if (from) txt(c, from, 70, 462, '300 28px ' + SANS, ink2, 'left', .4);
    c.font = '300 25px ' + SANS; c.fillStyle = ink2; c.textAlign = 'left';
    wrap(c, 'Forevye Mağaza › Hediye kartı bölümünde kart numarası, son kullanma tarihi ve CVV ile kullanılır. Tek kullanımlıktır; süresi dolarsa tutar gönderene geri döner.', 700, 3).forEach(function (l, k) { c.fillText(l, 70, 520 + k * 38); });
    gem(c, W - 70 - 110, H - 56 - 110, 110, .9);
  }

  /* ---- Dış arayüz ---- */
  /* render(canvas, 'front'|'back', tpl, { n, no, ex, cvv, frm, msg }): canvas boyutu ne olursa olsun 1012x638 koordinatlarında çizer */
  function render(canvas, side, tpl, d) {
    d = d || {}; tpl = T[tpl] ? tpl : 0;
    var c = canvas.getContext('2d'), s = canvas.width / W, t = T[tpl];
    c.setTransform(s, 0, 0, s, 0, 0); c.clearRect(0, 0, W, H); c.save(); rr(c, 0, 0, W, H, RAD); c.clip();
    c.imageSmoothingQuality = 'high'; c.drawImage(bgOf(tpl, side), 0, 0, W, H);
    (side === 'back' ? back : front)(c, t, d);
    c.restore();
    c.save(); rr(c, 1.5, 1.5, W - 3, H - 3, RAD - 1); c.strokeStyle = t.light ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.28)'; c.lineWidth = 3; c.stroke(); c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  function isHolo(tpl) { return !!(T[tpl] && T[tpl].holo); }
  function fontsReady(cb) {   // yazı tipleri yüklenince çizimi tazele (Türkçe harfler için latin-ext parçası da istenir)
    if (!document.fonts || !document.fonts.load) return;
    var s = 'İıŞşĞğÖöÜüÇç';
    Promise.all(['400 40px "Bebas Neue"', '400 40px Oswald', '300 40px Oswald'].map(function (f) { return document.fonts.load(f, s); })).then(function () { Object.keys(cache).forEach(function (k) { delete cache[k]; }); cb(); }, function () {});
  }
  root.KartArt = { W: W, H: H, count: T.length, render: render, isHolo: isHolo, fontsReady: fontsReady, gemPath: 'M14 6h20l10 12-20 26L4 18z' };
})(window);
