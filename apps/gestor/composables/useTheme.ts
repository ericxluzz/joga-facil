import { useColorMode } from '@vueuse/core';

// Wrapper sobre useColorMode do @vueuse: aplica classe `.dark` no <html>
// e persiste a preferência em localStorage.
export type ThemeMode = 'light' | 'dark';

export const useTheme = () => {
  const mode = useColorMode({
    selector: 'html',
    attribute: 'class',
    modes: { light: '', dark: 'dark' },
    storageKey: 'joga-facil-theme',
    initialValue: 'light',
  });

  const isDark = computed(() => mode.value === 'dark');

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark';
  }

  function setMode(value: ThemeMode) {
    mode.value = value;
  }

  return { mode, isDark, toggle, setMode };
};
