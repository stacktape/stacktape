import { createServer } from 'node:http';

const port = Number(process.env.PORT || 3000);

const server = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      service: 'diff-preview-web',
      releaseChannel: process.env.RELEASE_CHANNEL,
      tableName: process.env.TABLE_NAME
    })
  );
});

server.listen(port, () => {
  console.info(`diff-preview-web listening on ${port}`);
});
