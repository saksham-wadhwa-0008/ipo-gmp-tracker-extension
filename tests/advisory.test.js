const test = require('node:test');
const assert = require('node:assert');
const { evaluateAdvisory, normalizeIpo } = require('../utils/parser.js');
const { getIpoTrends } = require('../utils/seed_data.js');
const Storage = require('../utils/storage.js');

test('Advisory Logic - 1 day before close with GMP < 15% triggers CANCEL_APPLICATION', () => {
  const refDate = new Date(2026, 8, 24); // Sept 24, 2026
  const closeDate = new Date(2026, 8, 25); // Sept 25, 2026 (tomorrow)

  const ipo = {
    name: 'Swastika Infra',
    status: 'Open',
    gmpPercent: 4.32,
    closeDate
  };

  const result = evaluateAdvisory(ipo, 15.0, refDate);
  assert.strictEqual(result.isOneDayBefore, true);
  assert.strictEqual(result.daysRemaining, 1);
  assert.strictEqual(result.shouldCancel, true);
  assert.strictEqual(result.advisoryType, 'CANCEL_APPLICATION');
  assert.strictEqual(result.advisoryLevel, 'danger');
  assert.match(result.advisoryMessage, /CANCEL APPLICATION/i);
  assert.match(result.advisoryMessage, /closes tomorrow/i);
});

test('Advisory Logic - Closing today with GMP < 15% triggers CANCEL_APPLICATION', () => {
  const refDate = new Date(2026, 8, 24);
  const closeDate = new Date(2026, 8, 24); // closes today!

  const ipo = {
    name: 'Varmora Granito',
    status: 'Open',
    gmpPercent: 0.0,
    closeDate
  };

  const result = evaluateAdvisory(ipo, 15.0, refDate);
  assert.strictEqual(result.isClosingToday, true);
  assert.strictEqual(result.daysRemaining, 0);
  assert.strictEqual(result.shouldCancel, true);
  assert.strictEqual(result.advisoryType, 'CANCEL_APPLICATION');
  assert.match(result.advisoryMessage, /closes today/i);
});

test('Advisory Logic - 1 day before close with GMP >= 15% qualifies and does NOT cancel', () => {
  const refDate = new Date(2026, 8, 24);
  const closeDate = new Date(2026, 8, 25);

  const ipo = {
    name: 'Adroit Industries',
    status: 'Open',
    gmpPercent: 25.37,
    closeDate
  };

  const result = evaluateAdvisory(ipo, 15.0, refDate);
  assert.strictEqual(result.isOneDayBefore, true);
  assert.strictEqual(result.shouldCancel, false);
  assert.strictEqual(result.qualifies, true);
  assert.strictEqual(result.advisoryType, 'QUALIFIED_APPLY');
  assert.strictEqual(result.advisoryLevel, 'success');
  assert.match(result.advisoryMessage, /SAFE TO APPLY/i);
});

test('Advisory Logic - Custom threshold', () => {
  const refDate = new Date(2026, 8, 24);
  const closeDate = new Date(2026, 8, 25);

  const ipo = {
    name: 'Test IPO',
    status: 'Open',
    gmpPercent: 12.0,
    closeDate
  };

  // At default 15%, it should cancel
  const resDefault = evaluateAdvisory(ipo, 15.0, refDate);
  assert.strictEqual(resDefault.shouldCancel, true);

  // If user sets threshold to 10%, 12% is now acceptable
  const resCustom = evaluateAdvisory(ipo, 10.0, refDate);
  assert.strictEqual(resCustom.shouldCancel, false);
  assert.strictEqual(resCustom.qualifies, true);
});

test('Trend History - getIpoTrends returns day-by-day records leading up to today', () => {
  const ipo = {
    id: 'moneyview',
    name: 'Moneyview',
    status: 'Open',
    gmp: 14,
    gmpPercent: 41.18,
    trend: '🟢',
    isOneDayBefore: false
  };

  const trends = getIpoTrends(ipo);
  assert.ok(Array.isArray(trends));
  assert.ok(trends.length >= 4, 'Should have multiple daily data points');

  // Verify daily progression
  const lastPoint = trends[trends.length - 1];
  assert.strictEqual(lastPoint.gmp, 14);
  assert.strictEqual(lastPoint.gmpPercent, 41.18);
  assert.strictEqual(lastPoint.status, 'Open');
});

test('Storage Utils - setting and getting threshold and applied IPOs', async () => {
  await Storage.setThreshold(20.0);
  const t = await Storage.getThreshold();
  assert.strictEqual(t, 20.0);

  // Reset back to 15
  await Storage.setThreshold(15.0);
  assert.strictEqual(await Storage.getThreshold(), 15.0);

  // Toggle applied
  const isApplied1 = await Storage.toggleAppliedIpo('test-ipo');
  assert.strictEqual(isApplied1, true);
  assert.strictEqual(await Storage.isIpoApplied('test-ipo'), true);

  const isApplied2 = await Storage.toggleAppliedIpo('test-ipo');
  assert.strictEqual(isApplied2, false);
  assert.strictEqual(await Storage.isIpoApplied('test-ipo'), false);
});
