import Bonjour from 'bonjour-service';
import { bulbStore } from './bulbStore.js';

const BULB_PREFIX = 'kauf-bulb';
const SERVICE_TYPE = 'esphomelib';
const DISCOVERY_WINDOW_MS = 5000;  // Wait 5 seconds for devices to respond
const MAX_TIMEOUT_MS = 15000;      // Maximum wait time
const AUTO_REFRESH_INTERVAL_MS = 60000;  // Auto-refresh every 60 seconds

let bonjour = null;
let browser = null;
let discoveryInterval = null;
let isRefreshing = false;

function startBrowsing(onDeviceFound = null) {
  if (browser) {
    browser.stop();
  }

  bulbStore.markAllOffline();

  browser = bonjour.find({ type: SERVICE_TYPE }, (service) => {
    if (service.name && service.name.startsWith(BULB_PREFIX)) {
      const ip = service.addresses?.find(addr => addr.includes('.'));
      if (ip) {
        console.log(`Discovered bulb: ${service.name} at ${ip}`);
        bulbStore.updateBulb(service.name, ip);
        if (onDeviceFound) {
          onDeviceFound(service.name, ip);
        }
      }
    }
  });
}

function resetAutoRefreshTimer() {
  if (discoveryInterval) {
    clearInterval(discoveryInterval);
    discoveryInterval = setInterval(() => {
      console.log('Refreshing device discovery...');
      startBrowsing();
      // Save after auto-refresh discovery window
      setTimeout(async () => {
        try {
          await bulbStore.save();
        } catch (error) {
          console.error('Error saving bulb directory:', error.message);
        }
      }, DISCOVERY_WINDOW_MS);
    }, AUTO_REFRESH_INTERVAL_MS);
  }
}

export function startDiscovery(intervalMs = AUTO_REFRESH_INTERVAL_MS) {
  if (bonjour) {
    stopDiscovery();
  }

  bonjour = new Bonjour.default();
  console.log('Starting mDNS discovery for Kauf Bulbs...');

  startBrowsing();

  // Save after initial discovery window
  setTimeout(async () => {
    try {
      await bulbStore.save();
    } catch (error) {
      console.error('Error saving bulb directory:', error.message);
    }
  }, DISCOVERY_WINDOW_MS);

  discoveryInterval = setInterval(() => {
    console.log('Refreshing device discovery...');
    startBrowsing();
    // Save after discovery window
    setTimeout(async () => {
      try {
        await bulbStore.save();
      } catch (error) {
        console.error('Error saving bulb directory:', error.message);
      }
    }, DISCOVERY_WINDOW_MS);
  }, intervalMs);
}

export function stopDiscovery() {
  if (discoveryInterval) {
    clearInterval(discoveryInterval);
    discoveryInterval = null;
  }

  if (browser) {
    browser.stop();
    browser = null;
  }

  if (bonjour) {
    bonjour.destroy();
    bonjour = null;
  }

  console.log('Discovery service stopped');
}

/**
 * Manually refresh discovery - blocks until discovery window completes or timeout.
 * Returns the list of discovered bulbs.
 * @returns {Promise<{bulbs: Array, duration: number}>}
 */
export function refreshDiscovery() {
  return new Promise((resolve, reject) => {
    if (isRefreshing) {
      // If already refreshing, wait for it to complete
      console.log('Refresh already in progress, waiting...');
    }

    isRefreshing = true;
    const startTime = Date.now();
    let devicesFound = 0;

    console.log('Manual refresh triggered (blocking)');

    // Start browsing with callback to track discoveries
    startBrowsing((name, ip) => {
      devicesFound++;
    });

    // Reset auto-refresh timer to avoid interference
    resetAutoRefreshTimer();

    // Wait for discovery window, then return results
    const discoveryTimeout = setTimeout(async () => {
      isRefreshing = false;
      const duration = Date.now() - startTime;

      try {
        await bulbStore.save();
      } catch (error) {
        console.error('Error saving bulb directory:', error.message);
      }

      console.log(`Discovery completed: ${devicesFound} device(s) found in ${duration}ms`);

      resolve({
        bulbs: bulbStore.getAllBulbs(),
        duration,
        devicesFound
      });
    }, DISCOVERY_WINDOW_MS);

    // Safety timeout
    setTimeout(() => {
      if (isRefreshing) {
        clearTimeout(discoveryTimeout);
        isRefreshing = false;
        const duration = Date.now() - startTime;
        console.log(`Discovery timeout after ${duration}ms`);
        reject(new Error(`Discovery timeout after ${MAX_TIMEOUT_MS}ms`));
      }
    }, MAX_TIMEOUT_MS);
  });
}
