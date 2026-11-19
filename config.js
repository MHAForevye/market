/* Forevye Mağaza ayarları. Sadece burayı düzenle. */
window.MK_CONFIG = Object.freeze({
  API_BASE: 'https://mikroklimakontrolmerkezi.forevye.workers.dev',   // kristal sunucusu (Worker + D1). Değişirse index.html'deki CSP satırını da güncelle (test uyarır).
  WEATHER_URL: 'https://mikroklimakontrolmerkezi.forevye.workers.dev/', // "Hava durumuna dön" bağlantısı
  MANTAR_URL: 'https://frovyes.github.io/mantarpano/'                  // Mantar Pano adresi
});
