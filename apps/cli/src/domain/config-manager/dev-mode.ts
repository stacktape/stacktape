import type { DevNetworkPlacement } from '@domain-services/dev-network/placement';
import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';

/** Resource types that are emulated locally and should not be deployed to the dev stack unless selected as remote. */
const LOCAL_EMULATED_RESOURCE_TYPES: StpResourceType[] = [
  'relational-database',
  'redis',
  'dynamo-db-table',
  'open-search-domain'
];

/**
 * Cloud-only resources excluded from dev stacks unless they are remote: Kafka when marked `dev.remote: true` or named
 * in `--remote-resources`, a bastion also whenever a remote database, Redis or OpenSearch domain needs it (see
 * `withBastionsForRemoteResources`). With everything local, a bastion has nothing to reach, and deploying it would
 * keep the stage's own VPC, where VPC functions cannot reach the local databases.
 */
const REMOTE_ONLY_RESOURCE_TYPES: StpResourceType[] = ['kafka-cluster', 'bastion'];

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

/**
 * The remote resources of a dev stack plus its bastions when a remote resource sits in the VPC. Local workloads reach
 * a deployed private database only through a deployed bastion, so naming the database in `--remote-resources` keeps
 * the bastion too.
 */
export const withBastionsForRemoteResources = ({
  remoteResourceNames,
  vpcResourceNames,
  bastionNames
}: {
  remoteResourceNames: ReadonlySet<string>;
  /** Databases, Redis clusters and OpenSearch domains: what a local workload reaches through a bastion. */
  vpcResourceNames: readonly string[];
  bastionNames: readonly string[];
}): Set<string> => {
  const names = new Set(remoteResourceNames);
  if (vpcResourceNames.some((name) => remoteResourceNames.has(name))) {
    for (const name of bastionNames) names.add(name);
  }
  return names;
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

export type DevDeploymentContext = Readonly<{
  command: string;
  remoteResourceNames: ReadonlySet<string>;
  devNetwork?: DevNetworkPlacement;
}>;

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

/**
 * A dev stack keeps each JS function's source maps in its package, so `--enable-source-maps` applies and stack traces
 * in dev logs point at the source instead of the bundle. The cold-start cost of reading the maps does not matter in a
 * dev stack. An explicit `keepSourceMapsInPackage` or `disableSourceMaps` still wins.
 */
export const withSourceMapsInPackage = <T extends { type: string; properties?: unknown }>(packaging: T): T => {
  if (packaging?.type !== 'js-bundle') return packaging;
  const properties = (packaging.properties ?? {}) as { disableSourceMaps?: boolean; keepSourceMapsInPackage?: boolean };
  if (properties.disableSourceMaps || properties.keepSourceMapsInPackage !== undefined) return packaging;
  return { ...packaging, properties: { ...properties, keepSourceMapsInPackage: true } };
};
