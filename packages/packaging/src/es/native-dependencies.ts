import type {
  DockerBuildOutputArchitecture,
  ResolvedPackageDependency,
  SupportedEsPackageManager
} from '../runtime-contracts';
import type { SplitBundleDependency } from '../split-bundler/types';
import { createHash, type Hash } from 'node:crypto';
import { lstat, readdir, readFile, readlink } from 'node:fs/promises';
import { join, relative, resolve as resolvePath } from 'node:path';
import { copy, ensureDir, outputJSON, pathExists, remove, writeFile } from 'fs-extra';
import getFolderSize from 'get-folder-size';
import objectHash from 'object-hash';

export type RunDocker = (commands: string[]) => Promise<unknown>;

const inProgressBuilds = new Map<string, Promise<string>>();

const transformToUnixPath = (path: string): string => path.replace(/\\/g, '/');

const updateHashPart = (hash: Hash, part: string | Buffer) => {
  const contents = typeof part === 'string' ? Buffer.from(part) : part;
  hash.update(`${contents.byteLength}:`);
  hash.update(contents);
};

const getLayerContentHash = async (layerPath: string): Promise<string> => {
  const entries: Array<{
    absolutePath: string;
    relativePath: string;
    type: 'directory' | 'file' | 'other' | 'symlink';
    symlinkTarget?: string;
  }> = [];

  const collectEntries = async (directoryPath: string): Promise<void> => {
    await Promise.all(
      (await readdir(directoryPath)).map(async (name) => {
        const absolutePath = join(directoryPath, name);
        const stats = await lstat(absolutePath);
        const relativePath = transformToUnixPath(relative(layerPath, absolutePath));

        if (stats.isSymbolicLink()) {
          entries.push({
            absolutePath,
            relativePath,
            symlinkTarget: await readlink(absolutePath),
            type: 'symlink'
          });
        } else if (stats.isDirectory()) {
          entries.push({ absolutePath, relativePath, type: 'directory' });
          await collectEntries(absolutePath);
        } else {
          entries.push({ absolutePath, relativePath, type: stats.isFile() ? 'file' : 'other' });
        }
      })
    );
  };

  await collectEntries(layerPath);
  entries.sort((left, right) =>
    left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0
  );

  const hash = createHash('sha256');
  const fileContents = new Map(
    await Promise.all(
      entries
        .filter((entry) => entry.type === 'file')
        .map(async (entry) => [entry.relativePath, await readFile(entry.absolutePath)] as const)
    )
  );
  for (const entry of entries) {
    updateHashPart(hash, entry.type);
    updateHashPart(hash, entry.relativePath);
    if (entry.type === 'file') {
      updateHashPart(hash, fileContents.get(entry.relativePath)!);
    } else if (entry.type === 'symlink') {
      updateHashPart(hash, entry.symlinkTarget ?? '');
    }
  }
  return hash.digest('hex').slice(0, 12);
};

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
  buildIdentity,
  installationRootPath,
  lambdaRuntimeVersion,
  packageManager,
  dockerBuildOutputArchitecture,
  runDocker
}: {
  dependencies: { name: string; version: string }[];
  buildIdentity: string;
  installationRootPath: string;
  lambdaRuntimeVersion: number;
  packageManager: SupportedEsPackageManager;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
  runDocker: RunDocker;
}): Promise<string> => {
  const resolvedInstallationRootPath = resolvePath(installationRootPath);
  const cacheKey = `${resolvedInstallationRootPath}\0${buildIdentity}`;
  const existingBuild = inProgressBuilds.get(cacheKey);
  if (existingBuild) {
    try {
      const nodeModulesPath = await existingBuild;
      if (await pathExists(nodeModulesPath)) {
        return nodeModulesPath;
      }
      if (inProgressBuilds.get(cacheKey) === existingBuild) {
        inProgressBuilds.delete(cacheKey);
      }
    } catch (error) {
      if (inProgressBuilds.get(cacheKey) === existingBuild) {
        inProgressBuilds.delete(cacheKey);
      }
      throw error;
    }
  }

  const buildPromise = (async () => {
    const installDirPath = join(resolvedInstallationRootPath, buildIdentity);
    const nodeModulesPath = join(installDirPath, 'node_modules');
    await remove(installDirPath);
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

  inProgressBuilds.set(cacheKey, buildPromise);
  try {
    return await buildPromise;
  } catch (error) {
    if (inProgressBuilds.get(cacheKey) === buildPromise) {
      inProgressBuilds.delete(cacheKey);
    }
    throw error;
  }
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
  const buildIdentity = objectHash({
    dockerfileContents,
    dockerBuildOutputArchitecture: dockerBuildOutputArchitecture || 'linux/amd64'
  });
  const nodeModulesPath = await buildNativeModules({
    dependencies,
    buildIdentity,
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
  const buildIdentity = objectHash({
    dockerfileContents,
    dockerBuildOutputArchitecture: dockerBuildOutputArchitecture || 'linux/amd64'
  });
  const nodeModulesPath = await buildNativeModules({
    dependencies,
    buildIdentity,
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
  const contentHash = await getLayerContentHash(layerPath);

  return {
    layerPath,
    contentHash,
    sizeBytes: await getRoundedFolderSizeInBytes(layerPath),
    usedByLambdas,
    dependencies
  };
};
