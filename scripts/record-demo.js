/**
 * Demo Recording Script
 *
 * Records a demo video of the Kauf Bulb Controller web application.
 * Uses Playwright to automate browser interactions with visible cursor.
 *
 * Prerequisites:
 * - Server running on localhost:3001 (npm run dev)
 * - At least one Kauf Bulb on the network
 *
 * Usage:
 *   node scripts/record-demo.js
 *
 * Output:
 *   demo.webm - Video recording of the demo
 */

import { chromium } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';

const BASE_URL = 'http://localhost:3001';
const OUTPUT_FILE = 'demo.webm';

// Cursor visualization CSS - creates a visible cursor with click animation
const CURSOR_CSS = `
  * { cursor: none !important; }
  .demo-cursor {
    position: fixed;
    width: 20px;
    height: 20px;
    background: rgba(255, 100, 100, 0.8);
    border: 2px solid white;
    border-radius: 50%;
    pointer-events: none;
    z-index: 999999;
    transform: translate(-50%, -50%);
    transition: transform 0.1s ease, background 0.1s ease;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
  }
  .demo-cursor.clicking {
    transform: translate(-50%, -50%) scale(0.7);
    background: rgba(255, 50, 50, 1);
  }
`;

// JavaScript to track mouse and show cursor
const CURSOR_SCRIPT = `
  const cursor = document.createElement('div');
  cursor.className = 'demo-cursor';
  document.body.appendChild(cursor);

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });

  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function smoothMove(page, x, y, steps = 20) {
  const currentPos = await page.evaluate(() => {
    const cursor = document.querySelector('.demo-cursor');
    return {
      x: parseFloat(cursor?.style.left) || 0,
      y: parseFloat(cursor?.style.top) || 0
    };
  });

  for (let i = 1; i <= steps; i++) {
    const newX = currentPos.x + (x - currentPos.x) * (i / steps);
    const newY = currentPos.y + (y - currentPos.y) * (i / steps);
    await page.mouse.move(newX, newY);
    await sleep(15);
  }
}

async function clickAt(page, selector, options = {}) {
  const element = await page.locator(selector).first();
  const box = await element.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await smoothMove(page, x, y);
    await sleep(200);
    await page.mouse.click(x, y, options);
    await sleep(300);
  }
}

async function setupInitialState() {
  console.log('Setting up initial bulb state...');

  // Get bulb list
  const response = await fetch(`${BASE_URL}/api/list`);
  const data = await response.json();
  const bulbs = data.bulbs || [];

  if (bulbs.length === 0) {
    throw new Error('No bulbs found. Make sure bulbs are on the network.');
  }

  console.log(`Found ${bulbs.length} bulb(s)`);

  // Set first bulb: ON, white, 70% brightness
  if (bulbs[0]) {
    await fetch(`${BASE_URL}/api/bulb/${bulbs[0].id}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'on', brightness: 70, r: 255, g: 255, b: 255, transition: 500 })
    });
    console.log(`  ${bulbs[0].id}: ON, white, 70%`);
  }

  // Set second bulb: OFF
  if (bulbs[1]) {
    await fetch(`${BASE_URL}/api/bulb/${bulbs[1].id}/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'off', transition: 500 })
    });
    console.log(`  ${bulbs[1].id}: OFF`);
  }

  await sleep(1000);
  return bulbs;
}

async function recordDemo() {
  console.log('Starting demo recording...\n');

  // Check if server is running
  try {
    await fetch(`${BASE_URL}/api/list`);
  } catch (e) {
    console.error('ERROR: Server not running at', BASE_URL);
    console.error('Start the server with: npm run dev');
    process.exit(1);
  }

  // Setup initial bulb state
  const bulbs = await setupInitialState();

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: './temp-video', size: { width: 1280, height: 720 } }
  });

  const page = await context.newPage();

  // Add cursor visualization
  await page.addStyleTag({ content: CURSOR_CSS });

  // Navigate to app
  await page.goto(BASE_URL);
  await page.addStyleTag({ content: CURSOR_CSS });
  await page.evaluate(CURSOR_SCRIPT);

  // Wait for bulbs to load
  await page.waitForSelector('.bulb-card', { timeout: 10000 });
  await sleep(1500);

  console.log('Recording demo sequence...');

  // Demo sequence
  try {
    // 1. Click "Turn All On"
    console.log('  - Turn All On');
    await clickAt(page, 'button:has-text("Turn All On")');
    await sleep(1500);

    // 2. Click "Turn All Off"
    console.log('  - Turn All Off');
    await clickAt(page, 'button:has-text("Turn All Off")');
    await sleep(1500);

    // 3. Click on first bulb card to open modal
    console.log('  - Open bulb modal');
    await clickAt(page, '.bulb-card');
    await sleep(800);

    // 4. Wait for modal to appear
    await page.waitForSelector('.modal', { timeout: 15000 });
    await sleep(1000);

    // Scroll modal to bottom to show buttons
    console.log('  - Scroll modal to show buttons');
    await page.evaluate(() => {
      const modal = document.querySelector('.modal-body');
      if (modal) {
        modal.scrollTo({ top: modal.scrollHeight, behavior: 'smooth' });
      }
    });
    await sleep(1000);

    // 5. Adjust brightness slider
    console.log('  - Adjust brightness');
    const brightnessSlider = page.locator('input[type="range"]').first();
    if (await brightnessSlider.isVisible()) {
      const box = await brightnessSlider.boundingBox();
      if (box) {
        // Move to 80% position on slider
        const targetX = box.x + box.width * 0.8;
        const targetY = box.y + box.height / 2;
        await smoothMove(page, targetX, targetY);
        await sleep(200);
        await page.mouse.click(targetX, targetY);
        await sleep(500);
      }
    }

    // 6. Click color picker to show native dialog
    console.log('  - Open color picker');
    const colorPicker = page.locator('input[type="color"]');
    if (await colorPicker.isVisible()) {
      await clickAt(page, 'input[type="color"]');
      await sleep(1000);
      // Press Escape to close color picker dialog
      await page.keyboard.press('Escape');
      await sleep(500);
    }

    // 7. Change RGB values
    console.log('  - Change color to orange');
    const rInput = page.locator('input[type="number"]').nth(0);
    if (await rInput.isVisible()) {
      await clickAt(page, 'input[type="number"]:nth-of-type(1)');
      await rInput.fill('255');
      await sleep(200);
    }

    const gInput = page.locator('input[type="number"]').nth(1);
    if (await gInput.isVisible()) {
      await gInput.fill('128');
      await sleep(200);
    }

    const bInput = page.locator('input[type="number"]').nth(2);
    if (await bInput.isVisible()) {
      await bInput.fill('0');
      await sleep(300);
    }

    // 8. Click Apply button
    console.log('  - Apply changes');
    const applyButton = page.locator('button:has-text("Apply")');
    if (await applyButton.isVisible()) {
      await clickAt(page, 'button:has-text("Apply")');
      await sleep(1000);
    }

    // 9. Click Turn On in modal
    console.log('  - Turn on from modal');
    const turnOnButton = page.locator('.modal button:has-text("Turn On")');
    if (await turnOnButton.isVisible()) {
      await clickAt(page, '.modal button:has-text("Turn On")');
      await sleep(1000);
    }

    // 10. Close modal
    console.log('  - Close modal');
    await clickAt(page, '.close-btn');
    await sleep(1500);

    // 11. Click Refresh Status
    console.log('  - Refresh status');
    await clickAt(page, 'button:has-text("Refresh Status")');
    await sleep(1500);

  } catch (e) {
    console.error('Error during recording:', e.message);
  }

  // Final pause before ending
  await sleep(1000);

  // Close browser
  await page.close();
  await context.close();
  await browser.close();

  // Move video file to output location
  console.log('\nProcessing video...');
  const tempDir = './temp-video';
  const files = fs.readdirSync(tempDir);
  const videoFile = files.find(f => f.endsWith('.webm'));

  if (videoFile) {
    fs.renameSync(`${tempDir}/${videoFile}`, OUTPUT_FILE);
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Demo saved to: ${OUTPUT_FILE}`);
  } else {
    console.error('No video file found');
  }

  console.log('\nDemo recording complete!');
}

// Run the demo
recordDemo().catch(console.error);
