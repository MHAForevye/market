/* Seri ve alev kademeleri (hava uygulamasındaki core.js'in seri bölümü; sunucudaki streakNext ile aynı kurallar). */
/* ===== Giriş serisi (Duolingo tarzı, tamamen yerel; sunucuya hiçbir şey gitmez) =====
   Gün = cihazın yerel takvim günü ("YYYY-MM-DD"). Ardışık günde seri +1. Tek gün kaçırılırsa ve kalkan varsa seri korunur,
   yoksa 1'den başlar (en uzun seri saklanır). Her 7. günde 1 kalkan kazanılır (en fazla 1). */
const SERI_RE = /^\d{4}-\d{2}-\d{2}$/;
const SERI_EV = ['start', 'up', 'saved', 'reset'];
const seriDayNum = s => { const p = s.split('-').map(Number); return Date.UTC(p[0], p[1] - 1, p[2]) / 864e5; };
const seriDayDiff = (a, b) => Math.round(seriDayNum(b) - seriDayNum(a));
const seriAddDays = (s, k) => new Date((seriDayNum(s) + k) * 864e5).toISOString().slice(0, 10);
function seriClean(o) {
  if (!o || typeof o !== 'object' || !SERI_RE.test(String(o.last))) return null;
  const n = Math.floor(+o.n);
  if (!(n >= 1 && n <= 99999)) return null;
  const h = Array.isArray(o.h) ? o.h.filter(d => typeof d === 'string' && SERI_RE.test(d)) : [];
  return { n, best: Math.max(n, Math.min(99999, Math.floor(+o.best) || 0)), last: String(o.last), shield: o.shield ? 1 : 0, h: h.slice(-14), ev: SERI_EV.indexOf(o.ev) >= 0 ? o.ev : 'up' };
}
function seriNext(old, today) {
  const o = seriClean(old);
  if (!o) return { st: { n: 1, best: 1, last: today, shield: 0, h: [today], ev: 'start' }, ev: 'start', gotShield: false };
  const diff = seriDayDiff(o.last, today);
  if (diff <= 0) return { st: o, ev: 'same', gotShield: false };   // aynı gün ya da saat geri alınmış: dokunma
  const st = Object.assign({}, o, { h: o.h.slice() });
  let ev;
  if (diff === 1) { st.n++; ev = 'up'; }
  else if (diff === 2 && st.shield) { st.n++; st.shield = 0; st.h.push(seriAddDays(o.last, 1)); ev = 'saved'; }
  else { st.n = 1; ev = o.n > 1 ? 'reset' : 'start'; }
  st.last = today; st.h.push(today); st.h = st.h.slice(-14); st.ev = ev;
  if (st.n > st.best) st.best = st.n;
  const gotShield = ev !== 'reset' && st.n % 7 === 0 && !st.shield;
  if (gotShield) st.shield = 1;
  return { st, ev, gotShield };
}

/* ===== Alev kademeleri: seri 7, 14, 21... gün olunca alevin rengi ve şekli değişir (12 kademe) =====
   Kademe k, [7k, 7k+6] günlük seriye karşılık gelir (0: 1-6 gün, 11: 77 gün ve üstü). */
const SERI_TIERS = [
  { name: 'Kıvılcım', info: 'İlk küçük ateş. Her gün biraz daha büyür.' },
  { name: 'Mum Alevi', info: 'Bir hafta! Sıcak turuncu, sakin ve düzgün yanar.' },
  { name: 'Kamp Ateşi', info: 'İki hafta. Alev ikiye ayrıldı, çıtırdamaya başladı.' },
  { name: 'Meşale', info: 'Üç hafta. Koyu kırmızı, ortasında altın bir çekirdek.' },
  { name: 'Mavi Alev', info: 'Dört hafta. Daha sıcak yanan soğuk renk.' },
  { name: 'Turkuaz Alev', info: 'Beş hafta. Üç dilimli, berrak ve parlak.' },
  { name: 'Zümrüt Alev', info: 'Altı hafta. Yeşil ışık saçan nadir bir ateş.' },
  { name: 'Mor Alev', info: 'Yedi hafta. Gece gökyüzü rengi, etrafında kıvılcımlar.' },
  { name: 'Gül Alevi', info: 'Sekiz hafta. Pembe ve sıcak, halesi var.' },
  { name: 'Altın Alev', info: 'Dokuz hafta. Işıl ışıl, yukarı yıldız savuruyor.' },
  { name: 'Buz Alevi', info: 'On hafta. Beyaz-mavi, neredeyse gökten düşmüş gibi.' },
  { name: 'Gökkuşağı', info: 'On bir hafta ve ötesi. Renkten renge geçen taçlı alev.' }
];
const seriTier = n => Math.max(0, Math.min(11, Math.floor((+n || 0) / 7)));
const seriTierDay = k => k <= 0 ? 1 : 7 * k;                       // kademenin açıldığı gün
const seriNextMilestone = n => (Math.floor((+n || 0) / 7) + 1) * 7;   // bir sonraki 7'nin katı (seri ödülü günü)
if (typeof module !== 'undefined' && module.exports) module.exports = { seriNext, seriDayDiff, seriAddDays, seriClean, seriDayNum, SERI_TIERS, seriTier, seriTierDay, seriNextMilestone };
