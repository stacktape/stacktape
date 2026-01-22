import { join } from 'node:path';
import { fsPaths } from '@shared/naming/fs-paths';
import { execDocker } from '@shared/utils/docker';
import { buildEsBinInstallerDockerfile } from '@shared/utils/dockerfiles';
import { getFolderSize, transformToUnixPath } from '@shared/utils/fs-utils';
import { copy, ensureDir, outputJSON, writeFile } from 'fs-extra';
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

/** Result of building native binaries into a layer */
export type NativeBinaryLayerResult = {
  /** Path to the layer directory (contains nodejs/node_modules/) */
  layerPath: string;
  /** Content hash for caching */
  contentHash: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Lambda names that use this layer */
  usedByLambdas: string[];
  /** Dependencies included in the layer */
  dependencies: ModuleInfo[];
};

/**
 * Build native binaries into a shared layer structure.
 *
 * Instead of copying node_modules to each lambda, this creates a layer with:
 * - nodejs/node_modules/... (native binaries)
 * - nodejs/package.json (for ESM support)
 *
 * Lambda runtime mounts layers at /opt, so the path becomes /opt/nodejs/node_modules/
 * which is automatically in the NODE_PATH.
 */
export const buildNativeBinaryLayer = async ({
  dependencies,
  invocationId,
  layerBasePath,
  lambdaRuntimeVersion,
  packageManager,
  dockerBuildOutputArchitecture,
  usedByLambdas
}: {
  dependencies: ModuleInfo[];
  invocationId: string;
  layerBasePath: string;
  lambdaRuntimeVersion: number;
  packageManager: SupportedEsPackageManager;
  dockerBuildOutputArchitecture?: DockerBuildOutputArchitecture;
  usedByLambdas: string[];
}): Promise<NativeBinaryLayerResult | null> => {
  if (!dependencies.length) {
    return null;
  }

  const installationDirName = 'installation-dir';
  const dockerfileContents = buildEsBinInstallerDockerfile({
    installationDirName,
    packageManager,
    lambdaRuntimeVersion,
    dependencies
  });

  // Hash for deduplication and caching
  const contentHash = objectHash({
    dockerfileContents,
    dockerBuildOutputArchitecture: dockerBuildOutputArchitecture || 'linux/amd64'
  }).slice(0, 12);

  // Check if already built
  const existingBuild = inProgressBuilds.get(contentHash);
  let nodeModulesPath: string;

  if (existingBuild) {
    nodeModulesPath = await existingBuild;
  } else {
    // Build via Docker
    const installDirPath = fsPaths.absoluteBinDepsInstallPath({ invocationId, installationHash: contentHash });
    nodeModulesPath = join(installDirPath, 'node_modules');

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

    inProgressBuilds.set(contentHash, buildPromise);
    nodeModulesPath = await buildPromise;
  }

  // Create layer structure: layer-native/nodejs/node_modules/...
  const layerDir = join(layerBasePath, 'layer-native');
  const layerNodejsDir = join(layerDir, 'nodejs');
  const layerNodeModulesDir = join(layerNodejsDir, 'node_modules');

  await ensureDir(layerNodeModulesDir);
  await copy(nodeModulesPath, layerNodeModulesDir);

  // Create package.json for ESM support
  await outputJSON(join(layerNodejsDir, 'package.json'), { type: 'module' });

  // Get layer size (convert KB to bytes)
  const sizeKB = await getFolderSize(layerDir, 'KB', 0);
  const sizeBytes = Math.round(sizeKB * 1024);

  return {
    layerPath: layerDir,
    contentHash,
    sizeBytes,
    usedByLambdas,
    dependencies
  };
};
