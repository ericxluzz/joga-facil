-- Migration: performance indexes for hot query paths
-- Applied: 2026-05-20

-- minhas-reservas: lookup de reservas por telefone do cliente (seq scan global sem este índice)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_phone
  ON bookings (customer_phone);

-- gestor: getActiveTenant filtra tenant_users por user_id em todo request autenticado
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id
  ON tenant_users (user_id);

-- dashboard / financeiro: somatórios e listagens de pagamentos filtrados por paid_at
CREATE INDEX IF NOT EXISTS idx_payments_paid_at
  ON payments (paid_at) WHERE status = 'paid';

-- páginas públicas e slots: recursos ativos por tenant (filtro mais comum)
CREATE INDEX IF NOT EXISTS idx_resources_tenant_active
  ON resources (tenant_id) WHERE active = true;

-- slots e index público: serviços ativos por tenant
CREATE INDEX IF NOT EXISTS idx_services_tenant_active
  ON services (tenant_id) WHERE active = true;

-- detecção de conflito de slots: cobre resource_id + intervalo + statuses quentes
CREATE INDEX IF NOT EXISTS idx_bookings_slot_overlap
  ON bookings (resource_id, starts_at, ends_at)
  WHERE status IN ('hold', 'pending_approval', 'confirmed');

-- listagens de aprovações pendentes no gestor (tenant + status + data)
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_pending_starts
  ON bookings (tenant_id, starts_at) WHERE status = 'pending_approval';
