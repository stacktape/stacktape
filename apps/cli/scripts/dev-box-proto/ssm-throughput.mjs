import pg from 'pg';
const c = new pg.Client({ host: '127.0.0.1', port: 47398, user: 'postgres', password: 'devbox-proto-password', database: 'postgres' });
await c.connect();
const t = async (label, fn) => { const s = performance.now(); await fn(); console.log(label, (performance.now() - s).toFixed(0), 'ms'); };
for (let i = 0; i < 3; i++) await t('select1', () => c.query('SELECT 1'));
const big = 'x'.repeat(5 * 1024 * 1024);
for (let i = 0; i < 2; i++) await t('download 5MB box->laptop', () => c.query("SELECT repeat('x', 5242880)"));
for (let i = 0; i < 2; i++) await t('upload 5MB laptop->box', () => c.query('SELECT length($1)', [big]));
await c.end();
