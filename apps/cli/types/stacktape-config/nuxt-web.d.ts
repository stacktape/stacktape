import type { NuxtWeb, NuxtWebProps } from '@stacktape/config/nuxt-web';

declare global {
type StpNuxtWeb = NuxtWebProps & {
  name: string;
  type: NuxtWeb['type'];
  configParentResourceType: NuxtWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
}
