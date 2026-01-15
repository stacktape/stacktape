import Fastify from 'fastify';
import { Client as PgClient } from 'pg';

const fastify = Fastify({ logger: true });

const getPostgresConnection = () => process.env.STP_POSTGRES_DB_CONNECTION_STRING;

fastify.get('/', async () => {
  return { status: 'ok', service: 'private-service' };
});

fastify.get('/db-check', async () => {
  const connectionString = getPostgresConnection();
  if (!connectionString) {
    return { error: 'Postgres connection string not configured' };
  }

  try {
    const client = new PgClient({ connectionString });
    await client.connect();
    const res = await client.query('SELECT NOW()');
    await client.end();
    return { status: 'ok', time: res.rows[0].now };
  } catch (err) {
    return { error: err.message };
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Private service running on port ${port}`);
    console.log('Postgres connection:', getPostgresConnection());
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
