import { agendaSlimPreset } from '@agendaslim/ui/preset';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  nitro: { preset: 'vercel' },

  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@primevue/nuxt-module',
    '@vueuse/nuxt',
  ],

  css: ['@agendaslim/ui/styles.css', 'primeflex/primeflex.css'],

  primevue: {
    options: {
      theme: {
        preset: agendaSlimPreset,
        options: { darkModeSelector: '.dark' },
      },
      ripple: true,
    },
  },

  supabase: {
    url: supabaseUrl,
    key: supabaseKey,
    redirectOptions: {
      login: '/login',
      callback: '/auth/callback',
      include: ['/dashboard', '/arenas/**', '/pagamentos', '/webhooks', '/configuracoes'],
      exclude: ['/login'],
    },
  },

  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    cronSecret: process.env.CRON_SECRET,
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      platformAdminEmails: process.env.PLATFORM_ADMIN_EMAILS || '',
    },
  },

  typescript: { strict: true },

  app: {
    head: {
      title: 'Admin — Joga Fácil',
      meta: [{ name: 'robots', content: 'noindex,nofollow' }],
    },
  },
});
