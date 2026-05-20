/**
 * Normaliza DATABASE_URL para serverless (Vercel, Lambda).
 *
 * - Transaction pooler (recomendado): db.<ref>.supabase.co:6543
 * - Evita porta 5432 (conexão direta IPv6) em produção serverless
 * - DATABASE_POOLER_URL tem prioridade (ex.: Session pooler aws-0-* IPv4)
 */
export function resolveDatabaseUrl(raw?: string): string {
  const fallback = 'postgresql://postgres:postgres@localhost:5432/agendaslim';
  const url =
    raw ??
    process.env.DATABASE_POOLER_URL ??
    process.env.DATABASE_URL ??
    fallback;

  const isServerless = !!(process.env.VERCEL ?? process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!isServerless) return url;

  try {
    const parsed = new URL(url);
    const isSupabaseDbHost =
      parsed.hostname.startsWith('db.') && parsed.hostname.endsWith('.supabase.co');

    if (isSupabaseDbHost && (!parsed.port || parsed.port === '5432')) {
      parsed.port = '6543';
      return parsed.toString();
    }
  } catch {
    // URL inválida — devolve como está para o driver falhar com mensagem clara
  }

  return url;
}

export function describeDatabaseUrlIssue(errorMessage: string): string | undefined {
  if (!errorMessage.includes('ENOTFOUND') && !errorMessage.includes('EAI_AGAIN')) {
    return undefined;
  }

  const host = process.env.DATABASE_URL?.match(/@([^:/]+)/)?.[1] ?? '';
  if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
    return [
      'O host db.*.supabase.co usa IPv6; a Vercel precisa de IPv4.',
      'No Supabase: Connect → Session pooler (aws-0-REGIAO.pooler.supabase.com) e defina DATABASE_POOLER_URL na Vercel,',
      'ou ative o add-on IPv4 em Project Settings → Database.',
      'Enquanto isso, use Transaction pooler: mesma URL com porta 6543 (não 5432).',
    ].join(' ');
  }

  return undefined;
}
