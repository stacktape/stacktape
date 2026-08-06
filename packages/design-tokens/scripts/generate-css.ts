import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { designTokens, flattenTokens } from '../src/tokens.ts';

const outputUrl = new URL('../generated/tokens.css', import.meta.url);
const declarations = flattenTokens(designTokens)
  .map(({ name, value }) => `  ${name}: ${value};`)
  .join('\n');
const css = `/* Generated from src/tokens.ts. Do not edit. */
:root {
${declarations}
}
`;

if (process.argv.includes('--check')) {
  const current = await readFile(outputUrl, 'utf8').catch(() => '');
  if (current !== css) {
    throw new Error('Generated design-token CSS is stale. Run pnpm --filter @stacktape/design-tokens generate.');
  }
} else {
  await mkdir(new URL('../generated/', import.meta.url), { recursive: true });
  await writeFile(outputUrl, css);
}
