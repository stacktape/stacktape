import type { Redis } from '@stacktape/config/redis';

export type StpRedis = Redis['properties'] & {
  name: string;
  type: Redis['type'];
  configParentResourceType: Redis['type'];
  nameChain: string[];
};
export type RedisReferencableParam =
  | 'host'
  | 'readerHost'
  | 'port'
  | 'readerPort'
  | 'connectionString'
  | 'readerConnectionString'
  | 'sharding';
