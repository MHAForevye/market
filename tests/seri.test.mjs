import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const { seriNext, seriAddDays, seriDayDiff, seriTier, seriTierDay, seriNextMilestone, SERI_TIERS } = createRequire(import.meta.url)('../js/core.js');

/* ===== Giriş serisi ===== */
const run = (days) => days.reduce((o, d) => { const r = seriNext(o && o.st, d); r.ev0 = r.ev; return r; }, null);
test('seri: ilk giriş 1 gün', () => { const r = seriNext(null, '2026-11-10'); assert.equal(r.st.n, 1); assert.equal(r.ev, 'start'); });
test('seri: aynı gün tekrar açmak seriyi artırmaz', () => {
  const a = seriNext(null, '2026-11-10'), b = seriNext(a.st, '2026-11-10');
  assert.equal(b.st.n, 1); assert.equal(b.ev, 'same');
});
test('seri: ardışık günler artar, ay ve yıl sınırında da', () => {
  assert.equal(run(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']).st.n, 4);
  assert.equal(run(['2028-02-28', '2028-02-29', '2028-03-01']).st.n, 3);   // artık yıl
});
test('seri: kalkan yokken kaçırılan gün seriyi sıfırlar, en uzun seri kalır', () => {
  const r = run(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05']);
  assert.equal(r.st.n, 1); assert.equal(r.ev, 'reset'); assert.equal(r.st.best, 3);
});
test('seri: 7. günde kalkan kazanılır, tek kaçırılan günde seri korunur ve kalkan harcanır', () => {
  const days = Array.from({ length: 7 }, (_, i) => seriAddDays('2026-11-01', i));
  const w = run(days); assert.equal(w.st.n, 7); assert.equal(w.st.shield, 1); assert.equal(w.gotShield, true);
  const s = seriNext(w.st, seriAddDays('2026-11-07', 2));
  assert.equal(s.ev, 'saved'); assert.equal(s.st.n, 8); assert.equal(s.st.shield, 0);
  assert.ok(s.st.h.includes('2026-11-08'));
  const again = seriNext(s.st, seriAddDays('2026-11-09', 2));   // ikinci kaçırma: kalkan yok
  assert.equal(again.st.n, 1);
});
test('seri: kalkan iki gün kaçırmayı korumaz', () => {
  const days = Array.from({ length: 7 }, (_, i) => seriAddDays('2026-11-01', i));
  assert.equal(seriNext(run(days).st, '2026-11-10').st.n, 1);
});
test('seri: saat geri alınırsa seri bozulmaz', () => {
  const a = seriNext(seriNext(null, '2026-11-10').st, '2026-11-11');
  const b = seriNext(a.st, '2026-11-08'); assert.equal(b.st.n, 2); assert.equal(b.ev, 'same');
});
test('seri: bozuk kayıt çökmez, yeniden başlar', () => {
  for (const bad of [{}, 'x', { n: -4, last: '2026-11-10' }, { n: 3, last: 'dün' }, [], 7])
    assert.equal(seriNext(bad, '2026-11-10').st.n, 1);
  const r = seriNext({ n: 3, last: '2026-11-09', h: ['<img>', '2026-11-09'], ev: '<x>', shield: 'evet' }, '2026-11-10');
  assert.deepEqual(r.st.h, ['2026-11-09', '2026-11-10']); assert.equal(r.st.n, 4);
});

test('alev kademeleri: 12 kademe, 7 günde bir değişir, 77+ günde sabit kalır', () => {
  assert.equal(SERI_TIERS.length, 12);
  assert.deepEqual([1, 6, 7, 13, 14, 21, 76, 77, 500].map(seriTier), [0, 0, 1, 1, 2, 3, 10, 11, 11]);
  assert.equal(seriTierDay(0), 1); assert.equal(seriTierDay(3), 21);
  assert.equal(seriNextMilestone(1), 7); assert.equal(seriNextMilestone(7), 14); assert.equal(seriNextMilestone(20), 21);
  for (const t of SERI_TIERS) assert.ok(t.name && t.info);
});
