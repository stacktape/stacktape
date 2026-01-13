import type { DependencyInfo, LayerAssignment } from './dependency-analyzer';
import { dirname, join } from 'node:path';
import { buildDockerImage } from '@shared/utils/docker';
import { getFileSize, getFolder } from '@shared/utils/fs-utils';
import { archiveItem, createZipFast } from '@shared/utils/zip';
import execa from 'execa';
import { copy, ensureDir, outputFile, outputJSON, pathExists, remove } from 'fs-extra';
import { glob } from 'glob';
import objectHash from 'object-hash';

/**
 * Files and directories to remove from node_modules to reduce layer size.
 * These are typically not needed at runtime.
 */
const PRUNE_PATTERNS = [
  // Documentation and metadata
  '**/*.md',
  '**/*.markdown',
  '**/README*',
  '**/CHANGELOG*',
  '**/HISTORY*',
  '**/LICENSE*',
  '**/LICENCE*',
  '**/NOTICE*',
  '**/AUTHORS*',
  '**/CONTRIBUTORS*',
  '**/.npmignore',
  '**/.gitignore',
  '**/.gitattributes',
  '**/.editorconfig',
  '**/.eslintrc*',
  '**/.prettierrc*',
  '**/tsconfig*.json',
  '**/jsconfig*.json',
  '**/tslint.json',
  '**/.travis.yml',
  '**/.github/**',
  '**/docs/**',
  '**/doc/**',
  '**/documentation/**',

  // Test files
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/spec/**',
  '**/__mocks__/**',
  '**/coverage/**',
  '**/*.test.js',
  '**/*.spec.js',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/*.test.mjs',
  '**/*.spec.mjs',

  // TypeScript source and declarations (we only need JS at runtime)
  '**/*.ts',
  '!**/*.d.ts', // Keep .d.ts files for now (some packages need them)
  '**/src/**/*.ts',

  // Build artifacts and configs
  '**/Makefile',
  '**/Gruntfile.js',
  '**/Gulpfile.js',
  '**/rollup.config.*',
  '**/webpack.config.*',
  '**/babel.config.*',
  '**/.babelrc*',
  '**/jest.config.*',
  '**/karma.conf.*',
  '**/mocha.opts',

  // Examples and extras
  '**/example/**',
  '**/examples/**',
  '**/demo/**',
  '**/sample/**',
  '**/samples/**',

  // Source maps (not needed for production Lambda)
  '**/*.map',
  '**/*.js.map',
  '**/*.mjs.map'
];

/**
 * Remove unnecessary files from node_modules to reduce layer size.
 * This can significantly reduce the final zip size and speed up zipping.
 */
const pruneNodeModules = async (nodeModulesPath: string): Promise<{ prunedCount: number; savedBytes: number }> => {
  let prunedCount = 0;
  let savedBytes = 0;

  // Use glob to find all files matching prune patterns
  const filesToRemove = await glob(PRUNE_PATTERNS, {
    cwd: nodeModulesPath,
    absolute: true,
    nodir: false,
    dot: true
  });

  // Remove files in parallel batches
  const batchSize = 100;
  for (let i = 0; i < filesToRemove.length; i += batchSize) {
    const batch = filesToRemove.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (filePath) => {
        try {
          await remove(filePath);
          prunedCount++;
        } catch {
          // Ignore errors (file may already be deleted or directory)
        }
      })
    );
  }

  return { prunedCount, savedBytes };
};

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
    format: 'zip',
    useNativeZip: true
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
 * Collect all transitive dependencies for a package by reading its package.json.
 * Returns a set of all dependency names (including the package itself).
 */
const collectTransitiveDependencies = async (
  packageName: string,
  nodeModulesPath: string,
  visited: Set<string> = new Set()
): Promise<Set<string>> => {
  if (visited.has(packageName)) {
    return visited;
  }
  visited.add(packageName);

  const packageJsonPath = join(nodeModulesPath, packageName, 'package.json');
  try {
    const { readJson } = await import('fs-extra');
    const packageJson = await readJson(packageJsonPath);
    const deps = {
      ...packageJson.dependencies,
      ...packageJson.optionalDependencies
    };

    for (const depName of Object.keys(deps || {})) {
      await collectTransitiveDependencies(depName, nodeModulesPath, visited);
    }
  } catch {
    // Package doesn't exist or no package.json - skip
  }

  return visited;
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

  // Collect all transitive dependencies
  const nodeModulesPath = join(cwd, 'node_modules');
  const allDepsToInclude = new Set<string>();

  for (const dep of dependencies) {
    await collectTransitiveDependencies(dep.name, nodeModulesPath, allDepsToInclude);
  }

  // Ensure scoped package directories exist first
  const scopeDirs = new Set<string>();
  for (const depName of allDepsToInclude) {
    if (depName.startsWith('@')) {
      scopeDirs.add(depName.split('/')[0]);
    }
  }
  await Promise.all([...scopeDirs].map((scope) => ensureDir(join(nodejsDir, scope))));

  // Copy all dependencies (including transitive) in parallel for speed
  const depsArray = [...allDepsToInclude];
  await Promise.all(
    depsArray.map(async (depName) => {
      const srcPath = join(nodeModulesPath, depName);
      const destPath = join(nodejsDir, depName);
      try {
        await copy(srcPath, destPath);
      } catch {
        // Skip if dependency not found
      }
    })
  );

  // Prune unnecessary files to reduce size and speed up zipping
  await pruneNodeModules(nodejsDir);

  // Create the layer zip using fastest available tool
  const layerZipPath = join(distFolderPath, `layer-${layerHash}.zip`);
  await createZipFast({
    sourceDir: layerBuildDir,
    outputPath: layerZipPath,
    compressionLevel: 1 // Low compression for speed (Lambda layers have 250MB limit)
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

export type MultiLayerBuildResult = Map<string, LayerBuildResult>;

/**
 * Build multiple shared layers in parallel from layer assignments.
 * Returns a map from layerId to build result.
 */
export const buildMultipleLayers = async ({
  layerAssignments,
  cwd,
  distFolderPath,
  nodeVersion,
  packageManager,
  hasNativeDeps = false,
  architecture = 'linux/amd64'
}: {
  layerAssignments: LayerAssignment[];
  cwd: string;
  distFolderPath: string;
  nodeVersion?: number;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  hasNativeDeps?: boolean;
  architecture?: 'linux/amd64' | 'linux/arm64';
}): Promise<MultiLayerBuildResult> => {
  const results = new Map<string, LayerBuildResult>();

  if (layerAssignments.length === 0) {
    return results;
  }

  // Build all layers in parallel
  const buildPromises = layerAssignments.map(async (assignment) => {
    const buildResult = hasNativeDeps && nodeVersion && packageManager
      ? await buildSharedLayer({
          dependencies: assignment.dependencies,
          cwd,
          distFolderPath,
          nodeVersion,
          packageManager,
          architecture
        })
      : await buildSharedLayerSimple({
          dependencies: assignment.dependencies,
          cwd,
          distFolderPath
        });

    return { layerId: assignment.layerId, result: buildResult };
  });

  const buildResults = await Promise.all(buildPromises);

  for (const { layerId, result } of buildResults) {
    results.set(layerId, result);
  }

  return results;
};
