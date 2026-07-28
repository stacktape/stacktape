import type { HostingBucket } from '@stacktape/config/hosting-buckets';

declare global {
type WriteEnvFilesFormat = 'dotenv';
type StpHostingBucket = HostingBucket['properties'] & {
  name: string;
  type: HostingBucket['type'];
  configParentResourceType: HostingBucket['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
  };
};
}
