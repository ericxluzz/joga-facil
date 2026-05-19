# Agenda-Slim

Plataforma SaaS de agendamento e pagamento PIX para quadras esportivas, clínicas, salões e prestadores de serviço com agenda.

> **Status:** Sprint 1 (Foundation). Scaffold completo, rodando em modo mock sem dependências externas.

## Stack

- **Frontend:** Nuxt 3 + Vue 3 + TypeScript + PrimeVue 4 + Tema Aura
- **Backend:** Nuxt server routes (Nitro) + Drizzle ORM
- **Banco:** Postgres via Supabase (Row Level Security)
- **Cache/Hold:** Upstash Redis
- **Jobs:** Trigger.dev
- **PIX:** AbacatePay
- **Hosting:** Cloudflare Pages · também compatível com **Vercel** (gestor — ver secção abaixo)
- **Monorepo:** Turborepo + pnpm workspaces

## Deploy na Vercel (app **gestor**)

O repositório é um monorepo; existe `vercel.json` na raiz para:

1. **`pnpm turbo run build --filter=@agendaslim/gestor...`** — compila só o gestor e dependências workspace (evita falhas no app cliente/PWA no mesmo pipeline).
2. **Nitro** — em `apps/gestor/nuxt.config.ts`, no ambiente Vercel (`VERCEL=1`), a saída vai para **`.vercel/output` na raiz**, onde o runtime da Vercel espera encontrar o Build Output.

### Root Directory (obrigatório — evita 404 NOT_FOUND)

Escolha **uma** opção e mantenha consistente:

| Opção | Root Directory na Vercel | Arquivo de config |
|--------|--------------------------|-------------------|
| **Recomendado** | `apps/gestor` | `apps/gestor/vercel.json` |
| Alternativa | vazio / `.` (raiz do repo) | `vercel.json` na raiz |

Se estiver `apps/gestor` no painel mas o `outputDirectory` apontar para `apps/gestor/.vercel/output`, a Vercel procura uma pasta que não existe → **404 NOT_FOUND**.

**Framework Preset:** Other (o build é controlado pelo `vercel.json`).

**Variáveis obrigatórias** (Settings → Environment Variables):

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://jqduomezsszxsapidmrm.supabase.co` |
| `SUPABASE_KEY` | anon key (JWT `eyJ...`) — **não** use só `SUPABASE_ANON_KEY` sem `SUPABASE_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role JWT (só server) |
| `DATABASE_URL` | **Transaction pooler porta 6543** (Connect no Supabase) |
| `NUXT_PUBLIC_APP_URL` | `https://joga-facil-zeta.vercel.app` |
| `ABACATEPAY_API_KEY` | chave sandbox |
| `MOCK_AUTH` | `1` até auth/tenant estarem prontos; `0` com Supabase Auth configurado |

**Diagnóstico:** após deploy, abra `https://seu-dominio.vercel.app/api/health` — mostra se DB e Supabase estão OK.

Supabase Auth → URL Configuration: Site URL + redirect `https://seu-dominio.vercel.app/auth/callback`.

## Estrutura

```
agendei/
├── apps/
│   ├── gestor/         # Dashboard web do dono do estabelecimento (Nuxt 3)
│   └── cliente/        # PWA do cliente final (Nuxt 3 + Serwist)
├── packages/
│   ├── core/           # Lógica de slots, hold, pricing (pura, testável)
│   ├── db/             # Schema Drizzle + cliente Postgres
│   ├── ui/             # PrimeVue preset Aura customizado + design tokens
│   └── config/         # ESLint/Prettier compartilhados
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Pré-requisitos

- **Node.js >= 20** (idealmente 22)
- **pnpm >= 9** (`npm i -g pnpm`)
- Conta Supabase (depois) · AbacatePay (depois) · Upstash (depois)

## Setup local (modo mock — sem custos)

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar variáveis de ambiente
cp .env.example .env

# Já vem com MOCK_AUTH=1, MOCK_PAYMENTS=1, MOCK_EMAIL=1

# 3. Rodar tudo
pnpm dev
```

Isso sobe:
- **Gestor** em http://localhost:3000
- **Cliente** em http://localhost:3001

## Modo mock vs modo real

| Variável | Mock (dev) | Real (produção) |
|---|---|---|
| `MOCK_AUTH=1` | Login bypass — qualquer e-mail vira admin | Magic link Supabase real |
| `MOCK_PAYMENTS=1` | PIX simula confirmação após 5s | AbacatePay sandbox/produção |
| `MOCK_EMAIL=1` | E-mails logam no console | Resend envia de verdade |

Para sair do mock e usar serviços reais:

### Supabase
1. Crie projeto em https://supabase.com
2. Em **Settings > API**: copie `URL`, `anon key`, `service role key`
3. Em **Settings > Database**: copie a connection string (use a do **pooler em transaction mode**)
4. Cole no `.env`
5. Rode `pnpm db:generate && pnpm db:migrate`

### AbacatePay
1. Cadastre-se em https://abacatepay.com (precisa de CNPJ pra produção; sandbox é livre)
2. Em **Configurações > API**: copie chave de sandbox
3. Em **Webhooks**: configure URL `https://app.agenda-slim.com.br/api/webhooks/abacate`
4. Cole credenciais no `.env`

### Upstash Redis
1. https://upstash.com — crie banco free tier
2. Copie `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`

## Comandos

```bash
pnpm dev               # roda gestor + cliente em paralelo
pnpm build             # build de produção
pnpm typecheck         # checagem TS
pnpm lint              # ESLint
pnpm test              # vitest em packages/core
pnpm db:generate       # gera migrations Drizzle
pnpm db:migrate        # aplica migrations
pnpm db:studio         # abre Drizzle Studio (UI do banco)
```

## Schema do banco

Modelo de dados em `packages/db/src/schema/`. Tabelas principais:

- `tenants` — estabelecimentos
- `users` + `tenant_users` — gestores e clientes (espelha `auth.users`)
- `resources` — quadras
- `services` — tipos de serviço (1h society, etc.)
- `schedule_rules` — horários + preços dinâmicos
- `blocks` — bloqueios manuais
- `bookings` — **core**, com constraint única que previne race condition
- `payments` — transações AbacatePay
- `webhook_events` — idempotência

**Constraint crítica em `bookings`:**
```sql
UNIQUE (resource_id, starts_at) WHERE status IN ('hold','pending_approval','confirmed')
```

## Próximos passos (Sprint 2+)

- [ ] Migrations rodando no Supabase real
- [ ] API endpoints `/api/r/[slug]/slots` e `/api/r/[slug]/book`
- [ ] Configurador de agenda visual no gestor
- [ ] Integração AbacatePay completa (sandbox)
- [ ] Job Trigger.dev de cleanup de holds
- [ ] Templates Resend de confirmação e lembrete
- [ ] PWA service worker testado

Veja `Agenda-Slim-Documentacao-Completa.docx` na raiz pro detalhamento completo dos sprints.

## Licença

Proprietária · [ericxluzz](https://github.com/ericxluzz)
