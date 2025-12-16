import { ref, readonly } from 'vue';

const bulbs = ref([]);
const loading = ref(false);
const error = ref(null);

export function useBulbs() {
  async function fetchBulbs() {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/list');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      bulbs.value = data.bulbs || [];
    } catch (err) {
      error.value = `Failed to fetch bulbs: ${err.message}`;
      console.error('fetchBulbs error:', err);
    } finally {
      loading.value = false;
    }
  }

  async function turnOn(bulbId = null, options = {}) {
    error.value = null;
    try {
      let url;
      const body = {};
      if (options.transition !== undefined) body.transition = options.transition;

      if (bulbId) {
        // Single bulb: POST /api/bulb/:id/on
        url = `/api/bulb/${bulbId}/on`;
      } else {
        // All bulbs: POST /api/bulbs/on
        url = '/api/bulbs/on';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      await fetchBulbs();
      return await response.json();
    } catch (err) {
      error.value = `Failed to turn on: ${err.message}`;
      console.error('turnOn error:', err);
      throw err;
    }
  }

  async function turnOff(bulbId = null, options = {}) {
    error.value = null;
    try {
      let url;
      const body = {};
      if (options.transition !== undefined) body.transition = options.transition;

      if (bulbId) {
        // Single bulb: POST /api/bulb/:id/off
        url = `/api/bulb/${bulbId}/off`;
      } else {
        // All bulbs: POST /api/bulbs/off
        url = '/api/bulbs/off';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      await fetchBulbs();
      return await response.json();
    } catch (err) {
      error.value = `Failed to turn off: ${err.message}`;
      console.error('turnOff error:', err);
      throw err;
    }
  }

  async function setBulb(bulbId, options = {}) {
    error.value = null;
    try {
      const response = await fetch(`/api/bulb/${bulbId}/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      await fetchBulbs();
      return await response.json();
    } catch (err) {
      error.value = `Failed to set bulb: ${err.message}`;
      console.error('setBulb error:', err);
      throw err;
    }
  }

  async function updateName(bulbId, name) {
    error.value = null;
    try {
      const response = await fetch(`/api/bulb/${bulbId}/name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      await fetchBulbs();
      return await response.json();
    } catch (err) {
      error.value = `Failed to update name: ${err.message}`;
      console.error('updateName error:', err);
      throw err;
    }
  }

  async function refreshDiscovery() {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch('/api/refresh', { method: 'POST' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      // API returns bulb list directly after ~5 second discovery window
      bulbs.value = data.bulbs || [];
      return data;
    } catch (err) {
      error.value = `Failed to refresh: ${err.message}`;
      console.error('refreshDiscovery error:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function getBulbState(bulbId) {
    try {
      const response = await fetch(`/api/bulb/${bulbId}/state`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('getBulbState error:', err);
      throw err;
    }
  }

  async function getDeviceInfo(bulbId) {
    try {
      const response = await fetch(`/api/bulb/${bulbId}/info`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('getDeviceInfo error:', err);
      throw err;
    }
  }

  async function testBulb(bulbId) {
    try {
      const response = await fetch(`/api/bulb/${bulbId}/test`, {
        method: 'POST'
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('testBulb error:', err);
      throw err;
    }
  }

  async function pushState(bulbId, options = {}) {
    try {
      const response = await fetch(`/api/bulb/${bulbId}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('pushState error:', err);
      throw err;
    }
  }

  async function popState(bulbId) {
    try {
      const response = await fetch(`/api/bulb/${bulbId}/pop`, {
        method: 'POST'
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error('popState error:', err);
      throw err;
    }
  }

  function clearError() {
    error.value = null;
  }

  return {
    bulbs: readonly(bulbs),
    loading: readonly(loading),
    error: readonly(error),
    fetchBulbs,
    turnOn,
    turnOff,
    setBulb,
    updateName,
    refreshDiscovery,
    getBulbState,
    getDeviceInfo,
    testBulb,
    pushState,
    popState,
    clearError
  };
}
