const test = require('node:test');
const assert = require('node:assert');
const {
  parseDateRange,
  calculateDaysRemaining,
  isOneDayBeforeClose,
  isClosingToday,
  formatDate,
  getCountdownInfo
} = require('../utils/date_utils.js');

test('Date Utils - parse standard range "25-29 Sept"', () => {
  const result = parseDateRange('25-29 Sept', 2026);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.openDate.getDate(), 25);
  assert.strictEqual(result.openDate.getMonth(), 8); // Sept = 8 (0-indexed)
  assert.strictEqual(result.openDate.getFullYear(), 2026);
  assert.strictEqual(result.closeDate.getDate(), 29);
  assert.strictEqual(result.closeDate.getMonth(), 8);
});

test('Date Utils - parse month crossing range "30-5 Oct"', () => {
  const result = parseDateRange('30-5 Oct', 2026);
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.openDate.getDate(), 30);
  assert.strictEqual(result.openDate.getMonth(), 8); // Sept (month before Oct)
  assert.strictEqual(result.closeDate.getDate(), 5);
  assert.strictEqual(result.closeDate.getMonth(), 9); // Oct
});

test('Date Utils - calculateDaysRemaining with reference date', () => {
  // If close date is Sept 25, 2026
  const closeDate = new Date(2026, 8, 25); // 25 Sept

  // Today is Sept 24 (1 day before close)
  const todaySept24 = new Date(2026, 8, 24);
  assert.strictEqual(calculateDaysRemaining(closeDate, todaySept24), 1);
  assert.strictEqual(isOneDayBeforeClose(closeDate, todaySept24), true);
  assert.strictEqual(isClosingToday(closeDate, todaySept24), false);

  // Today is Sept 25 (closing day)
  const todaySept25 = new Date(2026, 8, 25);
  assert.strictEqual(calculateDaysRemaining(closeDate, todaySept25), 0);
  assert.strictEqual(isOneDayBeforeClose(closeDate, todaySept25), false);
  assert.strictEqual(isClosingToday(closeDate, todaySept25), true);

  // Today is Sept 23 (2 days before close)
  const todaySept23 = new Date(2026, 8, 23);
  assert.strictEqual(calculateDaysRemaining(closeDate, todaySept23), 2);
  assert.strictEqual(isOneDayBeforeClose(closeDate, todaySept23), false);

  // Today is Sept 26 (already closed)
  const todaySept26 = new Date(2026, 8, 26);
  assert.strictEqual(calculateDaysRemaining(closeDate, todaySept26), -1);
});

test('Date Utils - getCountdownInfo text and badge style', () => {
  assert.deepStrictEqual(getCountdownInfo(1), { text: '1 Day Before Close', type: 'warning' });
  assert.deepStrictEqual(getCountdownInfo(0), { text: 'Closes Today!', type: 'danger' });
  assert.deepStrictEqual(getCountdownInfo(3), { text: '3 Days Left', type: 'success' });
  assert.deepStrictEqual(getCountdownInfo(-1), { text: 'Closed', type: 'neutral' });
});
