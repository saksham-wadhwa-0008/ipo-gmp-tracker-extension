# IPO GMP Tracker & Advisory Chrome Extension

A high-performance Manifest V3 Chrome Extension designed for Indian stock market IPO investors monitoring [IPO Watch (Live Grey Market Premium)](https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/).

---

## 🎯 Key Problems Solved

1. **Information Overload Filter**: Automatically cuts through clutter by isolating **Upcoming** and **Open** IPOs that have a **GMP > 15%**.
2. **Day-by-Day Trend History**: Displays the full historical trajectory of GMP movement across all days leading up to **1 day before the close date**.
3. **Automated Capital Protection (Cancellation Advisory)**:
   - Evaluates the IPO closing schedule in real-time.
   - If an IPO is in its final decision window (**1 day before the ending date or closing day**) and its GMP is **< 15%**, it triggers an unmistakable advisory:
     > **🚨 CANCEL APPLICATION: GMP is only X% (< 15%) 1 day before close! High risk of flat or negative listing.**
4. **Dual Experience**:
   - **In-Page Overlay (`content.js`)**: Injects sticky filter controls, badges, and trend buttons directly onto the live `ipowatch.in` tables.
   - **Popup Dashboard (`popup.html`)**: Browser-wide extension popup to check qualifying IPOs, search, inspect SVG charts, and track your personal portfolio from any tab.
5. **Applied Portfolio & Chrome Notifications**: Mark IPOs as "Applied" to receive high-priority desktop alerts if GMP falls below your threshold near closing.

---

## 🚀 Installation & Setup (Load Unpacked)

1. Open Google Chrome.
2. Navigate to `chrome://extensions/` in your address bar.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left.
5. Select the project folder:
   ```
   /Users/home/.gemini/antigravity/scratch/ipo-gmp-tracker-extension
   ```
6. The extension icon will appear in your Chrome toolbar. Pin it for quick access!

---

## 📸 How It Works

### 1. In-Page Experience on IPO Watch
When you visit `https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/`:
- A sleek dark-themed control toolbar appears above the tables.
- By default, it activates the **"Only Upcoming & Open with GMP > 15%"** filter.
- Ineligible rows (closed IPOs, 0% GMP, or < 15%) are cleanly hidden.
- Each qualifying row gets a **`📈 Trend`** button and status badge.
- If any IPO ending tomorrow has GMP < 15%, a prominent red **Cancel Application Warning** banner is pinned at the top.
- Clicking **`📈 Trend`** opens a modal showing:
  - Interactive SVG trend line & area chart.
  - Day-by-day table showing daily GMP ₹, %, movement, and decision signals.

### 2. Chrome Extension Popup
Click the extension icon from any tab:
- **Summary Metrics**: Quick counters for Qualified (>15%), Open Bidding, and Cancel Advisories.
- **Tabs**:
  - `⭐ Qualified (>15%)`
  - `🟢 Open`
  - `⏳ Upcoming`
  - `🚨 Cancel Alerts`
  - `★ Applied (Watchlist)`
  - `📋 All`
- **Threshold Customizer**: Default is 15%, but you can adjust it to 10%, 20%, etc., anytime.
- **Card View**: Displays price band, estimated listing, date countdown, advisory card, expandable trend drawer, and applied status toggle.

---

## 🧪 Automated Testing

The extension includes a 100% passing test suite covering date parsing, currency normalization, advisory rules, and real HTML table parsing from IPO Watch:

```bash
cd /Users/home/.gemini/antigravity/scratch/ipo-gmp-tracker-extension
npm test
```

### Test Coverage:
- `tests/date_utils.test.js`: Validates date range parsing (`"25-29 Sept"`, `"30-5 Oct"`), days remaining, and 1-day-before detection.
- `tests/parser.test.js`: Validates HTML string & DOM parsing against live IPOWatch table data.
- `tests/advisory.test.js`: Validates cancellation advisory logic, threshold rules, seed trends, and storage.

---

## 🏗️ Technical Architecture (Manifest V3)

```
ipo-gmp-tracker-extension/
├── manifest.json            # MV3 configuration with content scripts & service worker
├── icons/                   # 16, 32, 48, 128px high-contrast icons + SVG source
├── background/
│   └── service_worker.js   # Background alarms, periodic sync & cancel notifications
├── content/
│   ├── content.js          # In-page DOM injection, table filtering & trend modal
│   └── content.css         # Modern, accessible in-page styling
├── popup/
│   ├── popup.html          # Extension dashboard UI
│   ├── popup.css           # Clean Astra-caliber responsive CSS
│   └── popup.js            # Search, tabs, card rendering & drawer visualization
├── utils/
│   ├── date_utils.js       # Date parsing & 1-day-before-close calculation
│   ├── parser.js           # DOM / HTML table parser & advisory evaluation
│   ├── seed_data.js        # Seed day-by-day trend logs & trend synthesizer
│   └── storage.js          # Chrome storage wrapper with local fallback
└── tests/
    ├── date_utils.test.js
    ├── parser.test.js
    └── advisory.test.js
```

---

## 🛡️ Privacy & Security
- **No external dependencies or remote CDNs**: All scripts, styles, and SVG graphics run 100% locally.
- **Permissions**: Minimal required permissions (`storage`, `alarms`, `notifications`).
- **Domain Restricted**: Host permissions limited strictly to `*://ipowatch.in/*`.
