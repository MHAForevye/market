/* Hediye kartı sayfası: kart oluşturma, kart kullanma, kartlarım.
   Bakiye ve kartların tamamı sunucuda tutulur (worker/index.js → /api/card/*). Bu dosya sadece ister ve gösterir;
   tarayıcıdaki sayıyı değiştirmek hiçbir şeyi değiştirmez. Hesap, Mağaza ile aynı: localStorage "mk_kristal2" (aynı alan adında otomatik). */
(function () {
  'use strict';
  var K = window.KartCore, A = window.KartArt, KEY = 'mk_kristal2', SEEN = 'mk_kristal2_seen';
  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var creds = null, S = { id: '--------', bal: 0 }, lastCfg = null, CC = { min: 10, max: 100000, templates: 15, validMonths: 12, maxActive: 20 };
  var offline = false, busy = false, reinit = false;
  var mode = 'new', sel = 0, created = null, redeemed = null, viewCard = null, cards = [], flipped = false, autoFlip = false, confirmT = 0;

  /* ===== Sunucu ===== */
  function api(path, body) {
    if (window.KART_API) return window.KART_API(path, body || {}, creds);   // demo / test için yerine konabilir
    var h = { 'Content-Type': 'application/json' };
    if (creds) h.Authorization = 'Bearer ' + creds.id + '.' + creds.token;
    var base = String((window.MK_CONFIG && MK_CONFIG.API_BASE) || '').replace(/\/+$/, '');
    return fetch(base + '/api' + path, { method: 'POST', headers: h, body: JSON.stringify(body || {}), cache: 'no-store' }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.err || 'Sunucu hatası'); e.status = r.status; e.data = d; throw e; }
        return d;
      });
    }, function () { var e = new Error('Sunucuya ulaşılamıyor. İnterneti kontrol et.'); e.net = true; throw e; });
  }
  function loadLocal() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY));
      if (o && /^\d{8}$/.test(String(o.id)) && /^[A-Za-z0-9_-]{20,64}$/.test(String(o.token))) {
        creds = { id: String(o.id), token: String(o.token) };
        if (o.cache && o.cache.s) { S = o.cache.s; lastCfg = o.cache.cfg || null; if (lastCfg && lastCfg.cards) CC = lastCfg.cards; }
      }
    } catch (e) {}
  }
  function saveLocal() { if (creds) try { localStorage.setItem(KEY, JSON.stringify({ id: creds.id, token: creds.token, cache: { s: S, cfg: lastCfg } })); } catch (e) {} }
  function apply(d) {
    if (d.id && d.token) creds = { id: d.id, token: d.token };
    if (d.s) S = d.s;
    if (d.cfg) { lastCfg = d.cfg; if (d.cfg.cards) CC = d.cfg.cards; }
    offline = false; saveLocal(); renderTop();
  }
  function sync() {
    if (busy) return Promise.resolve();
    busy = true;
    return api(creds ? '/sync' : '/init').then(apply, function (e) {
      if (e.status === 401 && creds && !reinit) {      // kimlik sunucuda yok: eskisini yedekle, yeni hesap aç
        reinit = true; try { localStorage.setItem(KEY + '_old', localStorage.getItem(KEY) || ''); } catch (x) {}
        creds = null; S = { id: '--------', bal: 0 }; busy = false; return sync();
      }
      if (e.net || !e.status) offline = true;
      renderTop();
    }).then(function () { busy = false; }, function () { busy = false; });
  }

  /* ===== Küçük yardımcılar ===== */
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 3800);
  }
  function copy(txt, ok) {
    var done = function () { toast(ok); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { window.prompt('Elle kopyala:', txt); });
    else window.prompt('Elle kopyala:', txt);
  }
  var nf = function (n) { try { return Number(n).toLocaleString('tr-TR'); } catch (e) { return String(n); } };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function pageUrl() { return location.origin + location.pathname; }
  function cardUrl(c) { return K.link(pageUrl(), c); }

  /* ===== Üst bilgi ===== */
  function setBal(n) {
    var b = $('kBal'), from = +b.dataset.v || 0; b.dataset.v = n;
    if (reduced || from === n) { b.textContent = nf(n); return; }
    var t0 = performance.now();
    (function tick(t) { var p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3); b.textContent = nf(Math.round(from + (n - from) * e)); if (p < 1) requestAnimationFrame(tick); })(t0);
  }
  function renderTop() {
    setBal(S.bal || 0); $('kId').textContent = S.id; $('kOff').hidden = !offline;
    $('kMineN').hidden = true; var act = cards.filter(function (c) { return c.status === 'active'; }).length;
    if (act) { $('kMineN').textContent = act; $('kMineN').hidden = false; }
    amountUi();
  }

  /* ===== Kart sahnesi ===== */
  var raf = 0;
  function paint() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; drawStage(); }); }
  function stageData() {
    var f = $('kFrm').value.trim(), m = $('kMsg').value.trim();
    if (mode === 'new') return created ? { tpl: created.tpl, d: created } : { tpl: sel, d: { n: amountVal(), frm: f, msg: m } };
    if (mode === 'use') return redeemed ? { tpl: redeemed.tpl, d: redeemed } : { tpl: 0, d: { no: K.digits($('kNo').value, 8), ex: K.fmtEx($('kEx').value), cvv: K.digits($('kCvv').value, 3) } };
    return viewCard ? { tpl: viewCard.tpl, d: viewCard } : { tpl: sel, d: { n: 0 } };
  }
  function drawStage() {
    var s = stageData(), masked = mode === 'new' && !created;
    A.render($('kFront'), 'front', s.tpl, s.d); A.render($('kBack'), 'back', s.tpl, s.d);
    $('kFlip').classList.toggle('holo', A.isHolo(s.tpl));
    $('kTplName').textContent = K.TEMPLATES[s.tpl] || '';
    $('kDesc').textContent = K.describe({ n: s.d.n, tpl: s.tpl, no: s.d.no || '', ex: s.d.ex || '' }, masked || !s.d.no || s.d.no.length < 8);
  }
  function setFlip(v) {
    flipped = v; $('kFlip').classList.toggle('flipped', v); $('kTurn').setAttribute('aria-pressed', v ? 'true' : 'false'); $('kTurn').textContent = v ? 'Ön yüze dön' : 'Kartı çevir';
  }
  function note(msg, ok) { var n = $('kStageNote'); n.textContent = msg || ''; n.classList.toggle('ok', !!ok); }

  function initTilt() {
    var st = document.querySelector('.stage'), tilt = $('kTilt'), fl = $('kFlip');
    if (reduced) return;
    st.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = fl.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      if (x < -.15 || x > 1.15 || y < -.15 || y > 1.15) return;
      tilt.classList.remove('rest');
      tilt.style.setProperty('--ry', ((x - .5) * 16).toFixed(2) + 'deg'); tilt.style.setProperty('--rx', ((.5 - y) * 12).toFixed(2) + 'deg');
      fl.style.setProperty('--mx', (flipped ? 100 - x * 100 : x * 100).toFixed(1) + '%'); fl.style.setProperty('--my', (y * 100).toFixed(1) + '%'); fl.style.setProperty('--shine', '.75');
    });
    st.addEventListener('pointerleave', function () { tilt.classList.add('rest'); tilt.style.setProperty('--rx', '0deg'); tilt.style.setProperty('--ry', '0deg'); fl.style.setProperty('--shine', '0'); });
  }

  /* ===== Sekmeler ===== */
  var MODES = ['new', 'use', 'mine'];
  function setMode(m, focus) {
    mode = m; viewCard = m === 'mine' ? viewCard : null;
    MODES.forEach(function (k) { var on = k === m, t = $('tab-' + k); t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; $('pane-' + k).hidden = !on; if (on && focus) t.focus(); });
    if (autoFlip) { autoFlip = false; }
    setFlip(false); note('');
    if (m === 'mine') loadMine();
    if (m === 'use' && redeemed) note('', false);
    paint();
  }

  /* ===== Kart oluştur ===== */
  function amountVal() { return K.amountOf($('kAmt').value, CC.min, CC.max); }
  function amountUi() {
    var inp = $('kAmt'); if (!inp) return; var n = amountVal(), h = $('kAmtHint'), bal = S.bal || 0;
    var raw = K.digits(inp.value);
    h.classList.remove('bad');
    if (!raw) { h.textContent = CC.min + ' ile ' + nf(CC.max) + ' kristal arasında bir tutar yaz.'; h.classList.add('bad'); }
    else if (!n) { h.textContent = 'Tutar ' + CC.min + ' ile ' + nf(CC.max) + ' arasında olmalı.'; h.classList.add('bad'); }
    else if (n > bal) { h.textContent = 'Yetersiz kristal. Bakiyen ' + nf(bal) + '.'; h.classList.add('bad'); }
    else h.textContent = 'Kart oluşunca bakiyen ' + nf(bal) + ' → ' + nf(bal - n) + ' olur.';
    var box = $('kChips'); box.textContent = '';
    K.PRESETS.concat(bal >= CC.min && K.PRESETS.indexOf(bal) < 0 && bal <= CC.max ? [bal] : []).forEach(function (v) {
      var b = el('button', 'chip', v === bal && K.PRESETS.indexOf(v) < 0 ? 'Tümü · ' + nf(v) : nf(v)); b.type = 'button'; b.disabled = v > bal || v > CC.max;
      b.setAttribute('aria-pressed', v === n ? 'true' : 'false'); b.addEventListener('click', function () { inp.value = v; onAmount(); }); box.appendChild(b);
    });
  }
  function onAmount() { cancelConfirm(); $('kNewErr').textContent = ''; amountUi(); paint(); }
  function stepAmt(dir) {
    var n = amountVal() || (dir > 0 ? CC.min - 10 : CC.min + 10), st = n < 100 ? 10 : n < 500 ? 50 : 100;
    $('kAmt').value = Math.max(CC.min, Math.min(CC.max, n + dir * st)); onAmount();
  }
  function buildPicker() {
    var box = $('kPicker'); box.textContent = '';
    for (var i = 0; i < Math.min(CC.templates, A.count); i++) (function (i) {
      var b = el('button', 'pick'), cv = document.createElement('canvas'); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', i === sel ? 'true' : 'false'); b.tabIndex = i === sel ? 0 : -1; b.dataset.i = i;
      cv.width = 276; cv.height = 174; cv.setAttribute('aria-hidden', 'true'); b.appendChild(cv); b.appendChild(el('span', '', K.TEMPLATES[i]));
      b.addEventListener('click', function () { pick(i); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
        e.preventDefault(); var n = (sel + d + A.count) % A.count; pick(n); box.children[n].focus();
      });
      box.appendChild(b);
    })(i);
    thumbs();
  }
  function thumbs() { var cs = $('kPicker').querySelectorAll('canvas'); for (var i = 0; i < cs.length; i++) A.render(cs[i], 'front', i, { n: 500 }); }
  function pick(i) {
    sel = i; Array.prototype.forEach.call($('kPicker').children, function (b, k) { b.setAttribute('aria-checked', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
    cancelConfirm(); paint();
  }
  function cancelConfirm() { clearTimeout(confirmT); var b = $('kCreate'); b.classList.remove('confirm'); $('kCreateTx').textContent = 'Kartı oluştur'; $('kCreateNo').hidden = true; }
  function createClick() {
    var err = $('kNewErr'), n = amountVal(); err.textContent = '';
    if (!n) { err.textContent = 'Tutar ' + CC.min + ' ile ' + nf(CC.max) + ' arasında olmalı.'; $('kAmt').focus(); return; }
    if (n > S.bal) { err.textContent = 'Yetersiz kristal! Günlük giriş yaparak kristal biriktirmeye devam et.'; return; }
    var b = $('kCreate');
    if (!b.classList.contains('confirm')) {
      b.classList.add('confirm'); $('kCreateTx').textContent = 'Onayla: ' + nf(n) + ' kristal çekilsin'; $('kCreateNo').hidden = false;
      clearTimeout(confirmT); confirmT = setTimeout(cancelConfirm, 8000); return;
    }
    cancelConfirm(); b.disabled = true;
    api('/card/create', { n: n, tpl: sel, frm: $('kFrm').value.trim(), msg: $('kMsg').value.trim() }).then(function (d) {
      apply(d); b.disabled = false; created = d.card; cards.unshift(d.card); renderTop();
      showDone(d.card); setFlip(true); setTimeout(function () { setFlip(false); }, reduced ? 0 : 1300);
      note(nf(d.card.n) + ' kristal hesabından düştü, kart hazır.', true); paint();
    }, function (e) {
      b.disabled = false; if (e.data && e.data.s) apply(e.data); err.textContent = e.message;
    });
  }
  function showDone(c) {
    $('newForm').hidden = true; $('newDone').hidden = false;
    var f = $('kFacts'); f.textContent = '';
    [['Kart numarası', K.fmtNo(c.no)], ['Son kullanma', c.ex], ['CVV', c.cvv]].forEach(function (p) { var d = el('div'); d.appendChild(el('dt', '', p[0])); d.appendChild(el('dd', '', p[1])); f.appendChild(d); });
  }
  function again() { created = null; $('newDone').hidden = true; $('newForm').hidden = false; note(''); setFlip(false); amountUi(); paint(); }

  /* ===== Resim ===== */
  function composeBlob(c) {
    return new Promise(function (ok) {
      var out = document.createElement('canvas'), W = A.W, H = A.H, g = out.getContext('2d'), a = document.createElement('canvas'), b = document.createElement('canvas');
      out.width = W + 80; out.height = H * 2 + 120; a.width = b.width = W; a.height = b.height = H;
      A.render(a, 'front', c.tpl, c); A.render(b, 'back', c.tpl, c);
      g.fillStyle = '#170e3d'; g.fillRect(0, 0, out.width, out.height); g.drawImage(a, 40, 40); g.drawImage(b, 40, H + 80);
      out.toBlob(ok, 'image/png');
    });
  }
  function saveImg(c) {
    composeBlob(c).then(function (blob) {
      if (!blob) return toast('Resim hazırlanamadı.');
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forevye-hediye-karti-' + c.no + '.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    });
  }
  function shareImg(c) {
    composeBlob(c).then(function (blob) {
      if (!blob) return toast('Resim hazırlanamadı.');
      var f = new File([blob], 'forevye-hediye-karti.png', { type: 'image/png' });
      if (navigator.canShare && navigator.share && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: 'Forevye hediye kartı' }).catch(function () {});
      else saveImg(c);
    });
  }
  var infoOf = function (c) { return K.shareText(c, cardUrl(c)); };

  /* ===== Kartı kullan ===== */
  function useState() {
    var no = K.digits($('kNo').value), ex = K.normEx($('kEx').value), cvv = K.digits($('kCvv').value), msg = '', bad = '';
    var noBad = no.length === 8 && !K.noOk(no), exBad = $('kEx').value.length === 5 && (!ex || K.exPast(ex));
    if (noBad) msg = 'Numara tutmuyor, bir hane yanlış yazılmış olabilir.';
    else if (exBad) msg = ex ? 'Bu kartın son kullanma tarihi geçmiş.' : 'Son kullanma tarihi AA/YY biçiminde olmalı.';
    $('kNo').classList.toggle('bad', noBad); $('kEx').classList.toggle('bad', exBad);
    $('kUseErr').textContent = msg;
    $('kUse').disabled = !(K.noOk(no) && ex && !K.exPast(ex) && K.cvvOk(cvv));
    return { no: no, ex: ex, cvv: cvv };
  }
  function onUseInput() { if (redeemed) { redeemed = null; note(''); } useState(); paint(); }
  function useClick() {
    var v = useState(); if ($('kUse').disabled) return;
    var b = $('kUse'); b.disabled = true; $('kUseErr').textContent = '';
    api('/card/redeem', { no: v.no, cvv: v.cvv, ex: v.ex }).then(function (d) {
      apply(d); redeemed = { no: v.no, ex: d.card.ex, cvv: v.cvv, n: d.card.n, tpl: d.card.tpl, msg: d.card.msg, frm: d.card.frm };
      ['kNo', 'kEx', 'kCvv'].forEach(function (id) { $(id).value = ''; }); setFlip(false);
      note('+' + nf(d.added) + ' kristal hesabına eklendi.' + (d.card.frm ? ' ' + d.card.frm + ' gönderdi.' : ''), true);
      toast('+' + nf(d.added) + ' kristal eklendi. Bakiyen: ' + nf(S.bal)); useState(); paint();
    }, function (e) { if (e.data && e.data.s) apply(e.data); $('kUseErr').textContent = e.message; b.disabled = false; });
  }

  /* ===== Kartlarım ===== */
  function loadMine() { api('/card/list').then(function (d) { apply(d); cards = d.cards || []; renderMine(); }, function (e) { if (e.net) { offline = true; renderTop(); } renderMine(); }); }
  var cancelArm = '';
  function renderMine() {
    var ul = $('kMine'); ul.textContent = ''; $('kMineEmpty').hidden = cards.length > 0;
    if (mode === 'mine' && !viewCard && cards.length) { viewCard = cards[0]; note(cards[0].status === 'active' ? 'Bu kart henüz kullanılmadı.' : (K.STATUS[cards[0].status] || '') + '.'); paint(); }
    cards.forEach(function (c) {
      var li = el('li'), cv = document.createElement('canvas'), box = el('div'), head = el('b', '', nf(c.n) + ' kristal'), row = el('div', 'row');
      cv.width = 224; cv.height = 141; cv.setAttribute('aria-hidden', 'true'); A.render(cv, 'front', c.tpl, c);
      head.appendChild(el('span', 'badge ' + c.status, K.STATUS[c.status] || c.status)); box.appendChild(head);
      box.appendChild(el('p', 'meta', K.TEMPLATES[c.tpl] + ' · SKT ' + c.ex + ' · ' + c.t.slice(0, 10).split('-').reverse().join('.')));
      var show = el('button', 'mini', 'Göster'); show.type = 'button'; show.addEventListener('click', function () { viewCard = c; setFlip(false); note(c.status === 'active' ? 'Bu kart henüz kullanılmadı.' : (K.STATUS[c.status] || '') + '.'); paint(); if (!reduced) document.querySelector('.stage').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
      row.appendChild(show);
      if (c.status === 'active') {
        var cp = el('button', 'mini', 'Bilgileri kopyala'); cp.type = 'button'; cp.addEventListener('click', function () { copy(infoOf(c), 'Kart bilgileri kopyalandı.'); }); row.appendChild(cp);
        var cn = el('button', 'mini', 'İptal et'); cn.type = 'button';
        cn.addEventListener('click', function () {
          if (cancelArm !== c.no) { cancelArm = c.no; cn.textContent = 'Onayla: +' + nf(c.n) + ' geri'; setTimeout(function () { if (cancelArm === c.no) { cancelArm = ''; cn.textContent = 'İptal et'; } }, 6000); return; }
          cancelArm = ''; cn.disabled = true;
          api('/card/cancel', { no: c.no }).then(function (d) { apply(d); cards = d.cards || cards; if (viewCard && viewCard.no === c.no) viewCard = null; renderMine(); renderTop(); toast(nf(d.refunded) + ' kristal hesabına geri döndü.'); paint(); }, function (e) { cn.disabled = false; toast(e.message); });
        });
        row.appendChild(cn);
      }
      box.appendChild(row); li.appendChild(cv); li.appendChild(box); ul.appendChild(li);
    });
    renderTop();
  }

  /* ===== Hesap taşıma ve yedek (Mağaza ile aynı yöntem) ===== */
  function seen() { try { var a = JSON.parse(localStorage.getItem(SEEN)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function markSeen(id) { var a = seen(); if (a.indexOf(id) < 0) { a.push(id); try { localStorage.setItem(SEEN, JSON.stringify(a.slice(-20))); } catch (e) {} } }
  function adopt(c) {
    var cur = creds, curRaw = ''; try { curRaw = localStorage.getItem(KEY) || ''; } catch (e) {}
    creds = c;
    return api('/sync').then(function (d) {
      if (cur && cur.id !== c.id && curRaw) { try { localStorage.setItem(KEY + '_old', curRaw); } catch (e) {} }
      markSeen(c.id); apply(d); cards = []; created = null; redeemed = null; again(); if (mode === 'mine') loadMine(); toast('Hesap yüklendi. Bakiye: ' + nf(S.bal)); return true;
    }, function (e) { creds = cur; toast(e.status === 401 ? 'Bu hesap sunucuda bulunamadı.' : e.message); if (!cur) sync(); return false; });
  }
  function handleHash() {
    var h = location.hash; if (!h) return false;
    var use = K.parseLink(h), acc = /(^#|&)hesap=/.test(h) && window.MKHesap ? MKHesap.parseHash(h) : null, hadAcc = /(^#|&)hesap=/.test(h);
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}   // anahtar ve kart bilgileri adres çubuğunda kalmasın
    if (use) { setMode('use'); $('kNo').value = K.fmtNo(use.no); $('kEx').value = use.ex; $('kCvv').value = use.cvv; useState(); paint(); note('Kart bilgileri bağlantıdan dolduruldu. Kullan düğmesine bas.'); }
    if (hadAcc && !acc) { toast('Hesap bağlantısı bozuk, kopyalanırken kesilmiş olabilir.'); return false; }
    if (acc) {
      if (creds && creds.id === acc.id) { markSeen(acc.id); return false; }
      if (seen().indexOf(acc.id) >= 0) return false;
      if (creds && !window.confirm('Bağlantıdaki hesap (ID ' + acc.id + ') yüklensin mi? Şu anki hesabın (ID ' + creds.id + (S.bal ? ', ' + nf(S.bal) + ' kristal' : '') + ') silinmez, bu cihazda yedeğe alınır.')) { markSeen(acc.id); return false; }
      adopt(acc); return true;
    }
    return false;
  }

  /* ===== Bağlantılar ===== */
  function init() {
    loadLocal(); if (creds) markSeen(creds.id);
    buildPicker(); renderTop(); drawStage();
    MODES.forEach(function (m, i) {
      var t = $('tab-' + m); t.addEventListener('click', function () { setMode(m); });
      t.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); setMode(MODES[(i + d + 3) % 3], true); } });
    });
    $('kTurn').addEventListener('click', function () { autoFlip = false; setFlip(!flipped); });
    $('kFlip').addEventListener('click', function () { autoFlip = false; setFlip(!flipped); });
    $('kAmt').addEventListener('input', function () { this.value = K.digits(this.value, 6); onAmount(); });
    $('kMinus').addEventListener('click', function () { stepAmt(-1); }); $('kPlus').addEventListener('click', function () { stepAmt(1); });
    $('kFrm').addEventListener('input', function () { cancelConfirm(); paint(); }); $('kMsg').addEventListener('input', function () { cancelConfirm(); paint(); });
    $('kCreate').addEventListener('click', createClick); $('kCreateNo').addEventListener('click', cancelConfirm);
    $('kCopyAll').addEventListener('click', function () { if (created) copy(infoOf(created), 'Kart bilgileri kopyalandı. Arkadaşına gönderebilirsin.'); });
    $('kCopyLink').addEventListener('click', function () { if (created) copy(cardUrl(created), 'Bağlantı kopyalandı. Bağlantı kart bilgilerini içerir, sadece göndereceğin kişiyle paylaş.'); });
    $('kShareImg').addEventListener('click', function () { if (created) shareImg(created); });
    $('kSaveImg').addEventListener('click', function () { if (created) saveImg(created); });
    $('kAgain').addEventListener('click', again);
    $('kNo').addEventListener('input', function () { this.value = K.fmtNo(this.value); onUseInput(); });
    $('kEx').addEventListener('input', function (e) { this.value = K.fmtEx(this.value, !(e.inputType || '').indexOf('insert')); onUseInput(); });
    $('kCvv').addEventListener('input', function () { this.value = K.digits(this.value, 3); onUseInput(); });
    $('kCvv').addEventListener('focus', function () { if (!flipped) { autoFlip = true; setFlip(true); } });
    $('kCvv').addEventListener('blur', function () { if (autoFlip) { autoFlip = false; setFlip(false); } });
    ['kNo', 'kEx', 'kCvv'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') useClick(); }); });
    $('kUse').addEventListener('click', useClick);
    $('kCopyId').addEventListener('click', function () { copy(S.id, 'ID kopyalandı: ' + S.id); });
    $('kBackCopy').addEventListener('click', function () { if (!creds) return toast('Henüz hesap yok.'); copy(MKHesap.makeBackup(creds), 'Hesap yedeği kopyalandı. Bu metni kimseyle paylaşma: hesabı açar.'); });
    $('kBackLoad').addEventListener('click', function () {
      var c = MKHesap.parseBackup($('kBackIn').value);
      if (!c) return toast('Yedek metni tanınmadı. Mağaza ya da hava uygulamasındaki yedeği olduğu gibi yapıştır.');
      if (creds && creds.id === c.id) return toast('Bu hesap zaten yüklü.');
      if (!window.confirm('ID ' + c.id + ' hesabı yüklensin mi? Şu anki hesabın silinmez, bu cihazda yedeğe alınır.')) return;
      adopt(c).then(function (ok) { if (ok) $('kBackIn').value = ''; });
    });
    window.addEventListener('hashchange', handleHash);
    initTilt(); amountUi(); useState();
    if (!handleHash()) sync();
    A.fontsReady(function () { thumbs(); if (mode === 'mine') renderMine(); paint(); });
    var lastSync = Date.now();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState !== 'visible' || Date.now() - lastSync < 60000) return; lastSync = Date.now(); sync(); });
  }
  /* Demo ve testler için: hesap değişince ekranı sunucudan yeniden yükler */
  window.KartApp = { refresh: function () { cards = []; created = null; redeemed = null; viewCard = null; again(); busy = false; return sync().then(function () { if (mode === 'mine') loadMine(); }); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
