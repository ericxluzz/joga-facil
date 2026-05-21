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
          0: '#1E293B',   // cards / componentes elevados (mais claro que o fundo)
          50: '#0F172A',  // fundo da página (mais escuro)
          100: '#243044', // bg de inputs, hover states
          200: '#334155', // bordas
          300: '#475569', // bordas sutis
          400: '#64748B', // placeholder / desabilitado
          500: '#94A3B8', // texto secundário/muted
          600: '#CBD5E1', // ícones
          700: '#E2E8F0', // texto secundário forte
          800: '#F1F5F9', // texto normal
          900: '#F8FAFC', // texto principal
          950: '#FFFFFF', // branco puro
        },
        formField: {
          background: '{surface.100}',
          borderColor: '{surface.200}',
          borderRadius: tokens.radius.md,
        },
        text: {
          color: '{surface.900}',
          mutedColor: '{surface.500}',
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
      colorScheme: {
        dark: {
          root: {
            background: '{surface.0}',
            color: '{surface.900}',
          },
        },
      },
    },
    datatable: {
      colorScheme: {
        dark: {
          header: {
            background: '{surface.0}',
            color: '{surface.900}',
            borderColor: '{surface.200}',
          },
          row: {
            background: '{surface.0}',
            color: '{surface.900}',
            stripedBackground: '{surface.50}',
            hoverBackground: '{surface.100}',
            hoverColor: '{surface.900}',
          },
          footer: {
            background: '{surface.0}',
            color: '{surface.900}',
            borderColor: '{surface.200}',
          },
          bodyCell: {
            borderColor: '{surface.200}',
          },
          columnTitle: {
            fontWeight: '600',
          },
        },
      },
    },
    dialog: {
      borderRadius: tokens.radius.lg,
      colorScheme: {
        dark: {
          root: {
            background: '{surface.0}',
            color: '{surface.900}',
            borderColor: '{surface.200}',
          },
          header: {
            background: '{surface.0}',
            color: '{surface.900}',
          },
          content: {
            background: '{surface.0}',
          },
          footer: {
            background: '{surface.0}',
          },
        },
      },
    },
    popover: {
      borderRadius: tokens.radius.lg,
      colorScheme: {
        dark: {
          root: {
            background: '{surface.0}',
            color: '{surface.900}',
            borderColor: '{surface.200}',
          },
        },
      },
    },
    select: {
      borderRadius: tokens.radius.md,
      colorScheme: {
        dark: {
          overlay: {
            background: '{surface.0}',
            color: '{surface.900}',
            borderColor: '{surface.200}',
          },
          option: {
            focusBackground: '{surface.100}',
            selectedBackground: '{surface.100}',
            color: '{surface.900}',
          },
        },
      },
    },
    multiselect: {
      borderRadius: tokens.radius.md,
      colorScheme: {
        dark: {
          overlay: {
            background: '{surface.0}',
            color: '{surface.900}',
            borderColor: '{surface.200}',
          },
          option: {
            focusBackground: '{surface.100}',
            color: '{surface.900}',
          },
        },
      },
    },
    datepicker: {
      borderRadius: tokens.radius.md,
      colorScheme: {
        dark: {
          panel: {
            background: '{surface.0}',
            color: '{surface.900}',
            borderColor: '{surface.200}',
          },
          header: {
            background: '{surface.0}',
            color: '{surface.900}',
          },
          tableHeaderCell: {
            color: '{surface.700}',
          },
          date: {
            hoverBackground: '{surface.100}',
            hoverColor: '{surface.900}',
            selectedBackground: '{primary.500}',
          },
        },
      },
    },
    panel: {
      borderRadius: tokens.radius.lg,
      colorScheme: {
        dark: {
          root: {
            background: '{surface.0}',
            color: '{surface.900}',
            borderColor: '{surface.200}',
          },
          header: {
            background: '{surface.0}',
          },
          content: {
            background: '{surface.0}',
          },
          footer: {
            background: '{surface.0}',
          },
        },
      },
    },
    inputtext: {
      borderRadius: tokens.radius.md,
    },
    message: {
      borderRadius: tokens.radius.md,
    },
    tag: {
      borderRadius: tokens.radius.md,
    },
    selectbutton: {
      colorScheme: {
        dark: {
          root: {
            background: '{surface.0}',
            borderColor: '{surface.200}',
          },
          option: {
            background: 'transparent',
            color: '{surface.700}',
            selectedBackground: '{surface.100}',
            selectedColor: '{surface.900}',
          },
        },
      },
    },
  },
});
