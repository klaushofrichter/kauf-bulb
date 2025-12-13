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

const statusClass = computed(() => {
  if (!props.bulb.online) return 'offline';
  return props.bulb.on ? 'on' : 'off';
});

const statusText = computed(() => {
  if (!props.bulb.online) return 'Offline';
  return props.bulb.on ? 'On' : 'Off';
});

const lastSeenFormatted = computed(() => {
  if (!props.bulb.lastSeen) return 'Never';
  const date = new Date(props.bulb.lastSeen);
  return date.toLocaleString();
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
  try {
    await apiTestBulb(props.bulb.id);
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    isTesting.value = false;
  }
}

function handleClick() {
  emit('click');
}
</script>

<template>
  <div class="bulb-card" :class="statusClass" @click="handleClick">
    <div class="card-header">
      <div class="status-indicator" :class="statusClass"></div>
      <span class="status-text">{{ statusText }}</span>
    </div>

    <h3 class="bulb-name">{{ bulb.name }}</h3>

    <div class="bulb-info">
      <p v-if="bulb.lastIp" class="ip">{{ bulb.lastIp }}</p>
      <p class="last-seen">Last seen: {{ lastSeenFormatted }}</p>
    </div>

    <div class="card-actions">
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
    </div>
  </div>
</template>

<style scoped>
.bulb-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.bulb-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.bulb-card.on {
  border-color: #4ade80;
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

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #9ca3af;
}

.status-indicator.on {
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80;
}

.status-indicator.off {
  background: #6b7280;
}

.status-indicator.offline {
  background: #dc3545;
}

.status-text {
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bulb-name {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  color: #1f2937;
}

.bulb-info {
  margin-bottom: 1rem;
}

.bulb-info p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.ip {
  font-family: monospace;
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
  background: #e5e7eb;
  color: #374151;
}

.power-btn.turn-on {
  background: #4ade80;
  color: #1a1a2e;
}

.power-btn.turn-on:hover:not(:disabled) {
  background: #22c55e;
}

.power-btn.turn-off {
  background: #6b7280;
  color: white;
}

.power-btn.turn-off:hover:not(:disabled) {
  background: #4b5563;
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
