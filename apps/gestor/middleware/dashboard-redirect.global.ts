// Redireciona /dashboard → /painel para preservar bookmarks antigos.
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/dashboard') {
    return navigateTo('/painel', { redirectCode: 301 });
  }
});
