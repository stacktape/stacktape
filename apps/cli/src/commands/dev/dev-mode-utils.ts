import { globalStateManager } from '@application-services/global-state-manager';

export type DevModeType = 'normal' | 'legacy';

/** Resource types that are emulated locally and should not be deployed to the dev stack (unless dev.remote: true) */
export const LOCAL_EMULATED_RESOURCE_TYPES: StpResourceType[] = [
  'relational-database',
  'redis-cluster',
  'dynamo-db-table',
  'open-search-domain'
];

/** Resource types that run locally (containers, frontends) - entirely skipped in dev stack */
export const LOCALLY_RUN_RESOURCE_TYPES: StpResourceType[] = [
  'web-service',
  'private-service',
  'worker-service',
  'multi-container-workload',
  'hosting-bucket',
  'nextjs-web',
  'astro-web',
  'nuxt-web',
  'sveltekit-web',
  'solidstart-web',
  'tanstack-web',
  'remix-web'
];

/** Check if the current command is 'dev' */
export const isDevCommand = (): boolean => {
  return globalStateManager.command === 'dev';
};

/** Get the current dev mode type (normal or legacy) */
export const getDevModeType = (): DevModeType => {
  return globalStateManager.args.devMode || 'normal';
};

/** Check if running in legacy dev mode */
export const isLegacyDevMode = (): boolean => {
  return isDevCommand() && getDevModeType() === 'legacy';
};

/** Check if running in normal dev mode */
export const isNormalDevMode = (): boolean => {
  return isDevCommand() && getDevModeType() === 'normal';
};

/** Check if a resource type should be completely excluded from the dev stack template */
export const isResourceTypeExcludedInDevMode = (resourceType: StpResourceType): boolean => {
  // In legacy mode, nothing is excluded - we use the existing deployed stack
  if (isLegacyDevMode()) {
    return false;
  }
  return LOCALLY_RUN_RESOURCE_TYPES.includes(resourceType);
};

/** Check if a resource type is locally emulatable (databases, redis, dynamodb) */
export const isResourceTypeLocallyEmulatable = (resourceType: StpResourceType): boolean => {
  return LOCAL_EMULATED_RESOURCE_TYPES.includes(resourceType);
};
