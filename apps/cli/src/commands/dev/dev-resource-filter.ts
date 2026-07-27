import {
  isDevCommand,
  isLegacyDevMode,
  isResourceTypeExcludedInDevMode,
  isResourceTypeLocallyEmulatable
} from './dev-mode-utils';
import { getRemoteResourceNames } from './local-resources';

export { isDevCommand, isLegacyDevMode };

/**
 * Check if a resource should be excluded from deployment in dev mode.
 *
 * In legacy mode:
 * - No resources are excluded - we use the existing deployed stack as-is
 *
 * In normal mode:
 * - For locally emulated resources (databases, redis, dynamodb):
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

  // In legacy mode, nothing is excluded - we use the existing deployed stack
  if (isLegacyDevMode()) {
    return false;
  }

  // Check if this is a locally emulated resource type
  if (isResourceTypeLocallyEmulatable(resourceType)) {
    const remoteResourceNames = getRemoteResourceNames();
    // Exclude unless it's marked as remote
    return !remoteResourceNames.has(resourceName);
  }

  // Check if this is a locally run resource type (containers, frontends)
  if (isResourceTypeExcludedInDevMode(resourceType)) {
    // Always exclude these from deployment - they run locally
    return true;
  }

  // Include all other resources (functions, api gateways, etc.)
  return false;
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
