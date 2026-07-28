type StpSolidStartWeb = SolidStartWebProps & {
  name: string;
  type: SolidStartWeb['type'];
  configParentResourceType: SolidStartWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
