/**
 * IPO Watch Table Parser & Advisory Evaluation Engine
 * Supports dual-environment: CommonJS (Node.js) & Browser global
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const DateUtils = require('./date_utils.js');
    module.exports = factory(DateUtils);
  } else {
    root.IpoParser = factory(root.IpoDateUtils);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (DateUtils) {
  'use strict';

  const DEFAULT_GMP_THRESHOLD = 15.0; // 15% threshold as requested

  /**
   * Escape HTML special characters to prevent XSS / script injection
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  /**
   * Validate and sanitize URL against javascript: and malicious protocols
   */
  function safeUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return 'https://ipowatch.in';
    const trimmed = rawUrl.trim();
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch (e) {
      if (trimmed.startsWith('/') || trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
        return trimmed;
      }
    }
    return 'https://ipowatch.in';
  }

  /**
   * Parse numerical rupee/currency string into float
   * e.g. "₹24" -> 24, "₹1,785" -> 1785
   */
  function parseCurrency(str) {
    if (!str || typeof str !== 'string') return 0;
    const clean = str.replace(/[₹,\s]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Parse price band (taking the upper band if range provided)
   * e.g. "₹139" -> 139, "₹132 to ₹139" -> 139, "₹104-111" -> 111
   */
  function parsePriceBand(str) {
    if (!str || typeof str !== 'string') return 0;
    const matches = str.match(/\d+(?:,\d+)*(?:\.\d+)?/g);
    if (!matches || matches.length === 0) return 0;
    // Take the highest number as the cut-off price
    const nums = matches.map(m => parseFloat(m.replace(/,/g, '')));
    return Math.max(...nums);
  }

  /**
   * Parse Est. Listing text to extract price and percentage
   * e.g. "₹163 (17.27%)" -> { estPrice: 163, gmpPercent: 17.27 }
   * e.g. "₹48 (41.18%)" -> { estPrice: 48, gmpPercent: 41.18 }
   */
  function parseEstListing(str, gmp, priceBand) {
    if (!str || typeof str !== 'string') {
      const pct = (priceBand > 0 && gmp > 0) ? +((gmp / priceBand) * 100).toFixed(2) : 0;
      return { estPrice: priceBand + gmp, gmpPercent: pct };
    }

    let gmpPercent = null;
    const pctMatch = str.match(/\(([+-]?\d+(?:\.\d+)?)\s*%\)/);
    if (pctMatch) {
      gmpPercent = parseFloat(pctMatch[1]);
    } else if (priceBand > 0) {
      gmpPercent = +((gmp / priceBand) * 100).toFixed(2);
    } else {
      gmpPercent = 0;
    }

    const priceMatch = str.match(/₹?\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
    const estPrice = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : (priceBand + gmp);

    return {
      estPrice: isNaN(estPrice) ? 0 : estPrice,
      gmpPercent: isNaN(gmpPercent) ? 0 : gmpPercent
    };
  }

  /**
   * Normalize Status
   */
  function parseStatus(str) {
    if (!str || typeof str !== 'string') return 'Upcoming';
    const clean = str.trim().toLowerCase();
    if (clean.includes('close')) return 'Closed';
    if (clean.includes('open')) return 'Open';
    if (clean.includes('upcom')) return 'Upcoming';
    return 'Upcoming';
  }

  /**
   * Determine advisory status for an IPO
   * Rules:
   * 1. If Closed (by date or status), mark CLOSED (takes priority to prevent outdated site status from misleading user)
   * 2. If Open and daysRemaining <= 1 (1 day before close or closing today) AND gmpPercent < threshold:
   *    -> CANCEL_APPLICATION
   * 3. If Open/Upcoming and gmpPercent >= threshold:
   *    -> QUALIFIED_BUY
   * 4. If Upcoming and gmpPercent < threshold:
   *    -> WATCHLIST_LOW
   */
  function evaluateAdvisory(ipo, threshold = DEFAULT_GMP_THRESHOLD, referenceDate = null) {
    const daysRemaining = DateUtils.calculateDaysRemaining(ipo.closeDate, referenceDate);
    const isOneDayBefore = DateUtils.isOneDayBeforeClose(ipo.closeDate, referenceDate);
    const isClosingToday = DateUtils.isClosingToday(ipo.closeDate, referenceDate);

    const isEndingSoon = (daysRemaining !== null && daysRemaining <= 1 && daysRemaining >= 0);
    const gmpPercent = ipo.gmpPercent;
    const isLowGmp = gmpPercent < threshold;
    const isClosed = (ipo.status === 'Closed' || (daysRemaining !== null && daysRemaining < 0));
    const isOpen = (!isClosed && ipo.status === 'Open');
    const isUpcoming = (!isClosed && ipo.status === 'Upcoming');

    // User requirement:
    // "1 day before ending date and if it is less than 15% it will tell me to cancel the application for the same"
    const shouldCancel = isOpen && isEndingSoon && isLowGmp;

    let advisoryType = 'NEUTRAL';
    let advisoryMessage = '';
    let advisoryLevel = 'neutral'; // 'danger' | 'warning' | 'success' | 'neutral'

    // Evaluate closed first to avoid marking expired IPOs as safe to apply
    if (isClosed) {
      advisoryType = 'CLOSED';
      advisoryLevel = 'neutral';
      advisoryMessage = `IPO Subscription is closed.`;
    } else if (shouldCancel) {
      advisoryType = 'CANCEL_APPLICATION';
      advisoryLevel = 'danger';
      const timeFrame = isClosingToday ? 'closes today' : 'closes tomorrow (1 day left)';
      advisoryMessage = `⚠️ BELOW THRESHOLD (Application Review Alert): GMP is ${gmpPercent}% (< ${threshold}% target) and IPO ${timeFrame}. Below your filter threshold.`;
    } else if (isOpen && !isLowGmp) {
      advisoryType = 'QUALIFIED_APPLY';
      advisoryLevel = 'success';
      advisoryMessage = `✅ MEETS TARGET: Strong GMP at ${gmpPercent}% (≥ ${threshold}% target). Meets your filter criteria.`;
    } else if (isUpcoming && !isLowGmp) {
      advisoryType = 'UPCOMING_HIGH_GMP';
      advisoryLevel = 'success';
      advisoryMessage = `⭐ UPCOMING: GMP is ${gmpPercent}% (≥ ${threshold}% target).`;
    } else if (isUpcoming && isLowGmp) {
      advisoryType = 'UPCOMING_LOW_GMP';
      advisoryLevel = 'neutral';
      advisoryMessage = `⏳ UPCOMING: GMP is ${gmpPercent}% (< ${threshold}% target).`;
    } else if (isOpen && isLowGmp) {
      advisoryType = 'OPEN_LOW_GMP';
      advisoryLevel = 'warning';
      advisoryMessage = `ℹ️ BELOW TARGET: GMP is currently ${gmpPercent}% (< ${threshold}% target).`;
    }

    // Filter rule: "only show the upcoming,opne ipo who have greater than 15% GMP"
    const qualifies = !isClosed && (isOpen || isUpcoming) && !isLowGmp;

    return {
      daysRemaining,
      isOneDayBefore,
      isClosingToday,
      isEndingSoon,
      isClosed,
      shouldCancel,
      qualifies,
      advisoryType,
      advisoryMessage,
      advisoryLevel
    };
  }

  /**
   * Parse a raw row object into a normalized IPO item
   */
  function normalizeIpo(rawRow, segment = 'Mainboard', threshold = DEFAULT_GMP_THRESHOLD, referenceDate = null) {
    const name = (rawRow.name || '').trim();
    const url = safeUrl(rawRow.url);
    const gmp = parseCurrency(rawRow.gmp);
    const priceBand = parsePriceBand(rawRow.priceBand);
    const est = parseEstListing(rawRow.estListing, gmp, priceBand);
    const dateRange = DateUtils.parseDateRange(rawRow.date);
    const status = parseStatus(rawRow.status);
    const trend = rawRow.trend || '🟡';
    const lastUpdated = (rawRow.lastUpdated || '').trim();

    const ipo = {
      id: name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
      name,
      url,
      segment, // 'Mainboard' or 'SME'
      gmp,
      trend,
      priceBand,
      estListingPrice: est.estPrice,
      gmpPercent: est.gmpPercent,
      dateStr: rawRow.date || '',
      openDate: dateRange.openDate,
      closeDate: dateRange.closeDate,
      status,
      lastUpdated
    };

    const evaluation = evaluateAdvisory(ipo, threshold, referenceDate);
    return Object.assign(ipo, evaluation);
  }

  /**
   * Check if a table is an active GMP table by examining headers
   */
  function isGmpTable(tableContent) {
    if (!tableContent || typeof tableContent !== 'string') return false;
    const lower = tableContent.toLowerCase();
    return lower.includes('gmp') && (lower.includes('price band') || lower.includes('est. listing') || lower.includes('trend'));
  }

  /**
   * Parse HTML string (used in background service worker or tests)
   */
  function parseHtmlTables(htmlContent, threshold = DEFAULT_GMP_THRESHOLD, referenceDate = null) {
    const tableRegex = /<table[\s\S]*?<\/table>/gi;
    const allTables = htmlContent.match(tableRegex) || [];

    // Filter to only GMP tables
    const gmpTables = allTables.filter(t => isGmpTable(t));

    const result = {
      mainboard: [],
      sme: [],
      all: [],
      qualified: [],
      cancelAlerts: []
    };

    gmpTables.forEach((tableHtml, tableIdx) => {
      // First matching table is Mainboard, second is SME
      if (tableIdx > 1) return;
      const segment = (tableIdx === 0) ? 'Mainboard' : 'SME';

      const trRegex = /<tr[\s\S]*?<\/tr>/gi;
      const rows = tableHtml.match(trRegex) || [];

      rows.slice(1).forEach(trHtml => {
        const cellRegex = /<(th|td)[\s\S]*?<\/\1>/gi;
        const cells = trHtml.match(cellRegex) || [];
        if (cells.length < 6) return;

        // Clean cell text
        const cellTexts = cells.map(c => c.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

        // Extract link if any from first cell
        const linkMatch = cells[0].match(/href=[\"']([^\"']+)[\"']/i);
        const url = linkMatch ? linkMatch[1] : '';

        // Columns: 0: Name, 1: GMP, 2: Trend, 3: Price Band, 4: Est Listing, 5: Date, 6: Status, 7: Last Updated
        const rawRow = {
          name: cellTexts[0],
          url,
          gmp: cellTexts[1],
          trend: cellTexts[2],
          priceBand: cellTexts[3],
          estListing: cellTexts[4],
          date: cellTexts[5],
          status: cellTexts[6] || 'Upcoming',
          lastUpdated: cellTexts[7] || ''
        };

        const ipo = normalizeIpo(rawRow, segment, threshold, referenceDate);
        if (tableIdx === 0) {
          result.mainboard.push(ipo);
        } else {
          result.sme.push(ipo);
        }
        result.all.push(ipo);

        if (ipo.qualifies) {
          result.qualified.push(ipo);
        }
        if (ipo.shouldCancel) {
          result.cancelAlerts.push(ipo);
        }
      });
    });

    return result;
  }

  /**
   * Parse in live DOM (used in content script)
   */
  function parseDomTables(documentObj, threshold = DEFAULT_GMP_THRESHOLD, referenceDate = null) {
    const allTables = Array.from(documentObj.querySelectorAll('table'));
    // Filter to GMP tables by header text
    const gmpTables = allTables.filter(table => {
      const headerText = (table.textContent || '').toLowerCase();
      return headerText.includes('gmp') && (headerText.includes('price band') || headerText.includes('trend'));
    });

    const tablesToUse = gmpTables.length > 0 ? gmpTables : allTables;

    const result = {
      mainboard: [],
      sme: [],
      all: [],
      qualified: [],
      cancelAlerts: []
    };

    tablesToUse.forEach((table, tableIdx) => {
      if (tableIdx > 1) return; // Only Mainboard and SME tables
      const segment = (tableIdx === 0) ? 'Mainboard' : 'SME';
      const rows = table.querySelectorAll('tr');

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td, th');
        if (cells.length < 6) continue;

        const nameCell = cells[0];
        const aTag = nameCell.querySelector('a');
        const name = (nameCell.textContent || '').trim();
        const url = aTag ? aTag.href : '';

        const rawRow = {
          name,
          url,
          gmp: (cells[1].textContent || '').trim(),
          trend: (cells[2].textContent || '').trim(),
          priceBand: (cells[3].textContent || '').trim(),
          estListing: (cells[4].textContent || '').trim(),
          date: (cells[5].textContent || '').trim(),
          status: cells[6] ? (cells[6].textContent || '').trim() : 'Upcoming',
          lastUpdated: cells[7] ? (cells[7].textContent || '').trim() : ''
        };

        const ipo = normalizeIpo(rawRow, segment, threshold, referenceDate);
        ipo.domRow = row; // attach live DOM element reference for filtering
        row.dataset.ipoId = ipo.id;
        row.dataset.qualifies = ipo.qualifies ? 'true' : 'false';
        row.dataset.shouldCancel = ipo.shouldCancel ? 'true' : 'false';
        row.dataset.status = ipo.status;
        row.dataset.gmpPercent = String(ipo.gmpPercent);

        if (tableIdx === 0) {
          result.mainboard.push(ipo);
        } else {
          result.sme.push(ipo);
        }
        result.all.push(ipo);

        if (ipo.qualifies) {
          result.qualified.push(ipo);
        }
        if (ipo.shouldCancel) {
          result.cancelAlerts.push(ipo);
        }
      }
    });

    return result;
  }

  return {
    DEFAULT_GMP_THRESHOLD,
    escapeHtml,
    safeUrl,
    parseCurrency,
    parsePriceBand,
    parseEstListing,
    parseStatus,
    evaluateAdvisory,
    normalizeIpo,
    parseHtmlTables,
    parseDomTables
  };
});
