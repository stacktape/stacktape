import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { HostingBucket } from '@stacktape/config/hosting-buckets';

export type WriteEnvFilesFormat = 'dotenv';
export type StpHostingBucket = HostingBucket['properties'] & {
  name: string;
  type: HostingBucket['type'];
  configParentResourceType: HostingBucket['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
  };
};
