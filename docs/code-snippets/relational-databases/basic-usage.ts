import express from 'express';
import { Pool } from 'pg';

const pgPool = new Pool({
  connectionString: process.env.STP_MY_DATABASE_CONNECTION_STRING // env variable was automatically injected by Stacktape
});

const app = express();

app.get('/time', async (req, res) => {
  const result = await pgPool.query('SELECT NOW()');
  const time = result.rows[0];

  res.send(time);
});

app.listen(3000, () => {
  console.info('Server running on port 3000');
});
