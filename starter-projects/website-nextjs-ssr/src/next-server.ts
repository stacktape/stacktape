import { parse } from 'url';
import next from 'next';
import { createServer } from 'http';

const IS_DEV = process.env.NODE_ENV !== 'production';
const app = next({ dev: IS_DEV });
const port = process.env.PORT || 3000;

const handleRequest = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url as string, true);
    handleRequest(req, res, parsedUrl);
    // @ts-ignore
  }).listen(port, (err) => {
    if (err) {
      throw err;
    }
    console.log(`Next.js server is listening on port ${port}.`);
  });
});
