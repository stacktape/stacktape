// Prints the rows the afterDeploy migrations wrote, as JSON, for the canary to compare across the upgrade.
import pg from 'pg';

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
const { rows } = await client.query('SELECT label FROM deploy_marks ORDER BY id');
console.log(JSON.stringify(rows.map(({ label }) => label)));
await client.end();
