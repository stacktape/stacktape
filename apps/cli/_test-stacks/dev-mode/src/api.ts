import { createServer } from 'node:http';
import { connect } from 'node:net';

// The dev-mode scenario edits this line and expects the rebuilt container to answer with the new value.
const RELEASE = 'first';

/** Dev mode injects the local database's address through `connectTo`; a TCP connection proves the wiring. */
const databaseReachable = () =>
  new Promise<boolean>((resolve) => {
    const host = process.env.STP_DB_HOST;
    const port = Number(process.env.STP_DB_PORT);
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
  response.end(JSON.stringify({ release: RELEASE, databaseReachable: await databaseReachable() }));
}).listen(Number(process.env.PORT) || 3000, () => {
  console.info('api listening');
});
