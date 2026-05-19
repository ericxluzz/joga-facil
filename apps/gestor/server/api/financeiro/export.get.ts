// GET /api/financeiro/export — exporta CSV
export default defineEventHandler(async (event) => {
  // Mock CSV simples
  const rows = [
    ['ID', 'Data', 'Cliente', 'Quadra', 'Valor (R$)', 'Status', 'Método'],
    ['p-1', '2026-05-15', 'João Silva', 'Society 1', '150,00', 'paid', 'PIX'],
    ['p-2', '2026-05-15', 'Carlos Eduardo', 'Society 2', '180,00', 'paid', 'PIX'],
    ['p-3', '2026-05-16', 'Time do Bairro', 'Padel 1', '100,00', 'pending', 'PIX'],
  ];

  const csv = rows.map((r) => r.join(';')).join('\n');
  setHeader(event, 'content-type', 'text/csv; charset=utf-8');
  setHeader(event, 'content-disposition', `attachment; filename="agenda-slim-financeiro.csv"`);
  return csv;
});
