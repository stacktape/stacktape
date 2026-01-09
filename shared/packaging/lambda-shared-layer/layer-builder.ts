import { join, dirname } from 'node:path';
import { outputJSON, remove, ensureDir, copy, outputFile } from 'fs-extra';
import objectHash from 'object-hash';
import { archiveItem } from '@shared/utils/zip';
import { buildDockerImage } from '@shared/utils/docker';
import { getFileSize, getFolder } from '@shared/utils/fs-utils';
import type { DependencyInfo } from './dependency-analyzer';
import execa from 'execa';

export type LayerBuildResult = {
  layerZipPath: string;
  layerHash: string;
  dependencies: { name: string; version: string }[];
  size: number;
};

/**
 * Generate a content-based hash for the layer.
 * This ensures layers are reused when dependencies haven't changed.
 */
export const generateLayerHash = (dependencies: { name: string; version: string }[]): string => {
  const sorted = [...dependencies].sort((a, b) => a.name.localeCompare(b.name));
  return objectHash(sorted).slice(0, 12);
};

/**
 * Get the layer name based on content hash.
 */
export const getLayerName = (stackName: string, hash: string): string => {
  return `${stackName}-shared-deps-${hash}`;
};

/**
 * Create a Dockerfile for building the layer.
 */
const createLayerDockerfile = ({
  nodeVersion,
  packageManager
}: {
  nodeVersion: number;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
}): string => {
  const installCommand = {
    npm: 'npm install --omit=dev --ignore-scripts',
    yarn: 'yarn install --production --ignore-scripts',
    pnpm: 'pnpm install --prod --ignore-scripts',
    bun: 'bun install --production --ignore-scripts'
  }[packageManager];

  // Build lockfile copy commands only for the matching package manager
  const lockfileCopy = {
    npm: 'COPY package-lock.json* ./',
    yarn: 'COPY yarn.lock* ./',
    pnpm: 'COPY pnpm-lock.yaml* ./',
    bun: 'COPY bun.lockb* bun.lock* ./'
  }[packageManager];

  return `FROM public.ecr.aws/docker/library/node:${nodeVersion}-slim

WORKDIR /build

COPY package.json ./
${lockfileCopy}

RUN ${installCommand}

RUN mkdir -p /opt/nodejs && mv node_modules /opt/nodejs/
`;
};

/**
 * Build the shared dependency layer using Docker.
 */
export const buildSharedLayer = async ({
  dependencies,
  cwd,
  distFolderPath,
  nodeVersion,
  packageManager,
  architecture = 'linux/amd64'
}: {
  dependencies: DependencyInfo[];
  cwd: string;
  distFolderPath: string;
  nodeVersion: number;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun';
  architecture?: 'linux/amd64' | 'linux/arm64';
}): Promise<LayerBuildResult> => {
  const layerHash = generateLayerHash(dependencies.map((d) => ({ name: d.name, version: d.version })));
  const layerBuildDir = join(distFolderPath, `layer-build-${layerHash}`);
  const layerOutputDir = join(layerBuildDir, 'output');

  await ensureDir(layerBuildDir);
  await ensureDir(layerOutputDir);

  // Create package.json with only the layer dependencies
  const packageJson = {
    name: 'stacktape-shared-layer',
    version: '1.0.0',
    dependencies: dependencies.reduce(
      (acc, dep) => {
        acc[dep.name] = dep.version;
        return acc;
      },
      {} as Record<string, string>
    )
  };

  await outputJSON(join(layerBuildDir, 'package.json'), packageJson, { spaces: 2 });

  // Create Dockerfile
  const dockerfile = createLayerDockerfile({ nodeVersion, packageManager });
  await outputFile(join(layerBuildDir, 'Dockerfile'), dockerfile);

  // Build Docker image
  const imageName = `stp-layer-builder-${layerHash}`;
  await buildDockerImage({
    imageTag: imageName,
    buildContextPath: layerBuildDir,
    dockerBuildOutputArchitecture: architecture
  });

  // Extract the built layer from Docker using docker cp
  const containerName = `stp-layer-extract-${layerHash}`;

  // Create container (don't start it)
  await execa('docker', ['create', '--name', containerName, imageName]);

  try {
    // Copy the /opt/nodejs directory from container
    await execa('docker', ['cp', `${containerName}:/opt/nodejs`, layerOutputDir]);
  } finally {
    // Remove the container
    await execa('docker', ['rm', containerName]).catch(() => {});
  }

  // Create the layer zip - Lambda expects nodejs/node_modules structure
  const layerZipPath = join(distFolderPath, `layer-${layerHash}.zip`);
  await archiveItem({
    absoluteSourcePath: layerOutputDir,
    absoluteDestDirPath: getFolder(layerZipPath),
    fileNameBase: `layer-${layerHash}`,
    format: 'zip'
  });

  // Get the zip size
  const size = await getFileSize(layerZipPath, 'MB', 2);

  // Cleanup
  await remove(layerBuildDir);

  return {
    layerZipPath,
    layerHash,
    dependencies: dependencies.map((d) => ({ name: d.name, version: d.version })),
    size
  };
};

/**
 * Simple layer builder without Docker (for non-native dependencies).
 * Faster but only works for pure JS dependencies.
 */
export const buildSharedLayerSimple = async ({
  dependencies,
  cwd,
  distFolderPath
}: {
  dependencies: DependencyInfo[];
  cwd: string;
  distFolderPath: string;
}): Promise<LayerBuildResult> => {
  const layerHash = generateLayerHash(dependencies.map((d) => ({ name: d.name, version: d.version })));
  const layerBuildDir = join(distFolderPath, `layer-build-${layerHash}`);
  const nodejsDir = join(layerBuildDir, 'nodejs', 'node_modules');

  await ensureDir(nodejsDir);

  // Copy each dependency from node_modules
  const nodeModulesPath = join(cwd, 'node_modules');
  for (const dep of dependencies) {
    const srcPath = join(nodeModulesPath, dep.name);
    const destPath = join(nodejsDir, dep.name);
    try {
      await copy(srcPath, destPath);

      // Also copy scoped package parent if needed (e.g., @aws-sdk)
      if (dep.name.startsWith('@')) {
        const scopeDir = dep.name.split('/')[0];
        await ensureDir(join(nodejsDir, scopeDir));
      }
    } catch (err) {
      // Skip if dependency not found (might be a transitive dep)
      console.warn(`Warning: Could not copy ${dep.name}: ${(err as Error).message}`);
    }
  }

  // Create the layer zip
  const layerZipPath = join(distFolderPath, `layer-${layerHash}.zip`);
  await archiveItem({
    absoluteSourcePath: layerBuildDir,
    absoluteDestDirPath: getFolder(layerZipPath),
    fileNameBase: `layer-${layerHash}`,
    format: 'zip'
  });

  // Get the zip size
  const size = await getFileSize(layerZipPath, 'MB', 2);

  // Cleanup build dir
  await remove(layerBuildDir);

  return {
    layerZipPath,
    layerHash,
    dependencies: dependencies.map((d) => ({ name: d.name, version: d.version })),
    size
  };
};
