import type { DockerBuildOutputArchitecture, RunDocker } from '../runtime-contracts';
import { ensureDir, remove } from 'fs-extra';
import { createTemporaryBuildFile } from '../fs/temporary-file';
import { transformToUnixPath } from '../fs/files';
import { isAbsolute, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createLanguageBuildContext } from './language-build-context';

/**
 * Runs the Docker `artifact` target used by every non-ECMAScript buildpack.
 *
 * The generated Dockerfile is deliberately unique and is always removed: leaving it in the local exporter destination
 * made Lambda archives contain Stacktape's build instructions and made concurrent builds race on `Dockerfile`.
 */
export const runDockerArtifactBuild = async ({
  dockerfileContents,
  sourcePath,
  distFolderPath,
  dockerBuildOutputArchitecture,
  buildArgs = [],
  runDocker
}: {
  dockerfileContents: string;
  sourcePath: string;
  distFolderPath: string;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  buildArgs?: string[] | undefined;
  runDocker: RunDocker;
}) => {
  const absoluteSourcePath = resolve(sourcePath);
  const absoluteDistFolderPath = resolve(distFolderPath);
  const sourceRelativeToDist = relative(absoluteDistFolderPath, absoluteSourcePath);
  if (sourceRelativeToDist === '' || (!sourceRelativeToDist.startsWith('..') && !isAbsolute(sourceRelativeToDist))) {
    throw new Error(`Artifact output directory must not contain its source directory: ${absoluteDistFolderPath}`);
  }
  // The local Docker exporter does not remove files that disappeared from a later build.
  await remove(absoluteDistFolderPath);
  await ensureDir(absoluteDistFolderPath);
  const { filePath: dockerfilePath } = await createTemporaryBuildFile({
    contents: dockerfileContents,
    directoryPath: tmpdir(),
    prefix: 'stp-artifact-',
    suffix: '.Dockerfile'
  });
  let buildContextPath: string;
  try {
    buildContextPath = await createLanguageBuildContext(absoluteSourcePath);
  } catch (error) {
    await remove(dockerfilePath).catch(() => {});
    throw error;
  }

  let buildResult: { succeeded: true } | { succeeded: false; error: unknown };
  try {
    await runDocker(
      [
        'image',
        'build',
        ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
        ...buildArgs,
        '--target',
        'artifact',
        '--file',
        dockerfilePath,
        '--output',
        `type=local,dest=${transformToUnixPath(absoluteDistFolderPath)}`,
        buildContextPath
      ],
      { cwd: process.cwd() }
    );
    buildResult = { succeeded: true };
  } catch (error) {
    buildResult = { succeeded: false, error };
  }

  try {
    await Promise.all([remove(dockerfilePath), remove(buildContextPath)]);
  } catch (cleanupError) {
    if (buildResult.succeeded) {
      throw cleanupError;
    }
  }
  if ('error' in buildResult) {
    throw buildResult.error;
  }
};
