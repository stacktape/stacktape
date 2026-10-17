import { createServer } from 'node:http';

// The canary rewrites this line before every measured deploy and polls for the new value.
const RELEASE = 'initial';

const server = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify({ release: RELEASE }));
}).listen(Number(process.env.PORT) || 3000, () => {
  console.info(`listening, release ${RELEASE}`);
});

// A load balancer or API Gateway can still send requests for up to 20 seconds after ECS asks the container to stop,
// so it keeps serving for 25 seconds (the default stopTimeout is 30) before it closes.
process.on('SIGTERM', () => {
  console.info('SIGTERM received, closing in 25 seconds');
  setTimeout(() => server.close(() => process.exit(0)), 25_000);
});
