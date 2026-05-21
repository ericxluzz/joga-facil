# Checklist ValidaPay Sandbox — antes de ir para produção

Execute todos estes testes no ambiente sandbox antes de mudar `VALIDAPAY_ENV=production`.

## 1. Autenticação

- [ ] **1.1** `POST /auth/token` com `clientId` + `clientSecret` retorna `access_token` válido.
- [ ] **1.2** Token tem `expires_in` correto; cache em memória é renovado automaticamente.
- [ ] **1.3** Credenciais inválidas retornam 401 e o sistema lança erro claro (não trava).

## 2. Criação de Subconta PF

- [ ] **2.1** `POST /v1/proposals` com payload PF (CPF, nome, endereço, data nascimento) retorna `formId`.
- [ ] **2.2** Campos obrigatórios ausentes retornam erro 422 — o sistema mapeia corretamente.
- [ ] **2.3** `GET /v1/proposals/:formId` retorna status `pending_review` (ou equivalente).

## 3. Criação de Subconta PJ

- [ ] **3.1** `POST /v1/proposals` com payload PJ (CNPJ, razão social, representante) retorna `formId`.
- [ ] **3.2** Campos do representante (CPF, nome, data de nascimento) são aceitos.

## 4. Documentos KYC

- [ ] **4.1** URL assinada do Supabase Storage é aceita como `documents[].url` na proposal.
- [ ] **4.2** Tipos de documento (`rg_front`, `cnh`, `selfie`, etc.) são aceitos pelo ValidaPay.
- [ ] **4.3** Se a API exigir upload direto (multipart), ajustar `subaccount.ts` — documentar aqui.

## 5. Webhook de aprovação de conta

- [ ] **5.1** Simular webhook `account.approved` → `tenant_payment_accounts.status` muda para `approved`.
- [ ] **5.2** `validapay_account_number` é preenchido no banco após aprovação.
- [ ] **5.3** Simular `account.rejected` → status muda para `rejected`, `rejection_reason` preenchido.

## 6. Formato do `accountNumber`

- [ ] **6.1** Confirmar o formato exato do `accountNumber` retornado (UUID, número, string?).
- [ ] **6.2** Confirmar que o header correto para usar ao criar cobrança é `accountId` (atualizar `provider.ts` se necessário).

## 7. Cobrança PIX com split

- [ ] **7.1** `POST /v1/charges/pix` com header `accountId` retorna `id` (chargeId), `qrCode`/`brCode`.
- [ ] **7.2** Split `fixedValue` de R$ 5,00 vai para master; restante para subconta.
- [ ] **7.3** Confirmar se taxa PIX de R$ 0,50 é descontada da **master** ou da **subconta** (ajustar `calculateCheckoutAmounts` se for da subconta).
- [ ] **7.4** Campos da resposta (`brCode`, `brCodeBase64`, `expiresAt`) — confirmar nomes exatos.

## 8. Webhook de pagamento

- [ ] **8.1** Simular `payment.success` → todos os bookings do mesmo `provider_payment_id` confirmados.
- [ ] **8.2** Simular `payment.expired` → todos os bookings cancelados.
- [ ] **8.3** Reenvio do mesmo webhook é idempotente (retorna `{ idempotent: true }`).
- [ ] **8.4** HMAC-SHA256 com `VALIDAPAY_WEBHOOK_SECRET` validado corretamente.
- [ ] **8.5** Validar nome do header de assinatura (`x-validapay-signature` ou outro).

## 9. Carrinho multi-booking

- [ ] **9.1** Criar 3 bookings em um único charge PIX → 3 payments no banco com mesmo `provider_payment_id`.
- [ ] **9.2** Webhook `payment.success` confirma todos os 3 bookings (não apenas o primeiro).

## 10. Expiração de holds

- [ ] **10.1** Hold criado com `expires_at` no passado é cancelado pelo job `expire-holds`.
- [ ] **10.2** Payment associado muda para `expired`.

## 11. Wallet — Saldo

- [ ] **11.1** `GET /v1/wallet/balance` com header `accountId` retorna `available` e `pending`.
- [ ] **11.2** Campos exatos da resposta (`available`, `availableAmount`, etc.) — atualizar `wallet.ts`.

## 12. Wallet — Extrato

- [ ] **12.1** `GET /v1/wallet/transactions` retorna lista de transações.
- [ ] **12.2** Filtros `from`, `to`, `type` funcionam corretamente.

## 13. Saque

- [ ] **13.1** `POST /v1/wallet/withdrawals` com `amount` em reais cria saque.
- [ ] **13.2** Retorna `withdrawalId` (ou campo equivalente).
- [ ] **13.3** Webhook `withdraw.success` muda status para `completed`.
- [ ] **13.4** Webhook `withdraw.failed` muda status para `failed` + `failure_reason`.

## 14. Sync de pagamentos (cron)

- [ ] **14.1** Job `sync-payments` detecta payment em `pending` há > 2 min e consulta `GET /v1/charges/:id`.
- [ ] **14.2** Status é atualizado corretamente após a sincronização.

## 15. Admin panel

- [ ] **15.1** Login com usuário `is_platform_admin = true` redireciona para `/dashboard`.
- [ ] **15.2** Login com usuário comum redireciona para `/login?reason=unauthorized`.
- [ ] **15.3** KPIs do dashboard batem com dados no banco.

## 16. Gating de PIX no checkout

- [ ] **16.1** Tenant sem KYC aprovado: botão PIX oculto no checkout, apenas "Pagar na chegada" visível.
- [ ] **16.2** Tenant com KYC aprovado: botão PIX visível e funcional.

## 17. Wizard KYC (gestor)

- [ ] **17.1** Fluxo PF completo: dados → documentos → revisão → envio → status `submitted`.
- [ ] **17.2** Fluxo PJ completo com representante.
- [ ] **17.3** CEP lookup via ViaCEP preenche endereço automaticamente.
- [ ] **17.4** Upload de documento → arquivo em bucket `tenant-kyc` privado.
- [ ] **17.5** Badge amarelo no sidebar quando status != `approved`.

## 18. Erro de valor insuficiente

- [ ] **18.1** Total do carrinho ≤ taxa da plataforma retorna erro 422 claro para o cliente.

## 19. Variáveis de ambiente (produção)

- [ ] **19.1** `VALIDAPAY_ENV=production` aponta para `api.validapay.com.br`.
- [ ] **19.2** `VALIDAPAY_DEFAULT_ACCOUNT_ID` removido ou deixado vazio em produção.
- [ ] **19.3** `VALIDAPAY_WEBHOOK_SECRET` configurado e HMAC obrigatório.
- [ ] **19.4** `CRON_SECRET` configurado nos três apps.
- [ ] **19.5** Bucket `tenant-kyc` criado no Supabase com política privada (sem acesso público).

## 20. Smoke test ponta-a-ponta

- [ ] **20.1** Criar arena nova → completar KYC → aprovar manualmente no sandbox.
- [ ] **20.2** Criar booking → fazer checkout → pagar PIX no sandbox → confirmar reserva automática via webhook.
- [ ] **20.3** Solicitar saque → confirmar via webhook → saldo atualizado.
- [ ] **20.4** Expirar PIX → booking cancelado automaticamente.
