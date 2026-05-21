// Pré-carrega as rotas mais visitadas no boot do client.
// Usa useNuxtApp().payload para popular o cache do useFetch,
// fazendo com que a primeira navegação para essas páginas seja instantânea.
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return;

  // Após hidratação, dispara fetches em background sem bloquear nada
  setTimeout(async () => {
    const { tenant, fetchTenant } = useTenant();
    if (!tenant.value) fetchTenant().catch(() => {});

    const { items, fetchNotifications } = useNotifications();
    if (items.value.length === 0) fetchNotifications().catch(() => {});

    // Pré-popula cache do painel e dos recursos da agenda
    const populateCache = async (key: string, url: string) => {
      if (nuxtApp.payload.data[key]) return; // já em cache
      try {
        const data = await $fetch(url);
        nuxtApp.payload.data[key] = data;
      } catch {
        // silencia — o fetch real na navegação vai tentar de novo
      }
    };

    await Promise.allSettled([
      populateCache('dashboard-today', '/api/dashboard/today'),
      populateCache('resources', '/api/resources'),
    ]);
  }, 100);
});
