/**
 * In-Page Content Script for IPO Watch GMP Tracker
 * Injects top filter toolbar, enhances tables, adds cancel advisories and trend modal
 */

(async function () {
  'use strict';

  // Dependencies assumed loaded via manifest: IpoDateUtils, IpoParser, IpoSeedData, IpoStorage
  const Parser = window.IpoParser;
  const DateUtils = window.IpoDateUtils;
  const SeedData = window.IpoSeedData;
  const Storage = window.IpoStorage;

  if (!Parser) {
    console.warn('IPO GMP Tracker: Parser not loaded, skipping content script');
    return;
  }

  const escapeHtml = Parser.escapeHtml || (s => String(s || '').replace(/[&<>"']/g, ''));
  const safeUrl = Parser.safeUrl || (u => u || '#');

  let currentThreshold = await Storage.getThreshold();
  let filterState = 'qualified'; // 'qualified' | 'open_high' | 'upcoming_high' | 'cancel_alerts' | 'all'
  let parsedData = null;

  /**
   * Main initializer with retry / observer
   */
  async function init() {
    let tables = document.querySelectorAll('table');
    if (!tables || tables.length === 0) {
      // Retry in 500ms if tables are loaded dynamically
      setTimeout(init, 500);
      return;
    }

    // Parse the live tables
    parsedData = Parser.parseDomTables(document, currentThreshold);

    if (!parsedData || parsedData.all.length === 0) {
      setTimeout(init, 800);
      return;
    }

    // Save snapshot to background/local storage for continuous daily trend building
    await Storage.recordDailySnapshot(parsedData.all);

    // Inject toolbar and enhance table rows
    injectToolbar();
    enhanceTableRows();
    applyFilter();
  }

  /**
   * Inject top sticky/floating toolbar above the tables
   */
  function injectToolbar() {
    const existing = document.getElementById('ipo-gmp-filter-toolbar');
    if (existing) existing.remove();

    const targetTable = document.querySelector('table');
    if (!targetTable) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'ipo-gmp-filter-toolbar';
    toolbar.className = 'ipo-gmp-toolbar';

    const qualifiedCount = parsedData.qualified.length;
    const cancelCount = parsedData.cancelAlerts.length;
    const openCount = parsedData.all.filter(i => i.status === 'Open' && i.gmpPercent >= currentThreshold).length;
    const upcomingCount = parsedData.all.filter(i => i.status === 'Upcoming' && i.gmpPercent >= currentThreshold).length;

    toolbar.innerHTML = `
      <div class="ipo-toolbar-header">
        <div class="ipo-toolbar-title-wrap">
          <img src="${chrome.runtime.getURL('icons/icon32.png')}" alt="IPO GMP" class="ipo-toolbar-icon" />
          <h2 class="ipo-toolbar-title">IPO GMP Intelligence</h2>
          <span class="ipo-toolbar-badge">&gt;${escapeHtml(currentThreshold)}% Filter Active</span>
        </div>
        <div class="ipo-toolbar-stats">
          <div class="ipo-stat-chip stat-qualified">
            <span>Qualified (&gt;${escapeHtml(currentThreshold)}%):</span> <strong>${qualifiedCount}</strong>
          </div>
          <div class="ipo-stat-chip">
            <span>Open Now:</span> <strong>${openCount}</strong>
          </div>
          <div class="ipo-stat-chip">
            <span>Upcoming:</span> <strong>${upcomingCount}</strong>
          </div>
          ${cancelCount > 0 ? `
            <div class="ipo-stat-chip stat-alerts" id="ipo-stat-alerts-chip" title="IPOs closing soon with GMP < ${escapeHtml(currentThreshold)}%">
              <span>⚠️ Below Target:</span> <strong>${cancelCount}</strong>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="ipo-toolbar-controls">
        <div class="ipo-filter-buttons">
          <button class="ipo-btn ${filterState === 'qualified' ? 'active' : ''}" data-filter="qualified">
            🌟 Qualified (≥${escapeHtml(currentThreshold)}%)
          </button>
          <button class="ipo-btn ${filterState === 'open_high' ? 'active' : ''}" data-filter="open_high">
            🟢 Open (≥${escapeHtml(currentThreshold)}%)
          </button>
          <button class="ipo-btn ${filterState === 'upcoming_high' ? 'active' : ''}" data-filter="upcoming_high">
            ⏳ Upcoming (≥${escapeHtml(currentThreshold)}%)
          </button>
          ${cancelCount > 0 ? `
            <button class="ipo-btn btn-danger ${filterState === 'cancel_alerts' ? 'active' : ''}" data-filter="cancel_alerts">
              ⚠️ Below Target (${cancelCount})
            </button>
          ` : ''}
          <button class="ipo-btn ${filterState === 'all' ? 'active' : ''}" data-filter="all">
            📋 Show All (Reset)
          </button>
        </div>

        <div class="ipo-threshold-wrap">
          <span>Min GMP %:</span>
          <input type="number" class="ipo-threshold-input" id="ipo-threshold-input" value="${escapeHtml(currentThreshold)}" min="1" max="100" step="1" />
          <span>%</span>
        </div>
      </div>

      ${cancelCount > 0 ? `
        <div class="ipo-global-alert-banner" id="ipo-global-alert-banner">
          <div>
            <strong>⚠️ Threshold Notice:</strong> 
            There are <strong>${cancelCount} Open IPO(s)</strong> ending soon where GMP is <strong>below ${escapeHtml(currentThreshold)}%</strong>. 
            Tracked for your personal review against your criteria.
          </div>
          <button class="ipo-alert-banner-close" id="ipo-alert-banner-close">&times;</button>
        </div>
      ` : ''}

      <div class="ipo-disclaimer-notice" style="font-size: 11px; color: #64748B; padding: 6px 12px; background: rgba(0,0,0,0.03); border-top: 1px solid #E2E8F0; text-align: center;">
        ℹ️ Personal screening tool based on public grey market estimates. Does not constitute financial or investment advice.
      </div>
    `;

    targetTable.parentNode.insertBefore(toolbar, targetTable);

    // Event Listeners for filter buttons
    toolbar.querySelectorAll('.ipo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterState = btn.dataset.filter;
        toolbar.querySelectorAll('.ipo-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilter();
      });
    });

    // Alert chip click
    const alertChip = toolbar.querySelector('#ipo-stat-alerts-chip');
    if (alertChip) {
      alertChip.addEventListener('click', () => {
        filterState = 'cancel_alerts';
        toolbar.querySelectorAll('.ipo-btn').forEach(b => b.classList.remove('active'));
        const alertBtn = toolbar.querySelector('[data-filter="cancel_alerts"]');
        if (alertBtn) alertBtn.classList.add('active');
        applyFilter();
      });
    }

    // Threshold input change
    const thresholdInput = toolbar.querySelector('#ipo-threshold-input');
    if (thresholdInput) {
      thresholdInput.addEventListener('change', async (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          currentThreshold = val;
          await Storage.setThreshold(val);
          // Re-evaluate
          parsedData = Parser.parseDomTables(document, currentThreshold);
          injectToolbar();
          enhanceTableRows();
          applyFilter();
        }
      });
    }

    // Close banner button
    const closeBtn = toolbar.querySelector('#ipo-alert-banner-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const b = toolbar.querySelector('#ipo-global-alert-banner');
        if (b) b.remove();
      });
    }
  }

  /**
   * Enhance table rows with badges, trend buttons, and action advisories
   */
  function enhanceTableRows() {
    parsedData.all.forEach(ipo => {
      const row = ipo.domRow;
      if (!row) return;

      // Clean previously injected items
      row.querySelectorAll('.ipo-injected').forEach(el => el.remove());

      // Update row classes
      row.classList.remove('ipo-row-cancel-alert', 'ipo-row-qualified');
      if (ipo.shouldCancel) {
        row.classList.add('ipo-row-cancel-alert');
      } else if (ipo.qualifies) {
        row.classList.add('ipo-row-qualified');
      }

      // Add badge to Name Cell (cell 0)
      const nameCell = row.cells[0];
      if (nameCell) {
        if (ipo.shouldCancel) {
          const badge = document.createElement('span');
          badge.className = 'ipo-cell-badge ipo-badge-cancel ipo-injected';
          badge.textContent = '⚠️ BELOW TARGET';
          badge.title = ipo.advisoryMessage;
          nameCell.appendChild(badge);
        } else if (ipo.qualifies && ipo.status === 'Open') {
          const badge = document.createElement('span');
          badge.className = 'ipo-cell-badge ipo-badge-safe ipo-injected';
          badge.textContent = `✅ ${ipo.gmpPercent}%`;
          nameCell.appendChild(badge);
        }
      }

      // Add "Trend" Button to Trend Cell (cell 2) or Name cell
      const targetCell = row.cells[2] || row.cells[0];
      if (targetCell) {
        const trendBtn = document.createElement('button');
        trendBtn.className = 'ipo-trend-action-btn ipo-injected';
        trendBtn.innerHTML = '📈 Trend';
        trendBtn.title = `View all day trends for ${escapeHtml(ipo.name)}`;
        trendBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openTrendModal(ipo);
        });
        targetCell.appendChild(trendBtn);
      }
    });
  }

  /**
   * Apply row visibility according to filterState
   */
  function applyFilter() {
    parsedData.all.forEach(ipo => {
      const row = ipo.domRow;
      if (!row) return;

      let show = false;

      switch (filterState) {
        case 'qualified':
          show = ipo.qualifies;
          break;
        case 'open_high':
          show = (ipo.status === 'Open' && ipo.gmpPercent >= currentThreshold);
          break;
        case 'upcoming_high':
          show = (ipo.status === 'Upcoming' && ipo.gmpPercent >= currentThreshold);
          break;
        case 'cancel_alerts':
          show = ipo.shouldCancel;
          break;
        case 'all':
        default:
          show = true;
          break;
      }

      if (show) {
        row.classList.remove('ipo-row-filtered-out');
      } else {
        row.classList.add('ipo-row-filtered-out');
      }
    });
  }

  /**
   * Render SVG Sparkline Trend Chart
   */
  function renderSvgChart(trends, threshold) {
    if (!trends || trends.length === 0) return '';

    const width = 580;
    const height = 130;
    const padding = { top: 20, right: 30, bottom: 25, left: 45 };

    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const pcts = trends.map(t => t.gmpPercent);
    const maxVal = Math.max(...pcts, threshold, 20);
    const minVal = Math.min(0, Math.min(...pcts));

    const range = (maxVal - minVal) || 1;

    const points = trends.map((t, idx) => {
      const x = padding.left + (idx / Math.max(1, trends.length - 1)) * innerW;
      const y = padding.top + innerH - ((t.gmpPercent - minVal) / range) * innerH;
      return { x, y, ...t };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaData = `${pathData} L ${points[points.length - 1].x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padding.top + innerH).toFixed(1)} Z`;

    const thresholdY = padding.top + innerH - ((threshold - minVal) / range) * innerH;

    const nodes = points.map(p => {
      const isBelow = p.gmpPercent < threshold;
      const color = isBelow ? '#EF4444' : '#10B981';
      const cleanDate = escapeHtml(p.displayDate);
      return `
        <g class="chart-node">
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="${color}" stroke="#FFFFFF" stroke-width="2" />
          <text x="${p.x.toFixed(1)}" y="${(p.y - 8).toFixed(1)}" font-size="10" font-weight="700" fill="${color}" text-anchor="middle">
            ${escapeHtml(p.gmpPercent)}%
          </text>
          <text x="${p.x.toFixed(1)}" y="${(padding.top + innerH + 16).toFixed(1)}" font-size="9.5" fill="#64748B" text-anchor="middle">
            ${cleanDate.split(' ')[0]} ${cleanDate.split(' ')[1] || ''}
          </text>
        </g>
      `;
    }).join('');

    return `
      <svg class="ipo-svg-chart" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.02" />
          </linearGradient>
        </defs>

        <!-- Threshold Reference Line -->
        <line x1="${padding.left}" y1="${thresholdY.toFixed(1)}" x2="${padding.left + innerW}" y2="${thresholdY.toFixed(1)}" stroke="#EF4444" stroke-width="1.5" stroke-dasharray="4,4" opacity="0.8" />
        <text x="${padding.left + innerW + 4}" y="${(thresholdY + 3).toFixed(1)}" font-size="10" font-weight="700" fill="#EF4444">
          ${escapeHtml(threshold)}% Min
        </text>

        <!-- Area fill -->
        <path d="${areaData}" fill="url(#chartAreaGrad)" />

        <!-- Line stroke -->
        <path d="${pathData}" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

        <!-- Nodes -->
        ${nodes}
      </svg>
    `;
  }

  /**
   * Open the detailed Day-by-Day Trend Modal
   */
  async function openTrendModal(ipo) {
    const existingModal = document.getElementById('ipo-trend-modal-backdrop');
    if (existingModal) existingModal.remove();

    // Fetch trend data
    const saved = await Storage.getSavedTrends(ipo.id);
    const trends = (saved && saved.length > 0) ? saved : SeedData.getIpoTrends(ipo);

    const isApplied = await Storage.isIpoApplied(ipo.id);
    const countdownInfo = DateUtils.getCountdownInfo(ipo.daysRemaining);

    const backdrop = document.createElement('div');
    backdrop.id = 'ipo-trend-modal-backdrop';
    backdrop.className = 'ipo-modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'ipo-modal-dialog';

    modal.innerHTML = `
      <div class="ipo-modal-header">
        <h3 class="ipo-modal-title">
          <span>${escapeHtml(ipo.name)}</span>
          <span style="font-size: 11px; background: #E2E8F0; color: #475569; padding: 2px 8px; border-radius: 4px; font-weight: 600;">
            ${escapeHtml(ipo.segment)}
          </span>
          <span style="font-size: 11px; background: ${ipo.status === 'Open' ? '#DCFCE7' : '#EFF6FF'}; color: ${ipo.status === 'Open' ? '#166534' : '#1E40AF'}; padding: 2px 8px; border-radius: 4px; font-weight: 700;">
            ${escapeHtml(ipo.status)}
          </span>
        </h3>
        <button class="ipo-modal-close" id="ipo-modal-close-btn">&times;</button>
      </div>

      <div class="ipo-modal-body">
        <!-- Advisory Notice Banner -->
        <div class="ipo-modal-advisory advisory-${escapeHtml(ipo.advisoryLevel)}">
          <div style="font-size: 18px; line-height: 1;">
            ${ipo.shouldCancel ? '⚠️' : (ipo.qualifies ? '✅' : '⏳')}
          </div>
          <div>
            <strong>${ipo.shouldCancel ? 'Threshold Notice: Below Custom Target' : (ipo.qualifies ? 'Screening Status: Meets Criteria' : 'Screening Status')}</strong>
            <p style="margin: 4px 0 0 0;">${escapeHtml(ipo.advisoryMessage)}</p>
          </div>
        </div>

        <!-- Metrics Grid -->
        <div class="ipo-modal-metrics">
          <div class="ipo-metric-box">
            <div class="ipo-metric-label">Current GMP</div>
            <div class="ipo-metric-val" style="color: ${ipo.gmpPercent >= currentThreshold ? '#10B981' : '#EF4444'};">
              ₹${escapeHtml(ipo.gmp)} (${escapeHtml(ipo.gmpPercent)}%)
            </div>
          </div>
          <div class="ipo-metric-box">
            <div class="ipo-metric-label">Price Band</div>
            <div class="ipo-metric-val">₹${escapeHtml(ipo.priceBand)}</div>
          </div>
          <div class="ipo-metric-box">
            <div class="ipo-metric-label">Est. Listing</div>
            <div class="ipo-metric-val">₹${escapeHtml(ipo.estListingPrice)}</div>
          </div>
          <div class="ipo-metric-box">
            <div class="ipo-metric-label">Closing Date</div>
            <div class="ipo-metric-val" style="font-size: 13px;">
              ${escapeHtml(ipo.dateStr)}
              <div style="font-size: 10px; color: ${countdownInfo.type === 'danger' ? '#EF4444' : (countdownInfo.type === 'warning' ? '#F59E0B' : '#10B981')}; font-weight: 700;">
                ${escapeHtml(countdownInfo.text)}
              </div>
            </div>
          </div>
        </div>

        <!-- Trend Chart -->
        <div class="ipo-chart-container">
          <div class="ipo-chart-title">
            <span>Daily GMP Movement (All Days Leading to Close)</span>
            <span style="font-weight: 500; font-size: 11px;">Threshold: ${escapeHtml(currentThreshold)}%</span>
          </div>
          ${renderSvgChart(trends, currentThreshold)}
        </div>

        <!-- Day by Day History Table -->
        <div style="margin-top: 15px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 13px; color: #0F172A; text-transform: uppercase;">Daily Historical Log</strong>
            <button class="ipo-btn" id="ipo-toggle-applied-btn" style="font-size: 11px; padding: 4px 10px;">
              ${isApplied ? '★ Marked as Applied' : '☆ Mark as Applied'}
            </button>
          </div>
          <table class="ipo-trend-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>GMP (₹)</th>
                <th>GMP (%)</th>
                <th>Trend</th>
                <th>Status</th>
                <th>Decision Signal</th>
              </tr>
            </thead>
            <tbody>
              ${trends.map(t => {
                const isUnder = t.gmpPercent < currentThreshold;
                const isFinalDay = t.displayDate.includes('1 Day Before Close') || t.displayDate.includes('Closing Day');
                return `
                  <tr style="${isUnder && isFinalDay ? 'background: #FEF2F2; font-weight: 600;' : ''}">
                    <td>${escapeHtml(t.displayDate)}</td>
                    <td>₹${escapeHtml(t.gmp)}</td>
                    <td style="color: ${isUnder ? '#EF4444' : '#10B981'}; font-weight: 700;">
                      ${escapeHtml(t.gmpPercent)}%
                    </td>
                    <td>${escapeHtml(t.trend)}</td>
                    <td>${escapeHtml(t.status)}</td>
                    <td>
                      ${isUnder && isFinalDay ? '<span style="color: #DC2626; font-weight: 700;">⚠️ BELOW TARGET</span>' : 
                        (t.gmpPercent >= currentThreshold ? '<span style="color: #10B981; font-weight: 600;">✅ Qualified</span>' : '<span style="color: #94A3B8;">Low GMP</span>')}
                    </td>
                  </tr>
                `;
              }).reverse().join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Event listeners
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.remove();
    });

    modal.querySelector('#ipo-modal-close-btn').addEventListener('click', () => {
      backdrop.remove();
    });

    // Close on Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        backdrop.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    const appliedBtn = modal.querySelector('#ipo-toggle-applied-btn');
    if (appliedBtn) {
      appliedBtn.addEventListener('click', async () => {
        const newState = await Storage.toggleAppliedIpo(ipo.id);
        appliedBtn.textContent = newState ? '★ Marked as Applied' : '☆ Mark as Applied';
      });
    }
  }

  // Run on start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
