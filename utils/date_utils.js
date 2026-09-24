/**
 * Date utilities for parsing IPO date ranges and calculating countdowns
 * Supports dual-environment: CommonJS (Node.js) & Browser global
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IpoDateUtils = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MONTHS_MAP = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };

  const MONTH_NAMES_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  /**
   * Normalize month string to 0-11 index
   */
  function parseMonth(monthStr) {
    if (!monthStr) return null;
    const clean = monthStr.toLowerCase().replace(/[^a-z]/g, '');
    if (clean in MONTHS_MAP) {
      return MONTHS_MAP[clean];
    }
    return null;
  }

  /**
   * Parses IPO date ranges like:
   *  - "25-29 Sept"
   *  - "30-5 Oct" (crosses month boundary, e.g. 30 Sept - 5 Oct)
   *  - "28-30 Sept"
   *  - "September 25, 2026"
   *  - "25 Sept - 29 Sept"
   *
   * @param {string} dateStr
   * @param {number} [defaultYear]
   * @returns {{ openDate: Date|null, closeDate: Date|null, raw: string, isValid: boolean }}
   */
  function parseDateRange(dateStr, defaultYear) {
    if (!dateStr || typeof dateStr !== 'string') {
      return { openDate: null, closeDate: null, raw: dateStr || '', isValid: false };
    }

    const cleanStr = dateStr.trim();
    const currentYear = defaultYear || new Date().getFullYear();

    // Pattern 1: "25-29 Sept" or "30-5 Oct" or "28-30 Sept, 2026"
    // Regex: (\d{1,2})\s*[-–—to]+\s*(\d{1,2})\s+([A-Za-z]+)(?:\s*,?\s*(\d{4}))?
    const rangeMatch = cleanStr.match(/^(\d{1,2})\s*[-–—to]+\s*(\d{1,2})\s+([A-Za-z]+)(?:\s*,?\s*(\d{4}))?/i);
    if (rangeMatch) {
      const openDay = parseInt(rangeMatch[1], 10);
      const closeDay = parseInt(rangeMatch[2], 10);
      const closeMonthStr = rangeMatch[3];
      const year = rangeMatch[4] ? parseInt(rangeMatch[4], 10) : currentYear;

      const closeMonth = parseMonth(closeMonthStr);
      if (closeMonth !== null) {
        let openMonth = closeMonth;
        // If openDay > closeDay (e.g. "30-5 Oct"), openMonth is the previous month
        if (openDay > closeDay) {
          openMonth = (closeMonth - 1 + 12) % 12;
        }

        const openYear = (openDay > closeDay && closeMonth === 0) ? year - 1 : year;
        const openDate = new Date(openYear, openMonth, openDay, 0, 0, 0, 0);
        const closeDate = new Date(year, closeMonth, closeDay, 23, 59, 59, 999);

        return { openDate, closeDate, raw: cleanStr, isValid: true };
      }
    }

    // Pattern 2: "25 Sept - 29 Sept" or "29 Sept - 1 Oct"
    const twoMonthRange = cleanStr.match(/^(\d{1,2})\s+([A-Za-z]+)\s*[-–—to]+\s*(\d{1,2})\s+([A-Za-z]+)(?:\s*,?\s*(\d{4}))?/i);
    if (twoMonthRange) {
      const openDay = parseInt(twoMonthRange[1], 10);
      const openMonth = parseMonth(twoMonthRange[2]);
      const closeDay = parseInt(twoMonthRange[3], 10);
      const closeMonth = parseMonth(twoMonthRange[4]);
      const year = twoMonthRange[5] ? parseInt(twoMonthRange[5], 10) : currentYear;

      if (openMonth !== null && closeMonth !== null) {
        const openYear = (openMonth > closeMonth) ? year - 1 : year;
        const openDate = new Date(openYear, openMonth, openDay, 0, 0, 0, 0);
        const closeDate = new Date(year, closeMonth, closeDay, 23, 59, 59, 999);
        return { openDate, closeDate, raw: cleanStr, isValid: true };
      }
    }

    // Pattern 3: Single date or Standard "Month DD, YYYY"
    const singleParsed = new Date(cleanStr);
    if (!isNaN(singleParsed.getTime())) {
      const openDate = new Date(singleParsed.getFullYear(), singleParsed.getMonth(), singleParsed.getDate(), 0, 0, 0, 0);
      const closeDate = new Date(singleParsed.getFullYear(), singleParsed.getMonth(), singleParsed.getDate(), 23, 59, 59, 999);
      return { openDate, closeDate, raw: cleanStr, isValid: true };
    }

    return { openDate: null, closeDate: null, raw: cleanStr, isValid: false };
  }

  /**
   * Calculates days remaining until close date from reference date (today).
   * Result:
   *  > 1: Multiple days remaining
   *  = 1: Exactly 1 day before closing (CRITICAL DECISION WINDOW)
   *  = 0: Closing today
   *  < 0: Closed
   *
   * @param {Date|string} closeDate
   * @param {Date} [referenceDate]
   * @returns {number|null}
   */
  function calculateDaysRemaining(closeDate, referenceDate) {
    let target = closeDate;
    if (typeof closeDate === 'string') {
      const parsed = parseDateRange(closeDate);
      target = parsed.closeDate;
    }
    if (!target || !(target instanceof Date) || isNaN(target.getTime())) {
      return null;
    }

    const ref = referenceDate ? new Date(referenceDate) : new Date();
    // Normalize both to start of calendar day for accurate discrete day count
    const refDay = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
    const closeDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();

    const diffMs = closeDay - refDay;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if today is 1 day before the close date
   * @param {Date|string} closeDate
   * @param {Date} [referenceDate]
   * @returns {boolean}
   */
  function isOneDayBeforeClose(closeDate, referenceDate) {
    const days = calculateDaysRemaining(closeDate, referenceDate);
    return days === 1;
  }

  /**
   * Check if today is the closing day
   * @param {Date|string} closeDate
   * @param {Date} [referenceDate]
   * @returns {boolean}
   */
  function isClosingToday(closeDate, referenceDate) {
    const days = calculateDaysRemaining(closeDate, referenceDate);
    return days === 0;
  }

  /**
   * Format a date into friendly display string, e.g. "29 Sep 2026"
   * @param {Date} date
   * @param {boolean} [includeYear=false]
   * @returns {string}
   */
  function formatDate(date, includeYear = false) {
    if (!date || isNaN(date.getTime())) return '';
    const day = date.getDate();
    const month = MONTH_NAMES_SHORT[date.getMonth()];
    return includeYear ? `${day} ${month} ${date.getFullYear()}` : `${day} ${month}`;
  }

  /**
   * Get human readable countdown badge text
   * @param {number|null} daysRemaining
   * @returns {{ text: string, type: 'danger'|'warning'|'success'|'neutral' }}
   */
  function getCountdownInfo(daysRemaining) {
    if (daysRemaining === null) return { text: 'TBD', type: 'neutral' };
    if (daysRemaining < 0) return { text: 'Closed', type: 'neutral' };
    if (daysRemaining === 0) return { text: 'Closes Today!', type: 'danger' };
    if (daysRemaining === 1) return { text: '1 Day Before Close', type: 'warning' };
    if (daysRemaining === 2) return { text: '2 Days Left', type: 'success' };
    return { text: `${daysRemaining} Days Left`, type: 'success' };
  }

  return {
    parseMonth,
    parseDateRange,
    calculateDaysRemaining,
    isOneDayBeforeClose,
    isClosingToday,
    formatDate,
    getCountdownInfo
  };
});
