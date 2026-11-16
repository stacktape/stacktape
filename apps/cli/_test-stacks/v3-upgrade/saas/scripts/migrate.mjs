// Stands in for `npx prisma migrate deploy` in the afterDeploy hook: connects to the Aurora cluster from the CI
// runner, creates the table once and records the CLI that deployed, so the rows prove earlier data survives.
import pg from 'pg';

const label = process.env.DEPLOY_MARK;
if (!label) throw new Error('DEPLOY_MARK is not set.');
const client = new pg.Client({
  host: process.env.DATABASE_HOST,
  port: 5432,
  user: 'app_admin',
  password: process.env.DATABASE_PASSWORD,
  database: 'app',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 60000
});
await client.connect();
await client.query('CREATE TABLE IF NOT EXISTS deploy_marks (id SERIAL PRIMARY KEY, label TEXT NOT NULL)');
await client.query('INSERT INTO deploy_marks (label) VALUES ($1)', [label]);
const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM deploy_marks');
console.log(`deploy_marks rows: ${rows[0].count}`);
await client.end();
