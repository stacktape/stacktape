type StpAwsCdkConstruct = AwsCdkConstruct['properties'] & {
  name: string;
  type: AwsCdkConstruct['type'];
  configParentResourceType: AwsCdkConstruct['type'];
  nameChain: string[];
};
