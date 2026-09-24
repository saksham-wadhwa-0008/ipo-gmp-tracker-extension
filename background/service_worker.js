/**
 * Background Service Worker for IPO GMP Tracker Chrome Extension
 * Manifest V3 compliant: handles alarms, background sync, and cancel advisory notifications
 */

importScripts('/utils/date_utils.js', '/utils/parser.js', '/utils/seed_data.js', '/utils/storage.js');

const ALARM_NAME = 'ipo_gmp_periodic_check';
const CHECK_INTERVAL_MINUTES = 60; // Check hourly

// On Installation / Extension Update
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('IPO GMP Tracker installed/updated:', details.reason);

  // Initialize alarms
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES,
    delayInMinutes: 1
  });

  // Initial fetch and snapshot
  await performBackgroundSync();
});

// Periodic alarm handler
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('Running periodic IPO GMP check alarm...');
    await performBackgroundSync();
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'FORCE_SYNC') {
    performBackgroundSync().then(result => {
      sendResponse({ success: true, data: result });
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep message channel open for async response
  }
});

// Handle notification click: open IPO Watch website
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.tabs.create({ url: 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/' });
});

/**
 * Fetch latest IPO Watch page, update snapshots, and check for cancel alerts
 */
async function performBackgroundSync() {
  try {
    const threshold = await IpoStorage.getThreshold();
    const appliedIpos = await IpoStorage.getAppliedIpos();

    const targetUrl = 'https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/';
    const response = await fetch(targetUrl, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const parsed = IpoParser.parseHtmlTables(html, threshold);

    if (parsed && parsed.all && parsed.all.length > 0) {
      // 1. Record snapshot to maintain day-by-day trends
      await IpoStorage.recordDailySnapshot(parsed.all);

      // 2. Check for Cancel Advisories
      for (const ipo of parsed.cancelAlerts) {
        const isApplied = appliedIpos.includes(ipo.id);

        // Notify if user applied, or if high-impact Mainboard alert
        if (isApplied || ipo.segment === 'Mainboard') {
          await sendCancelNotification(ipo, threshold);
        }
      }

      console.log(`Background sync completed: ${parsed.all.length} IPOs scanned, ${parsed.cancelAlerts.length} cancel alerts.`);
      return parsed;
    }
  } catch (error) {
    console.warn('Background sync failed (will retry on next alarm):', error.message);
    return null;
  }
}

/**
 * Dispatch desktop notification with de-duplication per day
 */
async function sendCancelNotification(ipo, threshold) {
  const todayIso = new Date().toISOString().split('T')[0];
  const notifKey = `notified_${ipo.id}_${todayIso}`;

  // Check if already notified today
  const alreadyNotified = await IpoStorage.get(notifKey, false);
  if (alreadyNotified) {
    return;
  }

  const notifId = `cancel_alert_${ipo.id}_${todayIso}`;

  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    title: `⚠️ IPO GMP Alert: Below ${threshold}% Target`,
    message: `${ipo.name} closes soon and its GMP is currently ${ipo.gmpPercent}% (< ${threshold}% target). Tracked for your personal review.`,
    priority: 2,
    requireInteraction: true
  }, async (createdId) => {
    if (chrome.runtime.lastError) {
      console.warn('Notification error:', chrome.runtime.lastError);
    } else {
      console.log('Notification displayed:', createdId);
      // Mark as notified today
      await IpoStorage.set(notifKey, true);
    }
  });
}
