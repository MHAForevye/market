/* Dış bağlantılar config.js'ten gelir. Hava uygulamasına giderken hesap da taşınır (#hesap=ID.ANAHTAR; # sonrası sunucuya gitmez),
   böylece iki sitede de aynı kristal hesabı kullanılır: günlük ödül hava uygulamasını açınca da işlenir. */
(function () {
  var c = window.MK_CONFIG || {};
  function weatherUrl() {
    var u = c.WEATHER_URL, k = null;
    try { k = window.MKHesap && MKHesap.parseBackup(localStorage.getItem('mk_kristal2')); } catch (e) {}
    return u + (k ? '#hesap=' + k.id + '.' + k.token : '');
  }
  function setup(id, getUrl) {
    var a = document.getElementById(id);
    if (!a || !getUrl()) return;
    a.href = getUrl();
    a.addEventListener('click', function () { a.href = getUrl(); });   // tıklarken güncel hesapla
    a.addEventListener('focus', function () { a.href = getUrl(); });
  }
  var ok = function (u) { return u && /^https:\/\//.test(u) ? u : ''; };
  setup('weatherBack', function () { return ok(c.WEATHER_URL) ? weatherUrl() : ''; });
  setup('weatherLink', function () { return ok(c.WEATHER_URL) ? weatherUrl() : ''; });
  setup('mantarLink', function () { return ok(c.MANTAR_URL); });
})();
