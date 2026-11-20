import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const html = readFileSync('kart/index.html', 'utf8'), js = readFileSync('kart/js/kart.js', 'utf8'), art = readFileSync('kart/js/kart-art.js', 'utf8'), css = readFileSync('kart/css/kart.css', 'utf8');
const market = readFileSync('index.html', 'utf8'), flow = readFileSync('.github/workflows/pages.yml', 'utf8');

test('kart: CSP sıkı (satır içi betik, stil ve olay yöneticisi yok)', () => {
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /script-src 'self'(;|$)/); assert.match(csp, /style-src 'self';/); assert.match(csp, /default-src 'none'/);
  assert.deepEqual(html.match(/\son(?:click|change|input|keydown|keyup|load|error|submit|focus|blur)\s*=/g) || [], []);
  assert.deepEqual(html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) || [], []);
  assert.ok(!/\sstyle=/.test(html), 'satır içi style özniteliği yok'); assert.ok(!/javascript:/i.test(html));
  for (const f of [js]) assert.ok(!/\son(?:click|change|input|keydown)=\\?"/.test(f) && !/innerHTML|insertAdjacentHTML|outerHTML/.test(f), 'kart.js DOM\'a HTML dizesi yazmaz (XSS)');
});
test('kart: connect-src sunucu adresi config.js ile aynı', () => {
  const api = readFileSync('config.js', 'utf8').match(/API_BASE:\s*'(https:\/\/[^'/]+)/)[1];
  assert.ok(html.match(/Content-Security-Policy" content="([^"]+)"/)[1].includes('connect-src \'self\' ' + api + ';'));
  assert.ok(!/workers\.dev/.test(js), 'sunucu adresi kodda gömülü değil'); assert.match(js, /MK_CONFIG\.API_BASE/);
});
test('kart: başvurulan yerel dosyaların hepsi var', () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]).filter(r => !/^(https?:|\/\/|mailto:)/.test(r) && r !== '../');
  assert.ok(refs.length >= 8);
  for (const r of refs) assert.ok(existsSync(join('kart', r.split('?')[0])), 'eksik: ' + r);
  const css0 = readFileSync('css/fonts.css', 'utf8'); assert.ok(css0.includes('bebas-neue') && css0.includes('oswald'));
});
test('kart: kart.js\'in aradığı her öğe index.html\'de var', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  const need = new Set([...js.matchAll(/\$\('([A-Za-z0-9]+)'\)/g)].map(m => m[1]));
  for (const m of js.matchAll(/\$\('(tab|pane)-' \+ \w+\)/g)) need.add(m[1] + '-new'), need.add(m[1] + '-use'), need.add(m[1] + '-mine');
  for (const id of need) assert.ok(ids.has(id), 'index.html\'de yok: ' + id);
  for (const m of html.matchAll(/<label[^>]*for="([^"]+)"/g)) assert.ok(ids.has(m[1]), 'label for: ' + m[1]);
});
test('kart: sekme düzeni erişilebilir (tablist, aria-controls, panel)', () => {
  assert.match(html, /role="tablist"/);
  for (const t of ['new', 'use', 'mine']) { assert.match(html, new RegExp('id="tab-' + t + '" aria-controls="pane-' + t + '"|id="tab-' + t + '"[^>]*aria-controls="pane-' + t + '"')); assert.match(html, new RegExp('id="pane-' + t + '" role="tabpanel" aria-labelledby="tab-' + t + '"')); }
});
test('kart: şablon sayısı çizim, ad listesi ve sunucu ayarında aynı (15)', () => {
  const core = readFileSync('kart/js/kart-core.js', 'utf8'), names = core.match(/TEMPLATES = \[([^\]]+)\]/)[1].split(',').length;
  const bgs = (art.match(/^\s+bg: function \(c\)/gm) || []).length;
  assert.equal(names, 15); assert.equal(bgs, 15);
  const worker = '../mikroklima/worker/index.js'; if (existsSync(worker)) assert.match(readFileSync(worker, 'utf8'), /templates: 15/);
});
test('kart: hareket azaltma ve odak göstergesi var', () => { assert.match(css, /prefers-reduced-motion: reduce/); assert.match(css, /:focus-visible/); assert.match(js, /prefers-reduced-motion: reduce/); });
test('kart: 3B kartın ebeveyninde filter yok (backface-visibility bozulur)', () => {
  for (const sel of ['.card-wrap', '.tilt', '.flipper']) { const m = css.match(new RegExp('^' + sel.replace('.', '\\.') + ' \\{[^}]*\\}', 'm')); assert.ok(m && !/filter\s*:/.test(m[0]), sel + ' filter içermemeli'); }
});
test('kart: sürüm numaraları güncel (kart/index.html)', async () => {
  const { execFileSync } = await import('node:child_process'); execFileSync('node', ['bump-version.mjs', '--check'], { stdio: 'pipe' });
});
test('Mağaza: hediye kartı bağlantısı ve yayın akışı kart klasörünü içeriyor', () => {
  assert.match(market, /id="kartLink" href="kart\/"/); assert.match(flow, /\bkart\b[^\n]*_site\//);
  assert.ok(!existsSync('kart/_dev'), 'geliştirme klasörü yayına girmemeli');
});
