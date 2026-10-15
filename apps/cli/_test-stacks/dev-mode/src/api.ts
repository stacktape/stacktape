import { createServer } from 'node:http';
import { connect } from 'node:net';

// The dev-mode scenario edits this line and expects the rebuilt container to answer with the new value.
const RELEASE = 'first';

/** Dev mode injects the local resources' addresses through `connectTo`; a TCP connection proves the wiring. */
const reachable = (host: string | undefined, port: number) =>
  new Promise<boolean>((resolve) => {
    if (!host || !port) return resolve(false);
    const socket = connect({ host, port });
    socket.setTimeout(2_000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });

createServer(async (_request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  const [databaseReachable, cacheReachable] = await Promise.all([
    reachable(process.env.STP_DB_HOST, Number(process.env.STP_DB_PORT)),
    reachable(process.env.STP_CACHE_HOST, Number(process.env.STP_CACHE_PORT))
  ]);
  response.end(JSON.stringify({ release: RELEASE, databaseReachable, cacheReachable }));
}).listen(Number(process.env.PORT) || 3000, () => {
  console.info('api listening');
});
