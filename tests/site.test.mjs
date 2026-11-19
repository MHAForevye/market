import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const html = readFileSync('index.html', 'utf8'), cfg = readFileSync('config.js', 'utf8'), kr = readFileSync('js/kristal.js', 'utf8');

test('CSP: satır içi olay yöneticisi ve satır içi betik yok', () => {
  assert.deepEqual(html.match(/\son(?:click|change|input|keydown|keyup|load|error|submit|focus|blur)\s*=/g) || [], []);
  assert.deepEqual(html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) || [], []);
  assert.ok(!/javascript:/i.test(html));
  assert.ok(!/\son(?:click|change|input|keydown)=\\?"/.test(kr));
});
test('CSP meta: connect-src, config.js içindeki API_BASE ile aynı adres', () => {
  const api = cfg.match(/API_BASE:\s*'(https:\/\/[^'/]+)/)[1];
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.ok(csp.includes('connect-src ' + api + ';'), 'CSP connect-src ' + api + ' olmalı');
  assert.match(csp, /script-src 'self'(;|$)/);
});
test('index.html: başvurulan yerel dosyaların hepsi var', () => {
  const refs = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]).filter(r => !/^(https?:|\/\/|mailto:)/.test(r) && r !== './');
  assert.ok(refs.length >= 10);
  for (const r of refs) assert.ok(existsSync(r.split('?')[0]), 'eksik: ' + r);
});
test('kristal.js ve seri.js\'in aradığı her öğe index.html\'de var', () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  const need = new Set();
  for (const f of ['js/kristal.js', 'js/seri.js', 'js/links.js']) for (const m of readFileSync(f, 'utf8').matchAll(/\$\('([A-Za-z0-9]+)'\)/g)) need.add(m[1]);
  const optional = new Set(['seriSt', 'seriTabN']);   // kodda "varsa" diye korunuyor
  for (const id of need) assert.ok(ids.has(id) || optional.has(id), 'index.html\'de yok: ' + id);
});
test('her <label for> var olan bir alana işaret eder', () => {
  for (const m of html.matchAll(/<label[^>]*for="([^"]+)"/g)) assert.ok(html.includes('id="' + m[1] + '"'), m[1]);
});
test('config.js: adresler https ve tanımlı', () => {
  for (const k of ['API_BASE', 'WEATHER_URL', 'MANTAR_URL']) assert.match(cfg, new RegExp(k + ":\\s*'https://"));
});
test('kristal.js: sunucu adresi koda gömülü değil, config.js\'ten geliyor', () => {
  assert.ok(!/workers\.dev/.test(kr)); assert.match(kr, /MK_CONFIG\.API_BASE/);
});
test('sürüm numaraları güncel (değilse: npm run bump)', () => {
  execFileSync('node', ['bump-version.mjs', '--check'], { stdio: 'pipe' });
});
test('ikonlar bildirilen boyutta ve kare', () => {
  const dim = f => { const b = readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const man = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
  for (const i of man.icons) assert.equal(dim(i.src).join('x'), i.sizes, i.src);
});
