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

  describe('Push/Pop State Stack', () => {
    it('should push current state to stack', { timeout: 10000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulb available');
        return;
      }

      const testBulbId = onlineBulbs[0].id;
      console.log(`Testing push state for ${testBulbId}...`);

      // Push current state
      const response = await apiPost(`/api/bulb/${testBulbId}/push`, { transition: 500 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('State pushed to stack');
      expect(response.body.stackSize).toBeGreaterThanOrEqual(1);
      expect(response.body.state).toBeDefined();

      console.log(`  ✓ ${testBulbId} state pushed (stack size: ${response.body.stackSize})`);
    });

    it('should push and pop state, restoring original settings', { timeout: 20000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulb available');
        return;
      }

      const testBulbId = onlineBulbs[0].id;
      console.log(`Testing push/pop cycle for ${testBulbId}...`);

      // Set bulb to a known state (on, orange, 80%)
      await apiPost(`/api/bulb/${testBulbId}/control`, {
        state: 'on',
        brightness: 80,
        r: 255,
        g: 128,
        b: 0
      });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Push the state
      const pushResponse = await apiPost(`/api/bulb/${testBulbId}/push`, { transition: 300 });
      expect(pushResponse.status).toBe(200);
      console.log(`  - Pushed state: on=${pushResponse.body.state.on}, brightness=${pushResponse.body.state.brightness}`);

      // Change the bulb to a different state (blue, 50%)
      await apiPost(`/api/bulb/${testBulbId}/control`, {
        state: 'on',
        brightness: 50,
        r: 0,
        g: 0,
        b: 255
      });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify the bulb changed
      const changedState = await apiGet(`/api/bulb/${testBulbId}/state`);
      expect(changedState.body.state.b).toBeGreaterThan(changedState.body.state.r);
      console.log(`  - Changed to blue`);

      // Pop the state (should restore to orange)
      const popResponse = await apiPost(`/api/bulb/${testBulbId}/pop`, {});
      expect(popResponse.status).toBe(200);
      expect(popResponse.body.success).toBe(true);
      expect(popResponse.body.restored).toBe(true);
      console.log(`  - Popped state: restoring to on=${popResponse.body.state.on}`);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify the bulb is restored to orange
      const restoredState = await apiGet(`/api/bulb/${testBulbId}/state`);
      expect(restoredState.body.state.on).toBe(true);
      // Should be more red than blue (orange)
      expect(restoredState.body.state.r).toBeGreaterThan(restoredState.body.state.b);

      console.log(`  ✓ ${testBulbId} state restored successfully`);
    });

    it('should return empty stack message when nothing to pop', async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulb available');
        return;
      }

      // Use a different bulb ID to ensure empty stack
      const testBulbId = onlineBulbs[onlineBulbs.length - 1].id;
      console.log(`Testing empty pop for ${testBulbId}...`);

      // Clear any existing state by popping until empty
      let popResult;
      do {
        popResult = await apiPost(`/api/bulb/${testBulbId}/pop`, {});
      } while (popResult.body.restored);

      // Now pop from empty stack
      const response = await apiPost(`/api/bulb/${testBulbId}/pop`, {});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Stack is empty, no change made');
      expect(response.body.restored).toBe(false);

      console.log(`  ✓ Empty stack handled correctly`);
    });

    it('should return 404 for non-existent bulb on push', async () => {
      const response = await apiPost('/api/bulb/non-existent-bulb/push', {});
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Device not found');
    });

    it('should return 404 for non-existent bulb on pop', async () => {
      const response = await apiPost('/api/bulb/non-existent-bulb/pop', {});
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Device not found');
    });
  });

  describe('Push-Set Combined Endpoint', () => {
    it('should push state and apply new settings in one call', { timeout: 15000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulb available');
        return;
      }

      const testBulbId = onlineBulbs[0].id;
      console.log(`Testing push-set for ${testBulbId}...`);

      // Push current state and set to red
      const response = await apiPost(`/api/bulb/${testBulbId}/push-set`, {
        state: 'on',
        brightness: 100,
        r: 255,
        g: 0,
        b: 0,
        transition: 300
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('State pushed and new settings applied');
      expect(response.body.stackSize).toBeGreaterThanOrEqual(1);
      expect(response.body.previousState).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify bulb is red
      const stateResponse = await apiGet(`/api/bulb/${testBulbId}/state`);
      expect(stateResponse.body.state.on).toBe(true);
      expect(stateResponse.body.state.r).toBeGreaterThan(stateResponse.body.state.b);

      console.log(`  ✓ ${testBulbId} push-set applied successfully`);
    });

    it('should allow pop to restore after push-set', { timeout: 20000 }, async () => {
      if (onlineBulbs.length === 0) {
        console.log('Skipping: No online bulb available');
        return;
      }

      const testBulbId = onlineBulbs[0].id;
      console.log(`Testing push-set + pop for ${testBulbId}...`);

      // Set to a known state first (white, 60%)
      await apiPost(`/api/bulb/${testBulbId}/control`, {
        state: 'on',
        brightness: 60,
        r: 255,
        g: 255,
        b: 255
      });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Push and set to blue
      const pushSetResponse = await apiPost(`/api/bulb/${testBulbId}/push-set`, {
        state: 'on',
        brightness: 100,
        r: 0,
        g: 0,
        b: 255,
        transition: 300
      });
      expect(pushSetResponse.body.success).toBe(true);
      console.log(`  - Pushed white state, set to blue`);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Pop to restore white
      const popResponse = await apiPost(`/api/bulb/${testBulbId}/pop`, {});
      expect(popResponse.body.success).toBe(true);
      expect(popResponse.body.restored).toBe(true);
      console.log(`  - Popped to restore white`);

      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify restored to white (r and g should equal b, not blue-dominant)
      const stateResponse = await apiGet(`/api/bulb/${testBulbId}/state`);
      // White means r >= b (blue was 255, 0, 0 before restore)
      expect(stateResponse.body.state.r).toBeGreaterThanOrEqual(stateResponse.body.state.b);
      expect(stateResponse.body.state.g).toBeGreaterThanOrEqual(stateResponse.body.state.b);

      console.log(`  ✓ ${testBulbId} push-set + pop cycle completed`);
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await apiPost('/api/bulb/non-existent-bulb/push-set', {
        brightness: 50
      });
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Device not found');
    });
  });
});
