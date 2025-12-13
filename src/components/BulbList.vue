<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import BulbCard from './BulbCard.vue';
import BulbModal from './BulbModal.vue';
import { useBulbs } from '../composables/useBulbs.js';

const {
  bulbs,
  loading,
  fetchBulbs,
  turnOn,
  turnOff,
  refreshDiscovery
} = useBulbs();

const selectedBulb = ref(null);

// Only show online bulbs in the UI
const onlineBulbs = computed(() => bulbs.value.filter(b => b.online));
const refreshInterval = ref(null);

onMounted(() => {
  fetchBulbs();
  refreshInterval.value = setInterval(fetchBulbs, 30000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});

async function handleRefresh() {
  await refreshDiscovery();
}

async function handleAllOn() {
  await turnOn();
}

async function handleAllOff() {
  await turnOff();
}

function openModal(bulb) {
  selectedBulb.value = bulb;
}

function closeModal() {
  selectedBulb.value = null;
  fetchBulbs();
}
</script>

<template>
  <div class="bulb-list">
    <div class="controls">
      <button class="btn btn-primary" @click="handleAllOn" :disabled="loading">
        Turn All On
      </button>
      <button class="btn btn-secondary" @click="handleAllOff" :disabled="loading">
        Turn All Off
      </button>
      <button class="btn btn-outline" @click="handleRefresh" :disabled="loading">
        Refresh Devices
      </button>
      <button class="btn btn-outline" @click="fetchBulbs" :disabled="loading">
        Refresh Status
      </button>
    </div>

    <div v-if="loading && onlineBulbs.length === 0" class="loading">
      Loading bulbs...
    </div>

    <div v-else-if="onlineBulbs.length === 0" class="empty">
      No online bulbs found. Click "Refresh Devices" to discover bulbs on your network.
    </div>

    <div v-else class="grid">
      <BulbCard
        v-for="bulb in onlineBulbs"
        :key="bulb.id"
        :bulb="bulb"
        @click="openModal(bulb)"
      />
    </div>

    <BulbModal
      v-if="selectedBulb"
      :bulb="selectedBulb"
      @close="closeModal"
    />
  </div>
</template>

<style scoped>
.bulb-list {
  max-width: 1200px;
  margin: 0 auto;
}

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #4ade80;
  color: #1a1a2e;
}

.btn-primary:hover:not(:disabled) {
  background: #22c55e;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #4b5563;
}

.btn-outline {
  background: white;
  border-color: #d1d5db;
  color: #374151;
}

.btn-outline:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.loading,
.empty {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  font-size: 1.1rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 400px));
  gap: 1.5rem;
  justify-content: center;
}
</style>
