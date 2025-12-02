import { Client } from 'pg';

const handler = async (event, context) => {
  const pgClient = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
  });

  await pgClient.connect();

  const result = await pgClient.query('SELECT NOW()');
  const time = result.rows[0];

  await pgClient.end();

  return { result: time };
};

export default handler;
