import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3001';

async function takeScreenshot() {
  console.log('Taking screenshot...');
  
  // Setup bulbs for nice display
  const response = await fetch(`${BASE_URL}/api/list`);
  const data = await response.json();
  const bulbs = data.bulbs || [];
  
  if (bulbs.length >= 1) {
    // First bulb: ON, warm white, 80%
    await fetch(`${BASE_URL}/api/bulb/${bulbs[0].id}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'on', brightness: 80, r: 255, g: 220, b: 180, transition: 500 })
    });
  }
  
  if (bulbs.length >= 2) {
    // Second bulb: ON, blue, 60%
    await fetch(`${BASE_URL}/api/bulb/${bulbs[1].id}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'on', brightness: 60, r: 100, g: 150, b: 255, transition: 500 })
    });
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  
  const page = await context.newPage();
  await page.goto(BASE_URL);
  
  // Set light theme
  await page.evaluate(() => {
    localStorage.setItem('kauf-bulb-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
  });
  
  // Wait for bulbs to load
  await page.waitForSelector('.bulb-card:not(.offline)', { timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));
  
  // Take screenshot
  await page.screenshot({ path: 'screenshot.png', fullPage: false });
  console.log('Screenshot saved to screenshot.png');
  
  await browser.close();
}

takeScreenshot().catch(console.error);
