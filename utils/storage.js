/**
 * Storage manager for IPO GMP Tracker Chrome Extension
 * Handles chrome.storage.local with automatic fallback for testing & options persistence
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.IpoStorage = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const STORAGE_KEYS = {
    THRESHOLD: 'ipo_gmp_threshold',
    APPLIED_IPOS: 'ipo_applied_list',
    TREND_HISTORY: 'ipo_trend_history',
    FILTER_ACTIVE: 'ipo_filter_active',
    LAST_SYNC: 'ipo_last_sync_timestamp',
    CACHED_IPOS: 'ipo_cached_list'
  };

  const DEFAULT_SETTINGS = {
    threshold: 15.0,
    filterActive: true,
    appliedIpos: []
  };

  const MAX_HISTORY_DAYS = 30; // Retain max 30 snapshots per IPO to prevent storage exhaustion

  // In-memory fallback if chrome.storage is not available
  const memoryStore = {};

  const hasChromeStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  /**
   * Get value by key
   */
  async function get(key, defaultValue = null) {
    if (hasChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.error('Storage error:', chrome.runtime.lastError);
            resolve(defaultValue);
          } else {
            resolve(result[key] !== undefined ? result[key] : defaultValue);
          }
        });
      });
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    }

    return memoryStore[key] !== undefined ? memoryStore[key] : defaultValue;
  }

  /**
   * Set value by key
   */
  async function set(key, value) {
    if (hasChromeStorage) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve(true);
        });
      });
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        // Fallback
      }
    }

    memoryStore[key] = value;
    return true;
  }

  /**
   * Get GMP threshold (default 15.0)
   */
  async function getThreshold() {
    return await get(STORAGE_KEYS.THRESHOLD, DEFAULT_SETTINGS.threshold);
  }

  /**
   * Set GMP threshold
   */
  async function setThreshold(threshold) {
    const num = parseFloat(threshold);
    const validNum = (isNaN(num) || num < 0) ? DEFAULT_SETTINGS.threshold : num;
    await set(STORAGE_KEYS.THRESHOLD, validNum);
    return validNum;
  }

  /**
   * Get In-Page Filter status (default: true)
   */
  async function isFilterActive() {
    return await get(STORAGE_KEYS.FILTER_ACTIVE, DEFAULT_SETTINGS.filterActive);
  }

  /**
   * Set In-Page Filter status
   */
  async function setFilterActive(active) {
    await set(STORAGE_KEYS.FILTER_ACTIVE, !!active);
    return !!active;
  }

  /**
   * Get list of Applied IPO IDs
   */
  async function getAppliedIpos() {
    return await get(STORAGE_KEYS.APPLIED_IPOS, []);
  }

  /**
   * Toggle Applied status for an IPO
   */
  async function toggleAppliedIpo(ipoId) {
    const list = await getAppliedIpos();
    const index = list.indexOf(ipoId);
    let isApplied = false;
    if (index >= 0) {
      list.splice(index, 1);
      isApplied = false;
    } else {
      list.push(ipoId);
      isApplied = true;
    }
    await set(STORAGE_KEYS.APPLIED_IPOS, list);
    return isApplied;
  }

  /**
   * Check if an IPO is marked as Applied
   */
  async function isIpoApplied(ipoId) {
    const list = await getAppliedIpos();
    return list.includes(ipoId);
  }

  /**
   * Record a snapshot of parsed IPOs to maintain real daily trends
   * Prunes history older than MAX_HISTORY_DAYS to prevent storage leaks.
   */
  async function recordDailySnapshot(ipos) {
    if (!Array.isArray(ipos) || ipos.length === 0) return;
    const history = await get(STORAGE_KEYS.TREND_HISTORY, {});
    const todayIso = new Date().toISOString().split('T')[0];

    const cleanIposForCache = [];

    ipos.forEach(ipo => {
      if (!ipo || !ipo.id) return;
      if (!history[ipo.id]) {
        history[ipo.id] = [];
      }
      const existingTodayIdx = history[ipo.id].findIndex(h => h.date === todayIso);
      const snapshot = {
        date: todayIso,
        displayDate: `${new Date().getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date().getMonth()]}`,
        gmp: ipo.gmp,
        gmpPercent: ipo.gmpPercent,
        trend: ipo.trend,
        status: ipo.status
      };

      if (existingTodayIdx >= 0) {
        history[ipo.id][existingTodayIdx] = snapshot;
      } else {
        history[ipo.id].push(snapshot);
      }

      // Prune to latest MAX_HISTORY_DAYS
      if (history[ipo.id].length > MAX_HISTORY_DAYS) {
        history[ipo.id] = history[ipo.id].slice(-MAX_HISTORY_DAYS);
      }

      // Prepare serializable object for cached list
      cleanIposForCache.push({
        id: ipo.id,
        name: ipo.name,
        url: ipo.url,
        segment: ipo.segment,
        gmp: ipo.gmp,
        trend: ipo.trend,
        priceBand: ipo.priceBand,
        estListingPrice: ipo.estListingPrice,
        gmpPercent: ipo.gmpPercent,
        dateStr: ipo.dateStr,
        status: ipo.status,
        lastUpdated: ipo.lastUpdated
      });
    });

    await set(STORAGE_KEYS.TREND_HISTORY, history);
    await set(STORAGE_KEYS.CACHED_IPOS, cleanIposForCache);
    await set(STORAGE_KEYS.LAST_SYNC, Date.now());
  }

  /**
   * Get cached IPO items
   */
  async function getCachedIpos() {
    return await get(STORAGE_KEYS.CACHED_IPOS, []);
  }

  /**
   * Get saved trend history for an IPO
   */
  async function getSavedTrends(ipoId) {
    const history = await get(STORAGE_KEYS.TREND_HISTORY, {});
    return history[ipoId] || [];
  }

  return {
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    MAX_HISTORY_DAYS,
    get,
    set,
    getThreshold,
    setThreshold,
    isFilterActive,
    setFilterActive,
    getAppliedIpos,
    toggleAppliedIpo,
    isIpoApplied,
    recordDailySnapshot,
    getCachedIpos,
    getSavedTrends
  };
});
