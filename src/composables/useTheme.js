import { ref, watch, onMounted } from 'vue';

const STORAGE_KEY = 'kauf-bulb-theme';
const THEMES = ['light', 'dark', 'system'];

const theme = ref('system');

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(themeName) {
  const effectiveTheme = themeName === 'system' ? getSystemTheme() : themeName;
  document.documentElement.setAttribute('data-theme', effectiveTheme);
}

export function useTheme() {
  onMounted(() => {
    // Load saved preference
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.includes(saved)) {
      theme.value = saved;
    }
    applyTheme(theme.value);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (theme.value === 'system') {
        applyTheme('system');
      }
    });
  });

  watch(theme, (newTheme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  });

  function cycleTheme() {
    const currentIndex = THEMES.indexOf(theme.value);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    theme.value = THEMES[nextIndex];
  }

  function getThemeIcon() {
    switch (theme.value) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'system': return '💻';
      default: return '💻';
    }
  }

  function getThemeLabel() {
    switch (theme.value) {
      case 'light': return 'Light';
      case 'dark': return 'Dark';
      case 'system': return 'System';
      default: return 'System';
    }
  }

  return {
    theme,
    cycleTheme,
    getThemeIcon,
    getThemeLabel
  };
}
