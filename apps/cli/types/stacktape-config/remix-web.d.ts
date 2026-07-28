type StpRemixWeb = RemixWebProps & {
  name: string;
  type: RemixWeb['type'];
  configParentResourceType: RemixWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
