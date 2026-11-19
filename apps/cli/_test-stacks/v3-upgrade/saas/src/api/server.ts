// The GraphQL API container: answers /graphql with its build mark and whether the database endpoint reached it.
import { createServer } from 'node:http';
import { BUILD_MARK } from './build-mark';

const port = Number(process.env.PORT ?? 3000);
createServer((request, response) => {
  if (request.url?.startsWith('/health')) {
    response.writeHead(200).end('ok');
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(
    JSON.stringify({
      service: 'graphql-api',
      build: BUILD_MARK,
      databaseEndpointConfigured: Boolean(process.env.DATABASE_HOST),
      path: request.url
    })
  );
}).listen(port, () => console.log(`graphql-api listening on ${port}`));
