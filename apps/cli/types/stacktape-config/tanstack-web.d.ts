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
