import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import {
  isDevCommand,
  isResourceTypeLocallyEmulatable,
  isResourceTypeRemoteOnlyInDevMode,
  shouldDeployResourceInDevMode
} from './dev-mode-utils';
import { getRemoteResourceNames } from './local-resources';

export { isDevCommand };

/**
 * Check if a resource should be excluded from deployment in dev mode.
 *
 * - For locally emulated resources (databases, Redis, DynamoDB):
 *   Excluded by default unless dev.remote: true or --remoteResources flag
 * - For locally run resources (containers, frontends):
 *   Always excluded in dev mode
 *
 * @param resourceName - The name of the resource
 * @param resourceType - The type of the resource
 * @returns true if the resource should be skipped/excluded
 */
export const shouldExcludeResourceInDevMode = (resourceName: string, resourceType: StpResourceType): boolean => {
  if (!isDevCommand()) {
    return false;
  }

  // Check if this is a locally emulated resource type
  if (isResourceTypeLocallyEmulatable(resourceType) || isResourceTypeRemoteOnlyInDevMode(resourceType)) {
    const remoteResourceNames = getRemoteResourceNames();
    // Exclude unless it's marked as remote
    return !shouldDeployResourceInDevMode(resourceType, remoteResourceNames.has(resourceName));
  }

  // Check if this is a locally run resource type (containers, frontends)
  return !shouldDeployResourceInDevMode(resourceType, false);
};

/**
 * Filter an array of resources, excluding those that should not be deployed in dev mode.
 */
export const filterResourcesForDevMode = <T extends { name: string; type: StpResourceType }>(resources: T[]): T[] => {
  if (!isDevCommand()) {
    return resources;
  }
  return resources.filter((resource) => !shouldExcludeResourceInDevMode(resource.name, resource.type));
};
