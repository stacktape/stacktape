import { join } from 'node:path';
import { fsPaths } from '@shared/naming/fs-paths';
import { execDocker } from '@shared/utils/docker';
import { buildEsBinInstallerDockerfile } from '@shared/utils/dockerfiles';
import { transformToUnixPath } from '@shared/utils/fs-utils';
import { ensureDir, writeFile } from 'fs-extra';
import objectHash from 'object-hash';
import { copyToDeploymentPackage } from './utils';

export const copyDockerInstalledModulesForLambda = async ({
  dependencies,
  invocationId,
  distFolderPath,
  workloadName,
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
  // forceExclude: string[];
  // forceInclude: string[];
}) => {
  if (!Object.keys(dependencies).length) {
    return;
  }
  const installationDirName = 'installation-dir';
  const dockerfileContents = buildEsBinInstallerDockerfile({
    installationDirName,
    packageManager,
    lambdaRuntimeVersion,
    dependencies
  });
  const installationHash = objectHash({ invocationId, dockerfileContents, workloadName });
  const installDirPath = fsPaths.absoluteBinDepsInstallPath({ invocationId, installationHash });
  await ensureDir(installDirPath);
  const nodeModulesPath = join(installDirPath, 'node_modules');
  const dockerfilePath = join(installDirPath, 'Dockerfile');
  await Promise.all([ensureDir(nodeModulesPath), writeFile(dockerfilePath, dockerfileContents)]);
  await execDocker([
    'image',
    'build',
    ...(dockerBuildOutputArchitecture ? ['--platform', dockerBuildOutputArchitecture] : []),
    '--target',
    'artifact',
    '--output',
    `type=local,dest=${transformToUnixPath(distFolderPath)}`,
    installDirPath
  ]);
  // const dependenciesToCopy = getAllDependencies([dependency], dirname(nodeModulesPath));
  // return copyPackages({ dependenciesToCopy, distFolderPath, forceExclude, workingDir, forceInclude });
  return copyToDeploymentPackage({ from: nodeModulesPath, to: distFolderPath });
};
