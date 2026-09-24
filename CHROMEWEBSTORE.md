# Chrome Web Store Listing & Privacy Submission Guide

> Last Updated: 2026-09-24

---

## 1. Store Listing Details

**Extension Name**
```
IPO GMP Tracker & Filter (IPO Watch)
```

**Summary / Short Description** (Max 132 chars)
```
Filter Upcoming & Open IPOs with >15% GMP on IPOWatch, view day-by-day trends, and receive personal threshold alerts.
```

**Detailed Description** (Copy & paste into Store Listing)
```markdown
IPO GMP Tracker & Filter is a personal productivity and analytical screening tool for retail stock market enthusiasts browsing IPOWatch (ipowatch.in). It simplifies tracking by filtering high-sentiment IPOs based on your custom criteria and displaying daily grey market premium trends.

KEY FEATURES:
- Automated Threshold Filter: Instantly screens public tables to show only Upcoming and Open IPOs meeting your target Grey Market Premium (default: >15%).
- Day-by-Day Historical Trends: Inspect historical daily GMP and estimated premium trajectories with interactive charts and date logs leading up to close dates.
- Personal Threshold Alerts: Highlights open IPOs whose GMP is below your target threshold 1 day prior to closing so you can review your personal strategy before bidding ends.
- In-Page Enhancement & Browser Popup: Seamlessly adds a screening toolbar to IPOWatch tables and provides a floating extension popup accessible from any browser tab.
- Watchlist Tracking: Mark issues as applied to keep a clean personal record of IPOs you are monitoring.
- Customizable Criteria: Set your preferred minimum GMP percentage (e.g., 10%, 15%, 20%) at any time.

HOW TO USE:
1. Visit the live IPO GMP page on IPOWatch (ipowatch.in) to view the automated screening toolbar and trend charts.
2. Click "View Trend" on any IPO row to inspect its historical day-by-day trajectory.
3. Click the extension icon in your browser anytime to view matching IPOs, adjust your threshold, and view personal review alerts.

PRIVACY & SECURITY:
- 100% Client-Side: Runs entirely in your local browser without transmitting any personal data or browsing activity.
- Zero External Analytics: No ads, no third-party trackers, no analytics SDKs.
- Focused Scope: Operates strictly on ipowatch.in public data.

DISCLAIMER & REGULATORY NOTICE:
IPO GMP Tracker & Filter is strictly an informational and analytical filtering utility based on publicly reported, unofficial grey market premium estimates. It does NOT provide financial, investment, or legal advice, and does NOT recommend buying, selling, subscribing to, or withdrawing applications for any securities or IPOs. Grey market rates are unofficial, unregulated, and subject to volatility. All investment decisions are solely the responsibility of the user. Always consult a SEBI-registered or certified financial advisor before investing.
```

**Category**
```
Productivity  (or Search Tools)
```

---

## 2. Privacy Tab Form Answers (Exact Copy-Paste)

### Single purpose description*
```
Provides an automated filtering toolbar and day-by-day trend visualizer for publicly listed IPO Grey Market Premium tables on ipowatch.in based on user-configured criteria.
```

### Permission Justifications

#### storage justification*
```
Used locally on the user's device to save user preferences (minimum GMP percentage threshold, filter view preferences, and locally pinned IPO watchlist items). No data is ever collected or sent to external servers.
```

#### alarms justification*
```
Used to trigger periodic background updates (every 60 minutes) to refresh publicly available grey market premium data from ipowatch.in and evaluate user-defined threshold alerts.
```

#### notifications justification*
```
Used to deliver local desktop notifications when an open IPO on the user's watchlist falls below their user-defined minimum GMP threshold one day before its closing date, reminding the user to review their personal criteria.
```

#### Host permission justification* (for `*://ipowatch.in/*`)
```
Required exclusively to read public HTML tables on ipowatch.in, inject the interactive filtering toolbar, and fetch updated grey market premium figures for the popup and trend charts. No other domains or user browsing history are accessed.
```

---

### Remote Code Question
- **Select**: `(•) No, I am not using remote code`  
*(All scripts are packaged locally within the extension; no eval(), new Function(), or external script tags are used).*

---

### Data Usage Disclosures
- **What user data do you plan to collect from users now or in the future?**
  - **LEAVE ALL BOXES UNCHECKED**.
  - *(The extension does not collect or transmit ANY personal info, health info, financial info, credentials, communications, location, web history, or user activity).*

---

### Data Use Certifications
- **Check all three boxes**:
  - [x] *I do not sell or transfer user data to third parties, outside of the approved use cases*
  - [x] *I do not use or transfer user data for purposes that are unrelated to my item's single purpose*
  - [x] *I do not use or transfer user data to determine creditworthiness or for lending purposes*

---

### Privacy Policy URL*
```
https://github.com/saksham-wadhwa-0008/ipo-gmp-tracker-extension/blob/feature/ipo-gmp-tracker-extension/PRIVACY_POLICY.md
```
*(Or the raw GitHub URL: `https://raw.githubusercontent.com/saksham-wadhwa-0008/ipo-gmp-tracker-extension/feature/ipo-gmp-tracker-extension/PRIVACY_POLICY.md`)*
