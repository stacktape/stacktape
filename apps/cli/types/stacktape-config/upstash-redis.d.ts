import type { UpstashRedis } from '@stacktape/config/upstash-redis';

declare global {
type StpUpstashRedis = UpstashRedis['properties'] & {
  name: string;
  type: UpstashRedis['type'];
  configParentResourceType: UpstashRedis['type'];
  nameChain: string[];
};
type UpstashRedisReferencableParam =
  | 'host'
  | 'port'
  | 'password'
  | 'restToken'
  | 'readOnlyRestToken'
  | 'restUrl'
  | 'redisUrl';
}
