type StpDeploymentScript = DeploymentScript['properties'] & {
  name: string;
  type: DeploymentScript['type'];
  configParentResourceType: DeploymentScript['type'];
  nameChain: string[];
  _nestedResources: {
    scriptFunction: StpLambdaFunction;
  };
};
