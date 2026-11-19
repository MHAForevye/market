/* index.html içindeki ?v=... sürüm numaralarını dosya içeriğinden üretir (GitHub Pages önbelleği eski dosyayı göstermesin).
   node bump-version.mjs          → günceller
   node bump-version.mjs --check  → güncel değilse 1 ile çıkar */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const TRACKED = ['config.js', 'js/core.js', 'js/hesap.js', 'js/vitrin.js', 'js/seri.js', 'js/kristal.js', 'js/links.js', 'css/fonts.css', 'css/market.css', 'css/vitrin.css'];
const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 8);
const esc = p => p.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
let h = readFileSync('index.html', 'utf8');
const old = h;
for (const p of TRACKED) h = h.replace(new RegExp('((?:href|src)=")' + esc(p) + '(?:\\?v=[^"]*)?"', 'g'), `$1${p}?v=${hash(readFileSync(p))}"`);
if (h === old) console.log('sürümler zaten güncel');
else if (process.argv.includes('--check')) { console.log('GÜNCEL DEĞİL: index.html'); process.exit(1); }
else { writeFileSync('index.html', h); console.log('güncellendi: index.html'); }
