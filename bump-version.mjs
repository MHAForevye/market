/* index.html ve kart/index.html içindeki ?v=... sürüm numaralarını dosya içeriğinden üretir (GitHub Pages önbelleği eski dosyayı göstermesin).
   node bump-version.mjs          → günceller
   node bump-version.mjs --check  → güncel değilse 1 ile çıkar */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
const PAGES = {
  'index.html': ['config.js', 'js/core.js', 'js/hesap.js', 'js/vitrin.js', 'js/seri.js', 'js/kristal.js', 'js/links.js', 'css/fonts.css', 'css/market.css', 'css/vitrin.css'],
  'kart/index.html': ['../config.js', '../js/hesap.js', '../css/fonts.css', 'css/kart.css', 'js/kart-core.js', 'js/kart-art.js', 'js/kart.js']
};
const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 8);
const esc = p => p.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
let stale = false;
for (const [page, tracked] of Object.entries(PAGES)) {
  let h = readFileSync(page, 'utf8'); const old = h;
  for (const p of tracked) h = h.replace(new RegExp('((?:href|src)=")' + esc(p) + '(?:\\?v=[^"]*)?"', 'g'), `$1${p}?v=${hash(readFileSync(join(dirname(page), p)))}"`);
  if (h === old) continue;
  if (process.argv.includes('--check')) { console.log('GÜNCEL DEĞİL: ' + page); stale = true; } else { writeFileSync(page, h); console.log('güncellendi: ' + page); }
}
if (stale) process.exit(1);
console.log('sürümler güncel');
