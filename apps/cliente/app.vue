<template>
  <div class="app" :style="appStyle">
    <NuxtPage />
    <BottomNav v-if="showNav" :style="{ '--nav-c': primaryColor }" />
    <Toast position="bottom-center" />
  </div>
</template>

<script setup lang="ts">
import Toast from 'primevue/toast';
import { computed } from 'vue';

const { tenant } = useReserva();
const route = useRoute();

const NAV_ROUTES = ['/reservar', '/minhas-reservas'];
const showNav = computed(() => NAV_ROUTES.some(r => route.path.includes(r)));

const primaryColor = computed(() => {
  const map: Record<string, string> = {
    emerald: '#10B981', blue: '#3B82F6', orange: '#F97316',
    red: '#EF4444', purple: '#A855F7', slate: '#475569',
  };
  return map[tenant.value?.settings?.primaryColor ?? 'emerald'] ?? '#10B981';
});

const colorPalettes: Record<string, Record<number, string>> = {
  emerald: {
    50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399',
    500: '#10B981', 600: '#059669', 700: '#047857', 800: '#065F46', 900: '#064E3B', 950: '#022C22'
  },
  blue: {
    50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD', 400: '#60A5FA',
    500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8', 800: '#1E40AF', 900: '#1E3A8A', 950: '#172554'
  },
  orange: {
    50: '#FFF7ED', 100: '#FFEDD5', 200: '#FED7AA', 300: '#FDBA74', 400: '#FB923C',
    500: '#F97316', 600: '#EA580C', 700: '#C2410C', 800: '#9A3412', 900: '#7C2D12', 950: '#431407'
  },
  red: {
    50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171',
    500: '#EF4444', 600: '#DC2626', 700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D', 950: '#450A0A'
  },
  purple: {
    50: '#FAF5FF', 100: '#F3E8FF', 200: '#E9D5FF', 300: '#D8B4FE', 400: '#C084FC',
    500: '#A855F7', 600: '#9333EA', 700: '#7E22CE', 800: '#6B21A8', 900: '#581C87', 950: '#3B0764'
  },
  slate: {
    50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8',
    500: '#475569', 600: '#334155', 700: '#1E293B', 800: '#0F172A', 900: '#020617', 950: '#000000'
  }
};

const appStyle = computed(() => {
  const colorName = tenant.value?.settings?.primaryColor || 'emerald';
  const palette = colorPalettes[colorName] || colorPalettes.emerald;
  
  const styles: Record<string, string> = {};
  for (const [shade, hex] of Object.entries(palette)) {
    styles[`--p-primary-${shade}`] = hex;
  }
  return styles;
});
</script>

<style>
/* Reset global */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }

body {
  background: #f0f2f5;
  font-family: 'Poppins', 'Inter', system-ui, sans-serif;
}

.app {
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  position: relative;
  overflow-x: hidden;
}

/* Desktop: card com sombra e bordas arredondadas */
@media (min-width: 481px) {
  body { padding: 1.75rem 1rem 3rem; background: #e4e8ee; }
  .app {
    border-radius: 28px;
    box-shadow: 0 12px 56px rgba(0,0,0,.16), 0 2px 12px rgba(0,0,0,.07);
    min-height: auto;
    /* sem overflow:hidden para não cortar a logo que sobresai do hero */
  }
  /* corta apenas o topo do card (hero) no desktop via pseudo-elemento não é necessário —
     o hero-photo/hero-fade já têm border-radius apenas nas bordas inferiores no mobile;
     no desktop as bordas do .app card fazem o recorte visual do topo automaticamente
     graças ao background branco do .page */
}
</style>
