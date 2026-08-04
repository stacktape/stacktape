import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { SolidStartWeb, SolidStartWebProps } from '@stacktape/config/solidstart-web';

export type StpSolidStartWeb = SolidStartWebProps & {
  name: string;
  type: SolidStartWeb['type'];
  configParentResourceType: SolidStartWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
