import type { TanStackWeb, TanStackWebProps } from '@stacktape/config/tanstack-web';

declare global {
type StpTanStackWeb = TanStackWebProps & {
  name: string;
  type: TanStackWeb['type'];
  configParentResourceType: TanStackWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
}
