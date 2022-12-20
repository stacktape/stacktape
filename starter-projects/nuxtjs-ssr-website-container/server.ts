import { createServer } from 'http';
import { handler } from './.output/server/index.mjs';

const port = process.env.PORT || 3000;

const server = createServer(handler);
server.listen(port, () => {
  console.info(`Nuxt app started successfully. Listening on port ${port}.`);
  console.info(`Static content is served from ${process.env.NUXT_APP_CDN_URL}.`);
});
