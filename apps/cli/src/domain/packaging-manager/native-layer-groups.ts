import type { SplitBundleDependency } from '@stacktape/packaging/split-bundler/types';

export type NativeDependencyLayerGroup = {
  dependencies: SplitBundleDependency[];
  lambdaNames: string[];
};

/**
 * Partitions split Lambdas into layers whose package-name/version requirements are compatible. A single shared layer
 * cannot represent two versions of the same bare Node module because both would occupy the same node_modules path.
 */
export const groupCompatibleNativeDependencies = (
  lambdaDependencies: Array<{ lambdaName: string; dependencies: SplitBundleDependency[] }>
): NativeDependencyLayerGroup[] => {
  const groups: Array<{ dependenciesByName: Map<string, SplitBundleDependency>; lambdaNames: string[] }> = [];

  for (const { lambdaName, dependencies } of lambdaDependencies.toSorted((left, right) =>
    left.lambdaName.localeCompare(right.lambdaName)
  )) {
    const dependenciesByName = new Map<string, SplitBundleDependency>();
    for (const dependency of dependencies) {
      const existing = dependenciesByName.get(dependency.name);
      if (existing && existing.version !== dependency.version) {
        throw new Error(
          `Function ${lambdaName} requires incompatible versions of native dependency ${dependency.name}: ${existing.version} and ${dependency.version}.`
        );
      }
      dependenciesByName.set(dependency.name, dependency);
    }

    let group = groups.find(({ dependenciesByName: groupDependencies }) =>
      Array.from(dependenciesByName).every(
        ([name, dependency]) =>
          !groupDependencies.has(name) || groupDependencies.get(name)?.version === dependency.version
      )
    );
    if (!group) {
      group = { dependenciesByName: new Map(), lambdaNames: [] };
      groups.push(group);
    }
    for (const [name, dependency] of dependenciesByName) {
      group.dependenciesByName.set(name, dependency);
    }
    group.lambdaNames.push(lambdaName);
  }

  return groups.map(({ dependenciesByName, lambdaNames }) => ({
    dependencies: Array.from(dependenciesByName.values()).toSorted((left, right) =>
      left.name.localeCompare(right.name)
    ),
    lambdaNames
  }));
};
