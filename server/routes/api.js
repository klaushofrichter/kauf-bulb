import { Router } from 'express';
import { bulbStore } from '../bulbStore.js';
import { refreshDiscovery } from '../discovery.js';
import * as bulbController from '../bulbController.js';
import { bulbStateStack } from '../bulbStateStack.js';

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

  res.json({ success: true, bulbs: bulbsWithState });
});

// Turn on all bulbs
router.post('/bulbs/on', async (req, res) => {
  const transition = req.body.transition ?? req.query.transition;
  const transitionValue = transition ? parseInt(transition, 10) : undefined;

  const onlineBulbs = bulbStore.getOnlineBulbs();
  const results = await Promise.all(
    onlineBulbs.map(async (bulb) => {
      const result = await bulbController.turnOn(bulb.lastIp, { transition: transitionValue });
      return { id: bulb.id, ...result };
    })
  );

  res.json({ success: true, results });
});

// Turn off all bulbs
router.post('/bulbs/off', async (req, res) => {
  const transition = req.body.transition ?? req.query.transition;
  const transitionValue = transition ? parseInt(transition, 10) : undefined;

  const onlineBulbs = bulbStore.getOnlineBulbs();
  const results = await Promise.all(
    onlineBulbs.map(async (bulb) => {
      const result = await bulbController.turnOff(bulb.lastIp, { transition: transitionValue });
      return { id: bulb.id, ...result };
    })
  );

  res.json({ success: true, results });
});

// Refresh device discovery (POST only)
// Blocks for ~5 seconds while discovering devices, returns bulb list
router.post('/refresh', async (req, res) => {
  try {
    const result = await refreshDiscovery();
    res.json({
      success: true,
      message: 'Discovery completed',
      bulbs: result.bulbs,
      bulbsFound: result.devicesFound,
      duration: result.duration
    });
  } catch (error) {
    res.status(504).json({ success: false, error: error.message });
  }
});

// Get specific bulb state
router.get('/bulb/:id/state', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ success: false, error: 'Bulb is offline', bulb });
  }

  const result = await bulbController.getState(bulb.lastIp);
  res.json({ id: req.params.id, bulb, ...result });
});

// Get device info (firmware version, etc.)
router.get('/bulb/:id/info', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ success: false, error: 'Bulb is offline', bulb });
  }

  const result = await bulbController.getDeviceInfo(bulb.lastIp);

  // Store firmware version if successfully fetched
  if (result.success && result.info?.firmwareVersion) {
    bulbStore.updateFirmwareVersion(req.params.id, result.info.firmwareVersion);
    await bulbStore.save();
  }

  res.json({ id: req.params.id, ...result });
});

// Turn on specific bulb
router.post('/bulb/:id/on', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ success: false, error: 'Bulb is offline' });
  }

  const transition = req.body.transition ?? req.query.transition;
  const transitionValue = transition ? parseInt(transition, 10) : undefined;

  const result = await bulbController.turnOn(bulb.lastIp, { transition: transitionValue });
  res.json({ id: req.params.id, ...result });
});

// Turn off specific bulb
router.post('/bulb/:id/off', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ success: false, error: 'Bulb is offline' });
  }

  const transition = req.body.transition ?? req.query.transition;
  const transitionValue = transition ? parseInt(transition, 10) : undefined;

  const result = await bulbController.turnOff(bulb.lastIp, { transition: transitionValue });
  res.json({ id: req.params.id, ...result });
});

// Test bulb (cycle through red, green, blue)
router.post('/bulb/:id/test', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ success: false, error: 'Bulb is offline' });
  }

  const result = await bulbController.testBulb(bulb.lastIp);
  res.json({ id: req.params.id, ...result });
});

// Set bulb state (brightness, color, on/off, transition)
router.post('/bulb/:id/set', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ success: false, error: 'Bulb is offline' });
  }

  const { on, brightness, r, g, b, transition } = req.body;
  // Convert on: true/false to state: "on"/"off" for bulbController
  const state = on === true ? 'on' : on === false ? 'off' : undefined;
  const result = await bulbController.control(bulb.lastIp, {
    state,
    brightness,
    r,
    g,
    b,
    transition
  });

  res.json({ id: req.params.id, ...result });
});

// Update bulb friendly name
router.post('/bulb/:id/name', async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: 'Name is required' });
  }

  const success = bulbStore.updateName(req.params.id, name.trim());
  if (!success) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }

  try {
    await bulbStore.save();
    res.json({ success: true, id: req.params.id, name: name.trim() });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save changes' });
  }
});

// Push current bulb state to stack
router.post('/bulb/:id/push', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ success: false, error: 'Bulb is offline' });
  }

  // Get current state from bulb
  const stateResult = await bulbController.getState(bulb.lastIp);
  if (!stateResult.success) {
    return res.status(500).json({ success: false, error: 'Failed to get current state', details: stateResult.error });
  }

  // Push state to stack
  const stackSize = bulbStateStack.push(req.params.id, {
    on: stateResult.state.on,
    brightness: stateResult.state.brightness,
    r: stateResult.state.r,
    g: stateResult.state.g,
    b: stateResult.state.b,
    transition: req.body.transition ?? 1000
  });

  res.json({
    success: true,
    id: req.params.id,
    message: 'State pushed to stack',
    stackSize,
    state: stateResult.state
  });
});

// Pop and restore bulb state from stack
router.post('/bulb/:id/pop', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ success: false, error: 'Bulb is offline' });
  }

  // Pop state from stack
  const state = bulbStateStack.pop(req.params.id);
  if (!state) {
    return res.json({
      success: true,
      id: req.params.id,
      message: 'Stack is empty, no change made',
      stackSize: 0,
      restored: false
    });
  }

  // Restore the state
  let result;
  if (state.on) {
    result = await bulbController.turnOn(bulb.lastIp, {
      brightness: state.brightness,
      r: state.r,
      g: state.g,
      b: state.b,
      transition: state.transition
    });
  } else {
    result = await bulbController.turnOff(bulb.lastIp, {
      transition: state.transition
    });
  }

  res.json({
    success: result.success,
    id: req.params.id,
    message: result.success ? 'State restored from stack' : 'Failed to restore state',
    stackSize: bulbStateStack.size(req.params.id),
    restored: true,
    state
  });
});

// Push current state and apply new settings (combined push + set)
router.post('/bulb/:id/push-set', async (req, res) => {
  const bulb = bulbStore.getBulb(req.params.id);
  if (!bulb) {
    return res.status(404).json({ success: false, error: 'Bulb not found' });
  }
  if (!bulb.online || !bulb.lastIp) {
    return res.status(503).json({ success: false, error: 'Bulb is offline' });
  }

  // Get current state from bulb
  const stateResult = await bulbController.getState(bulb.lastIp);
  if (!stateResult.success) {
    return res.status(500).json({ success: false, error: 'Failed to get current state', details: stateResult.error });
  }

  // Push current state to stack (use transition from request for restore)
  const { on, brightness, r, g, b, transition } = req.body;
  const stackSize = bulbStateStack.push(req.params.id, {
    on: stateResult.state.on,
    brightness: stateResult.state.brightness,
    r: stateResult.state.r,
    g: stateResult.state.g,
    b: stateResult.state.b,
    transition: transition ?? 1000
  });

  // Apply new settings - convert on: true/false to state: "on"/"off"
  const state = on === true ? 'on' : on === false ? 'off' : undefined;
  const setResult = await bulbController.control(bulb.lastIp, {
    state,
    brightness,
    r,
    g,
    b,
    transition
  });

  res.json({
    success: setResult.success,
    id: req.params.id,
    message: setResult.success ? 'State pushed and new settings applied' : 'State pushed but set failed',
    stackSize,
    previousState: stateResult.state,
    setResult
  });
});

export default router;
