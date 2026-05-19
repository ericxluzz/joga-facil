// GET /api/payment/[id]/status — para polling
// Mock que confirma após ~7s pra simular pagamento
const startedAt = new Map<string, number>();

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatório' });

  if (!startedAt.has(id)) startedAt.set(id, Date.now());
  const elapsed = Date.now() - (startedAt.get(id) || Date.now());

  return {
    id,
    status: elapsed > 7000 ? 'paid' : 'pending',
    paidAt: elapsed > 7000 ? new Date().toISOString() : null,
  };
});
