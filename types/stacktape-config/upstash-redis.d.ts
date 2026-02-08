/**
 * #### Serverless Redis by Upstash — pay-per-request with no idle costs.
 *
 * ---
 *
 * Perfect for Lambda-based apps where a traditional Redis cluster would be wasteful.
 * Accessible over HTTPS (REST API) or standard Redis protocol. Great for caching, sessions, rate limiting.
 */
interface UpstashRedis {
  type: 'upstash-redis';
  properties?: UpstashRedisProps;
  overrides?: ResourceOverrides;
}

type StpUpstashRedis = UpstashRedis['properties'] & {
  name: string;
  type: UpstashRedis['type'];
  configParentResourceType: UpstashRedis['type'];
  nameChain: string[];
};

interface UpstashRedisProps {
  /**
   * #### Auto-remove old keys when memory is full. Prioritizes keys with TTL set. Enable for cache use cases.
   *
   * ---
   *
   * Without eviction, writes fail once the memory limit is reached. Enable this for caching workloads.
   *
   * @default false
   */
  enableEviction?: boolean;
}

type UpstashRedisReferencableParam =
  | 'host'
  | 'port'
  | 'password'
  | 'restToken'
  | 'readOnlyRestToken'
  | 'restUrl'
  | 'redisUrl';
