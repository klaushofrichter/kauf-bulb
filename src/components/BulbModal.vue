<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useBulbs } from '../composables/useBulbs.js';

const props = defineProps({
  bulb: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close']);

const { controlBulb, updateName, getBulbState, getDeviceInfo } = useBulbs();

const editName = ref(props.bulb.name);
const brightness = ref(props.bulb.brightness ?? 100);
const colorR = ref(props.bulb.r ?? 255);
const colorG = ref(props.bulb.g ?? 255);
const colorB = ref(props.bulb.b ?? 255);
const transition = ref(1000);
const isLoading = ref(false);
const isSavingName = ref(false);
const currentState = ref(null);
const stateError = ref(null);
const deviceInfo = ref(null);

const hexColor = computed({
  get() {
    const r = colorR.value.toString(16).padStart(2, '0');
    const g = colorG.value.toString(16).padStart(2, '0');
    const b = colorB.value.toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  },
  set(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      colorR.value = parseInt(result[1], 16);
      colorG.value = parseInt(result[2], 16);
      colorB.value = parseInt(result[3], 16);
    }
  }
});

const lastSeenFormatted = computed(() => {
  if (!props.bulb.lastSeen) return 'Never';
  const date = new Date(props.bulb.lastSeen);
  return date.toLocaleString();
});

function handleKeydown(event) {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleKeydown);
  if (props.bulb.online) {
    await Promise.all([fetchState(), fetchDeviceInfo()]);
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});

watch(() => props.bulb.id, async () => {
  if (props.bulb.online) {
    await Promise.all([fetchState(), fetchDeviceInfo()]);
  }
});

async function fetchState() {
  stateError.value = null;
  try {
    const result = await getBulbState(props.bulb.id);
    if (result.success && result.state) {
      currentState.value = result.state;
      if (result.state.brightness !== null) {
        brightness.value = result.state.brightness;
      }
      if (result.state.r !== undefined) colorR.value = result.state.r;
      if (result.state.g !== undefined) colorG.value = result.state.g;
      if (result.state.b !== undefined) colorB.value = result.state.b;
    }
  } catch (err) {
    stateError.value = err.message;
  }
}

async function fetchDeviceInfo() {
  try {
    const result = await getDeviceInfo(props.bulb.id);
    if (result.success && result.info) {
      deviceInfo.value = result.info;
    }
  } catch (err) {
    console.error('Failed to fetch device info:', err);
  }
}

async function handleTurnOn() {
  isLoading.value = true;
  try {
    await controlBulb(props.bulb.id, {
      state: 'on',
      brightness: brightness.value,
      r: colorR.value,
      g: colorG.value,
      b: colorB.value,
      transition: transition.value
    });
    await fetchState();
  } finally {
    isLoading.value = false;
  }
}

async function handleTurnOff() {
  isLoading.value = true;
  try {
    await controlBulb(props.bulb.id, {
      state: 'off',
      transition: transition.value
    });
    await fetchState();
  } finally {
    isLoading.value = false;
  }
}

async function handleApply() {
  isLoading.value = true;
  try {
    await controlBulb(props.bulb.id, {
      brightness: brightness.value,
      r: colorR.value,
      g: colorG.value,
      b: colorB.value,
      transition: transition.value
    });
    await fetchState();
  } finally {
    isLoading.value = false;
  }
}

async function handleSaveName() {
  if (!editName.value.trim()) return;

  isSavingName.value = true;
  try {
    await updateName(props.bulb.id, editName.value.trim());
  } finally {
    isSavingName.value = false;
  }
}

function close() {
  emit('close');
}

function handleBackdropClick(event) {
  if (event.target === event.currentTarget) {
    close();
  }
}
</script>

<template>
  <div class="modal-backdrop" @click="handleBackdropClick">
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">
          <h2>Bulb Settings</h2>
          <span class="bulb-id">{{ bulb.id }}</span>
        </div>
        <button class="close-btn" @click="close">&times;</button>
      </div>

      <div class="modal-body">
        <div class="section">
          <label class="label">Friendly Name</label>
          <div class="name-input">
            <input
              v-model="editName"
              type="text"
              class="input"
              placeholder="Enter name"
            />
            <button
              class="btn btn-small"
              :disabled="isSavingName || !editName.trim()"
              @click="handleSaveName"
            >
              {{ isSavingName ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>

        <div class="section info-section">
          <div class="info-row">
            <span class="info-label">Device ID:</span>
            <span class="info-value mono">{{ bulb.id }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">IP Address:</span>
            <a
              v-if="bulb.lastIp"
              class="info-value mono ip-link"
              :href="`http://${bulb.lastIp}`"
              target="_blank"
              rel="noopener noreferrer"
            >{{ bulb.lastIp }}</a>
            <span v-else class="info-value mono">Unknown</span>
          </div>
          <div class="info-row">
            <span class="info-label">Last Seen:</span>
            <span class="info-value">{{ lastSeenFormatted }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-value" :class="bulb.online ? 'online' : 'offline'">
              {{ bulb.online ? 'Online' : 'Offline' }}
            </span>
          </div>
          <div v-if="currentState" class="info-row">
            <span class="info-label">Power:</span>
            <span class="info-value" :class="currentState.on ? 'on' : 'off'">
              {{ currentState.on ? 'On' : 'Off' }}
            </span>
          </div>
          <div v-if="deviceInfo" class="info-row">
            <span class="info-label">Firmware:</span>
            <span class="info-value mono">{{ deviceInfo.firmwareVersion }}</span>
          </div>
          <div v-if="deviceInfo && deviceInfo.esphomeVersion" class="info-row">
            <span class="info-label">ESPHome:</span>
            <span class="info-value mono">{{ deviceInfo.esphomeVersion }}</span>
          </div>
          <div v-if="deviceInfo && deviceInfo.macAddress" class="info-row">
            <span class="info-label">MAC:</span>
            <span class="info-value mono">{{ deviceInfo.macAddress }}</span>
          </div>
        </div>

        <div v-if="stateError" class="state-error">
          Could not fetch current state: {{ stateError }}
        </div>

        <template v-if="bulb.online">
          <div class="section">
            <label class="label">Brightness ({{ brightness }}%)</label>
            <input
              v-model.number="brightness"
              type="range"
              min="0"
              max="100"
              class="slider"
            />
          </div>

          <div class="section">
            <label class="label">Color</label>
            <div class="color-controls">
              <input
                v-model="hexColor"
                type="color"
                class="color-picker"
              />
              <div class="rgb-inputs">
                <div class="rgb-input">
                  <label>R</label>
                  <input v-model.number="colorR" type="number" min="0" max="255" />
                </div>
                <div class="rgb-input">
                  <label>G</label>
                  <input v-model.number="colorG" type="number" min="0" max="255" />
                </div>
                <div class="rgb-input">
                  <label>B</label>
                  <input v-model.number="colorB" type="number" min="0" max="255" />
                </div>
              </div>
            </div>
          </div>

          <div class="section">
            <label class="label">Transition ({{ transition }}ms)</label>
            <input
              v-model.number="transition"
              type="range"
              min="0"
              max="5000"
              step="100"
              class="slider"
            />
          </div>

          <div class="actions">
            <button
              class="btn btn-success"
              :disabled="isLoading"
              @click="handleTurnOn"
            >
              Turn On
            </button>
            <button
              class="btn btn-secondary"
              :disabled="isLoading"
              @click="handleTurnOff"
            >
              Turn Off
            </button>
            <button
              class="btn btn-primary"
              :disabled="isLoading"
              @click="handleApply"
            >
              Apply Settings
            </button>
          </div>
        </template>

        <div v-else class="offline-message">
          This bulb is currently offline. Controls are disabled.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--modal-backdrop);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: var(--modal-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px var(--card-shadow-hover);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.bulb-id {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
  padding: 0;
}

.close-btn:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 1.5rem;
}

.section {
  margin-bottom: 1.5rem;
}

.label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--input-bg);
  color: var(--text-primary);
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.name-input {
  display: flex;
  gap: 0.5rem;
}

.name-input .input {
  flex: 1;
}

.info-section {
  background: var(--bg-primary);
  padding: 1rem;
  border-radius: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
}

.info-label {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.info-value {
  color: var(--text-primary);
  font-size: 0.875rem;
}

.info-value.mono {
  font-family: monospace;
}

.info-value.online {
  color: #22c55e;
}

.info-value.offline {
  color: #dc3545;
}

.info-value.on {
  color: #22c55e;
}

.info-value.off {
  color: var(--text-secondary);
}

.ip-link {
  text-decoration: none;
  transition: color 0.2s;
}

.ip-link:hover {
  color: #3b82f6;
  text-decoration: underline;
}

.state-error {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.slider {
  width: 100%;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--btn-disabled-bg);
  border-radius: 4px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

.color-controls {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.color-picker {
  width: 60px;
  height: 60px;
  padding: 0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.rgb-inputs {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.rgb-input {
  flex: 1;
}

.rgb-input label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.rgb-input input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--input-border);
  border-radius: 6px;
  font-size: 0.875rem;
  text-align: center;
  background: var(--input-bg);
  color: var(--text-primary);
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-small {
  padding: 0.5rem 1rem;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-success {
  background: #4ade80;
  color: #1a1a2e;
}

.btn-success:hover:not(:disabled) {
  background: #22c55e;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.offline-message {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 8px;
}
</style>
