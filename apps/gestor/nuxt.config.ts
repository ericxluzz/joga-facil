import { agendaSlimPreset } from '@agendaslim/ui/preset';
import dotenv from 'dotenv';
import path from 'path';

// Carrega o .env explicitamente do diretório correto
dotenv.config({ path: path.resolve(__dirname, '.env') });

/** Raiz do monorepo (apps/gestor → ../..) — usado pelo Nitro na Vercel */
const monorepoRoot = path.resolve(__dirname, '../..');

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  /**
   * Preset Vercel + saída na raiz do repo (Turbo/monorepo).
   * Sem isso o Nitro gera `.vercel/output` dentro de apps/gestor e o deploy falha
   * mesmo com o build “verde”. Ref.: nitro deploy vercel + monorepo output dir.
   */
  nitro: {
    preset: 'vercel',
    ...(process.env.VERCEL
      ? {
          output: {
            dir: path.join(monorepoRoot, '.vercel/output'),
          },
        }
      : {}),
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
    // Configuração via .env (SUPABASE_URL, SUPABASE_KEY)
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
