import type { RedisCluster } from '@stacktape/config/redis-cluster';

export type StpRedisCluster = RedisCluster['properties'] & {
  name: string;
  type: RedisCluster['type'];
  configParentResourceType: RedisCluster['type'];
  nameChain: string[];
};
