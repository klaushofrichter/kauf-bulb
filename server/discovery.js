import Bonjour from 'bonjour-service';
import { bulbStore } from './bulbStore.js';

const BULB_PREFIX = 'kauf-bulb';
const SERVICE_TYPE = 'esphomelib';

let bonjour = null;
let browser = null;
let discoveryInterval = null;

function startBrowsing() {
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
      }
    }
  });

  setTimeout(async () => {
    try {
      await bulbStore.save();
    } catch (error) {
      console.error('Error saving bulb directory:', error.message);
    }
  }, 10000);
}

export function startDiscovery(intervalMs = 60000) {
  if (bonjour) {
    stopDiscovery();
  }

  bonjour = new Bonjour.default();
  console.log('Starting mDNS discovery for Kauf Bulbs...');

  startBrowsing();

  discoveryInterval = setInterval(() => {
    console.log('Refreshing device discovery...');
    startBrowsing();
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

export async function refreshDiscovery() {
  console.log('Manual refresh triggered');
  startBrowsing();
}
