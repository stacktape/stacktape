import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOwnCodeAnchorSource } from './own-code-anchor';
import type { BuildMetafile } from './types';

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

/** A metafile in which `lib/orders.ts` shares a chunk with the packages it imports. */
const anchorFor = async (source: string, imports: { original: string; path: string }[]) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-anchor-'));
  temporaryDirectories.push(root);
  await writeFile(join(root, 'orders.ts'), source);
  const metafile: BuildMetafile = {
    inputs: {
      'orders.ts': { bytes: source.length, imports: imports.map((entry) => ({ ...entry, kind: 'import-statement' })) },
      ...Object.fromEntries(imports.map(({ path }) => [path, { bytes: 1, imports: [] }]))
    },
    outputs: {
      'chunks/chunk-a.js': {
        bytes: 1,
        inputs: Object.fromEntries(
          ['orders.ts', ...imports.map(({ path }) => path)].map((path) => [path, { bytesInOutput: 1 }])
        ),
        imports: [],
        exports: []
      }
    }
  };
  return createOwnCodeAnchorSource({ metafile, resolveInput: (path) => join(root, path) });
};

test('re-exports exactly the names own code imports from packages, under names that cannot collide', async () => {
  const anchor = await anchorFor(
    [
      "import Stripe, { type Config, errors as stripeErrors } from 'stripe';",
      "import type { Pool } from 'pg';",
      "import * as dates from 'date-fns';",
      "export { z } from 'zod';",
      'export const charge = (pool: Pool, config: Config) => [Stripe, stripeErrors, dates, pool, config];'
    ].join('\n'),
    [
      { original: 'stripe', path: 'node_modules/stripe/index.js' },
      { original: 'date-fns', path: 'node_modules/date-fns/index.js' },
      { original: 'zod', path: 'node_modules/zod/index.js' }
    ]
  );
  const lines = anchor!.split('\n').map((line) => line.replace(/"[^"]*node_modules\//, '"'));
  expect(lines).toEqual([
    'export { default as __stp0, errors as __stp1 } from "stripe/index.js";',
    'export * as __stp2 from "date-fns/index.js";',
    'export { z as __stp3 } from "zod/index.js";'
  ]);
});

test('takes the namespace of a package whose import it cannot read', async () => {
  const anchor = await anchorFor("const pdf = require('pdfkit'); export default pdf;", [
    { original: 'pdfkit', path: 'node_modules/pdfkit/index.js' }
  ]);
  expect(anchor).toMatch(/^export \* as __stp0 from ".*node_modules\/pdfkit\/index\.js";$/);
});

test('needs no anchor when no chunk mixes own code and packages', async () => {
  const anchor = await createOwnCodeAnchorSource({
    metafile: {
      inputs: { 'orders.ts': { bytes: 1, imports: [] } },
      outputs: {
        'chunks/chunk-a.js': { bytes: 1, inputs: { 'orders.ts': { bytesInOutput: 1 } }, imports: [], exports: [] }
      }
    },
    resolveInput: (path) => path
  });
  expect(anchor).toBeUndefined();
});
