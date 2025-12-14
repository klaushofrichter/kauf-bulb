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

  async function turnOn(deviceId = null, options = {}) {
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (deviceId) params.set('device', deviceId);
      if (options.transition !== undefined) params.set('transition', options.transition);

      const url = `/api/on${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

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

  async function turnOff(deviceId = null, options = {}) {
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (deviceId) params.set('device', deviceId);
      if (options.transition !== undefined) params.set('transition', options.transition);

      const url = `/api/off${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);

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

  async function controlBulb(deviceId, options = {}) {
    error.value = null;
    try {
      const response = await fetch(`/api/bulb/${deviceId}/control`, {
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
      error.value = `Failed to control bulb: ${err.message}`;
      console.error('controlBulb error:', err);
      throw err;
    }
  }

  async function updateName(deviceId, name) {
    error.value = null;
    try {
      const response = await fetch(`/api/bulb/${deviceId}/name`, {
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
      // API now returns bulb list directly after ~5 second discovery window
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

  async function getBulbState(deviceId) {
    try {
      const response = await fetch(`/api/bulb/${deviceId}/state`);
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

  async function getDeviceInfo(deviceId) {
    try {
      const response = await fetch(`/api/bulb/${deviceId}/info`);
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

  async function testBulb(deviceId) {
    try {
      const response = await fetch(`/api/bulb/${deviceId}/test`, {
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
    controlBulb,
    updateName,
    refreshDiscovery,
    getBulbState,
    getDeviceInfo,
    testBulb,
    clearError
  };
}
