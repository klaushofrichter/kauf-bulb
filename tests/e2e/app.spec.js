import { test, expect } from '@playwright/test';

test.describe('Kauf Bulb Controller App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the app header', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('Kauf Bulb Controller');
  });

  test('should display control buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Turn All On' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Turn All Off' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh Devices' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh Status' })).toBeVisible();
  });

  test('should load and display bulbs', async ({ page }) => {
    // Wait for bulbs to load
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    // Check that bulb cards are displayed (at least 1)
    const bulbCards = page.locator('.bulb-card');
    const count = await bulbCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display bulb information', async ({ page }) => {
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    // Check that bulb cards have expected structure
    const firstCard = page.locator('.bulb-card').first();
    await expect(firstCard.locator('.bulb-name')).toBeVisible();
    await expect(firstCard.locator('.bulb-icon')).toBeVisible();
  });

  test('should show status indicators', async ({ page }) => {
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    // Check for bulb icons (one per bulb card)
    const bulbCards = page.locator('.bulb-card');
    const bulbIcons = page.locator('.bulb-icon');
    const cardCount = await bulbCards.count();
    await expect(bulbIcons).toHaveCount(cardCount);
  });
});

test.describe('Bulb Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );
  });

  test('should toggle individual bulb', async ({ page }) => {
    // Find the first online bulb card
    const bulbCard = page.locator('.bulb-card').first();
    const powerButton = bulbCard.locator('.power-btn').first();

    // Check if it's enabled (not disabled for offline bulbs)
    const isDisabled = await powerButton.getAttribute('disabled');
    if (isDisabled === null) {
      // Click and verify API call (could be on or off)
      const responsePromise = page.waitForResponse(response =>
        (response.url().includes('/api/bulb/') && (response.url().includes('/on') || response.url().includes('/off'))) && response.status() === 200
      );

      await powerButton.click();
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();
    }
  });

  test('should turn on all bulbs', async ({ page }) => {
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/bulbs/on') && response.status() === 200
    );

    await page.getByRole('button', { name: 'Turn All On' }).click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
  });

  test('should turn off all bulbs', async ({ page }) => {
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/bulbs/off') && response.status() === 200
    );

    await page.getByRole('button', { name: 'Turn All Off' }).click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
  });

  test('should refresh devices', async ({ page }) => {
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/refresh') && response.status() === 200
    );

    await page.getByRole('button', { name: 'Refresh Devices' }).click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
  });

  test('should refresh status', async ({ page }) => {
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    await page.getByRole('button', { name: 'Refresh Status' }).click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
  });

  test('should have Test button on bulb cards', async ({ page }) => {
    const bulbCard = page.locator('.bulb-card').first();
    const testButton = bulbCard.getByRole('button', { name: 'Test' });
    await expect(testButton).toBeVisible();
  });

  test('should trigger test cycle when clicking Test button', async ({ page }) => {
    // Find the first online bulb card with enabled Test button
    const bulbCard = page.locator('.bulb-card').first();
    const testButton = bulbCard.getByRole('button', { name: 'Test' });

    // Check if the button is enabled
    const isDisabled = await testButton.getAttribute('disabled');
    if (isDisabled === null) {
      // Click Test button and wait for the API call
      const responsePromise = page.waitForResponse(response =>
        response.url().includes('/api/bulb/') && response.url().includes('/test') && response.status() === 200
      );

      await testButton.click();

      // Button should show "Testing..." while in progress
      await expect(testButton).toHaveText('Testing...');

      // Wait for test to complete
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();

      // Button should return to "Test" after completion
      await expect(testButton).toHaveText('Test', { timeout: 10000 });
    }
  });

  test('should restore bulb state after test cycle completes', async ({ page }) => {
    // Find the first online bulb card with enabled Test button
    const bulbCard = page.locator('.bulb-card').first();
    const testButton = bulbCard.getByRole('button', { name: 'Test' });

    // Check if the button is enabled
    const isDisabled = await testButton.getAttribute('disabled');
    if (isDisabled === null) {
      // Get the initial border color style (represents bulb color)
      const initialBorderColor = await bulbCard.evaluate(el => el.style.borderColor);

      // Get initial on/off state from the status text
      const statusText = bulbCard.locator('.status-text');
      const initialStatus = await statusText.textContent();

      // Click Test button and wait for test API call
      const testResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/bulb/') && response.url().includes('/test') && response.status() === 200
      );

      await testButton.click();

      // Wait for test to complete
      await testResponsePromise;

      // Wait for the refresh API call that happens after test completes
      const listResponsePromise = page.waitForResponse(response =>
        response.url().includes('/api/list') && response.status() === 200
      );
      await listResponsePromise;

      // Wait for button to return to "Test" state
      await expect(testButton).toHaveText('Test', { timeout: 10000 });

      // Verify the bulb state is restored - border color should match initial
      const finalBorderColor = await bulbCard.evaluate(el => el.style.borderColor);
      expect(finalBorderColor).toBe(initialBorderColor);

      // Verify the on/off status is restored
      const finalStatus = await statusText.textContent();
      expect(finalStatus).toBe(initialStatus);
    }
  });
});

test.describe('Bulb Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );
  });

  test('should open modal when clicking bulb card', async ({ page }) => {
    // Click on a bulb card (not on the button)
    await page.locator('.bulb-card').first().click();

    // Modal should be visible
    await expect(page.locator('.modal')).toBeVisible();
    await expect(page.getByText('Bulb Settings')).toBeVisible();
  });

  test('should display bulb details in modal', async ({ page }) => {
    await page.locator('.bulb-card').first().click();

    // Check for device info within the modal (these are always present)
    const modal = page.locator('.modal');
    await expect(modal.getByText('Device ID:')).toBeVisible();
    await expect(modal.getByText('IP Address:')).toBeVisible();
    await expect(modal.getByText('Last Seen:', { exact: true })).toBeVisible();
  });

  test('should have editable name field', async ({ page }) => {
    await page.locator('.bulb-card').first().click();

    const nameInput = page.locator('.modal input[type="text"]').first();
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toBeEditable();
  });

  test('should have brightness slider for online bulb', async ({ page }) => {
    // Find an online bulb (has a Turn On/Off button that is not disabled)
    const onlineBulb = page.locator('.bulb-card:not(.offline)').first();
    await onlineBulb.click();

    // Only online bulbs show the slider
    const brightnessSlider = page.locator('.modal input[type="range"]').first();
    const isOnline = await page.locator('.info-value.online').count() > 0;
    if (isOnline) {
      await expect(brightnessSlider).toBeVisible();
    }
  });

  test('should have color picker for online bulb', async ({ page }) => {
    const onlineBulb = page.locator('.bulb-card:not(.offline)').first();
    await onlineBulb.click();

    const isOnline = await page.locator('.info-value.online').count() > 0;
    if (isOnline) {
      const colorPicker = page.locator('.modal input[type="color"]');
      await expect(colorPicker).toBeVisible();
    }
  });

  test('should have RGB inputs for online bulb', async ({ page }) => {
    const onlineBulb = page.locator('.bulb-card:not(.offline)').first();
    await onlineBulb.click();

    const isOnline = await page.locator('.info-value.online').count() > 0;
    if (isOnline) {
      const rgbInputs = page.locator('.rgb-input input');
      await expect(rgbInputs).toHaveCount(3);
    }
  });

  test('should have control buttons in modal for online bulb', async ({ page }) => {
    const onlineBulb = page.locator('.bulb-card:not(.offline)').first();
    await onlineBulb.click();

    const isOnline = await page.locator('.info-value.online').count() > 0;
    if (isOnline) {
      await expect(page.locator('.modal').getByRole('button', { name: 'Turn On' })).toBeVisible();
      await expect(page.locator('.modal').getByRole('button', { name: 'Turn Off' })).toBeVisible();
      await expect(page.locator('.modal').getByRole('button', { name: 'Apply Settings' })).toBeVisible();
    }
  });

  test('should close modal when clicking close button', async ({ page }) => {
    await page.locator('.bulb-card').first().click();
    await expect(page.locator('.modal')).toBeVisible();

    await page.locator('.close-btn').click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('should close modal when clicking backdrop', async ({ page }) => {
    await page.locator('.bulb-card').first().click();
    await expect(page.locator('.modal')).toBeVisible();

    // Click on the backdrop (outside the modal content)
    await page.locator('.modal-backdrop').click({ position: { x: 10, y: 10 } });
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('should close modal when pressing ESC key', async ({ page }) => {
    await page.locator('.bulb-card').first().click();
    await expect(page.locator('.modal')).toBeVisible();

    // Press ESC key
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('should save name changes', async ({ page }) => {
    // Mock the name API to prevent modifying the real bulb-directory.json
    await page.route(/\/api\/bulb\/.*\/name$/, route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, name: 'Test Name Change' })
      });
    });

    await page.locator('.bulb-card').first().click();

    const nameInput = page.locator('.modal input[type="text"]').first();
    await nameInput.fill('Test Name Change');

    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/name') && response.status() === 200
    );

    await page.locator('.modal').getByRole('button', { name: 'Save' }).click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
  });

  test('should apply brightness and color settings for online bulb', async ({ page }) => {
    const onlineBulb = page.locator('.bulb-card:not(.offline)').first();
    await onlineBulb.click();

    const isOnline = await page.locator('.info-value.online').count() > 0;
    if (isOnline) {
      // Adjust brightness using evaluate since fill doesn't work well with range inputs
      const brightnessSlider = page.locator('.modal input[type="range"]').first();
      await brightnessSlider.evaluate(el => { el.value = '75'; el.dispatchEvent(new Event('input', { bubbles: true })); });

      const responsePromise = page.waitForResponse(response =>
        response.url().includes('/set') && response.status() === 200
      );

      await page.locator('.modal').getByRole('button', { name: 'Apply Settings' }).click();
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();
    }
  });
});

test.describe('Error Handling', () => {
  test('should display error toast on API failure', async ({ page }) => {
    // Mock a failed API response
    await page.route('**/api/bulbs/on', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/');
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    // Try to turn on all bulbs
    await page.getByRole('button', { name: 'Turn All On' }).click();

    // Error toast should appear
    await expect(page.locator('.error-toast')).toBeVisible({ timeout: 5000 });
  });

  test('should dismiss error toast when clicked', async ({ page }) => {
    await page.route('**/api/bulbs/on', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Test Error' })
      });
    });

    await page.goto('/');
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    await page.getByRole('button', { name: 'Turn All On' }).click();
    await expect(page.locator('.error-toast')).toBeVisible({ timeout: 5000 });

    await page.locator('.error-toast').click();
    await expect(page.locator('.error-toast')).not.toBeVisible();
  });
});

test.describe('Responsive Layout', () => {
  test('should display grid layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    const grid = page.locator('.grid');
    await expect(grid).toBeVisible();
  });

  test('should adjust layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    // Grid should still be visible but with different columns
    const grid = page.locator('.grid');
    await expect(grid).toBeVisible();
  });
});

test.describe('Firmware Update', () => {
  test('should show Update Firmware button for old firmware', async ({ page }) => {
    // Mock API to return a bulb with old firmware version
    await page.route('**/api/list', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bulbs: [{
            id: 'test-bulb-old-firmware',
            name: 'Old Firmware Bulb',
            lastIp: '192.168.1.100',
            lastSeen: new Date().toISOString(),
            firmwareVersion: '1.90',
            online: true,
            on: true,
            brightness: 100,
            r: 255,
            g: 255,
            b: 255
          }]
        })
      });
    });

    await page.goto('/');
    await page.waitForSelector('.bulb-card');

    // Should show Update Firmware button instead of power/test buttons
    const firmwareBtn = page.locator('.firmware-btn');
    await expect(firmwareBtn).toBeVisible();
    await expect(firmwareBtn).toHaveText('Update Firmware');

    // Should NOT show power or test buttons
    await expect(page.locator('.power-btn')).not.toBeVisible();
    await expect(page.locator('.test-btn')).not.toBeVisible();
  });

  test('should link Update Firmware button to bulb IP', async ({ page }) => {
    await page.route('**/api/list', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bulbs: [{
            id: 'test-bulb-old-firmware',
            name: 'Old Firmware Bulb',
            lastIp: '192.168.1.100',
            lastSeen: new Date().toISOString(),
            firmwareVersion: '1.85',
            online: true,
            on: false
          }]
        })
      });
    });

    await page.goto('/');
    await page.waitForSelector('.bulb-card');

    const firmwareBtn = page.locator('.firmware-btn');
    await expect(firmwareBtn).toHaveAttribute('href', 'http://192.168.1.100');
    await expect(firmwareBtn).toHaveAttribute('target', '_blank');
  });

  test('should not open modal when clicking card with old firmware', async ({ page }) => {
    await page.route('**/api/list', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bulbs: [{
            id: 'test-bulb-old-firmware',
            name: 'Old Firmware Bulb',
            lastIp: '192.168.1.100',
            lastSeen: new Date().toISOString(),
            firmwareVersion: '1.50',
            online: true,
            on: true
          }]
        })
      });
    });

    await page.goto('/');
    await page.waitForSelector('.bulb-card');

    // Click on the card (not on the firmware button)
    await page.locator('.bulb-card').click();

    // Modal should NOT be visible
    await expect(page.locator('.modal')).not.toBeVisible();
  });

  test('should show normal controls for current firmware', async ({ page }) => {
    await page.route('**/api/list', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bulbs: [{
            id: 'test-bulb-current-firmware',
            name: 'Current Firmware Bulb',
            lastIp: '192.168.1.101',
            lastSeen: new Date().toISOString(),
            firmwareVersion: '1.96(u)',
            online: true,
            on: true
          }]
        })
      });
    });

    await page.goto('/');
    await page.waitForSelector('.bulb-card');

    // Should show power and test buttons
    await expect(page.locator('.power-btn')).toBeVisible();
    await expect(page.locator('.test-btn')).toBeVisible();

    // Should NOT show firmware button
    await expect(page.locator('.firmware-btn')).not.toBeVisible();
  });

  test('should show normal controls when firmware version is unknown', async ({ page }) => {
    await page.route('**/api/list', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          bulbs: [{
            id: 'test-bulb-unknown-firmware',
            name: 'Unknown Firmware Bulb',
            lastIp: '192.168.1.102',
            lastSeen: new Date().toISOString(),
            firmwareVersion: null,
            online: true,
            on: false
          }]
        })
      });
    });

    await page.goto('/');
    await page.waitForSelector('.bulb-card');

    // Should show power and test buttons (don't block when unknown)
    await expect(page.locator('.power-btn')).toBeVisible();
    await expect(page.locator('.test-btn')).toBeVisible();

    // Should NOT show firmware button
    await expect(page.locator('.firmware-btn')).not.toBeVisible();
  });
});

test.describe('Clickable IP Address', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );
  });

  test('should have clickable IP address in bulb card', async ({ page }) => {
    // Find the IP link in the first bulb card
    const bulbCard = page.locator('.bulb-card').first();
    const ipLink = bulbCard.locator('.ip-link');

    // Check if IP is present (some bulbs may not have an IP)
    const count = await ipLink.count();
    if (count > 0) {
      // Verify it's a link with correct attributes
      await expect(ipLink).toHaveAttribute('target', '_blank');
      await expect(ipLink).toHaveAttribute('rel', 'noopener noreferrer');

      // Get the href and verify it starts with http://
      const href = await ipLink.getAttribute('href');
      expect(href).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+$/);
    }
  });

  test('should have clickable IP address in modal', async ({ page }) => {
    // Open the modal
    await page.locator('.bulb-card').first().click();
    await expect(page.locator('.modal')).toBeVisible();

    // Find the IP link in the modal info section
    const modal = page.locator('.modal');
    const ipLink = modal.locator('.ip-link');

    // Check if IP is present
    const count = await ipLink.count();
    if (count > 0) {
      // Verify it's a link with correct attributes
      await expect(ipLink).toHaveAttribute('target', '_blank');
      await expect(ipLink).toHaveAttribute('rel', 'noopener noreferrer');

      // Get the href and verify it starts with http://
      const href = await ipLink.getAttribute('href');
      expect(href).toMatch(/^http:\/\/\d+\.\d+\.\d+\.\d+$/);
    }
  });

  test('should not navigate card when clicking IP address', async ({ page }) => {
    // This test verifies that clicking the IP link doesn't trigger the card click handler
    const bulbCard = page.locator('.bulb-card').first();
    const ipLink = bulbCard.locator('.ip-link');

    const count = await ipLink.count();
    if (count > 0) {
      // We'll intercept the navigation to prevent actually leaving the page
      await page.route('http://**', route => route.abort());

      // Click the IP link
      await ipLink.click();

      // The modal should NOT have opened (card click was not triggered)
      await expect(page.locator('.modal')).not.toBeVisible();
    }
  });
});

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('kauf-bulb-theme'));
    await page.reload();
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );
  });

  test('should display theme toggle button', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');
    await expect(themeToggle).toBeVisible();
  });

  test('should cycle through themes on click', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');

    // Initial state should be system (default)
    await expect(themeToggle).toHaveAttribute('title', 'Theme: System');

    // Click to cycle to light
    await themeToggle.click();
    await expect(themeToggle).toHaveAttribute('title', 'Theme: Light');

    // Click to cycle to dark
    await themeToggle.click();
    await expect(themeToggle).toHaveAttribute('title', 'Theme: Dark');

    // Click to cycle back to system
    await themeToggle.click();
    await expect(themeToggle).toHaveAttribute('title', 'Theme: System');
  });

  test('should apply dark theme styles', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');

    // Click twice to get to dark mode (system -> light -> dark)
    await themeToggle.click();
    await themeToggle.click();

    // Verify dark theme is applied
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('dark');
  });

  test('should apply light theme styles', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');

    // Click once to get to light mode
    await themeToggle.click();

    // Verify light theme is applied
    const theme = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(theme).toBe('light');
  });

  test('should persist theme preference', async ({ page }) => {
    const themeToggle = page.locator('.theme-toggle');

    // Set to dark mode
    await themeToggle.click();
    await themeToggle.click();

    // Verify dark theme is stored
    const storedTheme = await page.evaluate(() =>
      localStorage.getItem('kauf-bulb-theme')
    );
    expect(storedTheme).toBe('dark');

    // Reload the page
    await page.reload();
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    // Theme should still be dark
    await expect(themeToggle).toHaveAttribute('title', 'Theme: Dark');
    const themeAfterReload = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme')
    );
    expect(themeAfterReload).toBe('dark');
  });
});
