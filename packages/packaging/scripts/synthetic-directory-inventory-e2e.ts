/**
 * The directory checksum a Lambda artifact's cache identity is built from depends only on what the archive holds: a
 * root rename or a same-bytes rewrite keeps the identity and the cache hit, while a content or execute-bit edit changes
 * it, so no cache hit returns stale runtime output.
 *
 * A representative custom artifact (a handler that reads a data file through an internal symbolic link and reports
 * whether `bin/tool` is executable) goes through the production `buildUsingCustomArtifact`, with its digests offered back
 * as `existingDigests` the way the CLI does. Its ZIP is written from `listArchiveEntries`, the policy the CLI's archiver
 * writes from (modes, links, contents), extracted with Info-ZIP `unzip` and run in local `node:24-bookworm-slim` without
 * network. The production split-function digest is checked on the same tree. Steps:
 * 1. build at one root;
 * 2. move the tree to another parent under another name: same digests, cache hit;
 * 3. rewrite a file with the same bytes: same digests, cache hit;
 * 4. edit the handler: new digests, rebuilt, and the artifact prints the edit;
 * 5. remove `bin/tool`'s execute bit: new digest, rebuilt, and the artifact reports it.
 *
 *   bun run scripts/synthetic-directory-inventory-e2e.ts [--out <new or empty directory>]
 */
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, mkdtemp, readFile, rename, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { ZipArchive } from 'archiver';
import { listArchiveEntries } from '../src/artifact/archive-entries';
import { buildUsingCustomArtifact } from '../src/artifact/custom-artifact';
import type { ArchiveItem } from '../src/runtime-contracts';
import { getSplitFunctionDigest } from '../src/split-bundler/function-digest';
import { claimEmptyOutput, createChecks, createPackagingError, progressLogger, run, write } from './e2e-helpers';

const PACKAGE_ROOT = resolve(import.meta.dir, '..');
const outIndex = process.argv.indexOf('--out');
const out = resolve(
  outIndex === -1 ? await mkdtemp(join(tmpdir(), 'stacktape-directory-inventory-')) : process.argv[outIndex + 1]!
);
const containerLabel = `stacktape.test=directory-inventory-${Date.now()}`;
const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');

/** Writes the ZIP from the archive policy's own entry list: normalized modes, stored links, every file's bytes. */
const archiveFromEntries: ArchiveItem = async ({ absoluteSourcePath, absoluteDestDirPath, fileNameBase }) => {
  const { entries } = await listArchiveEntries({ sourcePath: absoluteSourcePath });
  const outputPath = join(absoluteDestDirPath ?? dirname(absoluteSourcePath), `${fileNameBase ?? 'artifact'}.zip`);
  await mkdir(dirname(outputPath), { recursive: true });
  await new Promise<void>((done, fail) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const output = createWriteStream(outputPath);
    output.on('close', () => done());
    output.on('error', fail);
    archive.on('error', fail);
    archive.pipe(output);
    for (const entry of entries) {
      if (entry.type === 'directory') archive.append('', { name: `${entry.path}/`, mode: entry.mode });
      else if (entry.type === 'symlink') archive.symlink(entry.path, entry.target, entry.mode);
      else archive.file(entry.sourcePath, { name: entry.path, mode: entry.mode });
    }
    void archive.finalize().catch(fail);
  });
  return outputPath;
};

const writeFixture = async (root: string, marker: string) => {
  await write(
    join(root, 'index.mjs'),
    [
      "import { readFileSync, statSync } from 'node:fs';",
      "const here = new URL('.', import.meta.url).pathname;",
      'export const handler = async () => ({',
      `  marker: '${marker}',`,
      "  data: readFileSync(here + 'lib/current', 'utf8').trim(),",
      "  toolExecutable: (statSync(here + 'bin/tool').mode & 0o111) !== 0",
      '});',
      ''
    ].join('\n')
  );
  await write(join(root, 'lib', 'data.txt'), 'inventory-data-1\n');
  await symlink('data.txt', join(root, 'lib', 'current'));
  await write(join(root, 'bin', 'tool'), '#!/bin/sh\necho tool\n');
  await chmod(join(root, 'bin', 'tool'), 0o755);
};

type Step = {
  step: string;
  root: string;
  digest: string;
  splitFunctionDigest: string;
  outcome: string;
  zipEntries: string | null;
  runOutput: string | null;
};

const packageStep = async (step: string, root: string, existingDigests: string[]): Promise<Step> => {
  const output = await buildUsingCustomArtifact({
    packagePath: root,
    name: 'inventory-fixture',
    cwd: root,
    distFolderPath: join(out, 'dist', step),
    progressLogger,
    existingDigests,
    handler: 'index.handler',
    archiveItem: archiveFromEntries,
    createPackagingError
  });
  const splitFunctionDigest = await getSplitFunctionDigest({
    distFolderPath: root,
    chunkLayers: [],
    nativeLayer: null
  });
  if (output.outcome !== 'bundled' || !output.artifactPath) {
    return {
      step,
      root,
      digest: output.digest,
      splitFunctionDigest,
      outcome: output.outcome,
      zipEntries: null,
      runOutput: null
    };
  }
  const extracted = join(out, 'extracted', step);
  await mkdir(extracted, { recursive: true });
  await run('/usr/bin/unzip', ['-q', output.artifactPath, '-d', extracted]);
  const zipEntries = (await run('/usr/bin/unzip', ['-Z', output.artifactPath])).stdout
    .split('\n')
    .filter((line) => /^[-dl]/.test(line))
    .map((line) => `${line.slice(0, 10)} ${line.split(/\s+/).slice(8).join(' ')}`)
    .join('\n');
  const runOutput = (
    await run('docker', [
      'run',
      '--rm',
      '--network',
      'none',
      '--label',
      containerLabel,
      '--user',
      '65534:65534',
      '--mount',
      `type=bind,source=${extracted},target=/var/task,readonly`,
      'node:24-bookworm-slim',
      'node',
      '--input-type=module',
      '-e',
      "const m = await import('/var/task/index.mjs'); console.log(JSON.stringify(await m.handler()));"
    ])
  ).stdout.trim();
  return { step, root, digest: output.digest, splitFunctionDigest, outcome: output.outcome, zipEntries, runOutput };
};

await claimEmptyOutput(out);
const { results, check } = createChecks();

const firstRoot = join(out, 'roots', 'checkout-one', 'app');
const movedRoot = join(out, 'elsewhere', 'renamed-artifact');
await writeFixture(firstRoot, 'handler-v1');
const built = await packageStep('1-build', firstRoot, []);
await mkdir(dirname(movedRoot), { recursive: true });
await rename(firstRoot, movedRoot);
const moved = await packageStep('2-moved', movedRoot, [built.digest]);
await writeFile(join(movedRoot, 'lib', 'data.txt'), await readFile(join(movedRoot, 'lib', 'data.txt')));
const rewritten = await packageStep('3-same-bytes', movedRoot, [built.digest]);
await writeFile(
  join(movedRoot, 'index.mjs'),
  (await readFile(join(movedRoot, 'index.mjs'), 'utf8')).replace('handler-v1', 'handler-v2')
);
const edited = await packageStep('4-content-edit', movedRoot, [built.digest]);
await chmod(join(movedRoot, 'bin', 'tool'), 0o644);
const chmodded = await packageStep('5-execute-bit', movedRoot, [built.digest, edited.digest]);

check(
  'the first build packages and runs the handler through its internal link',
  built.outcome === 'bundled' &&
    built.runOutput === '{"marker":"handler-v1","data":"inventory-data-1","toolExecutable":true}' &&
    /^l.* lib\/current$/m.test(built.zipEntries ?? '') &&
    /^-rwxr-xr-x bin\/tool$/m.test(built.zipEntries ?? ''),
  `${built.runOutput}\n${built.zipEntries}`
);
check(
  'moving the tree to another parent under another name keeps both digests and hits the cache',
  moved.digest === built.digest &&
    moved.splitFunctionDigest === built.splitFunctionDigest &&
    moved.outcome === 'skipped',
  `digest ${built.digest} → ${moved.digest}; split ${built.splitFunctionDigest} → ${moved.splitFunctionDigest}; ${moved.outcome}`
);
check(
  'rewriting a file with the same bytes keeps the digest and hits the cache',
  rewritten.digest === built.digest && rewritten.outcome === 'skipped',
  `${rewritten.digest}; ${rewritten.outcome}`
);
check(
  'a handler edit changes both digests, rebuilds, and the artifact runs the edit',
  edited.digest !== built.digest &&
    edited.splitFunctionDigest !== built.splitFunctionDigest &&
    edited.outcome === 'bundled' &&
    edited.runOutput === '{"marker":"handler-v2","data":"inventory-data-1","toolExecutable":true}',
  `${edited.digest}; ${edited.runOutput}`
);
check(
  'removing an execute bit changes the digest, rebuilds, and the artifact reports it',
  chmodded.digest !== edited.digest &&
    chmodded.outcome === 'bundled' &&
    /^-rw-r--r-- bin\/tool$/m.test(chmodded.zipEntries ?? '') &&
    chmodded.runOutput === '{"marker":"handler-v2","data":"inventory-data-1","toolExecutable":false}',
  `${chmodded.digest}; ${chmodded.runOutput}`
);
const leftovers = (await run('docker', ['ps', '-aq', '--filter', `label=${containerLabel}`])).stdout.trim();
check('no container is left behind', leftovers === '', leftovers || 'none');

const sourceFiles = [
  'src/artifact/hashing.ts',
  'src/artifact/archive-entries.ts',
  'src/artifact/custom-artifact.ts',
  'src/split-bundler/function-digest.ts',
  'scripts/synthetic-directory-inventory-e2e.ts'
];
await writeFile(
  join(out, 'report.json'),
  `${JSON.stringify(
    {
      kind: 'stacktape-directory-inventory-e2e',
      createdAt: new Date().toISOString(),
      source: {
        revision: (await run('git', ['rev-parse', 'HEAD'], PACKAGE_ROOT)).stdout.trim(),
        files: Object.fromEntries(
          await Promise.all(sourceFiles.map(async (file) => [file, sha256(await readFile(join(PACKAGE_ROOT, file)))]))
        )
      },
      steps: [built, moved, rewritten, edited, chmodded],
      results
    },
    null,
    2
  )}\n`
);
console.log(`Report: ${join(out, 'report.json')}`);
if (results.some(({ ok }) => !ok) || results.length < 6) process.exitCode = 1;
