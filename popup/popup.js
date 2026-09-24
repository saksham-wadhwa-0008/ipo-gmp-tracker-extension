/**
 * Popup Script for IPO GMP Tracker Chrome Extension
 * Handles data fetching, tab switching, search, card rendering, and trend visualization
 */

(async function () {
  'use strict';

  const Parser = window.IpoParser;
  const DateUtils = window.IpoDateUtils;
  const SeedData = window.IpoSeedData;
  const Storage = window.IpoStorage;

  if (!Parser) {
    console.error('Parser module not available');
    return;
  }

  const escapeHtml = Parser.escapeHtml || (s => String(s || '').replace(/[&<>"']/g, ''));
  const safeUrl = Parser.safeUrl || (u => u || 'https://ipowatch.in');

  // State
  let currentThreshold = 15.0;
  let activeTab = 'qualified';
  let searchQuery = '';
  let ipoData = { all: [], qualified: [], mainboard: [], sme: [], cancelAlerts: [] };
  let appliedList = [];
  let openDrawers = new Set();

  // DOM Elements
  const statQualified = document.getElementById('stat-qualified');
  const statOpen = document.getElementById('stat-open');
  const statAlerts = document.getElementById('stat-alerts');
  const cardAlerts = document.getElementById('metric-card-alerts');
  const cancelBanner = document.getElementById('cancel-alert-banner');
  const cancelAlertText = document.getElementById('cancel-alert-text');
  const viewCancelAlertsBtn = document.getElementById('view-cancel-alerts-btn');

  const searchInput = document.getElementById('search-input');
  const thresholdInput = document.getElementById('threshold-input');
  const refreshBtn = document.getElementById('refresh-btn');
  const tabButtons = document.querySelectorAll('.tab-btn');

  const ipoListContainer = document.getElementById('ipo-list');
  const loadingSpinner = document.getElementById('loading-spinner');
  const emptyState = document.getElementById('empty-state');
  const lastUpdatedText = document.getElementById('last-updated-text');

  /**
   * Main Initialization
   */
  async function init() {
    currentThreshold = await Storage.getThreshold();
    thresholdInput.value = currentThreshold;
    appliedList = await Storage.getAppliedIpos();

    setupEventListeners();
    await loadIpoData();
  }

  /**
   * Setup UI Event Listeners
   */
  function setupEventListeners() {
    // Search
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderList();
    });

    // Threshold change
    thresholdInput.addEventListener('change', async (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        currentThreshold = val;
        await Storage.setThreshold(val);
        reEvaluateData();
        updateStats();
        renderList();
      }
    });

    // Refresh button
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('rotating');

      // Request background sync if runtime available
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        try {
          chrome.runtime.sendMessage({ action: 'FORCE_SYNC' });
        } catch (e) {}
      }

      await loadIpoData(true);
      setTimeout(() => refreshBtn.classList.remove('rotating'), 600);
    });

    // Tab buttons
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderList();
      });
    });

    // Cancel Banner action
    if (viewCancelAlertsBtn) {
      viewCancelAlertsBtn.addEventListener('click', () => {
        activeTab = 'cancel_alerts';
        tabButtons.forEach(b => b.classList.remove('active'));
        const alertTab = document.querySelector('[data-tab="cancel_alerts"]');
        if (alertTab) alertTab.classList.add('active');
        renderList();
      });
    }

    if (cardAlerts) {
      cardAlerts.addEventListener('click', () => {
        activeTab = 'cancel_alerts';
        tabButtons.forEach(b => b.classList.remove('active'));
        const alertTab = document.querySelector('[data-tab="cancel_alerts"]');
        if (alertTab) alertTab.classList.add('active');
        renderList();
      });
    }
  }

  /**
   * Fetch live IPO data from IPOWatch or fallback to cache
   */
  async function loadIpoData(forceRefresh = false) {
    showLoading(true);

    try {
      const url = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/';
      const response = await fetch(url, { cache: forceRefresh ? 'reload' : 'default' });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const html = await response.text();
      ipoData = Parser.parseHtmlTables(html, currentThreshold);

      // Record snapshot to persist daily trends
      await Storage.recordDailySnapshot(ipoData.all);

      if (lastUpdatedText && ipoData.all.length > 0 && ipoData.all[0].lastUpdated) {
        lastUpdatedText.textContent = `Updated: ${ipoData.all[0].lastUpdated}`;
      }
    } catch (err) {
      console.warn('Could not fetch live IPO Watch directly, using stored trend snapshot:', err);
      // Fallback: load cached data or synthesize from seeds
      await loadFromStoredHistory();
    } finally {
      showLoading(false);
      updateStats();
      renderList();
    }
  }

  /**
   * Fallback loader when direct network fetch fails
   */
  async function loadFromStoredHistory() {
    // 1. Try to load cached items from storage
    const cached = await Storage.getCachedIpos();

    if (cached && cached.length > 0) {
      const all = cached.map(raw => Parser.normalizeIpo(raw, raw.segment, currentThreshold));
      ipoData = {
        all,
        qualified: all.filter(i => i.qualifies),
        mainboard: all.filter(i => i.segment === 'Mainboard'),
        sme: all.filter(i => i.segment === 'SME'),
        cancelAlerts: all.filter(i => i.shouldCancel)
      };
      if (lastUpdatedText) lastUpdatedText.textContent = 'Mode: Offline Cache';
      return;
    }

    // 2. Synthesize from seed data if cache is empty
    const synthesized = [];
    for (const [id, points] of Object.entries(SeedData.SEED_TRENDS)) {
      if (points && points.length > 0) {
        const latest = points[points.length - 1];
        const name = id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        synthesized.push({
          id,
          name,
          url: `https://ipowatch.in/${id}-ipo/`,
          segment: id.includes('tech') || id.includes('edu') ? 'SME' : 'Mainboard',
          gmp: latest.gmp,
          trend: latest.trend,
          priceBand: latest.gmp > 0 ? Math.round(latest.gmp / (latest.gmpPercent / 100)) : 100,
          estListingPrice: latest.gmp > 0 ? Math.round(latest.gmp / (latest.gmpPercent / 100)) + latest.gmp : 100,
          gmpPercent: latest.gmpPercent,
          dateStr: '23-25 Sept',
          openDate: new Date(2026, 8, 23),
          closeDate: new Date(2026, 8, 25),
          status: latest.status,
          lastUpdated: 'Today'
        });
      }
    }

    const all = synthesized.map(item => Parser.normalizeIpo(item, item.segment, currentThreshold));
    ipoData = {
      all,
      qualified: all.filter(i => i.qualifies),
      mainboard: all.filter(i => i.segment === 'Mainboard'),
      sme: all.filter(i => i.segment === 'SME'),
      cancelAlerts: all.filter(i => i.shouldCancel)
    };
    if (lastUpdatedText) lastUpdatedText.textContent = 'Mode: Seed Preview';
  }

  /**
   * Re-evaluate advisory rules for current threshold
   */
  function reEvaluateData() {
    if (!ipoData.all || ipoData.all.length === 0) return;

    ipoData.qualified = [];
    ipoData.cancelAlerts = [];

    ipoData.all.forEach(ipo => {
      const evalResult = Parser.evaluateAdvisory(ipo, currentThreshold);
      Object.assign(ipo, evalResult);

      if (ipo.qualifies) {
        ipoData.qualified.push(ipo);
      }
      if (ipo.shouldCancel) {
        ipoData.cancelAlerts.push(ipo);
      }
    });
  }

  /**
   * Update header metric counts & warning banners
   */
  function updateStats() {
    const qualCount = ipoData.qualified ? ipoData.qualified.length : 0;
    const openCount = ipoData.all ? ipoData.all.filter(i => i.status === 'Open' && i.gmpPercent >= currentThreshold).length : 0;
    const alertCount = ipoData.cancelAlerts ? ipoData.cancelAlerts.length : 0;

    if (statQualified) statQualified.textContent = qualCount;
    if (statOpen) statOpen.textContent = openCount;
    if (statAlerts) statAlerts.textContent = alertCount;

    if (cardAlerts) {
      if (alertCount > 0) {
        cardAlerts.classList.add('has-alerts');
      } else {
        cardAlerts.classList.remove('has-alerts');
      }
    }

    if (cancelBanner) {
      if (alertCount > 0) {
        cancelBanner.classList.remove('hidden');
        if (cancelAlertText) {
          cancelAlertText.textContent = `${alertCount} Open IPO(s) closing soon have GMP < ${currentThreshold}%!`;
        }
      } else {
        cancelBanner.classList.add('hidden');
      }
    }
  }

  /**
   * Filter and render IPO cards
   */
  function renderList() {
    ipoListContainer.innerHTML = '';

    let items = [];

    switch (activeTab) {
      case 'qualified':
        items = ipoData.all.filter(i => i.qualifies);
        break;
      case 'open':
        items = ipoData.all.filter(i => i.status === 'Open');
        break;
      case 'upcoming':
        items = ipoData.all.filter(i => i.status === 'Upcoming');
        break;
      case 'cancel_alerts':
        items = ipoData.all.filter(i => i.shouldCancel);
        break;
      case 'watchlist':
        items = ipoData.all.filter(i => appliedList.includes(i.id));
        break;
      case 'all':
      default:
        items = [...ipoData.all];
        break;
    }

    // Apply search query
    if (searchQuery) {
      items = items.filter(i => i.name.toLowerCase().includes(searchQuery));
    }

    if (items.length === 0) {
      emptyState.classList.remove('hidden');
      const emptyTitle = document.getElementById('empty-title');
      const emptySub = document.getElementById('empty-subtitle');

      if (activeTab === 'cancel_alerts') {
        emptyTitle.textContent = 'No Cancel Advisories 🎉';
        emptySub.textContent = `All IPOs ending soon have healthy GMP (>= ${currentThreshold}%).`;
      } else if (activeTab === 'watchlist') {
        emptyTitle.textContent = 'No Applied IPOs';
        emptySub.textContent = 'Click "★ Mark Applied" on any IPO card to track it here.';
      } else {
        emptyTitle.textContent = 'No Matching IPOs';
        emptySub.textContent = `No IPOs found with GMP >= ${currentThreshold}% in this view.`;
      }
      return;
    }

    emptyState.classList.add('hidden');

    // Sort: Cancel alerts first, then highest GMP %
    items.sort((a, b) => {
      if (a.shouldCancel && !b.shouldCancel) return -1;
      if (!a.shouldCancel && b.shouldCancel) return 1;
      return b.gmpPercent - a.gmpPercent;
    });

    items.forEach(ipo => {
      const card = createIpoCard(ipo);
      ipoListContainer.appendChild(card);
    });
  }

  /**
   * Build HTML Card for an IPO
   */
  function createIpoCard(ipo) {
    const card = document.createElement('div');
    card.className = `ipo-card ${ipo.shouldCancel ? 'card-cancel-alert' : ''}`;
    card.dataset.id = ipo.id;

    const isApplied = appliedList.includes(ipo.id);
    const isDrawerOpen = openDrawers.has(ipo.id);
    const countdown = DateUtils.getCountdownInfo(ipo.daysRemaining);

    // Timing Badge Style
    let timingClass = 'badge-neutral';
    if (ipo.daysRemaining === 0) timingClass = 'badge-danger';
    else if (ipo.daysRemaining === 1) timingClass = ipo.shouldCancel ? 'badge-danger' : 'badge-warning';
    else if (ipo.daysRemaining > 1) timingClass = 'badge-success';

    card.innerHTML = `
      <div class="card-top">
        <div class="card-title-group">
          <div class="card-title">
            <a href="${safeUrl(ipo.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(ipo.name)}</a>
            <span class="badge-tag tag-${escapeHtml(ipo.segment.toLowerCase())}">${escapeHtml(ipo.segment)}</span>
            <span class="badge-tag tag-${escapeHtml(ipo.status.toLowerCase())}">${escapeHtml(ipo.status)}</span>
          </div>
        </div>
      </div>

      <!-- Advisory Banner -->
      <div class="card-advisory advisory-${escapeHtml(ipo.advisoryLevel)}">
        <span>${ipo.shouldCancel ? '🚨' : (ipo.qualifies ? '✅' : '⏳')}</span>
        <div>${escapeHtml(ipo.advisoryMessage)}</div>
      </div>

      <!-- Numbers Grid -->
      <div class="card-metrics">
        <div>
          <div class="c-metric-label">GMP (₹)</div>
          <div class="c-metric-val ${ipo.gmpPercent >= currentThreshold ? 'gmp-high' : 'gmp-low'}">
            ₹${escapeHtml(ipo.gmp)} (${escapeHtml(ipo.gmpPercent)}%) ${escapeHtml(ipo.trend)}
          </div>
        </div>
        <div>
          <div class="c-metric-label">Price Band</div>
          <div class="c-metric-val">₹${escapeHtml(ipo.priceBand)}</div>
        </div>
        <div>
          <div class="c-metric-label">Est. Listing</div>
          <div class="c-metric-val">₹${escapeHtml(ipo.estListingPrice)}</div>
        </div>
      </div>

      <!-- Timing Info -->
      <div class="card-timing">
        <div>Dates: <strong>${escapeHtml(ipo.dateStr || 'TBD')}</strong></div>
        <div class="timing-badge ${timingClass}">${escapeHtml(countdown.text)}</div>
      </div>

      <!-- Actions -->
      <div class="card-actions">
        <button class="btn-card-action btn-trend-toggle" data-id="${escapeHtml(ipo.id)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          ${isDrawerOpen ? 'Hide Trend' : '📈 View Trend'}
        </button>

        <button class="btn-card-action btn-applied ${isApplied ? 'is-applied' : ''}" data-id="${escapeHtml(ipo.id)}">
          ${isApplied ? '★ Applied' : '☆ Mark Applied'}
        </button>
      </div>

      <!-- Expandable Trend Drawer -->
      <div class="trend-drawer ${isDrawerOpen ? 'open' : ''}" id="drawer-${escapeHtml(ipo.id)}">
        <!-- Populated on click -->
      </div>
    `;

    // Trend Toggle Listener
    const trendBtn = card.querySelector('.btn-trend-toggle');
    const drawer = card.querySelector(`#drawer-${ipo.id}`);

    trendBtn.addEventListener('click', async () => {
      if (openDrawers.has(ipo.id)) {
        openDrawers.delete(ipo.id);
        drawer.classList.remove('open');
        trendBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          📈 View Trend
        `;
      } else {
        openDrawers.add(ipo.id);
        await renderDrawerContent(drawer, ipo);
        drawer.classList.add('open');
        trendBtn.textContent = 'Hide Trend';
      }
    });

    // Populate drawer if already marked open
    if (isDrawerOpen) {
      renderDrawerContent(drawer, ipo);
    }

    // Applied Button Listener
    const appliedBtn = card.querySelector('.btn-applied');
    appliedBtn.addEventListener('click', async () => {
      const newState = await Storage.toggleAppliedIpo(ipo.id);
      appliedList = await Storage.getAppliedIpos();
      appliedBtn.classList.toggle('is-applied', newState);
      appliedBtn.textContent = newState ? '★ Applied' : '☆ Mark Applied';

      if (activeTab === 'watchlist') {
        renderList();
      }
    });

    return card;
  }

  /**
   * Render SVG chart and day-by-day table inside card drawer
   */
  async function renderDrawerContent(drawer, ipo) {
    const saved = await Storage.getSavedTrends(ipo.id);
    const trends = (saved && saved.length > 0) ? saved : SeedData.getIpoTrends(ipo);

    drawer.innerHTML = `
      <div class="drawer-chart-container">
        <div style="display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; color: #475569; margin-bottom: 6px;">
          <span>GMP TREND (ALL DAYS LEADING TO CLOSE)</span>
          <span>Target: &gt;${escapeHtml(currentThreshold)}%</span>
        </div>
        ${renderDrawerSvg(trends, currentThreshold)}
      </div>

      <table class="drawer-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>GMP (₹)</th>
            <th>Gain (%)</th>
            <th>Trend</th>
            <th>Advisory</th>
          </tr>
        </thead>
        <tbody>
          ${trends.map(t => {
            const isUnder = t.gmpPercent < currentThreshold;
            const isEnding = t.displayDate.includes('1 Day Before Close') || t.displayDate.includes('Closing Day');
            return `
              <tr style="${isUnder && isEnding ? 'background: #FEF2F2; font-weight: 700;' : ''}">
                <td>${escapeHtml(t.displayDate)}</td>
                <td>₹${escapeHtml(t.gmp)}</td>
                <td style="color: ${isUnder ? '#EF4444' : '#10B981'}; font-weight: 700;">${escapeHtml(t.gmpPercent)}%</td>
                <td>${escapeHtml(t.trend)}</td>
                <td>${isUnder && isEnding ? '<span style="color: #DC2626;">🚨 CANCEL</span>' : (t.gmpPercent >= currentThreshold ? '✅ Qualified' : 'Low')}</td>
              </tr>
            `;
          }).reverse().join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Compact SVG Chart for Card Drawer
   */
  function renderDrawerSvg(trends, threshold) {
    if (!trends || trends.length === 0) return '<p style="font-size: 11px;">No trend data available.</p>';

    const width = 410;
    const height = 95;
    const pad = { top: 15, right: 30, bottom: 20, left: 35 };

    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const pcts = trends.map(t => t.gmpPercent);
    const maxVal = Math.max(...pcts, threshold, 20);
    const minVal = Math.min(0, Math.min(...pcts));
    const range = (maxVal - minVal) || 1;

    const points = trends.map((t, idx) => {
      const x = pad.left + (idx / Math.max(1, trends.length - 1)) * innerW;
      const y = pad.top + innerH - ((t.gmpPercent - minVal) / range) * innerH;
      return { x, y, ...t };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaData = `${pathData} L ${points[points.length - 1].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;
    const threshY = pad.top + innerH - ((threshold - minVal) / range) * innerH;

    const nodes = points.map(p => {
      const color = p.gmpPercent < threshold ? '#EF4444' : '#10B981';
      const cleanDate = escapeHtml(p.displayDate);
      return `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" />
        <text x="${p.x.toFixed(1)}" y="${(p.y - 5).toFixed(1)}" font-size="8.5" font-weight="700" fill="${color}" text-anchor="middle">
          ${escapeHtml(p.gmpPercent)}%
        </text>
        <text x="${p.x.toFixed(1)}" y="${(pad.top + innerH + 13).toFixed(1)}" font-size="8" fill="#64748B" text-anchor="middle">
          ${cleanDate.split(' ')[0]} ${cleanDate.split(' ')[1] || ''}
        </text>
      `;
    }).join('');

    return `
      <svg style="width: 100%; height: ${height}px; overflow: visible;" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="drawerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <line x1="${pad.left}" y1="${threshY.toFixed(1)}" x2="${pad.left + innerW}" y2="${threshY.toFixed(1)}" stroke="#EF4444" stroke-width="1" stroke-dasharray="3,3" opacity="0.8" />
        <text x="${pad.left + innerW + 3}" y="${(threshY + 3).toFixed(1)}" font-size="8.5" font-weight="700" fill="#EF4444">
          ${escapeHtml(threshold)}%
        </text>

        <path d="${areaData}" fill="url(#drawerGrad)" />
        <path d="${pathData}" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        ${nodes}
      </svg>
    `;
  }

  function showLoading(show) {
    if (loadingSpinner) {
      if (show) loadingSpinner.classList.remove('hidden');
      else loadingSpinner.classList.add('hidden');
    }
  }

  // Start app
  document.addEventListener('DOMContentLoaded', init);
})();
