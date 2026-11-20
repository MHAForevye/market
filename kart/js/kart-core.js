/* Hediye kartı: saf yardımcılar (DOM'a, ağa dokunmaz; Node'da test edilir).
   Kart = 8 haneli numara (son hane Luhn) + 3 haneli CVV + SKT (AA/YY). Sunucu aynı kuralları kendisi de uygular (worker/index.js). */
(function (root) {
  'use strict';
  /* Şablon adları. Tasarımları kart-art.js çizer; sunucu sadece sırayı (0-14) saklar, o yüzden sırayı değiştirme. */
  var TEMPLATES = ['Gece Moru', 'Altın Çağ', 'Kamp Ateşi', 'Mavi Alev', 'Zümrüt', 'Buz Alevi', 'Gül Alevi', 'Gökkuşağı', 'Obsidyen', 'Okyanus', 'Gün Batımı', 'Aurora', 'Fırtına', 'Galaksi', 'Kum ve Bakır'];
  var PRESETS = [50, 100, 250, 500, 1000];

  function digits(v, max) { var d = String(v == null ? '' : v).replace(/\D/g, ''); return max ? d.slice(0, max) : d; }
  function luhnOk(s) {
    s = String(s); var sum = 0;
    for (var i = 0; i < s.length; i++) { var d = +s.charAt(s.length - 1 - i); if (i % 2) { d *= 2; if (d > 9) d -= 9; } sum += d; }
    return sum % 10 === 0;
  }
  function noOk(v) { var d = digits(v); return /^\d{8}$/.test(d) && luhnOk(d); }
  function fmtNo(v) { var d = digits(v, 8); return d.length > 4 ? d.slice(0, 4) + ' ' + d.slice(4) : d; }
  /* SKT yazarken: "1" → "1", "3" → "03" (ay 13+ olamaz), "112" → "11/2", "1127" → "11/27" */
  function fmtEx(v, typing) {
    var d = digits(v, 4);
    if (d.length === 1 && +d > 1 && typing) d = '0' + d;
    return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  }
  /* "1127", "11/27", "11 / 27", "11-27" → "11/27"; geçersizse "" */
  function normEx(v) { var d = digits(v); return d.length === 4 && +d.slice(0, 2) >= 1 && +d.slice(0, 2) <= 12 ? d.slice(0, 2) + '/' + d.slice(2) : ''; }
  /* SKT ayı geçmişte mi (ayın sonuna kadar geçerli). Sadece kullanıcıya erken uyarı; asıl denetim sunucuda. */
  function exPast(ex, now) {
    var e = normEx(ex); if (!e) return false;
    var d = now ? new Date(now) : new Date(), y = 2000 + +e.slice(3), m = +e.slice(0, 2);
    return y < d.getFullYear() || (y === d.getFullYear() && m < d.getMonth() + 1);
  }
  function cvvOk(v) { return /^\d{3}$/.test(digits(v)); }
  function amountOf(v, min, max) {
    var n = Math.floor(Number(String(v == null ? '' : v).replace(/[\s.]/g, '').replace(',', '.')));
    return isFinite(n) && n >= (min || 1) && n <= (max || 100000) ? n : 0;
  }
  /* Kullanma bağlantısı: <sayfa>#kullan=NO.CVV.SKT ("#" sonrası sunucuya gitmez) */
  function link(base, c) { return String(base).replace(/#.*$/, '') + '#kullan=' + digits(c.no, 8) + '.' + digits(c.cvv, 3) + '.' + digits(c.ex, 4); }
  function parseLink(hash) {
    var m = /(?:^#|&)kullan=(\d{8})\.(\d{3})\.(\d{4})(?:&|$)/.exec(String(hash || ''));
    return m && noOk(m[1]) && normEx(m[3]) ? { no: m[1], cvv: m[2], ex: normEx(m[3]) } : null;
  }
  /* Arkadaşa gönderilecek metin */
  function shareText(c, url) {
    return 'Forevye kristal hediye kartı: ' + c.n + ' kristal' + (c.frm ? ' (' + c.frm + ' gönderdi)' : '') + '\n' +
      'Kart no: ' + fmtNo(c.no) + '\nSKT: ' + c.ex + '   CVV: ' + c.cvv + '\n' + (c.msg ? '"' + c.msg + '"\n' : '') + 'Kullanmak için: ' + url;
  }
  function describe(c, masked) {
    return 'Kristal hediye kartı, ' + (c.n ? c.n + ' kristal, ' : '') + 'tasarım: ' + (TEMPLATES[c.tpl] || TEMPLATES[0]) + (masked ? '. Kart bilgileri henüz oluşturulmadı.' : '. Kart no ' + fmtNo(c.no) + ', son kullanma ' + c.ex + '.');
  }
  var STATUS = { active: 'Aktif', used: 'Kullanıldı', cancelled: 'İptal edildi', expired: 'Süresi doldu' };

  var api = { TEMPLATES: TEMPLATES, PRESETS: PRESETS, STATUS: STATUS, digits: digits, luhnOk: luhnOk, noOk: noOk, fmtNo: fmtNo, fmtEx: fmtEx, normEx: normEx, exPast: exPast, cvvOk: cvvOk, amountOf: amountOf, link: link, parseLink: parseLink, shareText: shareText, describe: describe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.KartCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
