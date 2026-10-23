import pg from 'pg';
const run = async (k) => {
  const clients = await Promise.all(Array.from({ length: k }, async () => { const c = new pg.Client({ host: '127.0.0.1', port: 47398, user: 'postgres', password: 'devbox-proto-password', database: 'postgres' }); await c.connect(); return c; }));
  const s = performance.now();
  await Promise.all(clients.map((c) => c.query("SELECT repeat('x', 5242880)")));
  const ms = performance.now() - s;
  console.log(`${k} parallel x 5MB: ${ms.toFixed(0)} ms, aggregate ${(k * 5 / (ms / 1000)).toFixed(2)} MB/s`);
  await Promise.all(clients.map((c) => c.end()));
};
for (const k of [1, 3, 6]) await run(k);
