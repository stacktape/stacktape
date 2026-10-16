import type { UserAuthPool } from '@stacktape/config/user-pools';

export type StpUserAuthPool = UserAuthPool['properties'] & {
  name: string;
  type: UserAuthPool['type'];
  configParentResourceType: UserAuthPool['type'];
  nameChain: string[];
};
