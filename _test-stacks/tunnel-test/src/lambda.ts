import { Client as PgClient } from 'pg';

export const handler = async (event: any) => {
  const connectionString = process.env.STP_POSTGRES_DB_CONNECTION_STRING;

  const result: any = {
    service: 'api-function',
    connectionString: connectionString ? connectionString.replace(/:[^:@]+@/, ':***@') : 'not set',
    timestamp: new Date().toISOString()
  };

  if (connectionString) {
    try {
      const url = new URL(connectionString);
      result.host = url.hostname;
      result.port = url.port;
      result.database = url.pathname.slice(1);

      // Actually connect to Postgres
      const client = new PgClient({ connectionString, connectionTimeoutMillis: 10000 });
      await client.connect();
      const res = await client.query('SELECT NOW() as time, current_database() as db, inet_server_addr() as server');
      result.dbTime = res.rows[0].time;
      result.dbName = res.rows[0].db;
      result.serverAddr = res.rows[0].server;
      result.dbStatus = 'connected';
      await client.end();
    } catch (err) {
      result.dbStatus = 'error';
      result.dbError = err.message;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result, null, 2)
  };
};
