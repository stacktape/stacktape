/**
 * A Node.js project's Lambda functions, packaged by the CLI's own `package` command, run in the Lambda runtime.
 *
 * The fixture is a small TypeScript project outside this repository with three functions and a hand-installed
 * `node_modules` (a CommonJS and an ESM-only package; nothing is downloaded):
 *
 * - `esm` and `plain` share the default configuration, so the CLI packages them in one split build: the module they
 *   both import is large enough to become a shared chunk layer. `esm` also loads a module through a dynamic
 *   `import()`, imports a file asset, uses the ESM-only package and imports `@aws-sdk/client-s3`, which the AWS SDK
 *   rule leaves to the runtime;
 * - `legacy` is a CommonJS entry file (`require`, `module.exports`, `__dirname`) packaged for Node.js 22 with
 *   CommonJS output, so it takes the per-function path.
 *
 * The source CLI runs as a child process in an isolated home, with every AWS and Stacktape request routed to the
 * offline guard. Each function ZIP is extracted with `unzip` and invoked in the official Lambda image for its
 * runtime, as an unprivileged user that owns none of the files, with the shared layers at `/opt` as Lambda assembles
 * them and `--enable-source-maps` on. The responses prove that the shared chunk loads from the layer, the dynamic
 * import and the asset resolve under `/var/task`, the ESM-only and CommonJS dependencies run, the AWS SDK comes from
 * the runtime and is not in the ZIP, `__dirname` is the task directory, and a thrown error names the original
 * TypeScript file and line.
 *
 * Then cache identity, with the same command: an unchanged repeat reproduces every digest and the layer bytes; an
 * edit of `esm`'s own source changes only `esm`'s digest; and the untouched project copied to another directory
 * reproduces the first run's digests, so a digest never depends on where the project was built.
 *
 * It needs Docker, `unzip` and the local Lambda Node.js 22 and 24 images (pulled when missing); never AWS.
 *
 *   bun scripts/packaging-archives/node-lambda-acceptance.ts [--out <new or empty directory>] [--keep]
 *     [--export <new or empty directory> | --import <directory>]
 */
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { startOfflineAwsServer } from '../qualification/offline-aws';
import { outputTail } from '../qualification/process';
import { writeJsonAtomic } from '../qualification/report';
import { cliDirectory, ensureDevCliArtifacts, packageWithSourceCli } from '../qualification/source-cli-packaging';
import {
  ensureLambdaImage,
  extractZip,
  invokeInLambdaRuntime,
  listExtractedEntries,
  listLeftoverContainers
} from './lambda-runtime';
import { writeInstallMarker } from './split-project-fixture';

/** `--keep` leaves the fixture, the CLI's invocation directories and the extracted layers for inspection. */
const keep = process.argv.includes('--keep');
const optionValue = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index === -1 ? undefined : resolve(process.argv[index + 1]!);
};
/**
 * `--export <dir>` runs the build phase only (the CLI packages, digests are compared) and copies the first and edited
 * builds' artifacts there; `--import <dir>` runs the invoke phase only on such a directory. The build phase runs on
 * any host the CLI supports, including Windows; the invoke phase needs Docker and `unzip` on Linux.
 */
const exportDirectory = optionValue('--export');
const importDirectory = optionValue('--import');
const outIndex = process.argv.indexOf('--out');
const out = resolve(
  outIndex === -1
    ? join(cliDirectory, '.stacktape', 'node-lambda-acceptance', new Date().toISOString().replace(/[:.]/g, '-'))
    : process.argv[outIndex + 1]!
);
const FUNCTIONS = ['esm', 'plain', 'legacy'] as const;
type FunctionName = (typeof FUNCTIONS)[number];
const RUNTIME_IMAGE: Record<FunctionName, string> = {
  esm: 'public.ecr.aws/lambda/nodejs:24',
  plain: 'public.ecr.aws/lambda/nodejs:24',
  legacy: 'public.ecr.aws/lambda/nodejs:22'
};

const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const checks: { check: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail: string) => {
  checks.push({ check: name, ok, detail });
  console.log(`${ok ? 'ok    ' : 'FAILED'}  ${name} — ${detail}`);
};
const file = async (path: string, contents: string | Uint8Array) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
};

/** More than the 1 KiB a shared chunk needs to become a layer, even minified. */
const SHARED_PAYLOAD = 'shared-'.repeat(1024);
const ASSET = Buffer.from(`asset-${'x'.repeat(2048)}\n`);

const writeFixture = async (project: string) => {
  const dependencies = { 'fixture-cjs-dep': '1.0.0', 'fixture-esm-dep': '1.0.0' };
  await file(
    join(project, 'package.json'),
    `${JSON.stringify({ name: 'node-lambda-fixture', version: '1.0.0', private: true, type: 'module', dependencies }, null, 2)}\n`
  );
  await file(
    join(project, 'package-lock.json'),
    `${JSON.stringify(
      {
        name: 'node-lambda-fixture',
        version: '1.0.0',
        lockfileVersion: 3,
        requires: true,
        packages: {
          '': { name: 'node-lambda-fixture', version: '1.0.0', dependencies },
          'node_modules/fixture-cjs-dep': { version: '1.0.0' },
          'node_modules/fixture-esm-dep': { version: '1.0.0' }
        }
      },
      null,
      2
    )}\n`
  );
  await file(
    join(project, 'tsconfig.json'),
    `${JSON.stringify({ compilerOptions: { module: 'esnext', moduleResolution: 'bundler', target: 'es2022', strict: true } })}\n`
  );
  const nodeModules = join(project, 'node_modules');
  await file(
    join(nodeModules, 'fixture-cjs-dep', 'package.json'),
    `${JSON.stringify({ name: 'fixture-cjs-dep', version: '1.0.0', main: 'index.js' })}\n`
  );
  await file(
    join(nodeModules, 'fixture-cjs-dep', 'index.js'),
    "module.exports = { kind: 'cjs', add: (left, right) => left + right };\n"
  );
  await file(
    join(nodeModules, 'fixture-esm-dep', 'package.json'),
    `${JSON.stringify({ name: 'fixture-esm-dep', version: '1.0.0', type: 'module', exports: { '.': { import: './index.mjs' } } })}\n`
  );
  await file(join(nodeModules, 'fixture-esm-dep', 'index.mjs'), "export const kind = 'esm-only';\n");
  await writeInstallMarker(project);

  await file(join(project, 'src', 'assets', 'template.bin'), ASSET);
  await file(
    join(project, 'src', 'lib', 'shared.ts'),
    [
      `export const payload = ${JSON.stringify(SHARED_PAYLOAD)};`,
      '',
      'export const explode = (): never => {',
      '  // The line below is what the source map must point at.',
      "  throw new Error('exploded in shared');",
      '};',
      ''
    ].join('\n')
  );
  await file(join(project, 'src', 'lib', 'lazy.ts'), "export const lazyValue = 'loaded-lazily';\n");
  await file(
    join(project, 'src', 'esm.ts'),
    [
      "import { S3Client } from '@aws-sdk/client-s3';",
      "import { readFileSync } from 'node:fs';",
      "import { createHash } from 'node:crypto';",
      "import { kind } from 'fixture-esm-dep';",
      "import templatePath from './assets/template.bin';",
      "import { explode, payload } from './lib/shared';",
      '',
      "export const marker = 'esm-v1';",
      '',
      'export const handler = async (event: { throw?: boolean }) => {',
      '  let stack: string[] = [];',
      '  if (event.throw) {',
      '    try {',
      '      explode();',
      '    } catch (error) {',
      "      stack = String((error as Error).stack).split('\\n').slice(0, 4);",
      '    }',
      '  }',
      "  const { lazyValue } = await import('./lib/lazy');",
      '  return {',
      "    function: 'esm',",
      '    marker,',
      '    sharedLength: payload.length,',
      '    lazyValue,',
      '    dependency: kind,',
      "    sdk: typeof S3Client === 'function' ? import.meta.resolve('@aws-sdk/client-s3') : 'missing',",
      '    asset: {',
      '      path: templatePath,',
      "      sha256: createHash('sha256').update(readFileSync(templatePath)).digest('hex')",
      '    },',
      '    importMetaUrl: import.meta.url,',
      '    stack',
      '  };',
      '};',
      ''
    ].join('\n')
  );
  await file(
    join(project, 'src', 'plain.ts'),
    [
      "import { payload } from './lib/shared';",
      '',
      "export const handler = async () => ({ function: 'plain', sharedLength: payload.length });",
      ''
    ].join('\n')
  );
  await file(
    join(project, 'src', 'legacy.cjs'),
    [
      "const { kind, add } = require('fixture-cjs-dep');",
      "const path = require('node:path');",
      '',
      'module.exports.handler = async () => ({',
      "  function: 'legacy',",
      '  dependency: kind,',
      '  sum: add(20, 22),',
      '  dirname: __dirname,',
      '  filename: path.basename(__filename),',
      "  format: typeof require === 'function' && typeof module === 'object' ? 'cjs' : 'other'",
      '});',
      ''
    ].join('\n')
  );
  await file(
    join(project, 'stacktape.yml'),
    [
      'resources:',
      '  esm:',
      '    type: function',
      '    properties:',
      '      packaging:',
      '        type: js-bundle',
      '        properties:',
      '          entryfilePath: src/esm.ts',
      '  plain:',
      '    type: function',
      '    properties:',
      '      packaging:',
      '        type: js-bundle',
      '        properties:',
      '          entryfilePath: src/plain.ts',
      '  legacy:',
      '    type: function',
      '    properties:',
      '      runtime: nodejs22.x',
      '      packaging:',
      '        type: js-bundle',
      '        properties:',
      '          entryfilePath: src/legacy.cjs',
      '          nodeVersion: 22',
      '          outputModuleFormat: cjs',
      ''
    ].join('\n')
  );
};

type PackagedFunction = { jobName: string; digest: string; artifactPath: string };
type PackageRun = {
  invocationId: string;
  /** The CLI's invocation directory, which `package` leaves behind with its artifacts and layers. */
  invocationDirectory: string;
  functions: Record<FunctionName, PackagedFunction>;
  /** Every shared layer's directory and the sorted `path mode sha256` listing of its files. */
  layers: { path: string; listing: string[] }[];
  optDirectory: string | undefined;
};

/** One `package` of the project at `project`, leaving its build directory, with `/opt` assembled from its layers. */
const packageProject = async ({ project, label }: { project: string; label: string }): Promise<PackageRun> => {
  const offlineServer = await startOfflineAwsServer();
  try {
    const packaged = await packageWithSourceCli({
      label,
      projectName: 'node-lambda-acceptance',
      projectRoot: project,
      configPath: join(project, 'stacktape.yml'),
      templatePath: join(out, `${label}-template.yml`),
      offlineServer,
      command: 'package'
    });
    const functions = {} as Record<FunctionName, PackagedFunction>;
    for (const workload of packaged.details.packagedWorkloads as Partial<PackagedFunction>[]) {
      const { jobName, digest, artifactPath } = workload;
      if (typeof jobName !== 'string' || typeof digest !== 'string' || typeof artifactPath !== 'string') {
        throw new Error(`The package command reported a workload without an artifact: ${JSON.stringify(workload)}`);
      }
      functions[jobName as FunctionName] = { jobName, digest, artifactPath };
    }
    for (const name of FUNCTIONS) {
      if (!functions[name]) throw new Error(`The package command did not package ${name}.`);
    }
    // `<invocation>/build/lambdas/<job>-<digest>.zip`; the layers of the same build are beside them.
    const buildDirectory = dirname(dirname(functions.esm.artifactPath));
    const layersRoot = join(buildDirectory, 'layers');
    const layerNames = (await readdir(layersRoot).catch(() => [])).toSorted();
    const layers = await Promise.all(
      layerNames.map(async (name) => ({
        path: join(layersRoot, name),
        listing: await listExtractedEntries(join(layersRoot, name))
      }))
    );
    let optDirectory: string | undefined;
    if (layers.length > 0) {
      optDirectory = join(out, label, 'opt');
      await mkdir(optDirectory, { recursive: true });
      for (const layer of layers) {
        await cp(layer.path, optDirectory, { recursive: true });
      }
    }
    return {
      invocationId: packaged.invocationId,
      invocationDirectory: dirname(buildDirectory),
      functions,
      layers,
      optDirectory
    };
  } finally {
    await offlineServer.close();
  }
};

type Response = Record<string, unknown>;

const invoke = async ({
  run,
  name,
  event = {}
}: {
  run: PackageRun;
  name: FunctionName;
  event?: unknown;
}): Promise<{ response: Response; entries: string[]; map: PackagedMap | undefined }> => {
  const functionDirectory = await extractZip(run.functions[name].artifactPath);
  try {
    const entries = await listExtractedEntries(functionDirectory);
    const map = await readPackagedMap(join(functionDirectory, 'index.js.map'));
    const invocation = await invokeInLambdaRuntime({
      functionDirectory,
      layerDirectory: run.optDirectory,
      handler: 'index.handler',
      image: RUNTIME_IMAGE[name],
      event,
      environment: { NODE_OPTIONS: '--enable-source-maps' }
    });
    if (invocation.status !== 200) {
      throw new Error(`${name} returned HTTP ${invocation.status}: ${invocation.body}\n${invocation.logs.stderr}`);
    }
    const response = JSON.parse(invocation.body) as Response;
    if ('errorMessage' in response) {
      throw new Error(`${name} failed in the Lambda runtime: ${invocation.body}\n${invocation.logs.stdout}`);
    }
    return { response, entries, map };
  } finally {
    await rm(functionDirectory, { recursive: true, force: true });
  }
};

/** What a shipped source map discloses: whether it carries the sources' text, and which files it names. */
type PackagedMap = { hasSourcesContent: boolean; sources: string[] };

const readPackagedMap = async (path: string): Promise<PackagedMap | undefined> => {
  const text = await readFile(path, 'utf8').catch(() => undefined);
  if (text === undefined) return undefined;
  const map = JSON.parse(text) as { sources?: unknown; sourcesContent?: unknown };
  return {
    hasSourcesContent: Array.isArray(map.sourcesContent) && map.sourcesContent.some((entry) => entry !== null),
    sources: Array.isArray(map.sources)
      ? map.sources.filter((source): source is string => typeof source === 'string')
      : []
  };
};

/** The first build's three functions in the Lambda runtime, and what their ZIPs hold. */
const invokeFirst = async ({
  first,
  sharedLine,
  report
}: {
  first: PackageRun;
  /** The 1-based line of `throw new Error('exploded in shared')` in `src/lib/shared.ts`. */
  sharedLine: number;
  report: Record<string, unknown>;
}) => {
  console.log('Invoking every function in the Lambda runtime...');
  const esm = await invoke({ run: first, name: 'esm', event: { throw: true } });
  const plain = await invoke({ run: first, name: 'plain' });
  const legacy = await invoke({ run: first, name: 'legacy' });
  report.responses = { esm: esm.response, plain: plain.response, legacy: legacy.response };
  report.entries = { esm: esm.entries, plain: plain.entries, legacy: legacy.entries };

  const layerChunks = first.layers.flatMap((layer) =>
    layer.listing
      .filter((entry) => entry.startsWith('nodejs/chunks/'))
      .map((entry) => entry.split(' ')[0]!.slice('nodejs/'.length))
  );
  const shipsLayerChunk = (entries: string[]) =>
    entries.some((entry) => layerChunks.some((chunk) => entry.startsWith(`${chunk} `)));
  check(
    'esm: shared chunk loads from the layer and is not duplicated in the function',
    esm.response.sharedLength === SHARED_PAYLOAD.length && layerChunks.length > 0 && !shipsLayerChunk(esm.entries),
    `sharedLength=${String(esm.response.sharedLength)}, layer chunks: ${layerChunks.join(', ')}`
  );
  check(
    'plain: shared chunk loads from the layer and is not duplicated in the function',
    plain.response.sharedLength === SHARED_PAYLOAD.length && !shipsLayerChunk(plain.entries),
    `sharedLength=${String(plain.response.sharedLength)}`
  );
  check(
    'esm: dynamic import resolves inside the package',
    esm.response.lazyValue === 'loaded-lazily',
    `lazyValue=${String(esm.response.lazyValue)}`
  );
  const asset = esm.response.asset as { path?: string; sha256?: string } | undefined;
  check(
    'esm: file asset ships and is read under /var/task',
    asset?.sha256 === sha256(ASSET) && typeof asset.path === 'string' && asset.path.startsWith('/var/task/'),
    `path=${String(asset?.path)}`
  );
  check(
    'esm: ESM-only dependency bundles',
    esm.response.dependency === 'esm-only',
    `dependency=${String(esm.response.dependency)}`
  );
  check(
    'esm: AWS SDK comes from the runtime, not the ZIP',
    typeof esm.response.sdk === 'string' &&
      esm.response.sdk.startsWith('file:///var/runtime/') &&
      !esm.entries.some((entry) => entry.includes('@aws-sdk/')),
    `sdk=${String(esm.response.sdk)}`
  );
  check(
    'esm: import.meta.url is the task file',
    typeof esm.response.importMetaUrl === 'string' && esm.response.importMetaUrl.startsWith('file:///var/task/'),
    `importMetaUrl=${String(esm.response.importMetaUrl)}`
  );
  const stack = Array.isArray(esm.response.stack) ? (esm.response.stack as string[]) : [];
  check(
    'esm: a thrown error names the original TypeScript file and line',
    stack.some((frame) => frame.includes(`src/lib/shared.ts:${sharedLine}:`)),
    `stack=${JSON.stringify(stack)}`
  );
  check(
    'legacy: CommonJS entry runs with require, module.exports and __dirname',
    legacy.response.dependency === 'cjs' &&
      legacy.response.sum === 42 &&
      legacy.response.dirname === '/var/task' &&
      legacy.response.format === 'cjs',
    JSON.stringify(legacy.response)
  );
  for (const [name, map, source] of [
    ['esm', esm.map, 'src/esm.ts'],
    ['plain', plain.map, 'src/plain.ts'],
    ['legacy', legacy.map, 'src/legacy.cjs']
  ] as const) {
    check(
      `${name}: ZIP ships a source map naming the original file, without sourcesContent`,
      map !== undefined && !map.hasSourcesContent && map.sources.some((entry) => entry.endsWith(source)),
      map === undefined
        ? 'no index.js.map'
        : `sourcesContent=${String(map.hasSourcesContent)} sources=${map.sources.slice(0, 4).join(', ')}`
    );
  }
  for (const name of FUNCTIONS) {
    const size = (await stat(first.functions[name].artifactPath)).size;
    check(`${name}: ZIP is a non-empty Lambda archive`, size > 0 && size < 50 * 1024 * 1024, `${size} bytes`);
  }
};

/** The edited build's `esm` function runs with its new source. */
const invokeEdited = async ({ edited }: { edited: PackageRun }) => {
  const editedEsm = await invoke({ run: edited, name: 'esm' });
  check(
    'the edited esm function runs with its new source',
    editedEsm.response.marker === 'esm-v2',
    `marker=${String(editedEsm.response.marker)}`
  );
};

/**
 * What the invoke phase needs from a build phase run elsewhere (for example on Windows): the ZIPs and the assembled
 * `/opt` of the first and edited builds, the layer listings, and where the fixture throws.
 */
type ExportedManifest = {
  sharedLine: number;
  runs: Record<
    'first' | 'edited',
    { functions: Record<FunctionName, PackagedFunction>; layers: PackageRun['layers']; opt: string | null }
  >;
};

const exportArtifacts = async ({
  directory,
  first,
  edited,
  sharedLine
}: {
  directory: string;
  first: PackageRun;
  edited: PackageRun;
  sharedLine: number;
}) => {
  const manifest: ExportedManifest = { sharedLine, runs: {} as ExportedManifest['runs'] };
  for (const [label, run] of [
    ['first', first],
    ['edited', edited]
  ] as const) {
    const functions = {} as Record<FunctionName, PackagedFunction>;
    for (const name of FUNCTIONS) {
      const zip = `${label}/${name}.zip`;
      await cp(run.functions[name].artifactPath, join(directory, zip));
      functions[name] = { ...run.functions[name], artifactPath: zip };
    }
    let opt: string | null = null;
    if (run.optDirectory !== undefined) {
      opt = `${label}/opt`;
      await cp(run.optDirectory, join(directory, opt), { recursive: true });
    }
    manifest.runs[label] = { functions, layers: run.layers, opt };
  }
  await writeJsonAtomic(join(directory, 'manifest.json'), manifest);
};

const importArtifacts = async (directory: string) => {
  const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8')) as ExportedManifest;
  const toRun = (label: 'first' | 'edited'): PackageRun => {
    const exported = manifest.runs[label];
    const functions = {} as Record<FunctionName, PackagedFunction>;
    for (const name of FUNCTIONS) {
      functions[name] = {
        ...exported.functions[name],
        artifactPath: join(directory, exported.functions[name].artifactPath)
      };
    }
    return {
      invocationId: `imported-${label}`,
      invocationDirectory: '',
      functions,
      layers: exported.layers,
      optDirectory: exported.opt === null ? undefined : join(directory, exported.opt)
    };
  };
  return { sharedLine: manifest.sharedLine, first: toRun('first'), edited: toRun('edited') };
};

/** The invoke phase alone, on artifacts a build phase exported, possibly from another operating system. */
const invokeImported = async (directory: string) => {
  await mkdir(out, { recursive: true });
  if ((await readdir(out)).length > 0) throw new Error(`Refusing to write into ${out}: it is not empty.`);
  const images = Object.fromEntries(
    [...new Set(Object.values(RUNTIME_IMAGE))].map((image) => [image, ensureLambdaImage(image)])
  );
  const report: Record<string, unknown> = { out, images, imported: directory };
  try {
    const { first, edited, sharedLine } = await importArtifacts(directory);
    report.first = first;
    report.edited = edited;
    check('the imported build has a shared layer', first.layers.length >= 1, `${first.layers.length} shared layer(s)`);
    await invokeFirst({ first, sharedLine, report });
    await invokeEdited({ edited });
  } finally {
    const leftovers = listLeftoverContainers();
    check('no acceptance container is left behind', leftovers.length === 0, leftovers.join(', ') || 'none');
    report.checks = checks;
    await writeJsonAtomic(join(out, 'report.json'), report);
  }
  const failed = checks.filter((entry) => !entry.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} check(s) failed: ${failed.map((entry) => entry.check).join('; ')}`);
  }
  console.log(`Node Lambda invoke phase passed; report at ${join(out, 'report.json')}`);
};

const main = async () => {
  if (importDirectory !== undefined) return invokeImported(importDirectory);
  await mkdir(out, { recursive: true });
  if ((await readdir(out)).length > 0) throw new Error(`Refusing to write into ${out}: it is not empty.`);
  if (exportDirectory !== undefined) {
    await mkdir(exportDirectory, { recursive: true });
    if ((await readdir(exportDirectory)).length > 0) {
      throw new Error(`Refusing to export into ${exportDirectory}: it is not empty.`);
    }
  }
  await ensureDevCliArtifacts();
  const images =
    exportDirectory === undefined
      ? Object.fromEntries([...new Set(Object.values(RUNTIME_IMAGE))].map((image) => [image, ensureLambdaImage(image)]))
      : {};
  const work = await mkdtemp(join(tmpdir(), 'stacktape-node-lambda-acceptance-'));
  const report: Record<string, unknown> = { out, images, work };
  const runs: PackageRun[] = [];
  try {
    const project = join(work, 'project');
    await writeFixture(project);
    const sharedLine =
      (await readFile(join(project, 'src', 'lib', 'shared.ts'), 'utf8'))
        .split('\n')
        .findIndex((line) => line.includes("throw new Error('exploded in shared')")) + 1;
    // A pristine copy for the relocation run, taken before any build writes into the project.
    const relocated = join(work, 'elsewhere', 'project');
    await cp(project, relocated, { recursive: true });

    console.log('Packaging the fixture with the source CLI (first run)...');
    const first = await packageProject({ project, label: 'first' });
    runs.push(first);
    report.first = first;
    check('split group emits a shared layer', first.layers.length >= 1, `${first.layers.length} shared layer(s)`);

    if (exportDirectory === undefined) await invokeFirst({ first, sharedLine, report });

    console.log('Packaging the unchanged project again...');
    const second = await packageProject({ project, label: 'second' });
    runs.push(second);
    report.second = second;
    check(
      'unchanged repeat reproduces every digest',
      FUNCTIONS.every((name) => second.functions[name].digest === first.functions[name].digest),
      FUNCTIONS.map((name) => `${name}=${second.functions[name].digest.slice(0, 12)}`).join(', ')
    );
    check(
      'unchanged repeat reproduces the layer bytes',
      JSON.stringify(second.layers.map((layer) => layer.listing)) ===
        JSON.stringify(first.layers.map((layer) => layer.listing)),
      `${second.layers.length} layer(s)`
    );

    console.log('Editing esm.ts and packaging again...');
    const esmSource = join(project, 'src', 'esm.ts');
    await writeFile(esmSource, (await readFile(esmSource, 'utf8')).replace("'esm-v1'", "'esm-v2'"));
    const edited = await packageProject({ project, label: 'edited' });
    runs.push(edited);
    report.edited = edited;
    check(
      'editing esm changes only the esm digest',
      edited.functions.esm.digest !== first.functions.esm.digest &&
        edited.functions.plain.digest === first.functions.plain.digest &&
        edited.functions.legacy.digest === first.functions.legacy.digest,
      FUNCTIONS.map((name) => `${name}=${edited.functions[name].digest.slice(0, 12)}`).join(', ')
    );
    check(
      'editing esm keeps the shared layer bytes',
      JSON.stringify(edited.layers.map((layer) => layer.listing)) ===
        JSON.stringify(first.layers.map((layer) => layer.listing)),
      `${edited.layers.length} layer(s)`
    );
    if (exportDirectory === undefined) await invokeEdited({ edited });

    console.log('Packaging the untouched copy from another directory...');
    const moved = await packageProject({ project: relocated, label: 'relocated' });
    runs.push(moved);
    report.relocated = moved;
    check(
      'the same project in another directory reproduces every digest',
      FUNCTIONS.every((name) => moved.functions[name].digest === first.functions[name].digest),
      FUNCTIONS.map(
        (name) =>
          `${name}: ${moved.functions[name].digest.slice(0, 12)} vs ${first.functions[name].digest.slice(0, 12)}`
      ).join(', ')
    );
    check(
      'the same project in another directory reproduces the layer bytes',
      JSON.stringify(moved.layers.map((layer) => layer.listing)) ===
        JSON.stringify(first.layers.map((layer) => layer.listing)),
      `${moved.layers.length} layer(s)`
    );
    if (exportDirectory !== undefined) {
      await exportArtifacts({ directory: exportDirectory, first, edited, sharedLine });
      console.log(`Exported the artifacts of the first and edited builds to ${exportDirectory}.`);
    }
  } finally {
    // The build phase starts no container and needs no Docker; the check would only fail where there is none.
    if (exportDirectory === undefined) {
      const leftovers = listLeftoverContainers();
      check('no acceptance container is left behind', leftovers.length === 0, leftovers.join(', ') || 'none');
    }
    if (!keep) {
      await rm(work, { recursive: true, force: true }).catch(() => undefined);
      await Promise.all(
        runs.map((run) => rm(run.invocationDirectory, { recursive: true, force: true }).catch(() => undefined))
      );
    }
    report.checks = checks;
    await writeJsonAtomic(join(out, 'report.json'), report);
  }
  const failed = checks.filter((entry) => !entry.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} check(s) failed: ${failed.map((entry) => entry.check).join('; ')}`);
  }
  console.log(`Node Lambda acceptance passed; report at ${join(out, 'report.json')}`);
};

void main().catch((error: unknown) => {
  console.error(outputTail(error instanceof Error ? (error.stack ?? error.message) : String(error), 12_000));
  process.exitCode = 1;
});
