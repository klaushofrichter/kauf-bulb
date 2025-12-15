<script setup>
import { ref, computed } from 'vue';
import { useBulbs } from '../composables/useBulbs.js';

const props = defineProps({
  bulb: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['click']);

const { turnOn, turnOff, testBulb: apiTestBulb } = useBulbs();
const isLoading = ref(false);
const isTesting = ref(false);
const testColor = ref(null);

// Test colors matching server: Red, Green, Blue (1 second each)
const TEST_COLORS = [
  { r: 255, g: 0, b: 0 },   // Red
  { r: 0, g: 255, b: 0 },   // Green
  { r: 0, g: 0, b: 255 },   // Blue
];
const TEST_DISPLAY_MS = 1000;

const statusClass = computed(() => {
  if (!props.bulb.online) return 'offline';
  return props.bulb.on ? 'on' : 'off';
});

const statusText = computed(() => {
  if (!props.bulb.online) return 'Offline';
  return props.bulb.on ? 'On' : 'Off';
});

const bulbColor = computed(() => {
  if (!props.bulb.online || !props.bulb.on) return null;
  const r = props.bulb.r ?? 255;
  const g = props.bulb.g ?? 255;
  const b = props.bulb.b ?? 255;
  return `rgb(${r}, ${g}, ${b})`;
});

const displayColor = computed(() => {
  if (testColor.value) {
    const { r, g, b } = testColor.value;
    return `rgb(${r}, ${g}, ${b})`;
  }
  return bulbColor.value;
});

const bulbGlow = computed(() => {
  if (!props.bulb.online || !props.bulb.on) return 'none';
  const r = props.bulb.r ?? 255;
  const g = props.bulb.g ?? 255;
  const b = props.bulb.b ?? 255;
  return `0 0 12px rgba(${r}, ${g}, ${b}, 0.8)`;
});

const displayGlow = computed(() => {
  if (testColor.value) {
    const { r, g, b } = testColor.value;
    return `0 0 12px rgba(${r}, ${g}, ${b}, 0.8)`;
  }
  return bulbGlow.value;
});

const lastSeenFormatted = computed(() => {
  if (!props.bulb.lastSeen) return 'Never';
  const date = new Date(props.bulb.lastSeen);
  return date.toLocaleString();
});

// Parse firmware version string like "1.96(u)" to extract numeric version
function parseFirmwareVersion(version) {
  if (!version) return null;
  const match = version.match(/^(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

const MINIMUM_FIRMWARE_VERSION = 1.96;

const needsFirmwareUpdate = computed(() => {
  const version = parseFirmwareVersion(props.bulb.firmwareVersion);
  // If firmware version is unknown (null), don't block - allow modal to open
  if (version === null) return false;
  return version < MINIMUM_FIRMWARE_VERSION;
});

const firmwareUpdateUrl = computed(() => {
  return props.bulb.lastIp ? `http://${props.bulb.lastIp}` : null;
});

async function togglePower(event) {
  event.stopPropagation();
  if (!props.bulb.online) return;

  isLoading.value = true;
  try {
    if (props.bulb.on) {
      await turnOff(props.bulb.id);
    } else {
      await turnOn(props.bulb.id);
    }
  } finally {
    isLoading.value = false;
  }
}

async function testBulb(event) {
  event.stopPropagation();
  if (!props.bulb.online || isTesting.value) return;

  isTesting.value = true;

  // Run color animation locally in parallel with API call
  const animateColors = async () => {
    for (const color of TEST_COLORS) {
      testColor.value = color;
      await new Promise(resolve => setTimeout(resolve, TEST_DISPLAY_MS));
    }
    testColor.value = null;
  };

  try {
    await Promise.all([
      apiTestBulb(props.bulb.id),
      animateColors()
    ]);
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    testColor.value = null;
    isTesting.value = false;
  }
}

function handleClick() {
  // Don't open modal if firmware needs update
  if (needsFirmwareUpdate.value) return;
  emit('click');
}
</script>

<template>
  <div class="bulb-card" :class="statusClass" :style="{ borderColor: displayColor }" @click="handleClick">
    <div class="card-header">
      <svg
        class="bulb-icon"
        :class="statusClass"
        :style="{ color: displayColor, filter: displayGlow !== 'none' ? `drop-shadow(${displayGlow})` : 'none' }"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm2 15h-4v-1h4v1zm0-2h-4v-1h4v1zm-1.5 5h-1c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1c.28 0 .5.22.5.5s-.22.5-.5.5zm1-1h-3c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h3c.28 0 .5.22.5.5s-.22.5-.5.5z"/>
      </svg>
      <span class="status-text">{{ statusText }}</span>
    </div>

    <h3 class="bulb-name">{{ bulb.name }}</h3>

    <div class="bulb-info">
      <a
        v-if="bulb.lastIp"
        class="ip ip-link"
        :href="`http://${bulb.lastIp}`"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >{{ bulb.lastIp }}</a>
      <p class="last-seen">Last seen: {{ lastSeenFormatted }}</p>
    </div>

    <div class="card-actions">
      <template v-if="needsFirmwareUpdate">
        <a
          v-if="firmwareUpdateUrl"
          class="firmware-btn"
          :href="firmwareUpdateUrl"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
        >
          Update Firmware
        </a>
        <span v-else class="firmware-btn disabled">Update Firmware</span>
      </template>
      <template v-else>
        <button
          class="power-btn"
          :class="{ 'turn-on': !bulb.on, 'turn-off': bulb.on, disabled: !bulb.online }"
          :disabled="!bulb.online || isLoading || isTesting"
          @click="togglePower"
        >
          {{ isLoading ? '...' : (bulb.on ? 'Turn Off' : 'Turn On') }}
        </button>
        <button
          class="test-btn"
          :class="{ testing: isTesting, disabled: !bulb.online }"
          :disabled="!bulb.online || isTesting"
          @click="testBulb"
        >
          {{ isTesting ? 'Testing...' : 'Test' }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.bulb-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px var(--card-shadow);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.bulb-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px var(--card-shadow-hover);
}

.bulb-card.on {
  /* border-color set dynamically via style binding */
}

.bulb-card.off {
  border-color: var(--border-color);
}

.bulb-card.offline {
  opacity: 0.7;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.bulb-icon {
  width: 24px;
  height: 24px;
  color: #9ca3af;
  transition: all 0.3s ease;
}

.bulb-icon.on {
  /* Color is set dynamically via style binding */
}

.bulb-icon.off {
  color: #6b7280;
}

.bulb-icon.offline {
  color: #dc3545;
}

.status-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bulb-name {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.bulb-info {
  margin-bottom: 1rem;
}

.bulb-info p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.ip {
  font-family: monospace;
}

.ip-link {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
}

.ip-link:hover {
  color: #3b82f6;
  text-decoration: underline;
}

.firmware-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #f59e0b;
  color: white;
  text-align: center;
  text-decoration: none;
  display: block;
}

.firmware-btn:hover {
  background: #d97706;
}

.firmware-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--btn-disabled-bg);
  color: var(--text-secondary);
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.power-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--btn-disabled-bg);
  color: var(--text-primary);
}

.power-btn.turn-on {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
}

.power-btn.turn-on:hover:not(:disabled) {
  filter: brightness(0.9);
}

.power-btn.turn-off {
  background: var(--btn-secondary-bg);
  color: var(--btn-secondary-text);
}

.power-btn.turn-off:hover:not(:disabled) {
  filter: brightness(0.85);
}

.power-btn.disabled,
.power-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-btn {
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #3b82f6;
  color: white;
}

.test-btn:hover:not(:disabled) {
  background: #2563eb;
}

.test-btn.testing {
  background: #f59e0b;
  animation: pulse 0.5s ease-in-out infinite alternate;
}

.test-btn.disabled,
.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes pulse {
  from { opacity: 0.7; }
  to { opacity: 1; }
}
</style>
