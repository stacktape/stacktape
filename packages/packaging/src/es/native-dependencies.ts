import type {
  DockerBuildOutputArchitecture,
  ResolvedPackageDependency,
  SupportedEsPackageManager
} from '../runtime-contracts';
import type { SplitBundleDependency } from '../split-bundler/types';
import { join } from 'node:path';
import { copy, ensureDir, outputJSON, writeFile } from 'fs-extra';
import getFolderSize from 'get-folder-size';
import objectHash from 'object-hash';

export type RunDocker = (commands: string[]) => Promise<unknown>;

const inProgressBuilds = new Map<string, Promise<string>>();

const transformToUnixPath = (path: string): string => path.replace(/\\/g, '/');

const getRoundedFolderSizeInBytes = (folderPath: string): Promise<number> =>
  new Promise((resolve, reject) => {
    getFolderSize(folderPath, (error, size) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(Math.round(Number((size / 1024).toFixed(0)) * 1024));
    });
  });

const getInstallDependenciesCommand = ({
  dependencies,
  packageManager
}: {
  dependencies: { name: string; version: string }[];
  packageManager: SupportedEsPackageManager;
}) => {
  if (!dependencies.length) {
    return '';
  }
  const installCommand = packageManager === 'npm' ? 'install --save' : 'add';
  const dependencyList = dependencies.map(({ name, version }) => `${name}@${version}`).join(' ');
  return `RUN ${packageManager} ${installCommand} ${dependencyList}`;
};

const getInstallPackageManagerCommand = (packageManager: SupportedEsPackageManager) => {
  if (packageManager === 'pnpm') {
    return 'RUN npm install -g pnpm\n';
  }
  if (packageManager === 'yarn') {
    return 'RUN command -v yarn >/dev/null 2>&1 || npm install -g yarn\n';
  }
  if (packageManager === 'deno') {
    return 'RUN npm install -g deno\n';
  }
  if (packageManager === 'bun') {
    return 'RUN npm install -g bun\n';
  }
  return '';
};

const buildEsBinInstallerDockerfile = ({
  installationDirName,
  packageManager,
  lambdaRuntimeVersion,
  dependencies
}: {
  installationDirName: string;
  packageManager: SupportedEsPackageManager;
  lambdaRuntimeVersion: number;
  dependencies: { name: string; version: string }[];
}) => {
  const installDependenciesCommand = getInstallDependenciesCommand({ dependencies, packageManager });
  const installPackageManagerCommand = getInstallPackageManagerCommand(packageManager);

  return `FROM public.ecr.aws/sam/build-nodejs${lambdaRuntimeVersion}.x AS build

RUN mkdir /${installationDirName}
WORKDIR /${installationDirName}

${installPackageManagerCommand}${installDependenciesCommand}

FROM scratch AS artifact
COPY --from=build /${installationDirName}/node_modules /node_modules`;
};

const buildNativeModules = async ({
  dependencies,
  installationHash,
  installationRootPath,
  lambdaRuntimeVersion,
  packageManager,
  dockerBuildOutputArchitecture,
  runDocker
}: {
  dependencies: { name: string; version: string }[];
  installationHash: string;
  installationRootPath: string;
  lambdaRuntimeVersion: number;
  packageManager: SupportedEsPackageManager;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
  runDocker: RunDocker;
}): Promise<string> => {
  const existingBuild = inProgressBuilds.get(installationHash);
  if (existingBuild) {
    return existingBuild;
  }

  const buildPromise = (async () => {
    const installDirPath = join(installationRootPath, installationHash);
    const nodeModulesPath = join(installDirPath, 'node_modules');
    await ensureDir(installDirPath);
    await writeFile(
      join(installDirPath, 'Dockerfile'),
      buildEsBinInstallerDockerfile({
        installationDirName: 'installation-dir',
        packageManager,
        lambdaRuntimeVersion,
        dependencies
      })
    );

    await runDocker([
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
  return buildPromise;
};

export const copyDockerInstalledModulesForLambda = async ({
  dependencies,
  installationRootPath,
  distFolderPath,
  lambdaRuntimeVersion,
  packageManager,
  dockerBuildOutputArchitecture,
  runDocker
}: {
  dependencies: ResolvedPackageDependency[];
  installationRootPath: string;
  distFolderPath: string;
  lambdaRuntimeVersion: number;
  packageManager: SupportedEsPackageManager;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
  runDocker: RunDocker;
}) => {
  if (!dependencies.length) {
    return;
  }

  const dockerfileContents = buildEsBinInstallerDockerfile({
    installationDirName: 'installation-dir',
    packageManager,
    lambdaRuntimeVersion,
    dependencies
  });
  const installationHash = objectHash({
    dockerfileContents,
    dockerBuildOutputArchitecture: dockerBuildOutputArchitecture || 'linux/amd64'
  });
  const nodeModulesPath = await buildNativeModules({
    dependencies,
    installationHash,
    installationRootPath,
    lambdaRuntimeVersion,
    packageManager,
    ...(dockerBuildOutputArchitecture && { dockerBuildOutputArchitecture }),
    runDocker
  });

  await copy(nodeModulesPath, join(distFolderPath, 'node_modules'));
};

export type NativeBinaryLayerResult = {
  layerPath: string;
  contentHash: string;
  sizeBytes: number;
  usedByLambdas: string[];
  dependencies: SplitBundleDependency[];
};

export const buildNativeBinaryLayer = async ({
  dependencies,
  installationRootPath,
  layerBasePath,
  lambdaRuntimeVersion,
  packageManager,
  dockerBuildOutputArchitecture,
  usedByLambdas,
  runDocker
}: {
  dependencies: SplitBundleDependency[];
  installationRootPath: string;
  layerBasePath: string;
  lambdaRuntimeVersion: number;
  packageManager: SupportedEsPackageManager;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
  usedByLambdas: string[];
  runDocker: RunDocker;
}): Promise<NativeBinaryLayerResult | null> => {
  if (!dependencies.length) {
    return null;
  }

  const dockerfileContents = buildEsBinInstallerDockerfile({
    installationDirName: 'installation-dir',
    packageManager,
    lambdaRuntimeVersion,
    dependencies
  });
  const contentHash = objectHash({
    dockerfileContents,
    dockerBuildOutputArchitecture: dockerBuildOutputArchitecture || 'linux/amd64'
  }).slice(0, 12);
  const nodeModulesPath = await buildNativeModules({
    dependencies,
    installationHash: contentHash,
    installationRootPath,
    lambdaRuntimeVersion,
    packageManager,
    ...(dockerBuildOutputArchitecture && { dockerBuildOutputArchitecture }),
    runDocker
  });

  const layerPath = join(layerBasePath, 'layer-native');
  const layerNodejsPath = join(layerPath, 'nodejs');
  await ensureDir(join(layerNodejsPath, 'node_modules'));
  await copy(nodeModulesPath, join(layerNodejsPath, 'node_modules'));
  await outputJSON(join(layerNodejsPath, 'package.json'), { type: 'module' });

  return {
    layerPath,
    contentHash,
    sizeBytes: await getRoundedFolderSizeInBytes(layerPath),
    usedByLambdas,
    dependencies
  };
};
