import { useSupabaseUser } from '#imports';

export default defineNuxtRouteMiddleware(() => {
  if (process.env.MOCK_AUTH === '1') return;

  const user = useSupabaseUser();
  if (!user.value) {
    return navigateTo('/login');
  }
});
