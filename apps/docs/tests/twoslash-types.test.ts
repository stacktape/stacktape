import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createTwoslasher } from 'twoslash';
import { CLI_STACKTAPE_DECLARATIONS_DIR } from '../src/build/cli-generated-inputs.ts';
import { typescriptLibDir } from '../src/build/generated-runtime-assets.ts';
import {
  loadTwoslashFsMap,
  STACKTAPE_TYPES_ROUTE,
  TS_LIB_ROUTE,
  TWOSLASH_COMPILER_OPTIONS
} from '../src/components/Mdx/twoslash-types.ts';

/**
 * The documentation's in-browser Twoslash must genuinely resolve `import ... from 'stacktape'`
 * against the declarations this checkout produces.
 *
 * Production renders with `noErrorValidation: true` so a reader never sees a red block; that makes
 * error suppression useless as evidence. This test therefore runs the real `createTwoslasher` with
 * error validation ON, so an unresolved module (TS2307) fails here even though it would be invisible
 * on the site. It also asserts a real hover type, which only exists if the declarations were loaded.
 *
 * `fetch` is stubbed to serve the same two routes the build serves, from the same local files, and to
 * reject every other URL — so the test also proves the loader needs no network.
 */

const realFetch = globalThis.fetch;
const rejectedUrls: string[] = [];

const respond = (path: string) => {
  try {
    return new Response(readFileSync(path, 'utf8'), { status: 200 });
  } catch {
    return new Response('', { status: 404 });
  }
};

before(() => {
  const libDir = typescriptLibDir();

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.startsWith(`${STACKTAPE_TYPES_ROUTE}/`)) {
      return respond(join(CLI_STACKTAPE_DECLARATIONS_DIR, url.slice(STACKTAPE_TYPES_ROUTE.length + 1)));
    }
    if (url.startsWith(`${TS_LIB_ROUTE}/`)) {
      return respond(join(libDir, url.slice(TS_LIB_ROUTE.length + 1)));
    }

    rejectedUrls.push(url);
    throw new Error(`The documentation Twoslash runtime must not reach the network: ${url}`);
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = realFetch;
});

test('the virtual filesystem places the stacktape package where TypeScript resolves it', async () => {
  const fsMap = await loadTwoslashFsMap();

  // `createTwoslasher({ fsMap })` roots the virtual filesystem at `/`, so node resolution from
  // `/index.ts` walks `/node_modules/...`. A `file:///` prefix is never on that lookup path.
  assert.ok(fsMap.has('/node_modules/stacktape/package.json'), 'package manifest must be under /node_modules');
  assert.ok(fsMap.has('/node_modules/stacktape/index.d.ts'), 'entry declarations must be under /node_modules');
  assert.equal(
    [...fsMap.keys()].filter((key) => key.startsWith('file:')).length,
    0,
    'no virtual file may use a file:// URL key'
  );
  assert.ok(fsMap.has('/lib.es5.d.ts'), 'the standard library must be at the virtual filesystem root');
  assert.deepEqual(rejectedUrls, [], 'the loader must only request its own two same-origin routes');
});

test('a documentation sample really type-checks against the local stacktape declarations', async () => {
  const fsMap = await loadTwoslashFsMap();
  const twoslasher = createTwoslasher({ compilerOptions: TWOSLASH_COMPILER_OPTIONS, fsMap });

  const sample = ["import { defineConfig } from 'stacktape';", '', 'const config = defineConfig;'].join('\n');

  // Error validation ON: an unresolved `stacktape` import throws here with TS2307. This is the
  // assertion the production `noErrorValidation: true` path cannot make for itself.
  const result = twoslasher(sample, 'ts', { handbookOptions: { noErrorValidation: false } });

  assert.deepEqual(
    result.nodes.filter((node) => node.type === 'error'),
    [],
    'the sample must compile cleanly against the local declarations'
  );

  const hover = result.nodes.find((node) => node.type === 'hover' && node.target === 'defineConfig');
  assert.ok(hover, 'Twoslash must report a hover for the imported `defineConfig`');
  assert.match(
    (hover as { text: string }).text,
    /defineConfig/,
    'the hover must carry a real signature, not an unresolved `any`'
  );
});
