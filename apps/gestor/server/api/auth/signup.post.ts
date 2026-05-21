import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function isEmailConfirmationError(message?: string) {
  const m = message?.toLowerCase() ?? '';
  return m.includes('confirmation email') || m.includes('sending');
}

function isDuplicateUserError(message?: string) {
  const m = message?.toLowerCase() ?? '';
  return (
    m.includes('database error saving new user') ||
    m.includes('already registered') ||
    m.includes('already been registered') ||
    m.includes('user already registered') ||
    m.includes('duplicate key') ||
    m.includes('users_email_partial_key')
  );
}

function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key.length < 100 || key.startsWith('COLE_')) return null;
  return key;
}

async function trySignIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password, name, document, phone } = body;

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'email e password são obrigatórios' });
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = getServiceRoleKey();

  if (!url || !anonKey) {
    throw createError({ statusCode: 500, message: 'Configuração do Supabase ausente' });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Com service role: cria usuário já confirmado (hash correto, sem email)
  if (serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: adminUser, error: adminError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, document, phone },
    });

    if (adminError && !adminError.message?.toLowerCase().includes('already')) {
      throw createError({ statusCode: 500, message: adminError.message });
    }

    const tokens = await trySignIn(supabase, email, password);
    if (tokens) return tokens;
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, document, phone } },
  });

  if (!signUpError && signUpData.session) {
    return {
      access_token: signUpData.session.access_token,
      refresh_token: signUpData.session.refresh_token,
    };
  }

  if (isDuplicateUserError(signUpError?.message)) {
    const tokens = await trySignIn(supabase, email, password);
    if (tokens) return tokens;
    throw createError({
      statusCode: 409,
      message:
        'Este email já está cadastrado. Faça login ou use outro email.',
    });
  }

  if (isEmailConfirmationError(signUpError?.message)) {
    await supabase.rpc('confirm_pending_user', { p_email: email });

    const tokens = await trySignIn(supabase, email, password);
    if (tokens) return tokens;

    throw createError({
      statusCode: 503,
      message:
        'Conta pode ter sido criada, mas o login falhou. No Supabase (Joga Fácil), desative "Confirm email" em Auth → Providers → Email e tente de novo.',
    });
  }

  if (!signUpError && !signUpData.session) {
    return { needsConfirmation: true };
  }

  throw createError({ statusCode: 400, message: signUpError?.message || 'Erro desconhecido' });
});
