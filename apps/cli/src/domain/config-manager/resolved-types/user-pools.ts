import type { UserAuthPool } from '@stacktape/config/user-pools';

export type StpUserAuthPool = UserAuthPool['properties'] & {
  name: string;
  type: UserAuthPool['type'];
  configParentResourceType: UserAuthPool['type'];
  nameChain: string[];
};
export type UserPoolReferencableParam = 'id' | 'clientId' | 'arn' | 'domain' | 'clientSecret' | 'providerUrl';
