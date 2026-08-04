import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { RemixWeb, RemixWebProps } from '@stacktape/config/remix-web';

export type StpRemixWeb = RemixWebProps & {
  name: string;
  type: RemixWeb['type'];
  configParentResourceType: RemixWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
