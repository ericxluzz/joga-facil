// Schema completo do Agenda-Slim
// Multi-tenant via tenant_id + RLS no Supabase
// Tabela `bookings` é o coração: status 'hold' com expires_at + constraint única

export * from './tenants';
export * from './users';
export * from './resources';
export * from './services';
export * from './schedule-rules';
export * from './blocks';
export * from './bookings';
export * from './payments';
export * from './webhook-events';
export * from './audit-log';
export * from './tenant-payment-accounts';
export * from './tenant-payment-documents';
export * from './withdrawals';
export * from './platform-settings';
