import assert from 'node:assert/strict';
import test from 'node:test';
import { bucketClicksByDay } from '../src/services/analyticsService';

const NOW = new Date('2026-08-28T12:00:00Z');
const daysAgo = (n: number, hour = 10): Date => {
  const d = new Date(NOW.getTime() - n * 86_400_000);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
};

test('bucketClicksByDay always returns exactly `days` points, oldest first', () => {
  const out = bucketClicksByDay([], 30, NOW);
  assert.equal(out.length, 30);
  assert.equal(out[0].date, '2026-07-30');
  assert.equal(out[29].date, '2026-08-28');
  assert.ok(out.every((p) => p.count === 0));
});

test('bucketClicksByDay counts multiple clicks on the same day', () => {
  const out = bucketClicksByDay([daysAgo(0, 1), daysAgo(0, 9), daysAgo(0, 23), daysAgo(3)], 30, NOW);
  assert.equal(out.find((p) => p.date === '2026-08-28')?.count, 3);
  assert.equal(out.find((p) => p.date === '2026-08-25')?.count, 1);
});

test('bucketClicksByDay leaves gap days at zero', () => {
  const out = bucketClicksByDay([daysAgo(1), daysAgo(4)], 30, NOW);
  assert.equal(out.find((p) => p.date === '2026-08-27')?.count, 1);
  assert.equal(out.find((p) => p.date === '2026-08-26')?.count, 0);
  assert.equal(out.find((p) => p.date === '2026-08-24')?.count, 1);
});

test('bucketClicksByDay ignores clicks outside the window', () => {
  const out = bucketClicksByDay([daysAgo(0), daysAgo(40)], 30, NOW);
  assert.equal(
    out.reduce((s, p) => s + p.count, 0),
    1,
  );
});
