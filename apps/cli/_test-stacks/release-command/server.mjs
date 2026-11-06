import { createServer } from 'node:http';
import pg from 'pg';

const RELEASE = 'initial';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 });

createServer(async (request, response) => {
  try {
    const { rows } = await pool.query('SELECT count(*)::int AS runs FROM release_runs');
    const { rows: migrations } = await pool.query('SELECT name FROM applied_migrations ORDER BY name');
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({ release: RELEASE, runs: rows[0].runs, migrations: migrations.map(({ name }) => name) })
    );
  } catch (error) {
    response.statusCode = 500;
    response.end(String(error));
  }
}).listen(Number(process.env.PORT), '0.0.0.0');
