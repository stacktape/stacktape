const { Client } = require('pg');

const migrate = async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query('CREATE TABLE IF NOT EXISTS init_canary (id SERIAL PRIMARY KEY, note TEXT NOT NULL)');
  await client.query(
    "INSERT INTO init_canary (note) SELECT 'migrated-ok' WHERE NOT EXISTS (SELECT 1 FROM init_canary)"
  );
  await client.end();
};

migrate().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
