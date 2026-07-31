import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { TanStackWeb, TanStackWebProps } from '@stacktape/config/tanstack-web';

export type StpTanStackWeb = TanStackWebProps & {
  name: string;
  type: TanStackWeb['type'];
  configParentResourceType: TanStackWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
