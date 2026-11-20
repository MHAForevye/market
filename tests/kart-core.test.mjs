import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const K = createRequire(import.meta.url)('../kart/js/kart-core.js');

test('Luhn: geçerli numaralar kabul, tek hane hatası ve yer değiştirme reddedilir', () => {
  const good = '12345674'; assert.ok(K.luhnOk(good) && K.noOk(good));
  for (let i = 0; i < 8; i++) for (const d of '0123456789') { if (d === good[i]) continue; assert.ok(!K.noOk(good.slice(0, i) + d + good.slice(i + 1)), 'tek hane hatası yakalanmalı: ' + i + d); }
  assert.ok(!K.noOk('1234567') && !K.noOk('123456745') && !K.noOk('abcdefgh'));
});
test('fmtNo: 8 haneye kadar, 4-4 gruplar, harfleri atar', () => {
  assert.equal(K.fmtNo('12345678'), '1234 5678'); assert.equal(K.fmtNo('1234'), '1234'); assert.equal(K.fmtNo('12a34 5678 99'), '1234 5678'); assert.equal(K.fmtNo(''), '');
});
test('fmtEx / normEx: yazarken AA/YY, farklı yazımlar tek biçime iner, geçersiz ay reddedilir', () => {
  assert.equal(K.fmtEx('1', true), '1'); assert.equal(K.fmtEx('3', true), '03'); assert.equal(K.fmtEx('112', true), '11/2'); assert.equal(K.fmtEx('1127'), '11/27'); assert.equal(K.fmtEx('3', false), '3');
  for (const v of ['1127', '11/27', '11 / 27', '11-27', ' 11.27 ']) assert.equal(K.normEx(v), '11/27', v);
  for (const v of ['1327', '0027', '11/2', '', null, '112']) assert.equal(K.normEx(v), '', String(v));
});
test('exPast: SKT ayı bitene kadar geçerli, sonraki ay geçmiş sayılır', () => {
  const now = new Date(2026, 10, 20);   // 20 Kasım 2026
  assert.equal(K.exPast('11/26', now), false); assert.equal(K.exPast('10/26', now), true); assert.equal(K.exPast('12/26', now), false); assert.equal(K.exPast('01/27', now), false); assert.equal(K.exPast('12/25', now), true); assert.equal(K.exPast('xx', now), false);
});
test('amountOf: sınırlar, binlik ayraç, ondalık ve çöp girdi', () => {
  assert.equal(K.amountOf('500', 10, 100000), 500); assert.equal(K.amountOf('1.000', 10, 100000), 1000); assert.equal(K.amountOf('9', 10, 100000), 0); assert.equal(K.amountOf('100001', 10, 100000), 0);
  assert.equal(K.amountOf('', 10, 100000), 0); assert.equal(K.amountOf('abc', 10, 100000), 0); assert.equal(K.amountOf('50,7', 10, 100000), 50); assert.equal(K.amountOf(null, 10, 100000), 0);
});
test('cvvOk: tam 3 hane', () => { assert.ok(K.cvvOk('007')); assert.ok(!K.cvvOk('12')); assert.ok(!K.cvvOk('1234')); assert.ok(!K.cvvOk('')); });
test('bağlantı: oluştur ve çöz gidiş dönüş; bozuk/Luhn hatalı/eksik bağlantı reddedilir', () => {
  const c = { no: '12345674', cvv: '042', ex: '11/27' };
  const l = K.link('https://x.test/kart/?a=1#eski', c); assert.equal(l, 'https://x.test/kart/?a=1#kullan=12345674.042.1127');
  assert.deepEqual(K.parseLink('#' + l.split('#')[1]), c);
  assert.equal(K.parseLink('#kullan=12345678.042.1127'), null, 'Luhn'); assert.equal(K.parseLink('#kullan=12345674.04.1127'), null); assert.equal(K.parseLink('#kullan=12345674.042.1327'), null); assert.equal(K.parseLink(''), null); assert.equal(K.parseLink('#hesap=1'), null);
  assert.deepEqual(K.parseLink('#x=1&kullan=12345674.042.1127&y=2'), c);
});
test('şablonlar: 15 benzersiz ad; sunucudaki sayı ile aynı', () => {
  assert.equal(K.TEMPLATES.length, 15); assert.equal(new Set(K.TEMPLATES).size, 15);
});
test('shareText: numara, SKT, CVV ve bağlantı içerir', () => {
  const t = K.shareText({ no: '12345674', ex: '11/27', cvv: '042', n: 500, frm: 'Ahmet', msg: 'İyi ki doğdun' }, 'https://x.test/#kullan=1');
  for (const s of ['500 kristal', 'Ahmet', '1234 5674', '11/27', '042', 'İyi ki doğdun', 'https://x.test/#kullan=1']) assert.ok(t.includes(s), s);
});
