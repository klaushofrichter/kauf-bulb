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
    await expect(firstCard.locator('.status-indicator')).toBeVisible();
  });

  test('should show status indicators', async ({ page }) => {
    await page.waitForResponse(response =>
      response.url().includes('/api/list') && response.status() === 200
    );

    // Check for status indicators (one per bulb card)
    const bulbCards = page.locator('.bulb-card');
    const statusIndicators = page.locator('.status-indicator');
    const cardCount = await bulbCards.count();
    await expect(statusIndicators).toHaveCount(cardCount);
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
        (response.url().includes('/api/on') || response.url().includes('/api/off')) && response.status() === 200
      );

      await powerButton.click();
      const response = await responsePromise;
      expect(response.ok()).toBeTruthy();
    }
  });

  test('should turn on all bulbs', async ({ page }) => {
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/on') && !response.url().includes('device=') && response.status() === 200
    );

    await page.getByRole('button', { name: 'Turn All On' }).click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
  });

  test('should turn off all bulbs', async ({ page }) => {
    const responsePromise = page.waitForResponse(response =>
      response.url().includes('/api/off') && !response.url().includes('device=') && response.status() === 200
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

  test('should save name changes', async ({ page }) => {
    await page.locator('.bulb-card').first().click();

    const nameInput = page.locator('.modal input[type="text"]').first();
    await nameInput.fill('Updated Name');

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
        response.url().includes('/control') && response.status() === 200
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
    await page.route('**/api/on**', route => {
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
    await page.route('**/api/on**', route => {
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
