import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';
import { tokens } from './tokens';

// Preset customizado baseado no Aura com a identidade visual do Agenda-Slim.
// Use no createApp como PrimeVue config: { theme: { preset: agendaSlimPreset } }
export const agendaSlimPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: tokens.colors.primary[50],
      100: tokens.colors.primary[100],
      200: tokens.colors.primary[200],
      300: tokens.colors.primary[300],
      400: tokens.colors.primary[400],
      500: tokens.colors.primary[500],
      600: tokens.colors.primary[600],
      700: tokens.colors.primary[700],
      800: tokens.colors.primary[800],
      900: tokens.colors.primary[900],
      950: tokens.colors.primary[950],
    },
    colorScheme: {
      light: {
        surface: {
          0: tokens.colors.surface[0],
          50: tokens.colors.surface[50],
          100: tokens.colors.surface[100],
          200: tokens.colors.surface[200],
          300: tokens.colors.surface[300],
          400: tokens.colors.surface[400],
          500: tokens.colors.surface[500],
          600: tokens.colors.surface[600],
          700: tokens.colors.surface[700],
          800: tokens.colors.surface[800],
          900: tokens.colors.surface[900],
          950: tokens.colors.surface[950],
        },
        formField: {
          background: '{surface.0}',
          borderColor: '{surface.200}',
          borderRadius: tokens.radius.md,
        },
        text: {
          color: '{surface.900}',
          mutedColor: '{surface.500}',
        },
      },
      dark: {
        surface: {
          0: '#020617',
          50: '#0F172A',
          100: '#1E293B',
          200: '#334155',
          300: '#475569',
          400: '#64748B',
          500: '#94A3B8',
          600: '#CBD5E1',
          700: '#E2E8F0',
          800: '#F1F5F9',
          900: '#F8FAFC',
          950: '#FFFFFF',
        },
      },
    },
  },
  components: {
    button: {
      borderRadius: tokens.radius.md,
    },
    card: {
      borderRadius: tokens.radius.lg,
    },
    inputtext: {
      borderRadius: tokens.radius.md,
    },
  },
});
