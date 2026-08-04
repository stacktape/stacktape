import { describe, expect, test } from 'bun:test';
import type { ResolvedPackageDependency } from '../../runtime-contracts';
import { createDockerDependencyPlan } from './docker-dependency-plan';

const dependency = (name: string): ResolvedPackageDependency => ({
  dependencyType: 'root',
  name,
  path: `/node_modules/${name}`,
  version: '1.0.0'
});

const createPackagingError = ({ message }: { message: string }) => new Error(message);

describe('createDockerDependencyPlan', () => {
  test('requires a lockfile when only an explicitly included file introduces a Docker dependency', () => {
    expect(() =>
      createDockerDependencyPlan({
        bundledDependencies: [],
        explicitlyIncludedDependencies: [dependency('native-addon')],
        packageManager: null,
        createPackagingError
      })
    ).toThrow('Failed to load dependency lockfile');
  });

  test('does not require or schedule a package-manager install when there are no Docker dependencies', () => {
    expect(
      createDockerDependencyPlan({
        bundledDependencies: [],
        explicitlyIncludedDependencies: [],
        packageManager: null,
        createPackagingError
      })
    ).toBeNull();
  });

  test('merges include-file dependencies before deduplication and marks their origin', () => {
    const plan = createDockerDependencyPlan({
      bundledDependencies: [dependency('bundled-native')],
      explicitlyIncludedDependencies: [dependency('included-native'), dependency('bundled-native')],
      packageManager: 'pnpm',
      createPackagingError
    });

    expect(plan).toEqual({
      dependencies: [
        dependency('bundled-native'),
        { ...dependency('included-native'), note: 'FROM_EXPLICITLY_INCLUDED_FILES' }
      ],
      packageManager: 'pnpm'
    });
  });
});
