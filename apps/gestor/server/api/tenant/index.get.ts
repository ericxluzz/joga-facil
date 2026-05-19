import { getActiveTenant } from '../../utils/tenant';

// GET /api/tenant — retorna o tenant ativo do gestor logado
export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não encontrado' });
  }
  return tenant;
});
