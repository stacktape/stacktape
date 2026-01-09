import { join } from 'node:path';
import { readJSON } from 'fs-extra';
import { satisfies } from 'semver';

/**
 * AWS Lambda Node.js runtime bundled packages.
 * These packages are available in the Lambda runtime without bundling.
 * Source: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
 */
const LAMBDA_RUNTIME_PACKAGES: Record<number, Record<string, string>> = {
  // Node.js 18.x runtime
  18: {
    '@aws-sdk/client-s3': '3.400.0',
    '@aws-sdk/client-dynamodb': '3.400.0',
    '@aws-sdk/client-sns': '3.400.0',
    '@aws-sdk/client-sqs': '3.400.0',
    '@aws-sdk/client-lambda': '3.400.0',
    '@aws-sdk/client-sts': '3.400.0',
    '@aws-sdk/client-secrets-manager': '3.400.0',
    '@aws-sdk/client-ssm': '3.400.0',
    '@aws-sdk/lib-dynamodb': '3.400.0',
    '@aws-sdk/util-dynamodb': '3.400.0'
    // Note: Full AWS SDK v3 is available, these are just common ones
  },
  // Node.js 20.x runtime
  20: {
    '@aws-sdk/client-s3': '3.450.0',
    '@aws-sdk/client-dynamodb': '3.450.0',
    '@aws-sdk/client-sns': '3.450.0',
    '@aws-sdk/client-sqs': '3.450.0',
    '@aws-sdk/client-lambda': '3.450.0',
    '@aws-sdk/client-sts': '3.450.0',
    '@aws-sdk/client-secrets-manager': '3.450.0',
    '@aws-sdk/client-ssm': '3.450.0',
    '@aws-sdk/lib-dynamodb': '3.450.0',
    '@aws-sdk/util-dynamodb': '3.450.0'
  },
  // Node.js 22.x runtime
  22: {
    '@aws-sdk/client-s3': '3.500.0',
    '@aws-sdk/client-dynamodb': '3.500.0',
    '@aws-sdk/client-sns': '3.500.0',
    '@aws-sdk/client-sqs': '3.500.0',
    '@aws-sdk/client-lambda': '3.500.0',
    '@aws-sdk/client-sts': '3.500.0',
    '@aws-sdk/client-secrets-manager': '3.500.0',
    '@aws-sdk/client-ssm': '3.500.0',
    '@aws-sdk/lib-dynamodb': '3.500.0',
    '@aws-sdk/util-dynamodb': '3.500.0'
  },
  // Node.js 24.x runtime
  24: {
    '@aws-sdk/client-s3': '3.550.0',
    '@aws-sdk/client-dynamodb': '3.550.0',
    '@aws-sdk/client-sns': '3.550.0',
    '@aws-sdk/client-sqs': '3.550.0',
    '@aws-sdk/client-lambda': '3.550.0',
    '@aws-sdk/client-sts': '3.550.0',
    '@aws-sdk/client-secrets-manager': '3.550.0',
    '@aws-sdk/client-ssm': '3.550.0',
    '@aws-sdk/lib-dynamodb': '3.550.0',
    '@aws-sdk/util-dynamodb': '3.550.0'
  }
};

export type DependencyInfo = {
  name: string;
  version: string;
  versionRange: string; // Original version range from package.json
  size: number;
  isNative: boolean;
  usedBy: string[]; // Function names
};

export type DependencyAnalysisResult = {
  allDependencies: DependencyInfo[];
  sharedDependencies: DependencyInfo[];
  estimatedLayerSize: number;
  estimatedSavings: number;
};

/**
 * Check if a dependency is provided by Lambda runtime and the user's version range accepts it.
 */
export const isProvidedByRuntime = ({
  packageName,
  versionRange,
  nodeVersion
}: {
  packageName: string;
  versionRange: string;
  nodeVersion: number;
}): boolean => {
  const runtimePackages = LAMBDA_RUNTIME_PACKAGES[nodeVersion];
  if (!runtimePackages) return false;

  const runtimeVersion = runtimePackages[packageName];
  if (!runtimeVersion) return false;

  // Check if the user's version range accepts the runtime version
  // For AWS SDK, also check @aws-sdk/* pattern
  try {
    return satisfies(runtimeVersion, versionRange);
  } catch {
    // Invalid semver range, don't skip
    return false;
  }
};

/**
 * Check if a package name matches AWS SDK v3 pattern
 */
export const isAwsSdkV3 = (packageName: string): boolean => {
  return packageName.startsWith('@aws-sdk/') || packageName.startsWith('@smithy/');
};

const MINIMUM_SAVINGS_BYTES = 200_000; // 200KB minimum savings to include in layer
const MINIMUM_USAGE_COUNT = 2; // Must be used by at least 2 functions
const MAX_LAYER_SIZE_BYTES = 40_000_000; // 40MB max layer size (leaving room for function code)

/**
 * Determine if a dependency should be included in the shared layer.
 */
export const shouldIncludeInLayer = ({
  dep,
  totalFunctions,
  nodeVersion,
  allSameArchitecture = false
}: {
  dep: DependencyInfo;
  totalFunctions: number;
  nodeVersion: number;
  allSameArchitecture?: boolean;
}): boolean => {
  // Native deps can only be included if all functions share the same architecture
  // (so we can build the layer once with Docker for that architecture)
  if (dep.isNative && !allSameArchitecture) return false;

  // Must be used by at least 2 functions
  if (dep.usedBy.length < MINIMUM_USAGE_COUNT) return false;

  // Check if Lambda runtime provides this package
  if (isProvidedByRuntime({ packageName: dep.name, versionRange: dep.versionRange, nodeVersion })) {
    return false;
  }

  // Calculate savings: size * (usedBy - 1) since we still need it once in the layer
  const savings = dep.size * (dep.usedBy.length - 1);
  if (savings < MINIMUM_SAVINGS_BYTES) return false;

  return true;
};

/**
 * Select dependencies for the shared layer, respecting size limits.
 * Prioritizes dependencies with highest savings.
 */
export const selectDependenciesForLayer = ({
  candidates,
  maxSize = MAX_LAYER_SIZE_BYTES
}: {
  candidates: DependencyInfo[];
  maxSize?: number;
}): DependencyInfo[] => {
  // Sort by savings (descending) - prioritize deps that save the most
  const sorted = [...candidates].sort((a, b) => {
    const savingsA = a.size * (a.usedBy.length - 1);
    const savingsB = b.size * (b.usedBy.length - 1);
    return savingsB - savingsA;
  });

  let totalSize = 0;
  const selected: DependencyInfo[] = [];

  for (const dep of sorted) {
    if (totalSize + dep.size <= maxSize) {
      selected.push(dep);
      totalSize += dep.size;
    }
  }

  return selected;
};

/**
 * Get installed package size from node_modules in bytes.
 */
export const getPackageSize = async (nodeModulesPath: string, packageName: string): Promise<number> => {
  const { getFolderSize } = await import('@shared/utils/fs-utils');
  const packagePath = join(nodeModulesPath, packageName);
  try {
    // getFolderSize returns KB, convert to bytes
    const sizeKB = await getFolderSize(packagePath, 'KB', 0);
    return sizeKB * 1024;
  } catch {
    return 0;
  }
};

/**
 * Check if package has native binaries.
 */
export const hasNativeBinaries = async (nodeModulesPath: string, packageName: string): Promise<boolean> => {
  const packageJsonPath = join(nodeModulesPath, packageName, 'package.json');
  try {
    const packageJson = await readJSON(packageJsonPath);
    return !!(
      packageJson.gypfile ||
      (packageJson.binary && packageJson.binary.module_path) ||
      packageJson.dependencies?.['node-gyp'] ||
      packageJson.devDependencies?.['node-gyp'] ||
      packageJson.dependencies?.['node-pre-gyp'] ||
      packageJson.devDependencies?.['node-pre-gyp'] ||
      packageJson.dependencies?.['prebuild-install'] ||
      packageJson.devDependencies?.['prebuild-install']
    );
  } catch {
    return false;
  }
};

/**
 * Analyze dependencies across all Lambda functions and determine shared layer contents.
 */
export const analyzeDependencies = async ({
  functions,
  cwd,
  nodeVersion,
  allSameArchitecture = false
}: {
  functions: { name: string; dependencies: { name: string; version: string }[] }[];
  cwd: string;
  nodeVersion: number;
  allSameArchitecture?: boolean;
}): Promise<DependencyAnalysisResult> => {
  const nodeModulesPath = join(cwd, 'node_modules');
  const depMap = new Map<string, DependencyInfo>();

  // Collect dependencies from all functions
  for (const fn of functions) {
    for (const dep of fn.dependencies) {
      const existing = depMap.get(dep.name);
      if (existing) {
        if (!existing.usedBy.includes(fn.name)) {
          existing.usedBy.push(fn.name);
        }
      } else {
        const [size, isNative] = await Promise.all([
          getPackageSize(nodeModulesPath, dep.name),
          hasNativeBinaries(nodeModulesPath, dep.name)
        ]);
        depMap.set(dep.name, {
          name: dep.name,
          version: dep.version,
          versionRange: dep.version, // Will be resolved from package.json
          size,
          isNative,
          usedBy: [fn.name]
        });
      }
    }
  }

  const allDependencies = Array.from(depMap.values());

  // Filter to dependencies that should be in layer
  const candidates = allDependencies.filter((dep) =>
    shouldIncludeInLayer({ dep, totalFunctions: functions.length, nodeVersion, allSameArchitecture })
  );

  // Select dependencies respecting size limit
  const sharedDependencies = selectDependenciesForLayer({ candidates });

  const estimatedLayerSize = sharedDependencies.reduce((sum, dep) => sum + dep.size, 0);
  const estimatedSavings = sharedDependencies.reduce((sum, dep) => sum + dep.size * (dep.usedBy.length - 1), 0);

  return {
    allDependencies,
    sharedDependencies,
    estimatedLayerSize,
    estimatedSavings
  };
};

/**
 * Analyze dependencies from project's package.json for shared layer.
 * Assumes all production dependencies could be used by all Lambda functions.
 */
export const analyzeDependenciesFromPackageJson = async ({
  cwd,
  nodeVersion,
  functionCount,
  allSameArchitecture = false
}: {
  cwd: string;
  nodeVersion: number;
  functionCount: number;
  allSameArchitecture?: boolean;
}): Promise<DependencyAnalysisResult> => {
  const packageJsonPath = join(cwd, 'package.json');
  const nodeModulesPath = join(cwd, 'node_modules');

  let packageJson: { dependencies?: Record<string, string> };
  try {
    packageJson = await readJSON(packageJsonPath);
  } catch {
    return {
      allDependencies: [],
      sharedDependencies: [],
      estimatedLayerSize: 0,
      estimatedSavings: 0
    };
  }

  const dependencies = packageJson.dependencies || {};
  const depEntries = Object.entries(dependencies);

  // Analyze each dependency in parallel
  const depInfos = await Promise.all(
    depEntries.map(async ([name, versionRange]) => {
      const [size, isNative] = await Promise.all([
        getPackageSize(nodeModulesPath, name),
        hasNativeBinaries(nodeModulesPath, name)
      ]);

      // Try to get actual installed version from node_modules
      let version = versionRange;
      try {
        const depPackageJson = await readJSON(join(nodeModulesPath, name, 'package.json'));
        version = depPackageJson.version || versionRange;
      } catch {}

      return {
        name,
        version,
        versionRange,
        size,
        isNative,
        usedBy: Array.from({ length: functionCount }, (_, i) => `function-${i}`)
      } as DependencyInfo;
    })
  );

  // Filter out deps with 0 size (not installed)
  const allDependencies = depInfos.filter((dep) => dep.size > 0);

  // Filter to dependencies that should be in layer
  const candidates = allDependencies.filter((dep) =>
    shouldIncludeInLayer({ dep, totalFunctions: functionCount, nodeVersion, allSameArchitecture })
  );

  // Select dependencies respecting size limit
  const sharedDependencies = selectDependenciesForLayer({ candidates });

  const estimatedLayerSize = sharedDependencies.reduce((sum, dep) => sum + dep.size, 0);
  const estimatedSavings = sharedDependencies.reduce((sum, dep) => sum + dep.size * (dep.usedBy.length - 1), 0);

  return {
    allDependencies,
    sharedDependencies,
    estimatedLayerSize,
    estimatedSavings
  };
};
