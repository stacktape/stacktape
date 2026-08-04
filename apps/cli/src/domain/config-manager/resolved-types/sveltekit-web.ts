import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { SvelteKitWeb, SvelteKitWebProps } from '@stacktape/config/sveltekit-web';

export type StpSvelteKitWeb = SvelteKitWebProps & {
  name: string;
  type: SvelteKitWeb['type'];
  configParentResourceType: SvelteKitWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
