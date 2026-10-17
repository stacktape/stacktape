import { mkdir, writeFile } from 'node:fs/promises';
const result = await Bun.build({
  entrypoints: ['./src/app.ts'],
  outdir: './dist/static',
  target: 'browser',
  naming: 'app.js'
});
if (!result.success) throw new Error(result.logs.join('\n'));
await mkdir('dist/docs/getting-started', { recursive: true });
// Deploy-time configuration reaches the build through the environment, like `VITE_*` variables do.
const channel = process.env.STATIC_SITE_CHANNEL ?? 'unset';
await writeFile(
  'dist/index.html',
  `<meta name="channel" content="${channel}"><h1>Static home</h1><script type="module" src="/static/app.js"></script>`
);
await writeFile(
  'dist/docs/getting-started/index.html',
  '<h1>Getting started</h1><script type="module" src="/static/app.js"></script>'
);
