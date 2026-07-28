import type { SvelteKitWeb, SvelteKitWebProps } from '@stacktape/config/sveltekit-web';

declare global {
type StpSvelteKitWeb = SvelteKitWebProps & {
  name: string;
  type: SvelteKitWeb['type'];
  configParentResourceType: SvelteKitWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
}
