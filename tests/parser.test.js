const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  parseCurrency,
  parsePriceBand,
  parseEstListing,
  parseStatus,
  evaluateAdvisory,
  parseHtmlTables,
  normalizeIpo,
  escapeHtml,
  safeUrl
} = require('../utils/parser.js');

test('Parser Utils - Currency, Price Band, and Est. Listing', () => {
  assert.strictEqual(parseCurrency('₹24'), 24);
  assert.strictEqual(parseCurrency('₹1,785'), 1785);
  assert.strictEqual(parseCurrency('₹0'), 0);
  assert.strictEqual(parseCurrency('--'), 0);

  assert.strictEqual(parsePriceBand('₹139'), 139);
  assert.strictEqual(parsePriceBand('₹132 to ₹139'), 139);
  assert.strictEqual(parsePriceBand('₹104-111'), 111);

  const est1 = parseEstListing('₹163 (17.27%)', 24, 139);
  assert.strictEqual(est1.estPrice, 163);
  assert.strictEqual(est1.gmpPercent, 17.27);

  const est2 = parseEstListing('₹48 (41.18%)', 14, 34);
  assert.strictEqual(est2.estPrice, 48);
  assert.strictEqual(est2.gmpPercent, 41.18);

  const est3 = parseEstListing('', 10, 100);
  assert.strictEqual(est3.estPrice, 110);
  assert.strictEqual(est3.gmpPercent, 10.0);
});

test('Parser Security - escapeHtml and safeUrl', () => {
  assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.strictEqual(escapeHtml('German & Green "Steel"'), 'German &amp; Green &quot;Steel&quot;');

  assert.strictEqual(safeUrl('javascript:alert(1)'), 'https://ipowatch.in');
  assert.strictEqual(safeUrl('data:text/html,bad'), 'https://ipowatch.in');
  assert.strictEqual(safeUrl('https://ipowatch.in/sample-ipo/'), 'https://ipowatch.in/sample-ipo/');
  assert.strictEqual(safeUrl('/sample-ipo/'), '/sample-ipo/');
});

test('Parser Utils - parseStatus', () => {
  assert.strictEqual(parseStatus('Upcoming'), 'Upcoming');
  assert.strictEqual(parseStatus('Open'), 'Open');
  assert.strictEqual(parseStatus('Closed'), 'Closed');
  assert.strictEqual(parseStatus(''), 'Upcoming');
});

test('Parser Advisory - evaluateAdvisory rules & precedence', () => {
  const refSept24 = new Date(2026, 8, 24); // Sept 24, 2026

  // Scenario 1: Open IPO, 1 day before close (25 Sept close, today is 24 Sept), GMP is 13.58% (< 15%)
  // User Requirement: "1 day before ending date and if it is less than 15% it will tell me to cancel the application for the same"
  const ipoLowGmpEndingTomorrow = {
    name: 'A-One Steels',
    status: 'Open',
    gmpPercent: 13.58,
    closeDate: new Date(2026, 8, 25)
  };

  const eval1 = evaluateAdvisory(ipoLowGmpEndingTomorrow, 15.0, refSept24);
  assert.strictEqual(eval1.isOneDayBefore, true);
  assert.strictEqual(eval1.daysRemaining, 1);
  assert.strictEqual(eval1.shouldCancel, true);
  assert.match(eval1.advisoryMessage, /BELOW THRESHOLD/);

  // Scenario 2: Open IPO, 1 day before close, GMP is 25.37% (>= 15%)
  const ipoHighGmpEndingTomorrow = {
    name: 'Adroit Industries',
    status: 'Open',
    gmpPercent: 25.37,
    closeDate: new Date(2026, 8, 25)
  };

  const eval2 = evaluateAdvisory(ipoHighGmpEndingTomorrow, 15.0, refSept24);
  assert.strictEqual(eval2.isOneDayBefore, true);
  assert.strictEqual(eval2.shouldCancel, false);
  assert.strictEqual(eval2.qualifies, true);
  assert.strictEqual(eval2.advisoryType, 'QUALIFIED_APPLY');

  // Scenario 3: Upcoming IPO, GMP is 17.27% (>= 15%)
  const ipoUpcomingHighGmp = {
    name: 'German Green Steel',
    status: 'Upcoming',
    gmpPercent: 17.27,
    closeDate: new Date(2026, 8, 29)
  };

  const eval3 = evaluateAdvisory(ipoUpcomingHighGmp, 15.0, refSept24);
  assert.strictEqual(eval3.shouldCancel, false);
  assert.strictEqual(eval3.qualifies, true);
  assert.strictEqual(eval3.advisoryType, 'UPCOMING_HIGH_GMP');

  // Scenario 4: Closed IPO should NOT qualify even if GMP > 15% and site status is stale
  const ipoClosedStaleStatus = {
    name: 'Past Closed IPO',
    status: 'Open', // Stale status on site
    gmpPercent: 50.0,
    closeDate: new Date(2026, 8, 21) // Closed 3 days ago relative to Sept 24
  };

  const eval4 = evaluateAdvisory(ipoClosedStaleStatus, 15.0, refSept24);
  assert.strictEqual(eval4.isClosed, true);
  assert.strictEqual(eval4.qualifies, false);
  assert.strictEqual(eval4.advisoryType, 'CLOSED');
});

test('Parser Utils - parseHtmlTables with real HTML file', () => {
  const htmlPath = path.join(__dirname, '..', '..', 'ipowatch_page.html');
  if (!fs.existsSync(htmlPath)) return;

  const html = fs.readFileSync(htmlPath, 'utf8');
  const refDate = new Date(2026, 8, 24);
  const result = parseHtmlTables(html, 15.0, refDate);

  assert.ok(result.all.length > 30, `Expected > 30 IPOs, got ${result.all.length}`);
  assert.ok(result.mainboard.length > 10, `Expected > 10 Mainboard IPOs, got ${result.mainboard.length}`);
  assert.ok(result.sme.length > 20, `Expected > 20 SME IPOs, got ${result.sme.length}`);

  // Check Moneyview (Open, GMP 41.18% > 15%)
  const moneyview = result.all.find(i => i.name.toLowerCase().includes('moneyview'));
  assert.ok(moneyview, 'Moneyview should be parsed');
  assert.strictEqual(moneyview.gmpPercent, 41.18);
  assert.strictEqual(moneyview.qualifies, true);

  // Check German Green Steel (Upcoming, GMP 17.27% > 15%)
  const germanSteel = result.all.find(i => i.name.toLowerCase().includes('german green steel'));
  assert.ok(germanSteel, 'German Green Steel should be parsed');
  assert.strictEqual(germanSteel.gmpPercent, 17.27);
  assert.strictEqual(germanSteel.qualifies, true);

  // Check cancel alerts
  assert.ok(result.cancelAlerts.length >= 1, 'Should find at least 1 cancel alert for low GMP ending tomorrow');
});
