import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { createTestApp, seedTestBulbs, clearTestBulbs, bulbStore } from './setup.js';
import { bulbStateStack } from '../../server/bulbStateStack.js';

// Mock the bulbController to avoid actual HTTP calls to bulbs
vi.mock('../../server/bulbController.js', () => ({
  turnOn: vi.fn().mockResolvedValue({ success: true, ip: '192.168.1.100' }),
  turnOff: vi.fn().mockResolvedValue({ success: true, ip: '192.168.1.100' }),
  getState: vi.fn().mockResolvedValue({
    success: true,
    ip: '192.168.1.100',
    state: { on: true, brightness: 100, r: 255, g: 255, b: 255 }
  }),
  control: vi.fn().mockResolvedValue({ success: true, ip: '192.168.1.100' })
}));

// Mock discovery
vi.mock('../../server/discovery.js', () => ({
  refreshDiscovery: vi.fn().mockResolvedValue({
    bulbs: [],
    devicesFound: 0,
    duration: 5000
  })
}));

describe('REST API Endpoints', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    seedTestBulbs();
  });

  afterEach(() => {
    clearTestBulbs();
    bulbStateStack.clearAll();
    vi.clearAllMocks();
  });

  describe('GET /api/list', () => {
    it('should return all bulbs with success flag', async () => {
      const response = await request(app)
        .get('/api/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('bulbs');
      expect(response.body.bulbs).toHaveLength(3);
    });

    it('should include bulb details', async () => {
      const response = await request(app)
        .get('/api/list')
        .expect(200);

      const bulb = response.body.bulbs.find(b => b.id === 'kauf-bulb-test1');
      expect(bulb).toBeDefined();
      expect(bulb.name).toBe('Test Bulb 1');
      expect(bulb.lastIp).toBe('192.168.1.100');
      expect(bulb.online).toBe(true);
    });

    it('should return empty array when no bulbs exist', async () => {
      clearTestBulbs();

      const response = await request(app)
        .get('/api/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.bulbs).toHaveLength(0);
    });
  });

  describe('POST /api/bulbs/on', () => {
    it('should turn on all online bulbs', async () => {
      const response = await request(app)
        .post('/api/bulbs/on')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('results');
      // Should only turn on online bulbs (2 out of 3)
      expect(response.body.results).toHaveLength(2);
    });

    it('should return id in results', async () => {
      const response = await request(app)
        .post('/api/bulbs/on')
        .expect(200);

      expect(response.body.results[0]).toHaveProperty('id');
      expect(response.body.results[0]).toHaveProperty('success');
    });

    it('should accept transition in body', async () => {
      const response = await request(app)
        .post('/api/bulbs/on')
        .send({ transition: 2000 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/bulb/:id/on', () => {
    it('should turn on a specific bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/on')
        .expect(200);

      expect(response.body.id).toBe('kauf-bulb-test1');
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/non-existent/on')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb not found');
    });

    it('should return 503 for offline bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-offline/on')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb is offline');
    });

    it('should accept transition parameter', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/on')
        .send({ transition: 2000 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/bulbs/off', () => {
    it('should turn off all online bulbs', async () => {
      const response = await request(app)
        .post('/api/bulbs/off')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
    });

    it('should return id in results', async () => {
      const response = await request(app)
        .post('/api/bulbs/off')
        .expect(200);

      expect(response.body.results[0]).toHaveProperty('id');
      expect(response.body.results[0]).toHaveProperty('success');
    });
  });

  describe('POST /api/bulb/:id/off', () => {
    it('should turn off a specific bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/off')
        .expect(200);

      expect(response.body.id).toBe('kauf-bulb-test1');
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/non-existent/off')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb not found');
    });

    it('should return 503 for offline bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-offline/off')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb is offline');
    });
  });

  describe('POST /api/refresh', () => {
    it('should trigger discovery refresh and return results', async () => {
      const response = await request(app)
        .post('/api/refresh')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Discovery completed');
      expect(response.body).toHaveProperty('bulbs');
      expect(response.body).toHaveProperty('bulbsFound');
      expect(response.body).toHaveProperty('duration');
    });
  });

  describe('GET /api/bulb/:id/state', () => {
    it('should return bulb state', async () => {
      const response = await request(app)
        .get('/api/bulb/kauf-bulb-test1/state')
        .expect(200);

      expect(response.body.id).toBe('kauf-bulb-test1');
      expect(response.body.success).toBe(true);
      expect(response.body.state).toBeDefined();
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await request(app)
        .get('/api/bulb/non-existent/state')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb not found');
    });

    it('should return 503 for offline bulb', async () => {
      const response = await request(app)
        .get('/api/bulb/kauf-bulb-offline/state')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb is offline');
    });
  });

  describe('POST /api/bulb/:id/set', () => {
    it('should set bulb with brightness', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/set')
        .send({ brightness: 50 })
        .expect(200);

      expect(response.body.id).toBe('kauf-bulb-test1');
      expect(response.body.success).toBe(true);
    });

    it('should set bulb with color', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/set')
        .send({ r: 255, g: 128, b: 0 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should set bulb with on:true and transition', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/set')
        .send({ on: true, brightness: 75, transition: 500 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should set bulb with on:false', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/set')
        .send({ on: false, transition: 500 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/non-existent/set')
        .send({ on: true })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb not found');
    });

    it('should return 503 for offline bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-offline/set')
        .send({ on: true })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb is offline');
    });
  });

  describe('POST /api/bulb/:id/name', () => {
    it('should update bulb name', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/name')
        .send({ name: 'New Name' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.id).toBe('kauf-bulb-test1');
      expect(response.body.name).toBe('New Name');

      // Verify the name was updated in the store
      const bulb = bulbStore.getBulb('kauf-bulb-test1');
      expect(bulb.name).toBe('New Name');
    });

    it('should trim whitespace from name', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/name')
        .send({ name: '  Trimmed Name  ' })
        .expect(200);

      expect(response.body.name).toBe('Trimmed Name');
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/name')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Name is required');
    });

    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/name')
        .send({ name: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Name is required');
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/non-existent/name')
        .send({ name: 'New Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb not found');
    });
  });

  describe('POST /api/bulb/:id/push', () => {
    it('should push current state to stack', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/push')
        .send({ transition: 500 })
        .expect(200);

      expect(response.body.id).toBe('kauf-bulb-test1');
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('State pushed to stack');
      expect(response.body.stackSize).toBe(1);
      expect(response.body.state).toBeDefined();
    });

    it('should increment stack size on multiple pushes', async () => {
      await request(app)
        .post('/api/bulb/kauf-bulb-test1/push')
        .send({})
        .expect(200);

      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/push')
        .send({})
        .expect(200);

      expect(response.body.stackSize).toBe(2);
    });

    it('should maintain separate stacks per bulb', async () => {
      await request(app)
        .post('/api/bulb/kauf-bulb-test1/push')
        .send({})
        .expect(200);

      await request(app)
        .post('/api/bulb/kauf-bulb-test1/push')
        .send({})
        .expect(200);

      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test2/push')
        .send({})
        .expect(200);

      expect(response.body.stackSize).toBe(1); // Separate stack for test2
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/non-existent/push')
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb not found');
    });

    it('should return 503 for offline bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-offline/push')
        .send({})
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb is offline');
    });
  });

  describe('POST /api/bulb/:id/pop', () => {
    it('should pop and restore state from stack', async () => {
      // First push a state
      await request(app)
        .post('/api/bulb/kauf-bulb-test1/push')
        .send({ transition: 500 })
        .expect(200);

      // Then pop it
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/pop')
        .expect(200);

      expect(response.body.id).toBe('kauf-bulb-test1');
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('State restored from stack');
      expect(response.body.stackSize).toBe(0);
      expect(response.body.restored).toBe(true);
      expect(response.body.state).toBeDefined();
    });

    it('should return empty stack message when nothing to pop', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/pop')
        .expect(200);

      expect(response.body.id).toBe('kauf-bulb-test1');
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Stack is empty, no change made');
      expect(response.body.stackSize).toBe(0);
      expect(response.body.restored).toBe(false);
    });

    it('should pop in LIFO order', async () => {
      // Push two states
      await request(app)
        .post('/api/bulb/kauf-bulb-test1/push')
        .send({ transition: 100 })
        .expect(200);

      await request(app)
        .post('/api/bulb/kauf-bulb-test1/push')
        .send({ transition: 200 })
        .expect(200);

      // Pop first - should get the second pushed (LIFO)
      const response1 = await request(app)
        .post('/api/bulb/kauf-bulb-test1/pop')
        .expect(200);
      expect(response1.body.stackSize).toBe(1);
      expect(response1.body.state.transition).toBe(200);

      // Pop second - should get the first pushed
      const response2 = await request(app)
        .post('/api/bulb/kauf-bulb-test1/pop')
        .expect(200);
      expect(response2.body.stackSize).toBe(0);
      expect(response2.body.state.transition).toBe(100);
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/non-existent/pop')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb not found');
    });

    it('should return 503 for offline bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-offline/pop')
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb is offline');
    });
  });

  describe('POST /api/bulb/:id/push-set', () => {
    it('should push current state and apply new settings', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/push-set')
        .send({ on: true, brightness: 80, r: 255, g: 128, b: 0, transition: 500 })
        .expect(200);

      expect(response.body.id).toBe('kauf-bulb-test1');
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('State pushed and new settings applied');
      expect(response.body.stackSize).toBe(1);
      expect(response.body.previousState).toBeDefined();
      expect(response.body.setResult).toBeDefined();
    });

    it('should increment stack size on multiple push-set calls', async () => {
      await request(app)
        .post('/api/bulb/kauf-bulb-test1/push-set')
        .send({ brightness: 50 })
        .expect(200);

      const response = await request(app)
        .post('/api/bulb/kauf-bulb-test1/push-set')
        .send({ brightness: 100 })
        .expect(200);

      expect(response.body.stackSize).toBe(2);
    });

    it('should allow pop to restore after push-set', async () => {
      // Push and set new state
      await request(app)
        .post('/api/bulb/kauf-bulb-test1/push-set')
        .send({ on: true, brightness: 100, r: 0, g: 255, b: 0 })
        .expect(200);

      // Pop should restore
      const popResponse = await request(app)
        .post('/api/bulb/kauf-bulb-test1/pop')
        .expect(200);

      expect(popResponse.body.restored).toBe(true);
      expect(popResponse.body.stackSize).toBe(0);
    });

    it('should return 404 for non-existent bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/non-existent/push-set')
        .send({ brightness: 50 })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb not found');
    });

    it('should return 503 for offline bulb', async () => {
      const response = await request(app)
        .post('/api/bulb/kauf-bulb-offline/push-set')
        .send({ brightness: 50 })
        .expect(503);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Bulb is offline');
    });
  });
});
