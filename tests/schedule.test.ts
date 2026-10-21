import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slotReason, freeGaps } from '../lib/schedule';

test('a suggested slot is described by the event it sits next to', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 15, h, m).getTime();
  const events = [
    { start: at(8), end: at(15), title: 'School' },
    { start: at(16, 30), end: at(18), title: 'Football practice' },
  ];
  assert.equal(slotReason({ start: at(16), end: at(16, 20) }, events), 'before Football practice');
  assert.equal(slotReason({ start: at(15, 15), end: at(15, 45) }, events), 'after School');
  assert.equal(slotReason({ start: at(20), end: at(20, 30) }, events), '');
  const gaps = freeGaps(events, at(14));
  assert.deepEqual(gaps, [{ start: at(15), end: at(16, 30) }, { start: at(18), end: at(22) }]);
});
