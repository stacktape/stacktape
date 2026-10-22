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

/**
 * The anchor for a chunk that holds the packages and then `orders.ts`, which imports them, in that order. `before`
 * puts a second own file ahead of the packages in the chunk.
 */
const anchorFor = async (
  source: string,
  imports: { original: string; path: string; format?: string }[],
  before?: string
) => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-anchor-'));
  temporaryDirectories.push(root);
  await writeFile(join(root, 'orders.ts'), source);
  if (before !== undefined) await writeFile(join(root, 'before.ts'), before);
  const chunkInputs = [...(before === undefined ? [] : ['before.ts']), ...imports.map(({ path }) => path), 'orders.ts'];
  const metafile: BuildMetafile = {
    inputs: {
      'orders.ts': {
        bytes: source.length,
        imports: imports.map(({ original, path }) => ({ original, path, kind: 'import-statement' }))
      },
      ...(before === undefined ? {} : { 'before.ts': { bytes: before.length, imports: [] } }),
      ...Object.fromEntries(imports.map(({ path, format = 'esm' }) => [path, { bytes: 1, imports: [], format }]))
    },
    outputs: {
      'chunks/chunk-a.js': {
        bytes: 1,
        inputs: Object.fromEntries(chunkInputs.map((path) => [path, { bytesInOutput: 1 }])),
        imports: [],
        exports: []
      }
    }
  };
  return createOwnCodeAnchorSource({ metafile, resolveInput: (path) => join(root, path) });
};

const withoutRoot = (anchor: string | undefined) => anchor?.replace(/"[^"]*node_modules\//g, '"');

test('reads only the members the own code reads, and takes whole only the bindings it uses as values', async () => {
  const anchor = await anchorFor(
    [
      "import Stripe, { type Config, errors as stripeErrors } from 'stripe';",
      "import type { Pool } from 'pg';",
      "import * as dates from 'date-fns';",
      "import { z } from 'zod';",
      "export { formatInTimeZone } from 'date-fns-tz';",
      "export * from 'p-map';",
      'const schema = z.object({ id: z.string() });',
      'export type Order = z.infer<typeof schema> & { at: typeof z };',
      'export const charge = (pool: Pool, config: Config) => [new Stripe(config.key), stripeErrors.card, dates.addDays, pool, schema];'
    ].join('\n'),
    [
      { original: 'stripe', path: 'node_modules/stripe/index.js' },
      { original: 'date-fns', path: 'node_modules/date-fns/index.js' },
      { original: 'zod', path: 'node_modules/zod/index.js' },
      { original: 'date-fns-tz', path: 'node_modules/date-fns-tz/index.js' },
      { original: 'p-map', path: 'node_modules/p-map/index.js' }
    ]
  );
  expect(withoutRoot(anchor)?.split('\n')).toEqual([
    'export { default as __stp0 } from "stripe/index.js";',
    'import { errors as __stp1_binding } from "stripe/index.js";',
    'export const __stp1 = [__stp1_binding.card];',
    'import * as __stp2_binding from "date-fns/index.js";',
    'export const __stp2 = [__stp2_binding.addDays];',
    'import { z as __stp3_binding } from "zod/index.js";',
    'export const __stp3 = [__stp3_binding.object, __stp3_binding.string];',
    'export { formatInTimeZone as __stp4 } from "date-fns-tz/index.js";',
    'export * as __stp5 from "p-map/index.js";'
  ]);
});

test('is not used when own setup code would run after packages it ran before', async () => {
  const imports = [{ original: 'esm-config', path: 'node_modules/esm-config/index.js' }];
  const source = "import { mode } from 'esm-config'; export const getMode = () => mode;";
  expect(await anchorFor(source, imports, "process.env.MODE ??= 'configured';")).toBeUndefined();
  // Declarations alone behave the same in either order.
  expect(await anchorFor(source, imports, "export const label = 'orders';")).toBeDefined();
  // So does filling in the module's own object, and the CommonJS path globals, as Prisma's generated client does.
  const prismaLike = "const config = {}; config.schema = JSON.parse('{}'); globalThis['__dirname'] = '/var/task';";
  expect(await anchorFor(source, imports, prismaLike)).toBeDefined();
  const setups = ['globalThis.fetch = () => {};', 'startTracing();', "if (!process.env.MODE) process.env.MODE = 'x';"];
  expect(await Promise.all(setups.map((setup) => anchorFor(source, imports, setup)))).toEqual(
    setups.map(() => undefined)
  );
  // A CommonJS package runs when it is first required, wherever Bun places it.
  expect(
    await anchorFor(source, [{ ...imports[0]!, format: 'cjs' }], "process.env.MODE ??= 'configured';")
  ).toBeDefined();
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
