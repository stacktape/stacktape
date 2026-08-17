const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const app = express();
app.get('/', async (_request, response) => {
  const result = await pool.query('SELECT note FROM init_canary ORDER BY id LIMIT 1');
  response.json({ ok: true, note: result.rows[0]?.note ?? null });
});
app.get('/health', (_request, response) => response.json({ ok: true }));
app.listen(process.env.PORT || 3000, '0.0.0.0');
