import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/agendaslim';

// Em serverless (Vercel/Lambda) usar max: 1.
// prepare: false é obrigatório com o Transaction pooler do Supabase (porta 6543).
const isServerless = !!(process.env.VERCEL ?? process.env.AWS_LAMBDA_FUNCTION_NAME);

const client = postgres(connectionString, {
  max: isServerless ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(client, { schema, casing: 'snake_case' });
export type Database = typeof db;

export const createDb = (url: string) => {
  const c = postgres(url, { max: 1, prepare: false });
  return drizzle(c, { schema, casing: 'snake_case' });
};
