# IPO GMP Tracker & Advisory Chrome Extension — Specification

**Author:** Antigravity (Pair Programming with Saksham)  
**Date:** September 24, 2026  
**Target:** [IPO Watch Grey Market Premium Tracker](https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/)  
**Status:** Approved & Ready for Implementation  

---

## 1. Executive Summary & Objective

The **IPO GMP Tracker & Advisory** is a Manifest V3 Chrome Extension designed specifically for Indian stock market IPO investors monitoring [IPO Watch](https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/). 

### Key Objectives:
1. **Filter Noise**: Instantly isolate only **Upcoming** and **Open** IPOs with **GMP > 15%** (ignoring closed IPOs, 0% GMP, and low-demand issues).
2. **Dual Experience**:
   - **In-Page Overlay**: Automatically cleans and filters the live tables directly on `ipowatch.in`, injecting interactive filter buttons, status chips, and cancellation warnings.
   - **Browser Popup**: Accessible from any tab, giving a live dashboard of qualified IPOs, day-to-day trends, and portfolio tracking.
3. **Trend Visualizer**: Visual day-by-day trend tracking showing GMP movement for all recorded days leading up to 1 day before the IPO ending date.
4. **Intelligent Cancellation Advisory**:
   - Accurately computes the IPO closing date from date strings like `"25-29 Sept"`, `"30-5 Oct"`.
   - Identifies the critical cutoff: **1 day before the ending date**.
   - If on or by 1 day before the ending date the GMP is **< 15%**, it highlights an unmistakable advisory banner: **"🚨 CANCEL APPLICATION: GMP is [X]% (< 15%) 1 day before close!"** to protect capital.
5. **Applied IPO Watchlist & Notifications**:
   - Allows Saksham to mark applied IPOs.
   - Background service worker polls and sends Chrome desktop notifications if an applied IPO's GMP falls below 15% 1 day before close.

---

## 2. Architecture & Manifest V3 Structure

```
ipo-gmp-tracker-extension/
├── manifest.json                # MV3 extension manifest
├── icons/                       # 16, 32, 48, 128px high-contrast SVG/PNG icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── icon.svg
├── background/
│   └── service_worker.js       # Background fetcher, alarms, storage sync, alert notifications
├── content/
│   ├── content.js              # DOM injection, in-page table filtering, trend modal, badges
│   └── content.css             # Floating control pill, table highlights, modal styling
├── popup/
│   ├── popup.html              # Modern dashboard UI
│   ├── popup.css               # Clean, accessible styling matching Astra 6 standards
│   └── popup.js                # Search, tab filtering, trend chart drawer, watchlist toggle
├── utils/
│   ├── parser.js               # Dual DOM / HTML string parser for IPO Watch tables
│   ├── date_utils.js           # Date range parsing, closing date & 1-day-before detection
│   ├── storage.js              # Chrome storage wrapper with historical trend management
│   └── seed_data.js            # Initial seed trend data for current active IPOs
├── tests/
│   ├── parser.test.js          # Unit tests against real ipowatch.in table HTML
│   ├── date_utils.test.js      # Unit tests for multi-format date ranges & closing date logic
│   └── advisory.test.js        # Unit tests verifying cancellation advisory rules
├── package.json                # Test runner scripts and metadata
└── README.md                   # Installation, developer setup, and usage guide
```

---

## 3. Data Flow & Parsing Logic

### 3.1 Table Structure on `ipowatch.in`
The target page contains two primary active tables:
- **Table 1**: Mainboard IPOs
- **Table 2**: SME IPOs

Each row has 8 columns:
1. `IPO Name`: String containing company name and link (e.g. `German Green Steel`)
2. `IPO GMP*`: Premium amount (e.g. `₹24`, `₹0`)
3. `Trend`: Indicator symbol (`🟢` for up, `🔴` for down, `🟡` for neutral)
4. `Price Band`: Issue cut-off price (e.g. `₹139`)
5. `Est. Listing`: Estimated listing price and percentage (e.g. `₹163 (17.27%)`)
6. `Date`: Subscription duration (e.g. `25-29 Sept`, `30-5 Oct`, `22-24 Sept`)
7. `Status`: String (`Upcoming`, `Open`, `Closed`)
8. `Last Updated`: Timestamp string (e.g. `24 Sept, 08:05`)

### 3.2 Date Range Parsing & 1-Day Before Close Logic
1. Input format: `DD-DD Month` (e.g. `25-29 Sept`), or `DD-DD Month1-Month2` (e.g. `30-5 Oct`).
2. Parser extracts:
   - `openDay`: 25, `openMonth`: Sept
   - `closeDay`: 29, `closeMonth`: Sept
   - `closeYear`: Derived from current year or page timestamp.
   - `closeDate`: `new Date(year, monthIndex, closeDay)`
   - `oneDayBeforeClose`: `new Date(closeDate.getTime() - 24 * 60 * 60 * 1000)`
3. Date comparison:
   - Normalizes `today` to midnight UTC/local.
   - Calculates `daysRemaining = Math.ceil((closeDate - today) / (1000 * 60 * 60 * 24))`.
   - `isOneDayBefore = (daysRemaining === 1)`.
   - If `today >= oneDayBeforeClose && today <= closeDate`, the IPO is in the final decision window.

### 3.3 Rule Engine:
- **Qualification Criteria**:
  - `(status === 'Open' || status === 'Upcoming')` **AND** `gmpPercent >= 15.0`.
- **Cancellation Advisory Criteria**:
  - `(status === 'Open')` **AND** `(daysRemaining <= 1)` **AND** `gmpPercent < 15.0`.
  - Advisory Message:
    `"🚨 CANCEL APPLICATION: GMP is only {gmpPercent}% (< 15%) 1 day before closing ({closeDate})!"`
- **Trend Tracking**:
  - Every snapshot is indexed by `ipoName` + `snapshotDate` (e.g. `YYYY-MM-DD`).
  - Stored in `chrome.storage.local` under `ipo_history_[normalized_name]`.
  - Displays day-by-day table and sparkline chart.

---

## 4. User Experience & Features

### 4.1 In-Page Content Script (`content.js`)
- Floating control pill at the top of tables:
  - Toggle: "Only GMP > 15% (Upcoming & Open)" [ON/OFF]
  - Badges showing count of qualified IPOs vs total.
  - Quick action buttons: "All >15%", "Open Only", "Upcoming Only", "Reset".
  - Alert Bar if any IPO ending soon has GMP < 15%.
- Table enhancements:
  - Ineligible rows hidden smoothly when filter is active.
  - Rows with Cancel Advisory highlighted with a warning amber/red badge.
  - Injected "📈 Trend" button on every row that opens a sleek slide-in modal with daily GMP history and chart.

### 4.2 Popup UI (`popup.html`)
- Header with live refresh button, search input, and configurable GMP threshold slider (default 15%).
- Metrics summary chips:
  - **Qualifying (>15%)**: Count
  - **Open Now**: Count
  - **Cancel Alerts**: Count (highlighted in red if > 0)
- Tab Bar:
  - `All Qualified (>15%)`
  - `Open`
  - `Upcoming`
  - `Cancel Alerts`
  - `Watchlist / Applied`
- Cards for each IPO:
  - Company name & exchange category (Mainboard / SME).
  - Current GMP badge (₹ and %).
  - Price band and expected listing price.
  - Subscription dates & countdown badge ("Closes Tomorrow", "Opens in 2 days", etc.).
  - Action decision badge:
    - 🟢 "Safe to Apply: GMP 25.4% (> 15%)"
    - 🔴 "Action Required: CANCEL APPLICATION (GMP 13.5% < 15% 1 day before close)"
    - 🟡 "Upcoming (Opens 25 Sept)"
  - "Trend History" button: Opens interactive daily trend line and table.
  - "Mark as Applied" checkbox to track personalized alerts.

---

## 5. Security & Manifest V3 Compliance
- Clean declarative permissions (`storage`, `alarms`, `notifications`).
- Zero remote script execution or external CDN dependencies; all CSS, SVG icons, and charting logic are self-contained.
- Host permissions restricted to `*://ipowatch.in/*`.
