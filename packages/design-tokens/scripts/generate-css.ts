import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { designTokens } from '../src/tokens.ts';

const outputUrl = new URL('../generated/tokens.css', import.meta.url);
const css = `/* Generated from src/tokens.ts. Do not edit. */
:root {
  --stp-color-accent: ${designTokens.color.accent};
  --stp-color-canvas: ${designTokens.color.canvas};
  --stp-color-text: ${designTokens.color.text};
  --stp-font-sans: ${designTokens.font.sans};
  --stp-space-6: ${designTokens.space[6]};
  --stp-space-12: ${designTokens.space[12]};
  --stp-space-16: ${designTokens.space[16]};
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
