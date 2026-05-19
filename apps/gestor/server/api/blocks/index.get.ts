// GET /api/blocks — bloqueios manuais (feriado, manutenção)
export default defineEventHandler(async () => {
  return {
    blocks: [
      {
        id: 'b-1',
        resourceId: null,
        resourceName: 'Todas as quadras',
        startsAt: '2026-12-25T00:00:00-03:00',
        endsAt: '2026-12-25T23:59:59-03:00',
        reason: 'Feriado de Natal',
      },
    ],
  };
});
