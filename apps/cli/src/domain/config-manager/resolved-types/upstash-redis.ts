import type { UpstashRedis } from '@stacktape/config/upstash-redis';

export type StpUpstashRedis = UpstashRedis['properties'] & {
  name: string;
  type: UpstashRedis['type'];
  configParentResourceType: UpstashRedis['type'];
  nameChain: string[];
};
