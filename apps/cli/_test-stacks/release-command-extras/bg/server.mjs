import { createServer } from 'node:http';

const RELEASE = 'initial';

createServer((_request, response) => {
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ release: RELEASE }));
}).listen(Number(process.env.PORT), '0.0.0.0');
