import { createServer } from 'node:http';

const port = Number(process.env.PORT || 3001);

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('multi ok');
});

server.listen(port, '0.0.0.0');
