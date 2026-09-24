# Chrome Web Store Listing — IPO GMP Tracker & Advisory (IPO Watch)

> Last Updated: 2026-09-24

## Store Listing

**Extension Name**
IPO GMP Tracker & Advisory (IPO Watch)

**Short Description**
Filter Upcoming & Open IPOs with >15% GMP on IPOWatch, view daily trends, and get cancel advisories 1 day before close.

**Detailed Description**
IPO GMP Tracker & Advisory helps stock market investors make smarter IPO decisions on IPOWatch (ipowatch.in) by eliminating low-demand noise and protecting capital.

Key Features:
- Automatic High-Conviction Filter: Instantly hides closed IPOs and low-sentiment issues, showing only Upcoming and Open IPOs with Grey Market Premium (GMP) > 15%.
- Capital Protection Cancel Advisories: Flags an unmistakable cancellation alert if an open IPO's GMP slips below 15% on or by 1 day before its close date.
- Day-by-Day Historical Trends: Inspect full daily GMP and gain % movement across all recorded days leading up to closing date with interactive SVG sparklines and history logs.
- Dual Experience: Works as an automatic in-page toolbar directly on IPOWatch tables and as a standalone browser popup accessible across any tab.
- Portfolio Watchlist: Mark IPOs as applied to keep track of your active bids and receive timely notifications.
- Customizable Threshold: Adjust the minimum GMP % filter anytime (default: 15%).

How to Use:
1. Visit the live IPO GMP page on IPOWatch (ipowatch.in) to see the in-page filter and trend buttons.
2. Click "📈 Trend" on any row to view its day-by-day trajectory and closing countdown.
3. Click the extension icon in your browser toolbar anytime to view current qualifying IPOs and check for cancellation alerts.
4. If an IPO you applied for shows "🚨 CANCEL APPLICATION", review your bid before the issue closes.

Privacy & Security:
- 100% Client-Side: Runs entirely in your browser without collecting, storing, or transmitting any personal data or browsing history.
- No External Trackers: Zero analytics, zero ads, and zero third-party telemetry.
- Scoped Access: Works exclusively with IPOWatch GMP pages.

Support & Feedback:
For questions, feature requests, or bug reports, please visit our project repository or contact us via email.

**Category**
Productivity

**Single Purpose**
Filters Upcoming and Open IPOs with greater than 15% GMP on IPOWatch, visualizes day-by-day trends, and advises cancellation 1 day before close if GMP falls below 15%.

**Primary Language**
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon128.png` |
| Small Icon | 16×16, 32×32, 48×48 PNG | ✅ Ready | `icons/icon16.png`, `icons/icon32.png`, `icons/icon48.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ To Capture | In-Page Toolbar on IPOWatch |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To Capture | Day-by-Day Trend Modal & Chart |
| Screenshot 3 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ To Capture | Browser Popup Dashboard |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Optional | Promo banner |
| Marquee Promo Tile | 1400×560 | ⬜ Optional | Marquee banner |

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Used to save user preferences (minimum GMP threshold), personal applied IPO watchlist, and local daily GMP snapshot history for offline trend charts. |
| `alarms` | permissions | Used to schedule periodic background checks (hourly) to update daily GMP trend snapshots without requiring a persistent background tab. |
| `notifications` | permissions | Used to deliver capital protection desktop notifications when an applied IPO's GMP falls below 15% 1 day before closing. |
| `*://ipowatch.in/*` | host_permissions | Required to fetch and read live IPO GMP tables from ipowatch.in and inject the interactive filtering and trend visualizer toolbar onto the page. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

All data processing happens 100% locally on the user's computer. The extension only reads public stock market data from `ipowatch.in` and stores user settings (threshold, watchlist) in local browser storage.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | None | No |
| Health info | No | No | None | No |
| Financial info | No | No | None | No |
| Authentication info | No | No | None | No |
| Personal communications | No | No | None | No |
| Location | No | No | None | No |
| Web history | No | No | None | No |
| User activity | No | No | None | No |
| Website content | No | No | Reads public table on ipowatch.in locally | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
Host `PRIVACY_POLICY.md` on GitHub Pages, Notion, or your personal website (e.g. `https://<your-username>.github.io/ipo-gmp-tracker/privacy`).

---

## Distribution

**Visibility**: Public (or Unlisted for private link sharing)  
**Regions**: All regions (specifically India where IPOWatch is used)  

---

## Developer Info

**Publisher Name**: Saksham  
**Contact Email**: [Your developer contact email]  
**Support URL**: [Your GitHub repository issues page or email]  

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-09-24 | Initial release: >15% GMP filtering, 1-day-before cancellation advisory, trend modal, popup dashboard, background notifications. | Ready for Submission |
