import { readdirSync, readFileSync } from 'node:fs';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
await client.query('CREATE TABLE IF NOT EXISTS applied_migrations (name text PRIMARY KEY)');
// One row per run, so the canary can count how often the command ran.
await client.query('CREATE TABLE IF NOT EXISTS release_runs (id serial PRIMARY KEY, at timestamptz DEFAULT now())');
await client.query('INSERT INTO release_runs DEFAULT VALUES');
console.log(`release-command-started ${process.env.RELEASE_MARKER ?? ''}`);
for (const name of readdirSync('migrations').sort()) {
  const { rowCount } = await client.query('SELECT 1 FROM applied_migrations WHERE name = $1', [name]);
  if (rowCount) continue;
  console.log(`applying ${name}`);
  await client.query(readFileSync(`migrations/${name}`, 'utf8'));
  await client.query('INSERT INTO applied_migrations (name) VALUES ($1)', [name]);
}
await client.end();
console.log('release-command-finished');
