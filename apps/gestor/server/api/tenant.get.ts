import { getActiveTenant } from '../utils/tenant';

export default defineEventHandler(async (event) => {
  const tenant = await getActiveTenant(event);
  if (!tenant) {
    throw createError({ statusCode: 404, message: 'Estabelecimento não cadastrado. Conclua o onboarding.' });
  }
  return tenant;
});
