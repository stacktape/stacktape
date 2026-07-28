import type { AstroWeb, AstroWebProps } from '@stacktape/config/astro-web';

declare global {
type StpAstroWeb = AstroWebProps & {
  name: string;
  type: AstroWeb['type'];
  configParentResourceType: AstroWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
}
