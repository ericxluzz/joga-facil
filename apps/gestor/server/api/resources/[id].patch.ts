export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  return { id, ...body, updatedAt: new Date().toISOString() };
});
