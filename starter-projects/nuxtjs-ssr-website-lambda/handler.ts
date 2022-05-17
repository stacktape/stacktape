import { handler } from './.output/server/index.mjs';

console.info(`Static content is served from ${process.env.NUXT_APP_CDN_URL}.`);

export default handler;
