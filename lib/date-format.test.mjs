import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDateTime,
  formatDayMonth,
  formatDayMonthYear,
  formatMonthDayYear,
} from './date-format.js';

test('date labels are fixed English and UTC so server and browser agree', () => {
  assert.equal(formatMonthDayYear('2026-11-14T12:42:08.41478+00:00'), 'Nov 14, 2026');
  assert.equal(formatDayMonth('2026-11-14T12:42:08Z'), '14 Nov');
  assert.equal(formatDayMonthYear('2026-11-07T23:59:00Z'), '7 Nov 2026');
  assert.equal(formatDateTime('2026-11-14T12:42:08Z'), '14 Nov 2026, 12:42');
  // A late-UTC instant stays on the same UTC day instead of shifting with the
  // server or browser timezone.
  assert.equal(formatMonthDayYear('2026-11-07T23:59:00Z'), 'Nov 7, 2026');
});

test('invalid or missing dates produce an empty label', () => {
  assert.equal(formatMonthDayYear(undefined), '');
  assert.equal(formatMonthDayYear(''), '');
  assert.equal(formatMonthDayYear('not-a-date'), '');
  assert.equal(formatDayMonth(null), '');
  assert.equal(formatDayMonthYear({}), '');
  assert.equal(formatDateTime('nope'), '');
});
