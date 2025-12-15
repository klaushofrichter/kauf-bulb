import { Router } from 'express';
import { bulbStore } from '../bulbStore.js';
import { refreshDiscovery } from '../discovery.js';
import * as bulbController from '../bulbController.js';

const router = Router();

// List all known bulbs
router.get('/list', async (req, res) => {
  const bulbs = bulbStore.getAllBulbs();

  // Optionally fetch current state for online bulbs
  const bulbsWithState = await Promise.all(
    bulbs.map(async (bulb) => {
      if (bulb.online && bulb.lastIp) {
        const stateResult = await bulbController.getState(bulb.lastIp);
        if (stateResult.success) {
          return { ...bulb, ...stateResult.state };
        }
      }
      return bulb;
    })
  );

  res.json({ bulbs: bulbsWithState });
});

// Turn on all bulbs or specific bulb
router.get('/on', async (req, res) => {
  const deviceId = req.query.device;
  const transition = req.query.transition ? parseInt(req.query.transition, 10) : undefined;

  if (deviceId) {
    const bulb = bulbStore.getBulb(deviceId);
    if (!bulb) {
      return res.status(404).json({ error: 'Device not found' });
    }
    if (!bulb.online || !bulb.lastIp) {
      return res.status(503).json({ error: 'Device is offline' });
    }

    const result = await bulbController.turnOn(bulb.lastIp, { transition });
    return res.json({ device: deviceId, ...result });
  }

  // Turn on all online bulbs
  const onlineBulbs = bulbStore.getOnlineBulbs();
  const results = await Promise.all(
    onlineBulbs.map(async (bulb) => {
      const result = await bulbController.turnOn(bulb.lastIp, { transition });
      return { device: bulb.id, ...result };
    })
  );

  res.json({ results });
});

// Turn off all bulbs or specific bulb
router.get('/off', async (req, res) => {
  const deviceId = req.query.device;
  const transition = req.query.transition ? parseInt(req.query.transition, 10) : undefined;

  if (deviceId) {
    const bulb = bulbStore.getBulb(deviceId);
    if (!bulb) {
      return res.status(404).json({ error: 'Device not found' });
    }
    if (!bulb.online || !bulb.lastIp) {
      return res.status(503).json({ error: 'Device is offline' });
    }

    const result = await bulbController.turnOff(bulb.lastIp, { transition });
    return res.json({ device: deviceId, ...result });
  }

  // Turn off all online bulbs
  const onlineBulbs = bulbStore.getOnlineBulbs();
  const results = await Promise.all(
    onlineBulbs.map(async (bulb) => {
      const result = await bulbController.turnOff(bulb.lastIp, { transition });
      return { device: bulb.id, ...result };
    })
  );

  res.json({ results });
});

// Refresh device discovery (supports both GET and POST)
// Blocks for ~5 seconds while discovering devices, returns bulb list
async function handleRefresh(req, res) {
  try {
    const result = await refreshDiscovery();
    res.json({
      message: 'Discovery completed',
      bulbs: result.bulbs,
      devicesFound: result.devicesFound,
      duration: result.duration
    });
  } catch (error) {
    res.status(504).json({ error: error.message });
  }
}
router.get('/refresh', handleRefresh);
router.post('/refresh', handleRefresh);

// Get specific bulb state
router.get('/bulb/:id/state', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ error: 'Device not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ error: 'Device is offline', bulb });
  }

  const result = await bulbController.getState(bulb.lastIp);
  res.json({ device: req.params.id, bulb, ...result });
});

// Get device info (firmware version, etc.)
router.get('/bulb/:id/info', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ error: 'Device not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ error: 'Device is offline', bulb });
  }

  const result = await bulbController.getDeviceInfo(bulb.lastIp);

  // Store firmware version if successfully fetched
  if (result.success && result.info?.firmwareVersion) {
    bulbStore.updateFirmwareVersion(req.params.id, result.info.firmwareVersion);
    await bulbStore.save();
  }

  res.json({ device: req.params.id, ...result });
});

// Test bulb (cycle through red, green, blue)
router.post('/bulb/:id/test', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ error: 'Device not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ error: 'Device is offline' });
  }

  const result = await bulbController.testBulb(bulb.lastIp);
  res.json({ device: req.params.id, ...result });
});

// Advanced bulb control (brightness, color, transition)
router.post('/bulb/:id/control', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ error: 'Device not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ error: 'Device is offline' });
  }

  const { state, brightness, r, g, b, transition } = req.body;
  const result = await bulbController.control(bulb.lastIp, {
    state,
    brightness,
    r,
    g,
    b,
    transition
  });

  res.json({ device: req.params.id, ...result });
});

// Update bulb friendly name
router.post('/bulb/:id/name', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Name is required' });
  }

  const success = bulbStore.updateName(req.params.id, name.trim());
  if (!success) {
    return res.status(404).json({ error: 'Device not found' });
  }

  try {
    await bulbStore.save();
    res.json({ device: req.params.id, name: name.trim() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save changes' });
  }
});

export default router;
