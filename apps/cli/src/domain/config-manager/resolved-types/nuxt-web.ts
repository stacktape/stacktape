import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { NuxtWeb, NuxtWebProps } from '@stacktape/config/nuxt-web';

export type StpNuxtWeb = NuxtWebProps & {
  name: string;
  type: NuxtWeb['type'];
  configParentResourceType: NuxtWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
