import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';

/** Resource types that are emulated locally and should not be deployed to the dev stack unless selected as remote. */
const LOCAL_EMULATED_RESOURCE_TYPES: StpResourceType[] = [
  'relational-database',
  'redis-cluster',
  'dynamo-db-table',
  'open-search-domain'
];

/** Costly cloud-only resources excluded from dev stacks unless explicitly marked `dev.remote: true`. */
const REMOTE_ONLY_RESOURCE_TYPES: StpResourceType[] = ['kafka-cluster'];

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

/** Used during config validation as well as synthesis, before the config singleton is published. */
export const shouldDeployResourceInDevMode = (resourceType: StpResourceType, remote: boolean): boolean =>
  !isResourceTypeExcludedInDevMode(resourceType) &&
  (!(isResourceTypeLocallyEmulatable(resourceType) || isResourceTypeRemoteOnlyInDevMode(resourceType)) || remote);

/**
 * The container workloads a dev stack still deploys. A workload follows the resource that owns it: the workload of a
 * web, private or worker service runs locally with its parent, while the workloads Convex synthesizes are deployed
 * with it.
 */
export const selectWorkloadsDeployedInDevMode = <T extends { configParentResourceType: StpResourceType }>(
  workloads: T[]
): T[] =>
  workloads.filter(({ configParentResourceType }) => !isResourceTypeExcludedInDevMode(configParentResourceType));

export type DevDeploymentContext = Readonly<{ command: string; remoteResourceNames: ReadonlySet<string> }>;

export const shouldExcludeResourceInDevMode = (
  name: string,
  type: StpResourceType,
  context: DevDeploymentContext
): boolean => context.command === 'dev' && !shouldDeployResourceInDevMode(type, context.remoteResourceNames.has(name));

export const filterResourcesForDevMode = <T extends { name: string; type: StpResourceType }>(
  resources: T[],
  context: DevDeploymentContext
): T[] =>
  context.command === 'dev'
    ? resources.filter((resource) => !shouldExcludeResourceInDevMode(resource.name, resource.type, context))
    : resources;
