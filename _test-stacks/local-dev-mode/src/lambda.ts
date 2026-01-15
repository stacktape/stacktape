import { Client as PgClient } from 'pg';

const getPostgresConnection = () => process.env.STP_POSTGRES_DB_CONNECTION_STRING;

export const handler = async (event: any) => {
  const connectionString = getPostgresConnection();

  const result: any = {
    statusCode: 200,
    service: 'api-function',
    postgresConfigured: !!connectionString
  };

  if (connectionString) {
    try {
      const client = new PgClient({ connectionString });
      await client.connect();
      const res = await client.query('SELECT NOW()');
      result.dbTime = res.rows[0].now;
      result.dbStatus = 'connected';
      await client.end();
    } catch (err) {
      result.dbStatus = 'error';
      result.dbError = err.message;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result)
  };
};
