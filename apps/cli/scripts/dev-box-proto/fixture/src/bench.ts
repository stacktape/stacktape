/** One handler for every prototype measurement; the harness picks the action and the target in the event. */
import pg from 'pg';

const sandboxId = Math.random().toString(36).slice(2, 10);
const initAt = Date.now();
let invocations = 0;
const pools = new Map<string, { pool: pg.Pool; errors: string[] }>();

type Target = { host: string; port: number; user: string; password: string; database: string } | { useEnv: true };

const envConnectionString = () =>
  Object.entries(process.env).find(([key]) => key.endsWith('DB_CONNECTION_STRING'))?.[1] ?? '';

const connectionConfig = (target: Target): pg.ClientConfig =>
  'useEnv' in target
    ? { connectionString: envConnectionString(), connectionTimeoutMillis: 15000 }
    : { ...target, connectionTimeoutMillis: 15000 };

const now = () => Number(process.hrtime.bigint()) / 1e6;
const timed = async <T>(fn: () => Promise<T>) => {
  const start = now();
  const value = await fn();
  return { value, ms: now() - start };
};

const summary = (samples: number[]) => {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)];
  return { n: sorted.length, p50: at(0.5), p95: at(0.95), max: sorted.at(-1), min: sorted[0] };
};

const latency = async (event: { target: Target; n?: number; largeReps?: number }) => {
  const client = new pg.Client(connectionConfig(event.target));
  const connect = await timed(() => client.connect());
  try {
    const selectOne: number[] = [];
    for (let i = 0; i < (event.n ?? 200); i++) selectOne.push((await timed(() => client.query('SELECT 1'))).ms);
    const large: number[] = [];
    let largeBytes = 0;
    for (let i = 0; i < (event.largeReps ?? 5); i++) {
      const { value, ms } = await timed(() => client.query("SELECT repeat('x', 5242880) AS v"));
      largeBytes = value.rows[0].v.length;
      large.push(ms);
    }
    return { connectMs: connect.ms, selectOne: summary(selectOne), large: { bytes: largeBytes, ...summary(large) } };
  } finally {
    await client.end().catch(() => undefined);
  }
};

/** A module-scope pool per target name; a failed first query is recorded, then retried once on a fresh connection. */
const poolProbe = async (event: { targets: { name: string; target: Target }[] }) => {
  const results: Record<string, unknown> = {};
  await Promise.all(
    event.targets.map(async ({ name, target }) => {
      let entry = pools.get(name);
      const reused = Boolean(entry);
      if (!entry) {
        const pool = new pg.Pool({ ...connectionConfig(target), max: 1, idleTimeoutMillis: 0 });
        const errors: string[] = [];
        pool.on('error', (error) => errors.push(`idle client error: ${error.message}`));
        entry = { pool, errors };
        pools.set(name, entry);
      }
      const idleErrors = entry.errors.splice(0);
      try {
        const { ms } = await timed(() => entry.pool.query('SELECT 1'));
        results[name] = { ok: true, reused, ms, idleErrors };
      } catch (error) {
        const first = (error as Error).message;
        try {
          const { ms } = await timed(() => entry.pool.query('SELECT 1'));
          results[name] = { ok: false, reused, firstError: first, retryOk: true, retryMs: ms, idleErrors };
        } catch (retryError) {
          results[name] = { ok: false, reused, firstError: first, retryOk: false, retryError: (retryError as Error).message, idleErrors };
        }
      }
    })
  );
  return results;
};

/** One fresh connection and one query: what a Lambda sees during a laptop disconnect. */
const once = async (event: { target: Target }) => {
  const client = new pg.Client({ ...connectionConfig(event.target), connectionTimeoutMillis: 3000 });
  const start = now();
  try {
    await client.connect();
    await client.query('SELECT 1');
    return { ok: true, ms: now() - start };
  } catch (error) {
    return { ok: false, ms: now() - start, error: (error as Error).message };
  } finally {
    await client.end().catch(() => undefined);
  }
};

const egress = async () => {
  const { value, ms } = await timed(async () => (await fetch('https://checkip.amazonaws.com')).text());
  return { ip: value.trim(), ms };
};

export const handler = async (event: { action: string } & Record<string, any>) => {
  invocations += 1;
  const base = { sandboxId, sandboxAgeS: (Date.now() - initAt) / 1000, invocations, arch: process.arch };
  switch (event.action) {
    case 'env':
      return {
        ...base,
        env: Object.fromEntries(
          Object.entries(process.env)
            .filter(([key]) => key.startsWith('STP_') || key.startsWith('AWS_ENDPOINT'))
            .map(([key, value]) => [key, String(value).replace(/:[^:@/]*@/, ':***@')])
        )
      };
    case 'latency':
      return { ...base, ...(await latency(event as any)) };
    case 'pool':
      return { ...base, results: await poolProbe(event as any) };
    case 'once':
      return { ...base, ...(await once(event as any)) };
    case 'egress':
      return { ...base, ...(await egress()) };
    default:
      return { ...base };
  }
};
