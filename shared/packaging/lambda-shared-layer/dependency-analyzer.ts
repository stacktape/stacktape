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

// Multi-layer optimization types

export type FunctionLayerContext = {
  name: string;
  dependencies: DependencyInfo[];
  availableLayerSlots: number; // 5 - userDefinedLayers.length
};

export type LayerAssignment = {
  layerId: string;
  dependencies: DependencyInfo[];
  functions: string[]; // Functions that get this layer
  estimatedSize: number;
  estimatedSavings: number;
};

export type MultiLayerAnalysisResult = {
  layers: LayerAssignment[];
  functionLayerMap: Map<string, string[]>; // function -> layer IDs
  remainingDeps: Map<string, DependencyInfo[]>; // function -> deps to keep bundled
  totalEstimatedSavings: number;
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

// Per-dependency threshold: must be used by at least 2 functions to be worth including
const MINIMUM_USAGE_COUNT = 2;

// Total layer thresholds (to decide whether to build a layer at all)
const MAX_LAYER_SIZE_BYTES = 100_000_000; // 100MB max layer size (leaving 150MB for function code)
export const MINIMUM_TOTAL_SAVINGS_BYTES = 5_000_000; // 5MB - minimum total savings to justify layer overhead
export const MINIMUM_LAYER_SIZE_BYTES = 2_000_000; // 2MB - minimum layer size to be worth the overhead
export const MINIMUM_FUNCTIONS_FOR_LAYER = 3; // Need at least 3 lambdas to consider shared layers

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
  // Use name as secondary sort key for deterministic ordering
  const sorted = [...candidates].sort((a, b) => {
    const savingsA = a.size * (a.usedBy.length - 1);
    const savingsB = b.size * (b.usedBy.length - 1);
    if (savingsB !== savingsA) return savingsB - savingsA;
    return a.name.localeCompare(b.name);
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

// Minimum savings threshold for creating a layer (2MB)
const MINIMUM_LAYER_SAVINGS_BYTES = 2_000_000;

/**
 * Group dependencies by their exact usage pattern (which functions use them).
 * Returns a map from usage pattern key to list of dependencies.
 */
const groupDepsByUsagePattern = (
  dependencies: DependencyInfo[]
): Map<string, { deps: DependencyInfo[]; functions: string[] }> => {
  const groups = new Map<string, { deps: DependencyInfo[]; functions: string[] }>();

  for (const dep of dependencies) {
    // Create a stable key from sorted function names
    const key = [...dep.usedBy].sort().join(',');
    const existing = groups.get(key);
    if (existing) {
      existing.deps.push(dep);
    } else {
      groups.set(key, { deps: [dep], functions: [...dep.usedBy].sort() });
    }
  }

  return groups;
};

/**
 * Calculate savings for a potential layer.
 * Savings = layerSize * (functionsUsingIt - 1)
 */
const calculateLayerSavings = (deps: DependencyInfo[], functionCount: number): number => {
  const totalSize = deps.reduce((sum, dep) => sum + dep.size, 0);
  return totalSize * (functionCount - 1);
};

/**
 * Check if a layer can be assigned to all target functions without exceeding their slot limits.
 */
const canAssignLayerToFunctions = (
  targetFunctions: string[],
  functionSlots: Map<string, number>
): boolean => {
  return targetFunctions.every((fn) => (functionSlots.get(fn) ?? 0) > 0);
};

/**
 * Analyze optimal layer assignments using a greedy weighted algorithm.
 *
 * Algorithm:
 * 1. Group dependencies by exact usage pattern (same set of functions)
 * 2. Calculate savings for each group
 * 3. Greedily assign groups to layers, respecting per-function slot limits
 * 4. Continue until no more beneficial layers can be created
 */
export const analyzeOptimalLayers = ({
  functionContexts,
  nodeVersion,
  allSameArchitecture = false
}: {
  functionContexts: FunctionLayerContext[];
  nodeVersion: number;
  allSameArchitecture?: boolean;
}): MultiLayerAnalysisResult => {
  // Initialize available slots per function
  const functionSlots = new Map<string, number>();
  for (const ctx of functionContexts) {
    functionSlots.set(ctx.name, ctx.availableLayerSlots);
  }

  // Collect all unique dependencies across functions
  const allDepsMap = new Map<string, DependencyInfo>();
  for (const ctx of functionContexts) {
    for (const dep of ctx.dependencies) {
      const existing = allDepsMap.get(dep.name);
      if (existing) {
        // Merge usedBy lists
        for (const fn of dep.usedBy) {
          if (!existing.usedBy.includes(fn)) {
            existing.usedBy.push(fn);
          }
        }
      } else {
        allDepsMap.set(dep.name, { ...dep, usedBy: [...dep.usedBy] });
      }
    }
  }

  // Filter dependencies that are candidates for shared layers
  const candidates = Array.from(allDepsMap.values()).filter((dep) =>
    shouldIncludeInLayer({
      dep,
      totalFunctions: functionContexts.length,
      nodeVersion,
      allSameArchitecture
    })
  );

  // Group candidates by usage pattern
  const usageGroups = groupDepsByUsagePattern(candidates);

  // Convert to array and sort by savings (descending)
  const sortedGroups = Array.from(usageGroups.entries())
    .map(([key, { deps, functions }]) => ({
      key,
      deps,
      functions,
      size: deps.reduce((sum, dep) => sum + dep.size, 0),
      savings: calculateLayerSavings(deps, functions.length)
    }))
    .filter((group) => group.savings >= MINIMUM_LAYER_SAVINGS_BYTES)
    .sort((a, b) => {
      // Primary sort: savings descending
      if (b.savings !== a.savings) return b.savings - a.savings;
      // Secondary sort: key for deterministic ordering
      return a.key.localeCompare(b.key);
    });

  const layers: LayerAssignment[] = [];
  const assignedDeps = new Set<string>();
  let layerCounter = 0;

  // Greedy layer assignment
  for (const group of sortedGroups) {
    // Skip if any dep in this group is already assigned
    if (group.deps.some((dep) => assignedDeps.has(dep.name))) {
      continue;
    }

    // Check if we can assign a layer to all target functions
    if (!canAssignLayerToFunctions(group.functions, functionSlots)) {
      continue;
    }

    // Create the layer
    const layerId = `shared-layer-${layerCounter++}`;
    layers.push({
      layerId,
      dependencies: group.deps,
      functions: group.functions,
      estimatedSize: group.size,
      estimatedSavings: group.savings
    });

    // Mark deps as assigned
    for (const dep of group.deps) {
      assignedDeps.add(dep.name);
    }

    // Decrement available slots for affected functions
    for (const fn of group.functions) {
      const currentSlots = functionSlots.get(fn) ?? 0;
      functionSlots.set(fn, currentSlots - 1);
    }
  }

  // Build function -> layer IDs map
  const functionLayerMap = new Map<string, string[]>();
  for (const ctx of functionContexts) {
    functionLayerMap.set(ctx.name, []);
  }
  for (const layer of layers) {
    for (const fn of layer.functions) {
      const fnLayers = functionLayerMap.get(fn) ?? [];
      fnLayers.push(layer.layerId);
      functionLayerMap.set(fn, fnLayers);
    }
  }

  // Build remaining deps map (deps that stay bundled per function)
  const remainingDeps = new Map<string, DependencyInfo[]>();
  for (const ctx of functionContexts) {
    const remaining = ctx.dependencies.filter((dep) => !assignedDeps.has(dep.name));
    remainingDeps.set(ctx.name, remaining);
  }

  const totalEstimatedSavings = layers.reduce((sum, layer) => sum + layer.estimatedSavings, 0);

  return {
    layers,
    functionLayerMap,
    remainingDeps,
    totalEstimatedSavings
  };
};
