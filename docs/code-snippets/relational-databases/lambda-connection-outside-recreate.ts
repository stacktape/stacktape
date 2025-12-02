import { Client } from 'pg';

const pgClient = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

(async () => {
  await pgClient.connect();
})();

const handler = async (event, context) => {
  const result = await pgClient.query('SELECT NOW()');
  const time = result.rows[0];

  return { result: time };
};

export default handler;
