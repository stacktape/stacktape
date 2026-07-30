import type {
  CreatePackagingError,
  ResolvedPackageDependency,
  SupportedEsPackageManager
} from '../../runtime-contracts';
import { DEPENDENCIES_TO_IGNORE_FROM_DOCKER_INSTALLATION } from '../../es/config';

export type DockerDependencyPlan = {
  dependencies: ResolvedPackageDependency[];
  packageManager: SupportedEsPackageManager;
};

export const createDockerDependencyPlan = ({
  bundledDependencies,
  explicitlyIncludedDependencies,
  dependenciesToExcludeFromDeploymentPackage,
  packageManager,
  createPackagingError
}: {
  bundledDependencies: ResolvedPackageDependency[];
  explicitlyIncludedDependencies: ResolvedPackageDependency[];
  dependenciesToExcludeFromDeploymentPackage?: string[] | undefined;
  packageManager: SupportedEsPackageManager | null;
  createPackagingError: CreatePackagingError;
}): DockerDependencyPlan | null => {
  const seen = new Set<string>();
  const dependencies = bundledDependencies
    .concat(
      explicitlyIncludedDependencies.map((dependency) => ({
        ...dependency,
        note: 'FROM_EXPLICITLY_INCLUDED_FILES'
      }))
    )
    .filter(({ name }) => {
      if (seen.has(name)) {
        return false;
      }
      seen.add(name);
      return true;
    })
    .filter(({ name }) => !dependenciesToExcludeFromDeploymentPackage?.includes(name))
    .filter(({ name }) => !DEPENDENCIES_TO_IGNORE_FROM_DOCKER_INSTALLATION.includes(name));

  if (!dependencies.length) {
    return null;
  }
  if (!packageManager) {
    throw createPackagingError({
      type: 'PACKAGING',
      message:
        'Failed to load dependency lockfile. You need to install your dependencies first. Supported package managers are npm, yarn, pnpm, Bun and Deno.'
    });
  }
  return { dependencies, packageManager };
};
