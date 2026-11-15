import pg from 'pg';

const RELEASE = 'initial';

// Fails until the release command created the tables, so a function that got its code first answers with an error.
export const handler = async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const migrations = await client.query('SELECT name FROM applied_migrations ORDER BY name');
    const runs = await client.query('SELECT count(*) FROM release_runs');
    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        release: RELEASE,
        runs: Number(runs.rows[0].count),
        migrations: migrations.rows.map(({ name }) => name)
      })
    };
  } finally {
    await client.end();
  }
};
