import postgres from 'postgres';

const pwd = process.env.DB_PASSWORD;
const ref = 'jqduomezsszxsapidmrm';
const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'sa-east-1', 'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-south-1',
  'ca-central-1',
];

const extras = [
  ['db-6543-pooler-user', `postgresql://postgres.${ref}:${pwd}@db.${ref}.supabase.co:6543/postgres`],
  ['db-5432-plain', `postgresql://postgres:${pwd}@db.${ref}.supabase.co:5432/postgres`],
  ['aws1-us-east-6543', `postgresql://postgres.${ref}:${pwd}@aws-1-us-east-1.pooler.supabase.com:6543/postgres`],
  ['plain-user-us-east', `postgresql://postgres:${pwd}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`],
];

for (const [label, url] of extras) {
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    await sql`SELECT 1 as ok`;
    console.log(`${label}: OK`);
    console.log(url.replace(pwd, '***'));
    await sql.end({ timeout: 2 });
    process.exit(0);
  } catch (e) {
    console.log(`${label}:`, e.message?.slice(0, 120));
    await sql.end({ timeout: 2 }).catch(() => {});
  }
}

for (const r of regions) {
  for (const port of [6543, 5432]) {
    const label = `${r}:${port}`;
    const url = `postgresql://postgres.${ref}:${pwd}@aws-0-${r}.pooler.supabase.com:${port}/postgres`;
    const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 8 });
    try {
      await sql`SELECT 1 as ok`;
      console.log(`${label}: OK`);
      console.log('URL', url.replace(pwd, '***'));
      await sql.end({ timeout: 2 });
      process.exit(0);
    } catch (e) {
      const msg = e.message?.slice(0, 80) ?? '';
      if (!msg.includes('Tenant') && !msg.includes('tenant') && !msg.includes('ENOTFOUND')) {
        console.log(`${label}:`, msg);
      }
      await sql.end({ timeout: 2 }).catch(() => {});
    }
  }
}
console.log('No working pooler region found');
process.exit(1);
