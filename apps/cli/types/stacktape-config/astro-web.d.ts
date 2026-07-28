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
