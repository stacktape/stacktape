import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { AstroWeb, AstroWebProps } from '@stacktape/config/astro-web';

export type StpAstroWeb = AstroWebProps & {
  name: string;
  type: AstroWeb['type'];
  configParentResourceType: AstroWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
