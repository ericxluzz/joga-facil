export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return {
    id: `b-${Date.now()}`,
    ...body,
    createdAt: new Date().toISOString(),
  };
});
