import express from 'express';
import { bulbStore } from '../../server/bulbStore.js';
import apiRoutes from '../../server/routes/api.js';

export function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
  return app;
}

export function seedTestBulbs() {
  // Clear and seed with test data
  bulbStore.bulbs.clear();

  bulbStore.bulbs.set('kauf-bulb-test1', {
    id: 'kauf-bulb-test1',
    name: 'Test Bulb 1',
    lastSeen: new Date().toISOString(),
    lastIp: '192.168.1.100',
    online: true
  });

  bulbStore.bulbs.set('kauf-bulb-test2', {
    id: 'kauf-bulb-test2',
    name: 'Test Bulb 2',
    lastSeen: new Date().toISOString(),
    lastIp: '192.168.1.101',
    online: true
  });

  bulbStore.bulbs.set('kauf-bulb-offline', {
    id: 'kauf-bulb-offline',
    name: 'Offline Bulb',
    lastSeen: new Date(Date.now() - 86400000).toISOString(),
    lastIp: '192.168.1.102',
    online: false
  });
}

export function clearTestBulbs() {
  bulbStore.bulbs.clear();
}

export { bulbStore };
