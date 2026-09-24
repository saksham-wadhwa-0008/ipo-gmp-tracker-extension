/**
 * Seed historical day-wise GMP trend data for active and upcoming IPOs
 * Provides day-by-day GMP movement leading up to the final decision day.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IpoSeedData = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SEED_TRENDS = {
    // Moneyview (Price: ₹34, GMP: ₹14 -> 41.18%, Dates: 24-28 Sept)
    'moneyview': [
      { date: '2026-09-20', displayDate: '20 Sept', gmp: 8, gmpPercent: 23.53, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-21', displayDate: '21 Sept', gmp: 10, gmpPercent: 29.41, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-22', displayDate: '22 Sept', gmp: 12, gmpPercent: 35.29, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-23', displayDate: '23 Sept', gmp: 13, gmpPercent: 38.24, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-24', displayDate: '24 Sept', gmp: 14, gmpPercent: 41.18, trend: '🟢', status: 'Open' }
    ],

    // German Green Steel (Price: ₹139, GMP: ₹24 -> 17.27%, Dates: 25-29 Sept)
    'german-green-steel': [
      { date: '2026-09-21', displayDate: '21 Sept', gmp: 15, gmpPercent: 10.79, trend: '🟡', status: 'Upcoming' },
      { date: '2026-09-22', displayDate: '22 Sept', gmp: 18, gmpPercent: 12.95, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-23', displayDate: '23 Sept', gmp: 21, gmpPercent: 15.11, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-24', displayDate: '24 Sept', gmp: 24, gmpPercent: 17.27, trend: '🟢', status: 'Upcoming' }
    ],

    // Orient Cables (Price: ₹272, GMP: ₹45 -> 16.54%, Dates: 25-29 Sept)
    'orient-cables': [
      { date: '2026-09-20', displayDate: '20 Sept', gmp: 30, gmpPercent: 11.03, trend: '🟡', status: 'Upcoming' },
      { date: '2026-09-21', displayDate: '21 Sept', gmp: 36, gmpPercent: 13.24, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-22', displayDate: '22 Sept', gmp: 40, gmpPercent: 14.71, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-23', displayDate: '23 Sept', gmp: 42, gmpPercent: 15.44, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-24', displayDate: '24 Sept', gmp: 45, gmpPercent: 16.54, trend: '🟢', status: 'Upcoming' }
    ],

    // Adroit Industries (Price: ₹134, GMP: ₹34 -> 25.37%, Dates: 23-25 Sept, Closes Sept 25)
    'adroit-industries': [
      { date: '2026-09-20', displayDate: '20 Sept', gmp: 22, gmpPercent: 16.42, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-21', displayDate: '21 Sept', gmp: 26, gmpPercent: 19.40, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-22', displayDate: '22 Sept', gmp: 30, gmpPercent: 22.39, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-23', displayDate: '23 Sept', gmp: 32, gmpPercent: 23.88, trend: '🟢', status: 'Open' },
      { date: '2026-09-24', displayDate: '24 Sept (1 Day Before Close)', gmp: 34, gmpPercent: 25.37, trend: '🟢', status: 'Open' }
    ],

    // A-One Steels (Price: ₹405, GMP: ₹55 -> 13.58%, Dates: 24-28 Sept)
    'a-one-steels': [
      { date: '2026-09-21', displayDate: '21 Sept', gmp: 75, gmpPercent: 18.52, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-22', displayDate: '22 Sept', gmp: 68, gmpPercent: 16.79, trend: '🔴', status: 'Upcoming' },
      { date: '2026-09-23', displayDate: '23 Sept', gmp: 60, gmpPercent: 14.81, trend: '🔴', status: 'Upcoming' },
      { date: '2026-09-24', displayDate: '24 Sept', gmp: 55, gmpPercent: 13.58, trend: '🔴', status: 'Open' }
    ],

    // Swastika Infra (Price: ₹185, GMP: ₹8 -> 4.32%, Dates: 23-25 Sept, Closes Tomorrow -> CANCEL ADVISORY)
    'swastika-infra': [
      { date: '2026-09-21', displayDate: '21 Sept', gmp: 24, gmpPercent: 12.97, trend: '🟡', status: 'Upcoming' },
      { date: '2026-09-22', displayDate: '22 Sept', gmp: 18, gmpPercent: 9.73, trend: '🔴', status: 'Upcoming' },
      { date: '2026-09-23', displayDate: '23 Sept', gmp: 12, gmpPercent: 6.49, trend: '🔴', status: 'Open' },
      { date: '2026-09-24', displayDate: '24 Sept (1 Day Before Close)', gmp: 8, gmpPercent: 4.32, trend: '🔴', status: 'Open', note: 'Dropped below 15% - CANCEL' }
    ],

    // Elevate Campuses (Price: ₹362, GMP: ₹3 -> 0.83%, Dates: 23-25 Sept -> CANCEL ADVISORY)
    'elevate-campuses': [
      { date: '2026-09-21', displayDate: '21 Sept', gmp: 35, gmpPercent: 9.67, trend: '🟡', status: 'Upcoming' },
      { date: '2026-09-22', displayDate: '22 Sept', gmp: 20, gmpPercent: 5.52, trend: '🔴', status: 'Upcoming' },
      { date: '2026-09-23', displayDate: '23 Sept', gmp: 10, gmpPercent: 2.76, trend: '🔴', status: 'Open' },
      { date: '2026-09-24', displayDate: '24 Sept (1 Day Before Close)', gmp: 3, gmpPercent: 0.83, trend: '🔴', status: 'Open', note: 'Sharp drop - CANCEL' }
    ],

    // ArMee Infotech (Price: ₹375, GMP: ₹55 -> 14.66%, Dates: 23-25 Sept -> CANCEL ADVISORY)
    'armee-infotech': [
      { date: '2026-09-21', displayDate: '21 Sept', gmp: 65, gmpPercent: 17.33, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-22', displayDate: '22 Sept', gmp: 60, gmpPercent: 16.00, trend: '🔴', status: 'Upcoming' },
      { date: '2026-09-23', displayDate: '23 Sept', gmp: 58, gmpPercent: 15.47, trend: '🔴', status: 'Open' },
      { date: '2026-09-24', displayDate: '24 Sept (1 Day Before Close)', gmp: 55, gmpPercent: 14.66, trend: '🔴', status: 'Open', note: 'Slipped below 15% - CANCEL' }
    ],

    // SpectraA Technology (SME, Price: ₹118, GMP: ₹81 -> 68.64%, Closed)
    'spectraa-technology': [
      { date: '2026-09-17', displayDate: '17 Sept', gmp: 40, gmpPercent: 33.90, trend: '🟢', status: 'Open' },
      { date: '2026-09-18', displayDate: '18 Sept', gmp: 55, gmpPercent: 46.61, trend: '🟢', status: 'Open' },
      { date: '2026-09-19', displayDate: '19 Sept', gmp: 68, gmpPercent: 57.63, trend: '🟢', status: 'Open' },
      { date: '2026-09-20', displayDate: '20 Sept (1 Day Before Close)', gmp: 75, gmpPercent: 63.56, trend: '🟢', status: 'Open' },
      { date: '2026-09-21', displayDate: '21 Sept (Closing Day)', gmp: 81, gmpPercent: 68.64, trend: '🟢', status: 'Closed' }
    ],

    // Robokidz Eduventures (SME, Price: ₹106, GMP: ₹55 -> 51.89%, Closed)
    'robokidz-eduventures': [
      { date: '2026-09-19', displayDate: '19 Sept', gmp: 35, gmpPercent: 33.02, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-20', displayDate: '20 Sept', gmp: 45, gmpPercent: 42.45, trend: '🟢', status: 'Upcoming' },
      { date: '2026-09-21', displayDate: '21 Sept', gmp: 50, gmpPercent: 47.17, trend: '🟢', status: 'Open' },
      { date: '2026-09-22', displayDate: '22 Sept (1 Day Before Close)', gmp: 52, gmpPercent: 49.06, trend: '🟢', status: 'Open' },
      { date: '2026-09-23', displayDate: '23 Sept (Closing Day)', gmp: 55, gmpPercent: 51.89, trend: '🟢', status: 'Closed' }
    ]
  };

  /**
   * Get historical trend points for an IPO.
   * If pre-seeded data exists, returns it.
   * If not, synthesizes realistic historical points based on current GMP, trend symbol, and dates
   * so the user always sees the trend progression leading up to today.
   */
  function getIpoTrends(ipo) {
    if (!ipo) return [];
    const id = ipo.id || (ipo.name || '').toLowerCase().replace(/[^a-z0-9]/g, '-');

    if (SEED_TRENDS[id]) {
      return [...SEED_TRENDS[id]];
    }

    // Synthesize based on current data
    const points = [];
    const currentGmp = ipo.gmp || 0;
    const currentPct = ipo.gmpPercent || 0;
    const trendSymbol = ipo.trend || '🟡';
    const status = ipo.status || 'Upcoming';

    const now = new Date();
    const daysBack = 4;

    for (let i = daysBack; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const day = d.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[d.getMonth()];
      const dateIso = d.toISOString().split('T')[0];

      let ptGmp = currentGmp;
      let ptPct = currentPct;
      let ptTrend = trendSymbol;

      if (i > 0) {
        if (trendSymbol === '🟢') {
          // It was lower earlier
          const factor = 1 - (i * 0.12);
          ptGmp = Math.max(0, Math.round(currentGmp * factor));
          ptPct = +(currentPct * factor).toFixed(2);
          ptTrend = '🟢';
        } else if (trendSymbol === '🔴') {
          // It was higher earlier
          const factor = 1 + (i * 0.15);
          ptGmp = Math.round(currentGmp * factor);
          ptPct = +(currentPct * factor).toFixed(2);
          ptTrend = '🔴';
        } else {
          // Neutral / stable
          ptGmp = currentGmp;
          ptPct = currentPct;
          ptTrend = '🟡';
        }
      }

      let label = `${day} ${month}`;
      if (i === 0 && ipo.isOneDayBefore) {
        label += ' (1 Day Before Close)';
      }

      points.push({
        date: dateIso,
        displayDate: label,
        gmp: ptGmp,
        gmpPercent: ptPct,
        trend: ptTrend,
        status: (i === 0) ? status : (status === 'Open' ? (i <= 1 ? 'Open' : 'Upcoming') : 'Upcoming')
      });
    }

    return points;
  }

  return {
    SEED_TRENDS,
    getIpoTrends
  };
});
