// Middleware: blocks access if the logged-in user is not a platform admin.
export default defineNuxtRouteMiddleware(async () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  if (!user.value) return navigateTo('/login');

  // Check is_platform_admin flag in public.users table
  const { data } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.value.id)
    .maybeSingle();

  if (!data?.is_platform_admin) {
    return navigateTo('/login?reason=unauthorized');
  }
});
