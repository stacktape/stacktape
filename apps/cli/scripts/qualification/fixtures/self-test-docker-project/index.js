const http = require('node:http');

const port = Number(process.env.PORT || 3000);
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('self-test-ok\n');
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
