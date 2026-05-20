import { agendaSlimPreset } from '@agendaslim/ui/preset';
import dotenv from 'dotenv';
import path from 'path';

// Carrega .env local (apps/gestor ou raiz do monorepo) — na Vercel as vars vêm do painel
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '';

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  // Nitro gera apps/gestor/.vercel/output (ver outputDirectory no vercel.json da raiz)
  nitro: {
    preset: 'vercel',
  },

  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@primevue/nuxt-module',
    '@vueuse/nuxt',
  ],

  css: ['@agendaslim/ui/styles.css'],

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

  supabase: {
    url: supabaseUrl,
    key: supabaseKey,
    redirectOptions: {
      login: '/login',
      callback: '/auth/callback',
      include: process.env.MOCK_AUTH === '1' ? [] : ['/dashboard', '/configuracoes/**', '/agenda', '/financeiro', '/onboarding', '/aprovacoes'],
      exclude: process.env.MOCK_AUTH === '1' 
        ? ['/', '/login', '/cadastro', '/onboarding', '/dashboard', '/configuracoes/**', '/agenda', '/financeiro', '/aprovacoes'] 
        : ['/', '/login', '/cadastro'],
    },
  },

  runtimeConfig: {
    // Server-only
    databaseUrl: process.env.DATABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    abacatepayApiKey: process.env.ABACATEPAY_API_KEY,
    abacatepayWebhookSecret: process.env.ABACATEPAY_WEBHOOK_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    validapayAccessToken: process.env.VALIDAPAY_ACCESS_TOKEN,
    validapayClientId: process.env.VALIDAPAY_CLIENT_ID,
    validapayClientSecret: process.env.VALIDAPAY_CLIENT_SECRET,
    validapayWebhookSecret: process.env.VALIDAPAY_WEBHOOK_SECRET,

    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      clientUrl: process.env.NUXT_PUBLIC_CLIENT_URL || 'http://localhost:3001',
      mockAuth: process.env.MOCK_AUTH === '1',
    },
  },

  typescript: {
    strict: true,
  },

  app: {
    head: {
      title: 'Agenda-Slim · Gestor',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Plataforma de agendamento e pagamento PIX' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap',
        },
      ],
    },
  },
});
