// GET /api/payment/[id]/status - polling publico da cobranca
import {
  applyProviderPaymentStatus,
  findPaymentByPublicId,
} from '../../../utils/payments/status';

const mockStartedAt = new Map<string, number>();

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'id obrigatorio' });

  const payment = await findPaymentByPublicId(id);
  if (!payment) {
    throw createError({ statusCode: 404, message: 'Pagamento nao encontrado' });
  }

  let status = payment.status;
  let paidAt = payment.paidAt;

  if (process.env.MOCK_PAYMENTS === '1' && payment.providerPaymentId) {
    if (!mockStartedAt.has(id)) mockStartedAt.set(id, Date.now());
    const elapsed = Date.now() - (mockStartedAt.get(id) || Date.now());
    if (elapsed > 7000 && status === 'pending') {
      const now = new Date();
      await applyProviderPaymentStatus({
        provider: 'validapay',
        providerPaymentId: payment.providerPaymentId,
        status: 'paid',
        paidAt: now,
      });
      status = 'paid';
      paidAt = now;
    }
  }

  return {
    id,
    provider: payment.provider,
    status,
    amountCents: payment.amountCents,
    sellerAmountCents: payment.sellerAmountCents,
    platformFeeCents: payment.platformFeeCents,
    dueOnSiteCents: payment.dueOnSiteCents,
    pixQrCode: payment.pixQrCode,
    pixCopiaCola: payment.pixCopiaCola,
    expiresAt: payment.expiresAt?.toISOString() ?? null,
    paidAt: paidAt?.toISOString() ?? null,
  };
});
