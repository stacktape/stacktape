/**
 * Stacks deployed by Stacktape v3 record Redis caches under the former `redis-cluster` type until a v4 deployment
 * rewrites their stack metadata. Commands that read a deployed stack accept both names.
 */
export const isDeployedRedisResourceType = (resourceType: string) =>
  resourceType === 'redis' || resourceType === 'redis-cluster';
