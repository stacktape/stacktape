import { mkdir, writeFile } from 'node:fs/promises';
const result = await Bun.build({
  entrypoints: ['./src/app.ts'],
  outdir: './dist/static',
  target: 'browser',
  naming: 'app.js'
});
if (!result.success) throw new Error(result.logs.join('\n'));
await mkdir('dist/docs/getting-started', { recursive: true });
await writeFile('dist/index.html', '<h1>Static home</h1><script type="module" src="/static/app.js"></script>');
await writeFile(
  'dist/docs/getting-started/index.html',
  '<h1>Getting started</h1><script type="module" src="/static/app.js"></script>'
);
