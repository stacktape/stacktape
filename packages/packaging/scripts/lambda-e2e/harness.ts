import { chmod, cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { PackagingOutput } from '../../src/runtime-contracts';
import { archiveItem, createPackagingError, progressLogger, run, runDocker } from '../e2e-helpers';

export const actions = {
  existingDigests: [],
  dockerBuildOutputArchitecture: 'linux/amd64' as const,
  invocationId: 'language-lambda-e2e',
  progressLogger,
  createPackagingError,
  runDocker,
  archiveItem,
  sizeLimit: 250
};

/** A real ZIP, extracted independently of our archive code, is what the runtime consumes. */
export const extractArtifact = async (output: PackagingOutput, root: string) => {
  if (!output.artifactPath) throw new Error('The buildpack did not produce a Lambda ZIP.');
  const directory = join(root, 'extracted');
  await run('unzip', ['-q', output.artifactPath, '-d', directory]);
  await chmod(root, 0o755);
  await chmod(directory, 0o755);
  return directory;
};

export const withProject = async (language: string, scenario: (root: string, project: string) => Promise<void>) => {
  const root = await mkdtemp(join(tmpdir(), `stacktape-${language}-lambda-`));
  try {
    const project = join(root, 'project');
    await cp(join(import.meta.dir, 'fixtures', language), project, { recursive: true });
    if (language.startsWith('java-')) {
      await cp(join(import.meta.dir, 'fixtures', 'java-shared'), join(project, 'app'), { recursive: true });
    }
    await scenario(root, project);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

export const ensureRuntimeImage = async (image: string) => {
  try {
    await run('docker', ['image', 'inspect', image]);
  } catch {
    await run('docker', ['pull', image]);
  }
};
