type StpBatchJob = BatchJob['properties'] & {
  name: string;
  type: BatchJob['type'];
  configParentResourceType: BatchJob['type'];
  nameChain: string[];
  _nestedResources: {
    triggerFunction: StpHelperLambdaFunction;
  };
};
type BatchJobReferencableParam = 'jobDefinitionArn' | 'stateMachineArn' | 'logGroupArn';
