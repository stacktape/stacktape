/**
 * Packaged Lambda source maps omit `sourcesContent` by default, and the deployed function still reports original file
 * and line.
 *
 * A TypeScript handler calls `validateOrder` in `lib/validate.ts`, which throws at a known line after validating with
 * a real bundled dependency (`zod`, copied from the workspace; nothing is installed). Through the production ES Lambda
 * buildpack and the E2E ZIP adapter:
 * 1. default: every `.map` in the ZIP lacks `sourcesContent` and still names `lib/validate.ts`. The ZIP is extracted
 *    with `unzip` and invoked in the local Lambda Node.js 24 image with `NODE_OPTIONS=--enable-source-maps`, where the
 *    original sources do not exist; the caught error's stack must point at `lib/validate.ts:<line>`;
 * 2. an unchanged repeat offered that digest is skipped;
 * 3. `outputSourceMapsTo` still writes the full map, `sourcesContent` included, and ships none;
 * 4. `disableSourceMaps` ships no map;
 * 5. asset: `src/orders.ts`, which imports a file asset and throws after using it, is packaged alone the same way. Its
 *    reference to the asset is rewritten to `/var/task` on the minified line before the throw. Invoked in the Lambda
 *    image, its top frame must be the exact `<project>/src/orders.ts:<line>:<col>` of the `new Error(`;
 * 6. split: three functions go through `buildSplitBundle` and `createLayerArtifacts` inside the project, where the CLI
 *    builds them. No function or layer `.map` carries `sourcesContent`, and every packaged map's `sources` name the
 *    project's files from where the map is. Each function's ZIP and the layer ZIPs are extracted and invoked in the
 *    Lambda Node.js 24 image with the layers at /opt and `--enable-source-maps`. The top frame must be the exact
 *    `/src/<file>:<line>:<col>` of the `new Error(` in: the handler, after an asset import and rewritten chunk imports;
 *    a layered module; a layered chunk whose import of another layered chunk is rewritten; and a function-local,
 *    dynamically imported chunk whose import of a layered chunk is rewritten. A second build of the same fixture must
 *    produce the same function trees and layer hashes.
 * The report records artifact and map bytes, and split function and layer identities, for comparing runs.
 *
 *   bun run scripts/synthetic-lambda-source-map-e2e.ts [--out <new or empty directory>] [--project <new directory>]
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { buildUsingStacktapeEsLambdaBuildpack } from '../src/buildpacks/stacktape-es-lambda-buildpack';
import {
  archiveItem,
  buildSplitProjectWithLayers,
  claimEmptyOutput,
  createChecks,
  createPackagingError,
  invokeInLambdaImage,
  progressLogger,
  run,
  runDocker,
  write
} from './e2e-helpers';

const PACKAGE_ROOT = resolve(import.meta.dir, '..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '..', '..');
const outIndex = process.argv.indexOf('--out');
const out = resolve(
  outIndex === -1 ? await mkdtemp(join(tmpdir(), 'stacktape-lambda-source-map-')) : process.argv[outIndex + 1]!
);
/**
 * A standalone project outside this repository, so the build does not take the monorepo as its root. `--project`
 * fixes its path (it must not exist): Bun's source-map debug IDs, and so digests, depend on it, so comparing digests
 * between runs needs the same path.
 */
const projectIndex = process.argv.indexOf('--project');
const project =
  projectIndex === -1
    ? await mkdtemp(join(tmpdir(), 'stacktape-lambda-source-map-project-'))
    : resolve(process.argv[projectIndex + 1]!);
if (projectIndex !== -1) await mkdir(project);
const containerLabel = `stacktape.test=lambda-source-map-${Date.now()}`;
const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

const VALIDATE_SOURCE = [
  "import { z } from 'zod';",
  '',
  'const Order = z.object({ id: z.string().min(1), quantity: z.number().int().positive() });',
  '',
  'export const validateOrder = (input: unknown) => {',
  '  const result = Order.safeParse(input);',
  '  if (!result.success) {',
  '    throw new Error(`invalid order: ${result.error.issues.length} issue(s)`);',
  '  }',
  '  return result.data;',
  '};',
  ''
].join('\n');
const THROW_LINE = VALIDATE_SOURCE.split('\n').findIndex((line) => line.includes('throw new Error')) + 1;
const handlerSource = (label: string) =>
  [
    "import { validateOrder } from './lib/validate';",
    '',
    'export const handler = async (event: unknown) => {',
    '  try {',
    '    validateOrder(event);',
    `    return { label: '${label}', ok: true };`,
    '  } catch (error) {',
    `    return { label: '${label}', message: (error as Error).message, stack: (error as Error).stack };`,
    '  }',
    '};',
    ''
  ].join('\n');

/** The split functions. `limits` is used by all three, `rules` by two: two layered chunks, one importing the other. */
const SPLIT_FUNCTIONS = ['orders', 'refunds', 'audits'];
const SPLIT_SOURCES: Record<string, string> = {
  'src/split/limits.ts': [
    'export const assertPositive = (value: number) => {',
    '  if (!(value > 0)) {',
    '    throw new Error(`not positive: ${value}`);',
    '  }',
    '  return value;',
    '};',
    ''
  ].join('\n'),
  'src/split/rules.ts': [
    "import { assertPositive } from './limits';",
    '',
    'export const checkRefund = (amount: number) => {',
    '  assertPositive(amount);',
    '  if (amount > 100) {',
    '    throw new Error(`refund too large: ${amount}`);',
    '  }',
    '  return amount;',
    '};',
    ''
  ].join('\n'),
  // Imported dynamically by one function only, so it stays in that function as a local chunk.
  'src/split/report.ts': [
    "import { assertPositive } from './limits';",
    '',
    'export const report = (rows: number) => {',
    '  assertPositive(rows);',
    '  throw new Error(`report failed after ${rows} rows`);',
    '};',
    ''
  ].join('\n'),
  'src/orders.ts': [
    "import notePath from './data/note.bin';",
    "import { assertPositive } from './split/limits';",
    "import { checkRefund } from './split/rules';",
    '',
    'export const handler = async (event: { mode?: string }) => {',
    '  try {',
    "    if (event.mode === 'handler') {",
    '      throw new Error(`orders failed reading ${notePath}`);',
    '    }',
    "    if (event.mode === 'report') {",
    "      const { report } = await import('./split/report');",
    '      report(3);',
    '    }',
    "    return { label: 'orders', ok: checkRefund(assertPositive(5)) };",
    '  } catch (error) {',
    "    return { label: 'orders', message: (error as Error).message, stack: (error as Error).stack };",
    '  }',
    '};',
    ''
  ].join('\n'),
  'src/refunds.ts': [
    "import { assertPositive } from './split/limits';",
    "import { checkRefund } from './split/rules';",
    '',
    'export const handler = async (event: { mode?: string }) => {',
    '  try {',
    "    if (event.mode === 'limits') assertPositive(-1);",
    "    if (event.mode === 'rules') checkRefund(500);",
    "    return { label: 'refunds', ok: true };",
    '  } catch (error) {',
    "    return { label: 'refunds', message: (error as Error).message, stack: (error as Error).stack };",
    '  }',
    '};',
    ''
  ].join('\n'),
  'src/audits.ts': [
    "import { assertPositive } from './split/limits';",
    '',
    "export const handler = async () => ({ label: 'audits', ok: assertPositive(1) });",
    ''
  ].join('\n')
};
/** Where a correct map places each thrown error: the `Error` of its `new Error(` line, 1-based, as Node reports it. */
const throwSite = (file: string, marker: string) => {
  const lines = SPLIT_SOURCES[file]!.split('\n');
  const index = lines.findIndex((line) => line.includes(marker));
  return `/${file}:${index + 1}:${lines[index]!.indexOf('Error(') + 1}`;
};
const SPLIT_THROWS = [
  { label: 'the handler', name: 'orders', mode: 'handler', expected: throwSite('src/orders.ts', 'orders failed') },
  { label: 'a layered module', name: 'refunds', mode: 'limits', expected: throwSite('src/split/limits.ts', 'throw') },
  {
    label: 'a layered chunk whose import is rewritten',
    name: 'refunds',
    mode: 'rules',
    expected: throwSite('src/split/rules.ts', 'throw')
  },
  {
    label: 'a function-local chunk whose import is rewritten',
    name: 'orders',
    mode: 'report',
    expected: throwSite('src/split/report.ts', 'throw')
  }
];

const writeFixture = async () => {
  await write(
    join(project, 'package.json'),
    `${JSON.stringify({ name: 'lambda-source-map-fixture', private: true, type: 'module', dependencies: { zod: '*' } }, null, 2)}\n`
  );
  await cp(
    await realpath(join(REPO_ROOT, 'apps', 'cli', 'node_modules', 'zod')),
    join(project, 'node_modules', 'zod'),
    {
      recursive: true,
      dereference: true
    }
  );
  await write(join(project, 'src', 'lib', 'validate.ts'), VALIDATE_SOURCE);
  await write(join(project, 'src', 'handler.ts'), handlerSource('handler'));
  await Promise.all(Object.entries(SPLIT_SOURCES).map(([path, source]) => write(join(project, path), source)));
  await write(join(project, 'src', 'data', 'note.bin'), 'a file asset, read by path\n');
};

/** Relative path and SHA-256 of every file under `root`, sorted: a tree's identity, as its ZIP would carry it. */
const treeIdentity = async (root: string) => {
  const files = (await readdir(root, { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile());
  const lines = await Promise.all(
    files.map(async (entry) => {
      const path = join(entry.parentPath, entry.name);
      return `${relative(root, path)} ${sha256(await readFile(path))}`;
    })
  );
  return sha256(lines.toSorted().join('\n'));
};

/** One split build of the fixture in `directory`, with each function's tree identity and each layer's hash. */
const buildSplit = async (directory: string) => {
  const { layerArtifacts } = await buildSplitProjectWithLayers({ project, names: SPLIT_FUNCTIONS, directory });
  return {
    layerArtifacts,
    identities: {
      functions: Object.fromEntries(
        await Promise.all(
          SPLIT_FUNCTIONS.map(async (name) => [name, await treeIdentity(join(directory, 'functions', name))])
        )
      ),
      layers: Object.fromEntries(layerArtifacts.map(({ layerNumber, contentHash }) => [layerNumber, contentHash]))
    }
  };
};

/** The first frame of a stack, as `<path>:<line>:<column>`. */
const topFrameLocation = (stack: string | undefined) =>
  stack
    ?.split('\n')
    .find((line) => line.trimStart().startsWith('at '))
    ?.match(/\(?([^\s()]+:\d+:\d+)\)?$/)?.[1] ?? null;

/** Every `.map` under `root`, with whether it carries `sourcesContent` and the sources it names. */
const mapsUnder = async (root: string) => {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.map'))
      .map(async (entry) => {
        const path = join(entry.parentPath, entry.name);
        const map = JSON.parse(await readFile(path, 'utf8')) as { sources?: string[]; sourcesContent?: unknown[] };
        return {
          path: relative(root, path),
          bytes: (await stat(path)).size,
          hasSourcesContent: Array.isArray(map.sourcesContent) && map.sourcesContent.some((content) => content != null),
          sources: map.sources ?? []
        };
      })
  );
};

const extract = async (zipPath: string, label: string) => {
  const directory = join(out, 'extracted', label);
  await mkdir(directory, { recursive: true });
  await run('/usr/bin/unzip', ['-q', zipPath, '-d', directory]);
  return directory;
};

/** Invokes the extracted function in the local Lambda Node.js 24 image, with source maps enabled as the CLI sets them. */
const invoke = (functionDirectory: string, event: unknown) =>
  invokeInLambdaImage<{ label: string; message?: string; stack?: string }>({
    functionDirectory,
    event,
    containerLabel,
    environment: { NODE_OPTIONS: '--enable-source-maps' }
  });

const packageFunction = (
  label: string,
  languageSpecificConfig: Record<string, unknown>,
  existingDigests: string[] = [],
  entryfile = 'handler.ts'
) =>
  buildUsingStacktapeEsLambdaBuildpack({
    cwd: project,
    name: label,
    entryfilePath: join(project, 'src', entryfile),
    distFolderPath: join(out, 'build', 'functions', label),
    existingDigests,
    progressLogger,
    invocationId: 'lambda-source-map-e2e',
    sizeLimit: 250,
    languageSpecificConfig: { nodeVersion: 24, outputModuleFormat: 'esm', ...languageSpecificConfig },
    requiresGlibcBinaries: true,
    dockerBuildOutputArchitecture: 'linux/amd64',
    nodeTarget: '24',
    minify: true,
    archiveItem,
    createPackagingError,
    runDocker,
    installDependencies: async () => undefined,
    nativeDependencyInstallationRootPath: join(out, 'native-installations')
  });

await claimEmptyOutput(out);
const { results, check } = createChecks();
const report: Record<string, unknown> = {};

try {
  await writeFixture();

  // 1. The default.
  const built = await packageFunction('default', {});
  if (built.outcome !== 'bundled' || !built.artifactPath)
    throw new Error(`Default packaging: ${JSON.stringify(built)}`);
  const extracted = await extract(built.artifactPath, 'default');
  const maps = await mapsUnder(extracted);
  const extractedFiles = (await readdir(extracted, { recursive: true })).toSorted();
  const invocation = await invoke(extracted, {});
  const frame = invocation.stack?.split('\n').find((line) => line.includes('validateOrder')) ?? null;
  report.default = {
    digest: built.digest,
    zipBytes: (await stat(built.artifactPath)).size,
    jsBytes: (await stat(join(extracted, 'index.js'))).size,
    maps,
    extractedFiles,
    invocation
  };
  check(
    'default: the packaged map names the original sources but carries no sourcesContent',
    maps.length === 1 &&
      maps.every(({ hasSourcesContent }) => !hasSourcesContent) &&
      maps[0]!.sources.some((source) => source.endsWith('src/lib/validate.ts')),
    JSON.stringify(maps.map(({ path, bytes, hasSourcesContent }) => ({ path, bytes, hasSourcesContent })))
  );
  check(
    'default: the extracted function, without its sources, maps the thrown frame to lib/validate.ts',
    !extractedFiles.some((file) => file.endsWith('.ts')) &&
      invocation.message === 'invalid order: 2 issue(s)' &&
      frame !== null &&
      new RegExp(`src/lib/validate\\.ts:${THROW_LINE}:\\d+`).test(frame),
    `${frame}; files ${extractedFiles.join(', ')}`
  );

  // 2. An unchanged repeat.
  const repeat = await packageFunction('default', {}, [built.digest]);
  check(
    'default: an unchanged repeat hits the cache',
    repeat.outcome === 'skipped' && repeat.digest === built.digest,
    `${repeat.digest}; ${repeat.outcome}`
  );

  // 3. Explicit external output.
  const external = await packageFunction('external', { outputSourceMapsTo: 'external-maps' });
  const externalMaps = await mapsUnder(join(project, 'external-maps'));
  const externalZipMaps = external.artifactPath
    ? await mapsUnder(await extract(external.artifactPath, 'external'))
    : [];
  report.external = {
    digest: external.digest,
    zipBytes: external.artifactPath ? (await stat(external.artifactPath)).size : null,
    externalMaps,
    zipMaps: externalZipMaps
  };
  check(
    'outputSourceMapsTo: the full map, sourcesContent included, is written outside, and the ZIP has none',
    externalMaps.length === 1 && externalMaps[0]!.hasSourcesContent && externalZipMaps.length === 0,
    JSON.stringify({
      externalMaps: externalMaps.map(({ path, bytes, hasSourcesContent }) => ({ path, bytes, hasSourcesContent })),
      zipMaps: externalZipMaps.length
    })
  );

  // 4. Disabled maps.
  const disabled = await packageFunction('disabled', { disableSourceMaps: true });
  const disabledMaps = disabled.artifactPath ? await mapsUnder(await extract(disabled.artifactPath, 'disabled')) : [];
  report.disabled = {
    digest: disabled.digest,
    zipBytes: disabled.artifactPath ? (await stat(disabled.artifactPath)).size : null
  };
  check(
    'disableSourceMaps: the ZIP has no map',
    disabled.outcome === 'bundled' && disabledMaps.length === 0,
    `${disabledMaps.length} maps`
  );

  // 5. One function whose asset reference is rewritten to /var/task on the minified line before its throw.
  const asset = await packageFunction('asset', {}, [], 'orders.ts');
  if (asset.outcome !== 'bundled' || !asset.artifactPath) throw new Error(`Asset packaging: ${JSON.stringify(asset)}`);
  const assetDirectory = await extract(asset.artifactPath, 'asset');
  const assetFiles = (await readdir(assetDirectory, { recursive: true })).toSorted();
  const assetThrown = await invoke(assetDirectory, { mode: 'handler' });
  const assetExpected = `${project}${throwSite('src/orders.ts', 'orders failed')}`;
  const assetLocation = topFrameLocation(assetThrown.stack);
  report.asset = {
    digest: asset.digest,
    files: assetFiles,
    expected: assetExpected,
    location: assetLocation,
    stack: assetThrown.stack ?? null,
    message: assetThrown.message
  };
  check(
    `asset: a throw after a rewritten asset reference maps to ${assetExpected}`,
    assetLocation === assetExpected &&
      assetFiles.some((file) => /^note-[a-z0-9]+\.bin$/.test(file)) &&
      /\/var\/task\/note-[a-z0-9]+\.bin$/.test(assetThrown.message ?? ''),
    `${assetLocation ?? assetThrown.stack}; ${assetThrown.message}`
  );

  // 6. Split functions and their shared layers, built inside the project as the CLI builds them.
  const splitDirectory = join(project, '.stacktape', 'build');
  const split = await buildSplit(splitDirectory);
  const packagedRoots = [
    ...SPLIT_FUNCTIONS.map((name) => join(splitDirectory, 'functions', name)),
    ...split.layerArtifacts.map(({ layerPath }) => layerPath)
  ];
  const packagedMaps = (
    await Promise.all(
      packagedRoots.map(async (root) =>
        (await mapsUnder(root)).map((map) => Object.assign(map, { path: join(root, map.path) }))
      )
    )
  ).flat();
  const sharedMaps = await mapsUnder(join(splitDirectory, 'shared'));
  report.split = {
    identities: split.identities,
    packagedMaps: packagedMaps.map(({ path, bytes, hasSourcesContent, sources }) => ({
      path: relative(project, path),
      bytes,
      hasSourcesContent,
      sources
    })),
    sharedMaps: sharedMaps.map(({ path, bytes, hasSourcesContent }) => ({ path, bytes, hasSourcesContent }))
  };
  check(
    'split: no function or layer map carries sourcesContent, and the shared build keeps full maps',
    packagedMaps.length > 0 &&
      split.layerArtifacts.length > 0 &&
      packagedMaps.every(({ hasSourcesContent }) => !hasSourcesContent) &&
      sharedMaps.length > 0 &&
      sharedMaps.every(({ hasSourcesContent }) => hasSourcesContent),
    `${packagedMaps.length} packaged maps (${split.layerArtifacts.length} layers), ${packagedMaps.filter(({ hasSourcesContent }) => hasSourcesContent).length} with sourcesContent; ${sharedMaps.length} shared maps`
  );
  const unresolved = packagedMaps.flatMap(({ path, sources }) =>
    sources
      .filter((source) => !existsSync(resolve(dirname(path), source)))
      .map((source) => `${relative(project, path)}: ${source}`)
  );
  check(
    "split: every packaged map's sources name the project's files from where the map is",
    unresolved.length === 0,
    unresolved.length === 0 ? `${packagedMaps.length} maps` : unresolved.slice(0, 6).join('; ')
  );
  const splitRepeat = await buildSplit(join(project, '.stacktape', 'build-repeat'));
  report.splitRepeat = splitRepeat.identities;
  check(
    'split: a second build gives the same function trees and layer hashes',
    JSON.stringify(splitRepeat.identities) === JSON.stringify(split.identities),
    JSON.stringify(split.identities)
  );

  // The split ZIPs, extracted, run in the Lambda image with the layers at /opt.
  const layerDirectory = join(out, 'extracted', 'split-layers');
  await mkdir(layerDirectory, { recursive: true });
  const layerZips = await Promise.all(
    split.layerArtifacts.map(({ layerNumber, layerPath }) =>
      archiveItem({
        absoluteSourcePath: layerPath,
        absoluteDestDirPath: join(out, 'zips'),
        fileNameBase: `layer-${layerNumber}`,
        format: 'zip'
      })
    )
  );
  for (const zip of layerZips) {
    // oxlint-disable-next-line no-await-in-loop -- Layers extract into one folder, as Lambda merges them into /opt.
    await run('/usr/bin/unzip', ['-q', '-o', zip, '-d', layerDirectory]);
  }
  const functionDirectories = Object.fromEntries(
    await Promise.all(
      SPLIT_FUNCTIONS.map(async (name) => {
        const zip = await archiveItem({
          absoluteSourcePath: join(splitDirectory, 'functions', name),
          absoluteDestDirPath: join(out, 'zips'),
          fileNameBase: name,
          format: 'zip'
        });
        return [name, await extract(zip, `split-${name}`)] as const;
      })
    )
  );
  const frames: Record<string, unknown> = {};
  for (const { label, name, mode, expected } of SPLIT_THROWS) {
    // oxlint-disable-next-line no-await-in-loop -- One Lambda container at a time bounds the load on a shared host.
    const thrown = await invokeInLambdaImage<{ label: string; message?: string; stack?: string }>({
      functionDirectory: functionDirectories[name]!,
      layerDirectory,
      event: { mode },
      containerLabel,
      environment: { NODE_OPTIONS: '--enable-source-maps' }
    });
    const location = topFrameLocation(thrown.stack);
    frames[`${name}:${mode}`] = { expected, location, stack: thrown.stack ?? null, message: thrown.message };
    check(`split: a throw in ${label} maps to ${expected}`, location === expected, `${location ?? thrown.stack}`);
  }
  report.splitFrames = frames;
} finally {
  await rm(project, { recursive: true, force: true });
  const leftovers = (await run('docker', ['ps', '-aq', '--filter', `label=${containerLabel}`])).stdout.trim();
  check('no container is left behind', leftovers === '', leftovers || 'none');
  const sourceFiles = [
    'src/bundlers/es/index.ts',
    'src/split-bundler/bundler.ts',
    'src/split-bundler/layer-builder.ts',
    'src/split-bundler/chunk-rewriter.ts',
    'src/es/source-map-edits.ts',
    'src/es/bundler-helpers.ts',
    'src/artifact/lambda-assets.ts',
    'scripts/synthetic-lambda-source-map-e2e.ts'
  ];
  await writeFile(
    join(out, 'report.json'),
    `${JSON.stringify(
      {
        kind: 'stacktape-lambda-source-map-e2e',
        createdAt: new Date().toISOString(),
        source: {
          revision: (await run('git', ['rev-parse', 'HEAD'], PACKAGE_ROOT)).stdout.trim(),
          files: Object.fromEntries(
            await Promise.all(
              sourceFiles.map(async (file) => [
                file,
                sha256(await readFile(join(PACKAGE_ROOT, file)).catch(() => Buffer.from('missing')))
              ])
            )
          )
        },
        project,
        throwLine: THROW_LINE,
        ...report,
        results
      },
      null,
      2
    )}\n`
  );
  console.log(`Report: ${join(out, 'report.json')}`);
}
if (results.some(({ ok }) => !ok) || results.length < 14) process.exitCode = 1;
