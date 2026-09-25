/**
 * A split build puts an imported file asset only into the functions that use it, and every consumer still loads it.
 *
 * Three handlers go through the production `buildSplitBundle`, `assignChunksToLayers` and `createLayerArtifacts`:
 * `reports` imports its own `report-template.bin` and a shared library, `orders` imports only the library, and
 * `health` imports neither. The library imports `logo.bin`, so its chunk carries an asset, and, used by two functions,
 * it moves into a layer, from where it still reads the asset under `/var/task`. Each function's ZIP (the E2E adapter)
 * is extracted with `unzip` and invoked with the extracted layer at `/opt`, in the local Lambda Node.js 24 image
 * without pulling. Each consumer reads its assets and returns their SHA-256, which must equal the sources'. Then:
 * 1. ZIP contents: `reports` holds both assets, `orders` only the logo, `health` none;
 * 2. a targeted edit of `report-template.bin` changes only `reports`' split-function digest; `orders`, `health` and the
 *    layer keep theirs.
 * The report records every function's ZIP and unzipped bytes and digests.
 *
 *   bun run scripts/synthetic-split-assets-e2e.ts [--out <new or empty directory>]
 */
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { getSplitFunctionDigest } from '../src/split-bundler/function-digest';
import {
  archiveItem,
  buildSplitProjectWithLayers,
  claimEmptyOutput,
  createChecks,
  invokeInLambdaImage,
  run,
  write
} from './e2e-helpers';

const PACKAGE_ROOT = resolve(import.meta.dir, '..');
const outIndex = process.argv.indexOf('--out');
const out = resolve(
  outIndex === -1 ? await mkdtemp(join(tmpdir(), 'stacktape-split-assets-')) : process.argv[outIndex + 1]!
);
/** A standalone project outside this repository, so the build does not take the monorepo as its root. */
const project = await mkdtemp(join(tmpdir(), 'stacktape-split-assets-project-'));
const containerLabel = `stacktape.test=split-assets-${Date.now()}`;
const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const FUNCTIONS = ['reports', 'orders', 'health'] as const;
type FunctionName = (typeof FUNCTIONS)[number];
type AssetRead = { path: string; sha256: string };
type HandlerResponse = { function: string; template?: AssetRead; logo?: AssetRead; ok?: boolean };

const writeFixture = async () => {
  await write(join(project, 'package.json'), '{ "name": "split-assets-fixture", "private": true, "type": "module" }\n');
  // Incompressible, so each copy costs its full size in a ZIP.
  await write(join(project, 'src', 'assets', 'logo.bin'), randomBytes(32 * 1024));
  await write(join(project, 'src', 'assets', 'report-template.bin'), randomBytes(32 * 1024));
  await write(
    join(project, 'src', 'lib', 'shared.ts'),
    [
      "import { createHash } from 'node:crypto';",
      "import { readFileSync } from 'node:fs';",
      "import logoPath from '../assets/logo.bin';",
      '',
      "export const read = (path: string) => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });",
      'export const logo = () => read(logoPath);',
      ''
    ].join('\n')
  );
  await write(
    join(project, 'src', 'reports.ts'),
    [
      "import templatePath from './assets/report-template.bin';",
      "import { logo, read } from './lib/shared';",
      '',
      "export const handler = async () => ({ function: 'reports', template: read(templatePath), logo: logo() });",
      ''
    ].join('\n')
  );
  await write(
    join(project, 'src', 'orders.ts'),
    "import { logo } from './lib/shared';\n\nexport const handler = async () => ({ function: 'orders', logo: logo() });\n"
  );
  await write(
    join(project, 'src', 'health.ts'),
    "export const handler = async () => ({ function: 'health', ok: true });\n"
  );
};

/** One production split build of the fixture, its layer, digests and ZIPs, each function invoked from its ZIP. */
const buildStep = async (step: string) => {
  const root = join(out, step);
  const { layerArtifacts, chunksByFunction: chunksOf } = await buildSplitProjectWithLayers({
    project,
    names: FUNCTIONS,
    directory: root
  });
  const layers = await Promise.all(
    layerArtifacts.map(async (layer) => {
      const zip = await archiveItem({
        absoluteSourcePath: layer.layerPath,
        absoluteDestDirPath: join(root, 'zips'),
        fileNameBase: `layer-${layer.layerNumber}`,
        format: 'zip'
      });
      const extracted = join(root, 'extracted', `layer-${layer.layerNumber}`);
      await mkdir(extracted, { recursive: true });
      await run('/usr/bin/unzip', ['-q', zip, '-d', extracted]);
      return Object.assign(layer, { zip, zipBytes: (await stat(zip)).size, extracted });
    })
  );
  const functions = {} as Record<FunctionName, Record<string, unknown> & { digest: string; assets: string[] }>;
  for (const name of FUNCTIONS) {
    const distFolderPath = join(root, 'functions', name);
    const usedLayers = layers.filter((layer) => layer.chunks.some((chunk) => chunksOf.get(name)!.has(basename(chunk))));
    // oxlint-disable-next-line no-await-in-loop -- Functions are packaged and invoked one at a time.
    const digest = await getSplitFunctionDigest({
      distFolderPath,
      chunkLayers: usedLayers.map(({ layerNumber, contentHash }) => ({ layerNumber, contentHash })),
      nativeLayer: null
    });
    // oxlint-disable-next-line no-await-in-loop -- Functions are packaged and invoked one at a time.
    const zip = await archiveItem({
      absoluteSourcePath: distFolderPath,
      absoluteDestDirPath: join(root, 'zips'),
      fileNameBase: name,
      format: 'zip'
    });
    const extracted = join(root, 'extracted', name);
    // oxlint-disable-next-line no-await-in-loop -- Functions are packaged and invoked one at a time.
    await mkdir(extracted, { recursive: true });
    // oxlint-disable-next-line no-await-in-loop -- Functions are packaged and invoked one at a time.
    await run('/usr/bin/unzip', ['-q', zip, '-d', extracted]);
    // oxlint-disable-next-line no-await-in-loop -- Functions are packaged and invoked one at a time.
    const entries = (await readdir(extracted, { recursive: true, withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name).slice(extracted.length + 1));
    // oxlint-disable-next-line no-await-in-loop -- Functions are packaged and invoked one at a time.
    const unzippedBytes = (await Promise.all(entries.map((entry) => stat(join(extracted, entry))))).reduce(
      (sum, { size }) => sum + size,
      0
    );
    // oxlint-disable-next-line no-await-in-loop -- Functions are packaged and invoked one at a time.
    const response = await invokeInLambdaImage<HandlerResponse>({
      functionDirectory: extracted,
      layerDirectory: usedLayers[0]?.extracted,
      containerLabel
    });
    functions[name] = {
      digest,
      layers: usedLayers.map(({ layerNumber }) => layerNumber),
      // oxlint-disable-next-line no-await-in-loop -- Functions are packaged and invoked one at a time.
      zipBytes: (await stat(zip)).size,
      unzippedBytes,
      assets: entries.filter((entry) => entry.endsWith('.bin')).toSorted(),
      entries: entries.toSorted(),
      response
    };
  }
  return {
    functions,
    layers: layers.map(({ layerNumber, contentHash, chunks, zipBytes }) => ({
      layerNumber,
      contentHash,
      chunks,
      zipBytes
    }))
  };
};

await claimEmptyOutput(out);
const { results, check } = createChecks();
const report: Record<string, unknown> = {};
try {
  await writeFixture();
  const sourceHash = async (name: string) => sha256(await readFile(join(project, 'src', 'assets', name)));
  const base = await buildStep('base');
  const [logoHash, templateHash] = [await sourceHash('logo.bin'), await sourceHash('report-template.bin')];
  report.base = base;
  const assetName = (functionName: FunctionName, prefix: string) =>
    base.functions[functionName].assets.filter((asset) => asset.startsWith(prefix));
  const responses = Object.fromEntries(
    FUNCTIONS.map((name) => [name, base.functions[name].response as HandlerResponse])
  ) as Record<FunctionName, HandlerResponse>;
  check(
    'every function runs from its ZIP, and every consumer reads its assets exactly',
    base.layers.length === 1 &&
      responses.reports.template?.sha256 === templateHash &&
      responses.reports.logo?.sha256 === logoHash &&
      responses.orders.logo?.sha256 === logoHash &&
      responses.health.ok === true,
    JSON.stringify(responses)
  );
  check(
    'each ZIP holds exactly the assets its function uses',
    assetName('reports', 'report-template-').length === 1 &&
      assetName('reports', 'logo-').length === 1 &&
      base.functions.reports.assets.length === 2 &&
      base.functions.orders.assets.length === 1 &&
      assetName('orders', 'logo-').length === 1 &&
      base.functions.health.assets.length === 0,
    FUNCTIONS.map((name) => `${name}: ${base.functions[name].assets.join(', ') || 'none'}`).join('; ')
  );

  await write(join(project, 'src', 'assets', 'report-template.bin'), randomBytes(32 * 1024));
  const edited = await buildStep('edited-template');
  report.editedTemplate = edited;
  const changed = FUNCTIONS.filter((name) => edited.functions[name].digest !== base.functions[name].digest);
  check(
    'a report-template edit changes only the reports digest, and the layer keeps its hash',
    changed.length === 1 &&
      changed[0] === 'reports' &&
      edited.layers[0]?.contentHash === base.layers[0]?.contentHash &&
      (edited.functions.reports.response as HandlerResponse).template?.sha256 ===
        (await sourceHash('report-template.bin')),
    `changed: ${changed.join(', ') || 'none'}; layer ${base.layers[0]?.contentHash?.slice(0, 12)} → ${edited.layers[0]?.contentHash?.slice(0, 12)}`
  );
  report.bytes = Object.fromEntries(
    FUNCTIONS.map((name) => [
      name,
      { zipBytes: base.functions[name].zipBytes, unzippedBytes: base.functions[name].unzippedBytes }
    ])
  );
  report.functionZipBytes = FUNCTIONS.reduce((sum, name) => sum + (base.functions[name].zipBytes as number), 0);
} finally {
  await rm(project, { recursive: true, force: true });
  const leftovers = (await run('docker', ['ps', '-aq', '--filter', `label=${containerLabel}`])).stdout.trim();
  check('no container is left behind', leftovers === '', leftovers || 'none');
  const sourceFiles = [
    'src/split-bundler/bundler.ts',
    'scripts/synthetic-split-assets-e2e.ts',
    'scripts/e2e-helpers.ts'
  ];
  await writeFile(
    join(out, 'report.json'),
    `${JSON.stringify(
      {
        kind: 'stacktape-split-assets-e2e',
        createdAt: new Date().toISOString(),
        source: {
          revision: (await run('git', ['rev-parse', 'HEAD'], PACKAGE_ROOT)).stdout.trim(),
          files: Object.fromEntries(
            await Promise.all(sourceFiles.map(async (file) => [file, sha256(await readFile(join(PACKAGE_ROOT, file)))]))
          )
        },
        ...report,
        results
      },
      null,
      2
    )}\n`
  );
  console.log(`Report: ${join(out, 'report.json')}`);
}
if (results.some(({ ok }) => !ok) || results.length < 4) process.exitCode = 1;
