import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadHelperLambdaDetailsFromDir } from './helper-lambdas';

const tempDirs: string[] = [];

const makeTempDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'stacktape-helper-lambdas-'));
  tempDirs.push(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('loadHelperLambdaDetailsFromDir', () => {
  test('uses a per-invocation snapshot path for helper lambda artifacts', async () => {
    const sourceDir = await makeTempDir();
    const snapshotDir = join(await makeTempDir(), 'helper-lambdas');
    const oldArtifactPath = join(sourceDir, 'batchJobTriggerLambda-old.zip');
    const newArtifactPath = join(sourceDir, 'batchJobTriggerLambda-new.zip');

    await writeFile(oldArtifactPath, 'old');
    await writeFile(newArtifactPath, 'new');
    await utimes(oldArtifactPath, new Date('2024-01-01'), new Date('2024-01-01'));
    await utimes(newArtifactPath, new Date('2024-01-02'), new Date('2024-01-02'));

    const details = await loadHelperLambdaDetailsFromDir({ helperLambdasDir: sourceDir, snapshotDir });

    expect(details.batchJobTriggerLambda.digest).toBe('new');
    expect(details.batchJobTriggerLambda.artifactPath).toBe(join(snapshotDir, 'batchJobTriggerLambda-new.zip'));

    await rm(sourceDir, { recursive: true, force: true });
    await expect(readFile(details.batchJobTriggerLambda.artifactPath, 'utf8')).resolves.toBe('new');
  });
});
