const DEFAULT_TRANSITION = parseInt(process.env.DEFAULT_TRANSITION || '1000', 10);
const TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function buildControlBody(options = {}) {
  const body = {};

  // ESPHome expects transition in seconds
  const transitionMs = options.transition ?? DEFAULT_TRANSITION;
  body.transition = transitionMs / 1000;

  if (options.brightness !== undefined) {
    // Convert 0-100 to 0-255
    body.brightness = Math.round((options.brightness / 100) * 255);
  }

  if (options.r !== undefined) body.r = options.r;
  if (options.g !== undefined) body.g = options.g;
  if (options.b !== undefined) body.b = options.b;

  return body;
}

function buildQueryParams(options = {}) {
  const params = new URLSearchParams();

  // ESPHome expects transition in seconds
  const transitionMs = options.transition ?? DEFAULT_TRANSITION;
  params.set('transition', (transitionMs / 1000).toString());

  if (options.brightness !== undefined) {
    // Convert 0-100 to 0-255
    params.set('brightness', Math.round((options.brightness / 100) * 255).toString());
  }

  if (options.r !== undefined) params.set('r', options.r.toString());
  if (options.g !== undefined) params.set('g', options.g.toString());
  if (options.b !== undefined) params.set('b', options.b.toString());
  if (options.white_value !== undefined) params.set('white_value', options.white_value.toString());

  return params;
}

export async function turnOn(ip, options = {}) {
  const params = buildQueryParams(options);
  const url = `http://${ip}/light/kauf_bulb/turn_on?${params.toString()}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return { success: true, ip };
  } catch (error) {
    return {
      success: false,
      ip,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
}

export async function turnOff(ip, options = {}) {
  const params = buildQueryParams(options);
  const url = `http://${ip}/light/kauf_bulb/turn_off?${params.toString()}`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return { success: true, ip };
  } catch (error) {
    return {
      success: false,
      ip,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
}

export async function getState(ip) {
  const url = `http://${ip}/light/kauf_bulb`;

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      ip,
      state: {
        on: data.state === 'ON',
        brightness: data.brightness !== undefined
          ? Math.round((data.brightness / 255) * 100)
          : null,
        r: data.color?.r,
        g: data.color?.g,
        b: data.color?.b
      }
    };
  } catch (error) {
    return {
      success: false,
      ip,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
}

export async function control(ip, options = {}) {
  if (options.state === 'on' || options.state === true) {
    return turnOn(ip, options);
  } else if (options.state === 'off' || options.state === false) {
    return turnOff(ip, options);
  } else {
    // Just update brightness/color without changing state
    return turnOn(ip, options);
  }
}

export async function testBulb(ip) {
  const transitionMs = 100;
  const displayMs = 1000;

  try {
    // Get current state to restore later
    const stateResult = await getState(ip);
    const originalState = stateResult.success ? stateResult.state : null;

    // Test colors: Red, Green, Blue (1 second each)
    const testColors = [
      { r: 255, g: 0, b: 0 },   // Red
      { r: 0, g: 255, b: 0 },   // Green
      { r: 0, g: 0, b: 255 },   // Blue
    ];

    // Cycle through colors
    for (const color of testColors) {
      await turnOn(ip, {
        brightness: 100,
        r: color.r,
        g: color.g,
        b: color.b,
        white_value: 0,
        transition: transitionMs
      });
      await new Promise(resolve => setTimeout(resolve, displayMs));
    }

    // Restore original state
    if (originalState) {
      if (originalState.on) {
        await turnOn(ip, {
          brightness: originalState.brightness ?? 100,
          r: originalState.r ?? 255,
          g: originalState.g ?? 255,
          b: originalState.b ?? 255,
          transition: transitionMs
        });
      } else {
        await turnOff(ip, { transition: transitionMs });
      }
    }

    return { success: true, ip, message: 'Test completed' };
  } catch (error) {
    return {
      success: false,
      ip,
      error: error.message
    };
  }
}

export async function getDeviceInfo(ip) {
  const url = `http://${ip}/events`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'text/event-stream' }
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Read the response stream until we get a ping event with device info
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Look for ping event with device info
      const pingMatch = buffer.match(/event:\s*ping\ndata:\s*({[^\n]+})/);
      if (pingMatch) {
        clearTimeout(timeoutId);
        reader.cancel();

        const pingData = JSON.parse(pingMatch[1]);
        return {
          success: true,
          ip,
          info: {
            title: pingData.title,
            esphomeVersion: pingData.esph_v,
            projectName: pingData.proj_n,
            firmwareVersion: pingData.proj_v,
            macAddress: pingData.mac_addr,
            freeSpace: pingData.free_sp
          }
        };
      }
    }

    clearTimeout(timeoutId);
    return {
      success: false,
      ip,
      error: 'No device info found in event stream'
    };
  } catch (error) {
    return {
      success: false,
      ip,
      error: error.name === 'AbortError' ? 'Timeout' : error.message
    };
  }
}
