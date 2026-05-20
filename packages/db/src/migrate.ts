// Roda migrations Drizzle contra DATABASE_URL
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { resolveDatabaseUrl } from './resolve-database-url';

const url = resolveDatabaseUrl();
if (!url) {
  console.error('DATABASE_URL não definida. Configure no .env.');
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client);

const migrationsFolder = path.resolve(__dirname, '../drizzle');
await migrate(db, { migrationsFolder });
console.log('✓ Migrations aplicadas');
await client.end();
