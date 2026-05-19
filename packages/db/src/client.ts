import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/agendaslim';

// Connection pool — em produção, usar URL do pooler (transaction mode) do Supabase
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema, casing: 'snake_case' });
export type Database = typeof db;

export const createDb = (url: string) => {
  const c = postgres(url, { max: 10 });
  return drizzle(c, { schema, casing: 'snake_case' });
};
