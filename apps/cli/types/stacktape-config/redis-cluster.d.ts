import type { RedisCluster } from '@stacktape/config/redis-cluster';

declare global {
type StpRedisCluster = RedisCluster['properties'] & {
  name: string;
  type: RedisCluster['type'];
  configParentResourceType: RedisCluster['type'];
  nameChain: string[];
};
type RedisClusterReferencableParam = 'host' | 'readerHost' | 'port' | 'readerPort' | 'connectionString' | 'sharding';
}
