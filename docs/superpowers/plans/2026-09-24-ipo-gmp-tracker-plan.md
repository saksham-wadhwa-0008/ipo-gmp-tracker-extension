# IPO GMP Tracker & Advisory Chrome Extension — Implementation Plan

**Branch:** `feature/ipo-gmp-tracker-extension`  
**Date:** September 24, 2026  
**Target:** https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/  

---

## Proposed Changes

### Phase 1: Project Setup & Package Configuration
- `package.json`: Project manifest with test scripts (`node --test`).
- `manifest.json`: Manifest V3 configuration with:
  - `content_scripts`: injected on `*://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/*`
  - `background`: `background/service_worker.js`
  - `action`: `popup/popup.html`
  - `permissions`: `storage`, `alarms`, `notifications`
  - `host_permissions`: `*://ipowatch.in/*`
- `icons/`: Generate high-quality icons (16, 32, 48, 128px) + `icon.svg`.

### Phase 2: Core Utilities & Test-Driven Development (TDD)
- `utils/date_utils.js`:
  - Date parser supporting `DD-DD Month`, `DD-DD Month1-Month2`, `Month DD, YYYY`.
  - Calculates `daysRemaining`, `isOneDayBeforeClose`, `getClosingDate`.
- `utils/parser.js`:
  - Parses table rows (both DOM elements in content script and HTML string in background/popup).
  - Normalizes GMP (₹), Price Band, Est. Listing %, Status, and Date.
  - Determines `qualifies` (Upcoming/Open AND GMP >= threshold).
  - Determines `cancellationAdvisory` (Open AND daysRemaining <= 1 AND GMP < threshold).
- `utils/seed_data.js`:
  - Historical day-wise trend records for active IPOs (Moneyview, German Green Steel, Orient Cables, Adroit Industries, A-One Steels, etc.).
- `utils/storage.js`:
  - Chrome storage wrapper for trend logs, user threshold (default 15%), and applied IPOs.
- `tests/`:
  - `tests/date_utils.test.js`
  - `tests/parser.test.js`
  - `tests/advisory.test.js`

### Phase 3: In-Page Content Script (`content/`)
- `content/content.js`:
  - Auto-injected on `ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/*`.
  - Injects top control bar:
    - Toggle: "Show Only Upcoming/Open with GMP > 15%" (active by default).
    - Status badges (Qualified count, Total count, Cancel advisories count).
    - Filter tabs: All >15%, Open >15%, Upcoming >15%, Reset / Show All.
    - Global Cancel Alert Banner if any IPO ending tomorrow has GMP < 15%.
  - Table Enhancements:
    - Filters table rows live based on threshold and status.
    - Adds Action chips: 🟢 `Strong (>15%)`, 🟡 `Upcoming`, 🔴 `CANCEL ADVISORY (<15% 1 day before close)`.
    - Injects `📈 Trend` button on each row opening an in-page modal dialog.
  - Trend Modal:
    - Interactive day-by-day table and SVG sparkline/trend graph.
- `content/content.css`:
  - Clean floating sticky pill, action badges, modal backdrop, smooth transitions.

### Phase 4: Popup Dashboard UI (`popup/`)
- `popup/popup.html`:
  - Dashboard layout with stats overview (Qualified, Open, Cancel Alerts).
  - Threshold slider & search input.
  - Tab navigation: `Qualified (>15%)`, `Open`, `Upcoming`, `Cancel Alerts`, `Watchlist/Applied`, `All`.
  - Interactive IPO cards with date countdown, price, GMP %, decision advisory badge, "View Trend" drawer, and "Mark Applied" toggle.
- `popup/popup.css`:
  - Polished modern UI matching Astra 6 / Fabel 5.1 design caliber.
- `popup/popup.js`:
  - Tab switching, searching, card rendering, trend drawer, storage synchronization.

### Phase 5: Background Service Worker & Notifications (`background/`)
- `background/service_worker.js`:
  - Background alarm to check for updates.
  - Fetches and stores daily GMP snapshots.
  - Triggers Chrome notifications for applied IPOs that drop below 15% 1 day before closing.

### Phase 6: CodeRabbit Audit, E2E Verification & Documentation
- Run all automated unit tests (`node --test`).
- Review code against security, performance, accessibility, and clean architecture standards.
- Write comprehensive `README.md` with installation steps (Load Unpacked) and feature guide.

---

## Verification Plan
1. Automated unit test suite execution:
   `node --test tests/*.test.js`
2. HTML parsing verification against the live fetched IPO Watch HTML.
3. Cancellation rule verification:
   - Case A: Open IPO, 1 day before close, GMP < 15% -> CANCEL ADVISORY MUST BE TRUE.
   - Case B: Open IPO, 1 day before close, GMP >= 15% -> SAFE TO APPLY / HOLD.
   - Case C: Upcoming IPO, GMP >= 15% -> QUALIFIED.
   - Case D: Upcoming IPO, GMP < 15% -> EXCLUDED FROM DEFAULT VIEW.
   - Case E: Closed IPO -> EXCLUDED FROM DEFAULT VIEW.
4. Trend history calculation verification:
   - Day-by-day progression tracking.
