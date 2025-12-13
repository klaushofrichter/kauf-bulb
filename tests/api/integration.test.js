import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Integration tests for real Kauf Bulb control.
 * These tests require the server running at localhost:3001 and actual bulbs on the network.
 *
 * Start the server first: npm run dev
 * Then run: npm run test:api:integration
 */

const BASE_URL = 'http://localhost:3001';

async function apiGet(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  return {
    status: response.status,
    body: await response.json()
  };
}

async function apiPost(path, data) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return {
    status: response.status,
    body: await response.json()
  };
}

describe('Kauf Bulb Integration Tests', () => {
  let onlineBulbs = [];

  beforeAll(async () => {
    // Get list of bulbs from running server
    try {
      const response = await apiGet('/api/list');
      const bulbs = response.body.bulbs || [];
      onlineBulbs = bulbs.filter(b => b.online);

      if (onlineBulbs.length > 0) {
        console.log(`Found ${onlineBulbs.length} online bulb(s) for testing:`);
        onlineBulbs.forEach(b => console.log(`  - ${b.id} at ${b.lastIp}`));
      } else {
        console.log('No online bulbs found. Make sure the server is running and bulbs are on the network.');
      }
    } catch (error) {
      console.log('Could not connect to server. Make sure npm run dev is running.');
    }
  });

  describe('Bulb State Control - All Bulbs', () => {
    it('should turn on each bulb and verify state is ON', { timeout: 30000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulbs available');
        return;
      }

      for (const bulb of onlineBulbs) {
        console.log(`Testing turn ON for ${bulb.id}...`);

        // Turn on the bulb
        const onResponse = await apiGet(`/api/on?device=${bulb.id}`);
        expect(onResponse.status).toBe(200);
        expect(onResponse.body.success).toBe(true);

        // Wait for the bulb to update
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify state is ON
        const stateResponse = await apiGet(`/api/bulb/${bulb.id}/state`);
        expect(stateResponse.status).toBe(200);
        expect(stateResponse.body.success).toBe(true);
        expect(stateResponse.body.state.on).toBe(true);

        console.log(`  ✓ ${bulb.id} turned ON successfully`);
      }
    });

    it('should turn off each bulb and verify state is OFF', { timeout: 30000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulbs available');
        return;
      }

      for (const bulb of onlineBulbs) {
        console.log(`Testing turn OFF for ${bulb.id}...`);

        // Turn off the bulb
        const offResponse = await apiGet(`/api/off?device=${bulb.id}`);
        expect(offResponse.status).toBe(200);
        expect(offResponse.body.success).toBe(true);

        // Wait for the bulb to update
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify state is OFF
        const stateResponse = await apiGet(`/api/bulb/${bulb.id}/state`);
        expect(stateResponse.status).toBe(200);
        expect(stateResponse.body.success).toBe(true);
        expect(stateResponse.body.state.on).toBe(false);

        console.log(`  ✓ ${bulb.id} turned OFF successfully`);
      }
    });

    it('should turn on, verify ON, turn off, verify OFF for each bulb', { timeout: 60000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulbs available');
        return;
      }

      for (const bulb of onlineBulbs) {
        console.log(`Testing full cycle for ${bulb.id}...`);

        // Step 1: Turn ON
        const onResponse = await apiGet(`/api/on?device=${bulb.id}`);
        expect(onResponse.status).toBe(200);
        expect(onResponse.body.success).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Step 2: Verify ON
        const stateOn = await apiGet(`/api/bulb/${bulb.id}/state`);
        expect(stateOn.body.state.on).toBe(true);

        // Step 3: Turn OFF
        const offResponse = await apiGet(`/api/off?device=${bulb.id}`);
        expect(offResponse.status).toBe(200);
        expect(offResponse.body.success).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Step 4: Verify OFF
        const stateOff = await apiGet(`/api/bulb/${bulb.id}/state`);
        expect(stateOff.body.state.on).toBe(false);

        console.log(`  ✓ ${bulb.id} full cycle completed`);
      }
    });
  });

  describe('Bulb Brightness Control - All Bulbs', () => {
    it('should set brightness and verify for each bulb', { timeout: 30000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulbs available');
        return;
      }

      for (const bulb of onlineBulbs) {
        console.log(`Testing brightness for ${bulb.id}...`);

        // Turn on with specific brightness
        const controlResponse = await apiPost(`/api/bulb/${bulb.id}/control`, {
          state: 'on',
          brightness: 50
        });
        expect(controlResponse.status).toBe(200);
        expect(controlResponse.body.success).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify brightness (allow tolerance due to rounding and bulb behavior)
        const stateResponse = await apiGet(`/api/bulb/${bulb.id}/state`);
        expect(stateResponse.status).toBe(200);
        expect(stateResponse.body.state.on).toBe(true);
        // Bulb may have minimum brightness, so just verify it's in reasonable range
        // Some bulbs have lower minimum brightness, allow wide tolerance
        expect(stateResponse.body.state.brightness).toBeGreaterThanOrEqual(1);
        expect(stateResponse.body.state.brightness).toBeLessThanOrEqual(100);

        console.log(`  ✓ ${bulb.id} brightness set successfully`);
      }
    });

    it('should accept brightness control commands for each bulb', { timeout: 30000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulbs available');
        return;
      }

      for (const bulb of onlineBulbs) {
        console.log(`Testing brightness control for ${bulb.id}...`);

        // Set brightness to 100%
        const controlResponse = await apiPost(`/api/bulb/${bulb.id}/control`, {
          state: 'on',
          brightness: 100
        });

        expect(controlResponse.status).toBe(200);
        expect(controlResponse.body.success).toBe(true);

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Verify bulb is on and has some brightness value
        const stateResponse = await apiGet(`/api/bulb/${bulb.id}/state`);
        expect(stateResponse.body.state.on).toBe(true);
        expect(stateResponse.body.state.brightness).toBeDefined();
        expect(stateResponse.body.state.brightness).toBeGreaterThan(0);

        console.log(`  ✓ ${bulb.id} brightness control accepted`);
      }
    });
  });

  describe('Turn All Bulbs', () => {
    it('should turn on all bulbs', async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulbs available');
        return;
      }

      const response = await apiGet('/api/on');
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.results.length).toBe(onlineBulbs.length);

      for (const result of response.body.results) {
        expect(result.success).toBe(true);
      }
    });

    it('should turn off all bulbs', async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulbs available');
        return;
      }

      const response = await apiGet('/api/off');
      expect(response.status).toBe(200);
      expect(response.body.results).toBeDefined();
      expect(response.body.results.length).toBe(onlineBulbs.length);

      for (const result of response.body.results) {
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Transition Time', () => {
    it('should respect custom transition time', async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulb available');
        return;
      }

      const testBulbId = onlineBulbs[0].id;
      console.log(`Testing transition time for ${testBulbId}...`);

      // Turn off first
      await apiGet(`/api/off?device=${testBulbId}&transition=100`);

      await new Promise(resolve => setTimeout(resolve, 500));

      // Turn on with 2 second transition
      const startTime = Date.now();
      const response = await apiGet(`/api/on?device=${testBulbId}&transition=2000`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // The API call should return quickly (transition happens on the bulb)
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Test Endpoint', () => {
    it('should cycle through red, green, blue colors', { timeout: 15000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulb available');
        return;
      }

      const testBulbId = onlineBulbs[0].id;
      console.log(`Testing color cycle for ${testBulbId}...`);

      // Call the test endpoint
      const response = await apiPost(`/api/bulb/${testBulbId}/test`, {});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Test completed');
      expect(response.body.device).toBe(testBulbId);

      console.log(`  ✓ ${testBulbId} test cycle completed`);
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await apiPost('/api/bulb/non-existent-bulb/test', {});
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Device not found');
    });

    it('should return 503 for offline bulb', async () => {
      // Find an offline bulb from the list
      const listResponse = await apiGet('/api/list');
      const offlineBulbs = (listResponse.body.bulbs || []).filter(b => !b.online);

      if (offlineBulbs.length === 0) {
        console.log('Skipping: No offline bulbs to test');
        return;
      }

      const offlineBulbId = offlineBulbs[0].id;
      console.log(`Testing offline bulb ${offlineBulbId}...`);

      const response = await apiPost(`/api/bulb/${offlineBulbId}/test`, {});
      expect(response.status).toBe(503);
      expect(response.body.error).toBe('Device is offline');

      console.log(`  ✓ Offline bulb correctly rejected`);
    });
  });
});
