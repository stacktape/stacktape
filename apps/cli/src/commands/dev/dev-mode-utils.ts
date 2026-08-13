import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { globalStateManager } from '@application-services/global-state-manager';

/** Resource types that are emulated locally and should not be deployed to the dev stack unless selected as remote. */
export const LOCAL_EMULATED_RESOURCE_TYPES: StpResourceType[] = [
  'relational-database',
  'redis-cluster',
  'dynamo-db-table',
  'open-search-domain'
];

/** Costly cloud-only resources excluded from dev stacks unless explicitly marked `dev.remote: true`. */
export const REMOTE_ONLY_RESOURCE_TYPES: StpResourceType[] = ['kafka-cluster'];

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

/** Check if a resource type should be completely excluded from the dev stack template */
export const isResourceTypeExcludedInDevMode = (resourceType: StpResourceType): boolean => {
  return LOCALLY_RUN_RESOURCE_TYPES.includes(resourceType);
};

/** Check if a resource type is locally emulatable (databases, redis, dynamodb) */
export const isResourceTypeLocallyEmulatable = (resourceType: StpResourceType): boolean => {
  return LOCAL_EMULATED_RESOURCE_TYPES.includes(resourceType);
};

export const isResourceTypeRemoteOnlyInDevMode = (resourceType: StpResourceType): boolean =>
  REMOTE_ONLY_RESOURCE_TYPES.includes(resourceType);
