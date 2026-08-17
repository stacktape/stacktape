import type {
  DockerBuildOutputArchitecture,
  ResolvedPackageDependency,
  SupportedEsPackageManager
} from '../runtime-contracts';
import type { SplitBundleDependency } from '../split-bundler/types';
import { createHash, type Hash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, readdir, readlink } from 'node:fs/promises';
import { join, relative, resolve as resolvePath } from 'node:path';
import { copy, emptyDir, ensureDir, outputJSON, pathExists, remove, writeFile } from 'fs-extra';
import objectHash from 'object-hash';
import { getFolderSizeBytes } from '../fs/files';
import { getInstallDependenciesCommand, getInstallPackageManagerCommand } from './package-manager-install';

export type RunDocker = (commands: string[]) => Promise<unknown>;

const inProgressBuilds = new Map<string, Promise<string>>();

const transformToUnixPath = (path: string): string => path.replace(/\\/g, '/');

const updateHashPart = (hash: Hash, part: string | Buffer) => {
  const contents = typeof part === 'string' ? Buffer.from(part) : part;
  hash.update(`${contents.byteLength}:`);
  hash.update(contents);
};

const updateHashFile = async (hash: Hash, filePath: string, sizeBytes: number): Promise<void> => {
  hash.update(`${sizeBytes}:`);
  await new Promise<void>((done, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => {
      hash.update(chunk);
    });
    stream.on('error', reject);
    stream.on('end', done);
  });
};

const getLayerContentHash = async (layerPath: string): Promise<string> => {
  const entries: Array<{
    absolutePath: string;
    relativePath: string;
    sizeBytes?: number | undefined;
    type: 'directory' | 'file' | 'other' | 'symlink';
    symlinkTarget?: string | undefined;
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
          entries.push({
            absolutePath,
            relativePath,
            ...(stats.isFile() && { sizeBytes: stats.size }),
            type: stats.isFile() ? 'file' : 'other'
          });
        }
      })
    );
  };

  await collectEntries(layerPath);
  entries.sort((left, right) =>
    left.relativePath < right.relativePath ? -1 : left.relativePath > right.relativePath ? 1 : 0
  );

  const hash = createHash('sha256');
  for (const entry of entries) {
    updateHashPart(hash, entry.type);
    updateHashPart(hash, entry.relativePath);
    if (entry.type === 'file') {
      // oxlint-disable-next-line no-await-in-loop -- Files must enter the shared digest in sorted order without being buffered.
      await updateHashFile(hash, entry.absolutePath, entry.sizeBytes!);
    } else if (entry.type === 'symlink') {
      updateHashPart(hash, entry.symlinkTarget ?? '');
    }
  }
  return hash.digest('hex').slice(0, 12);
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
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  runDocker: RunDocker;
}): Promise<string> => {
  const resolvedInstallationRootPath = resolvePath(installationRootPath);
  const cacheKey = `${resolvedInstallationRootPath}\0${buildIdentity}`;
  while (true) {
    const existingBuild = inProgressBuilds.get(cacheKey);
    if (!existingBuild) {
      break;
    }
    try {
      // oxlint-disable-next-line no-await-in-loop -- Stale cache replacement must compare the same entry after awaiting it.
      const nodeModulesPath = await existingBuild;
      // oxlint-disable-next-line no-await-in-loop -- Reuse is safe only while this cached path still exists.
      if (await pathExists(nodeModulesPath)) {
        return nodeModulesPath;
      }
      if (inProgressBuilds.get(cacheKey) === existingBuild) {
        inProgressBuilds.delete(cacheKey);
        break;
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

const installNativeModules = ({
  dependencies,
  installationRootPath,
  lambdaRuntimeVersion,
  packageManager,
  dockerBuildOutputArchitecture,
  runDocker
}: {
  dependencies: { name: string; version: string }[];
  installationRootPath: string;
  lambdaRuntimeVersion: number;
  packageManager: SupportedEsPackageManager;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  runDocker: RunDocker;
}): Promise<string> => {
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
  return buildNativeModules({
    dependencies,
    buildIdentity,
    installationRootPath,
    lambdaRuntimeVersion,
    packageManager,
    ...(dockerBuildOutputArchitecture && { dockerBuildOutputArchitecture }),
    runDocker
  });
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
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  runDocker: RunDocker;
}) => {
  if (!dependencies.length) {
    return;
  }

  const nodeModulesPath = await installNativeModules({
    dependencies,
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
  layerName = 'layer-native',
  runDocker
}: {
  dependencies: SplitBundleDependency[];
  installationRootPath: string;
  layerBasePath: string;
  lambdaRuntimeVersion: number;
  packageManager: SupportedEsPackageManager;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture | undefined;
  usedByLambdas: string[];
  layerName?: string | undefined;
  runDocker: RunDocker;
}): Promise<NativeBinaryLayerResult | null> => {
  if (!dependencies.length) {
    return null;
  }

  const nodeModulesPath = await installNativeModules({
    dependencies,
    installationRootPath,
    lambdaRuntimeVersion,
    packageManager,
    ...(dockerBuildOutputArchitecture && { dockerBuildOutputArchitecture }),
    runDocker
  });

  const layerPath = join(layerBasePath, layerName);
  const layerNodejsPath = join(layerPath, 'nodejs');
  // The stable layer path is reused by dev/repackage flows. Never merge a new dependency set into the previous one.
  await emptyDir(layerPath);
  await ensureDir(join(layerNodejsPath, 'node_modules'));
  await copy(nodeModulesPath, join(layerNodejsPath, 'node_modules'));
  await outputJSON(join(layerNodejsPath, 'package.json'), { type: 'module' });
  const contentHash = await getLayerContentHash(layerPath);

  return {
    layerPath,
    contentHash,
    sizeBytes: await getFolderSizeBytes(layerPath),
    usedByLambdas,
    dependencies
  };
};
