<script setup>
import { ref } from 'vue';
import BulbList from './components/BulbList.vue';
import { useBulbs } from './composables/useBulbs.js';
import { useTheme } from './composables/useTheme.js';

const version = __APP_VERSION__;
const { error, clearError } = useBulbs();
const { theme, cycleTheme, getThemeIcon, getThemeLabel } = useTheme();
const showError = ref(true);

function dismissError() {
  clearError();
  showError.value = false;
  setTimeout(() => {
    showError.value = true;
  }, 100);
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Kauf Bulb Controller</h1>
      <div class="header-right">
        <button class="theme-toggle" @click="cycleTheme" :title="`Theme: ${getThemeLabel()}`">
          <span class="theme-icon">{{ getThemeIcon() }}</span>
        </button>
        <a href="https://github.com/klaushofrichter/kauf-bulb" target="_blank" class="version">v{{ version }}</a>
      </div>
    </header>

    <main class="main">
      <BulbList />
    </main>

    <Transition name="toast">
      <div v-if="error && showError" class="error-toast" @click="dismissError">
        {{ error }}
        <span class="dismiss">×</span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: var(--header-bg, #1a1a2e);
  color: var(--header-text, white);
  padding: 1rem 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.theme-toggle {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

.theme-icon {
  font-size: 1rem;
  line-height: 1;
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.version {
  font-size: 0.875rem;
  opacity: 0.7;
  color: inherit;
  text-decoration: none;
  transition: opacity 0.2s;
}

.version:hover {
  opacity: 1;
  text-decoration: underline;
}

.main {
  flex: 1;
  padding: 2rem;
  background: var(--bg-primary);
}

.error-toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #dc3545;
  color: white;
  padding: 1rem 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
}

.dismiss {
  font-size: 1.5rem;
  font-weight: bold;
  opacity: 0.8;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}
</style>
