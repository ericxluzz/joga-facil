import { agendaSlimPreset } from '@agendaslim/ui/preset';
import dotenv from 'dotenv';
import path from 'path';

// Carrega .env da raiz do monorepo (igual ao gestor)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const tenantSlug = process.env.NUXT_TENANT_SLUG;

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  // Nitro gera apps/cliente/.vercel/output (ver outputDirectory no vercel.json)
  nitro: {
    preset: 'vercel',
  },

  // Se NUXT_TENANT_SLUG estiver definido, redireciona / para /r/<slug>
  routeRules: tenantSlug
    ? { '/': { redirect: { to: `/r/${tenantSlug}`, statusCode: 301 } } }
    : {},

  modules: [
    '@pinia/nuxt',
    '@primevue/nuxt-module',
    '@vueuse/nuxt',
    '@vite-pwa/nuxt',
  ],

  css: ['@agendaslim/ui/styles.css', 'primeflex/primeflex.css'],

  primevue: {
    options: {
      theme: {
        preset: agendaSlimPreset,
        options: {
          darkModeSelector: '.dark',
        },
      },
      ripple: true,
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Joga Fácil',
      short_name: 'Joga Fácil',
      description: 'Reserve quadras e horários sem fricção',
      theme_color: '#10B981',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    },
    client: {
      installPrompt: true,
    },
  },

  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    validapayAccessToken: process.env.VALIDAPAY_ACCESS_TOKEN,
    validapayClientId: process.env.VALIDAPAY_CLIENT_ID,
    validapayClientSecret: process.env.VALIDAPAY_CLIENT_SECRET,
    validapayWebhookSecret: process.env.VALIDAPAY_WEBHOOK_SECRET,
    upstashRedisUrl: process.env.UPSTASH_REDIS_REST_URL,
    upstashRedisToken: process.env.UPSTASH_REDIS_REST_TOKEN,

    public: {
      clientUrl: process.env.NUXT_PUBLIC_CLIENT_URL || 'http://localhost:3001',
      mockPayments: process.env.MOCK_PAYMENTS === '1',
    },
  },

  typescript: { strict: true },

  app: {
    head: {
      title: 'Joga Fácil',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#10B981' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap',
        },
      ],
    },
  },
});
