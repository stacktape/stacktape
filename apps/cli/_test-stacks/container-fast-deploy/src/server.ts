import { createServer } from 'node:http';

// The canary rewrites this line before every measured deploy and polls for the new value.
const RELEASE = 'initial';

const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify({ release: RELEASE, awsNow: Date.now() }));
}).listen(Number(process.env.PORT) || 3000, () => {
  console.info(JSON.stringify({ event: 'listening', release: RELEASE, awsNow: Date.now() }));
});

// Keep backend connections open while API Gateway may reuse them. This isolates retirement from idle socket races.
server.keepAliveTimeout = 0;

// Close immediately, as ordinary Node applications do. The platform must allow cached routing to expire before
// delivering SIGTERM; an application-level sleep here would hide a regression in that protection.
process.on('SIGTERM', () => {
  console.info(JSON.stringify({ event: 'SIGTERM', release: RELEASE, awsNow: Date.now() }));
  server.close(() => {
    console.info(JSON.stringify({ event: 'closed', release: RELEASE, awsNow: Date.now() }));
    process.exit(0);
  });
});
