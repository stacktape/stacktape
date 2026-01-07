import { join } from 'node:path';
import { fsPaths } from '@shared/naming/fs-paths';
import { execDocker } from '@shared/utils/docker';
import { buildEsBinInstallerDockerfile } from '@shared/utils/dockerfiles';
import { transformToUnixPath } from '@shared/utils/fs-utils';
import { copy, ensureDir, writeFile } from 'fs-extra';
import objectHash from 'object-hash';

// Track in-progress builds to avoid duplicate Docker builds for same dependencies
const inProgressBuilds = new Map<string, Promise<string>>();

export const copyDockerInstalledModulesForLambda = async ({
  dependencies,
  invocationId,
  distFolderPath,
  lambdaRuntimeVersion,
  packageManager,
  dockerBuildOutputArchitecture
}: {
  dependencies: ModuleInfo[];
  invocationId: string;
  distFolderPath: string;
  workloadName: string;
  lambdaRuntimeVersion: number;
  packageManager: SupportedEsPackageManager;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
}) => {
  if (!dependencies.length) {
    return;
  }

  const installationDirName = 'installation-dir';
  const dockerfileContents = buildEsBinInstallerDockerfile({
    installationDirName,
    packageManager,
    lambdaRuntimeVersion,
    dependencies
  });

  // Hash only dependency-related inputs - not workloadName or invocationId
  // This allows reuse across multiple lambdas with same dependencies
  const installationHash = objectHash({
    dockerfileContents,
    dockerBuildOutputArchitecture: dockerBuildOutputArchitecture || 'linux/amd64'
  });

  // Check if another lambda is currently building (or has built) the same dependencies
  const existingBuild = inProgressBuilds.get(installationHash);
  if (existingBuild) {
    const nodeModulesPath = await existingBuild;
    await copy(nodeModulesPath, join(distFolderPath, 'node_modules'));
    return;
  }

  // Start the build and track it
  const installDirPath = fsPaths.absoluteBinDepsInstallPath({ invocationId, installationHash });
  const nodeModulesPath = join(installDirPath, 'node_modules');

  const buildPromise = (async () => {
    await ensureDir(installDirPath);
    const dockerfilePath = join(installDirPath, 'Dockerfile');
    await writeFile(dockerfilePath, dockerfileContents);

    await execDocker([
      'image',
      'build',
      ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
      '--target',
      'artifact',
      '--output',
      `type=local,dest=${transformToUnixPath(installDirPath)}`,
      installDirPath
    ]);

    return nodeModulesPath;
  })();

  inProgressBuilds.set(installationHash, buildPromise);

  // Don't delete from map - keep it so subsequent lambdas can reuse without rebuilding
  const builtNodeModulesPath = await buildPromise;
  await copy(builtNodeModulesPath, join(distFolderPath, 'node_modules'));
};
