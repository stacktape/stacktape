import { afterEach, describe, expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { HELPER_LAMBDA_NAMES } from '@config';
import {
  DIST_FOLDER_PATH,
  LAMBDA_TRACING_RUNTIME_DIST_PATH,
  SOURCE_MAP_INSTALL_DIST_PATH
} from 'src/config/project-paths';
import { loadHelperLambdaDetailsFromDir, writeHelperLambdaManifest } from './helper-lambdas';

const tempDirs: string[] = [];

const makeTempDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'stacktape-helper-lambdas-'));
  tempDirs.push(dir);
  return dir;
};

// Writes what `package-helper-lambdas.ts` leaves behind: it empties the directory, writes one ZIP per helper and then
// the manifest.
const buildHelperLambdas = async ({ helperLambdasDir, digest }: { helperLambdasDir: string; digest: string }) => {
  await rm(helperLambdasDir, { recursive: true, force: true });
  await mkdir(helperLambdasDir, { recursive: true });
  const artifacts = {} as Record<(typeof HELPER_LAMBDA_NAMES)[number], string>;
  for (const name of HELPER_LAMBDA_NAMES) {
    artifacts[name] = `${name}-${digest}.zip`;
    await writeFile(join(helperLambdasDir, artifacts[name]), `${name} built from ${digest}`);
  }
  await writeHelperLambdaManifest({ helperLambdasDir, artifacts });
};

const setFileTimes = async (helperLambdasDir: string, fileNames: string[], time: Date) => {
  for (const fileName of fileNames) await utimes(join(helperLambdasDir, fileName), time, time);
};

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('loadHelperLambdaDetailsFromDir', () => {
  test('selects the current build after Turbo restores an older cached build over a newer one', async () => {
    const helperLambdasDir = join(await makeTempDir(), 'helper-lambdas');
    const turboCacheDir = join(await makeTempDir(), 'helper-lambdas');
    const digestA = 'a'.repeat(40);
    const digestB = 'b'.repeat(40);
    const zipsOf = (digest: string) => HELPER_LAMBDA_NAMES.map((name) => `${name}-${digest}.zip`);

    // Source A is built and Turbo caches the output with its file times.
    await buildHelperLambdas({ helperLambdasDir, digest: digestA });
    await setFileTimes(helperLambdasDir, zipsOf(digestA), new Date('2026-10-22T10:00:00Z'));
    await cp(helperLambdasDir, turboCacheDir, { recursive: true, preserveTimestamps: true });

    // Source B is a cache miss: the build replaces the directory.
    await buildHelperLambdas({ helperLambdasDir, digest: digestB });
    await setFileTimes(helperLambdasDir, zipsOf(digestB), new Date('2026-10-22T11:00:00Z'));

    // Source returns to A: Turbo extracts the cached output over the directory with A's original file times and keeps
    // B's ZIPs, which are now the newest files there.
    await cp(turboCacheDir, helperLambdasDir, { recursive: true, preserveTimestamps: true, force: true });

    const details = await loadHelperLambdaDetailsFromDir({ helperLambdasDir });

    for (const name of HELPER_LAMBDA_NAMES) {
      expect(details[name].digest).toBe(digestA);
      await expect(readFile(details[name].artifactPath, 'utf8')).resolves.toBe(`${name} built from ${digestA}`);
    }
  });

  test('uses a per-invocation snapshot path for helper lambda artifacts', async () => {
    const sourceDir = await makeTempDir();
    const snapshotDir = join(await makeTempDir(), 'helper-lambdas');
    await buildHelperLambdas({ helperLambdasDir: sourceDir, digest: 'current' });

    const details = await loadHelperLambdaDetailsFromDir({ helperLambdasDir: sourceDir, snapshotDir });

    expect(details.batchJobTriggerLambda.digest).toBe('current');
    expect(details.batchJobTriggerLambda.artifactPath).toBe(join(snapshotDir, 'batchJobTriggerLambda-current.zip'));

    await rm(sourceDir, { recursive: true, force: true });
    await expect(readFile(details.batchJobTriggerLambda.artifactPath, 'utf8')).resolves.toBe(
      'batchJobTriggerLambda built from current'
    );
  });

  test('loads nothing from an empty directory, which commands that never deploy helpers use', async () => {
    const details = await loadHelperLambdaDetailsFromDir({ helperLambdasDir: await makeTempDir() });

    expect(Object.keys(details)).toEqual([]);
  });

  test('rejects ZIPs without a manifest instead of guessing which build is current', async () => {
    const helperLambdasDir = await makeTempDir();
    for (const name of HELPER_LAMBDA_NAMES)
      await writeFile(join(helperLambdasDir, `${name}-${'c'.repeat(40)}.zip`), '');

    await expect(loadHelperLambdaDetailsFromDir({ helperLambdasDir })).rejects.toMatchObject({
      code: 'HELPER_LAMBDA_MANIFEST_INVALID'
    });
  });

  test('rejects a manifest that lists a missing artifact', async () => {
    const helperLambdasDir = await makeTempDir();
    await buildHelperLambdas({ helperLambdasDir, digest: 'd'.repeat(40) });
    await rm(join(helperLambdasDir, `uptimeProber-${'d'.repeat(40)}.zip`));

    await expect(loadHelperLambdaDetailsFromDir({ helperLambdasDir })).rejects.toMatchObject({
      code: 'HELPER_LAMBDA_MANIFEST_INVALID'
    });
  });
});

// `pnpm dev:cli` runs `build:dev-artifacts` through Turbo. A cache hit restores only the declared outputs, so an asset
// missing from them disappears from a clean checkout, and traced deploys from source failed without the runtime.
test('the cached dev-artifacts build restores every asset the source CLI reads from the dist folder', async () => {
  const turboConfig = JSON.parse(await readFile(join(import.meta.dir, '..', '..', 'turbo.json'), 'utf8')) as {
    tasks: Record<string, { outputs?: string[] }>;
  };
  const outputs = turboConfig.tasks['build:dev-artifacts']?.outputs ?? [];
  const cliRoot = dirname(DIST_FOLDER_PATH);
  for (const asset of [SOURCE_MAP_INSTALL_DIST_PATH, LAMBDA_TRACING_RUNTIME_DIST_PATH]) {
    expect(outputs).toContain(relative(cliRoot, asset).replaceAll('\\', '/'));
  }
});
