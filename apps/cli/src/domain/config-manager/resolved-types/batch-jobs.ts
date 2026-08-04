import type { StpHelperLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { BatchJob } from '@stacktape/config/batch-jobs';

export type StpBatchJob = BatchJob['properties'] & {
  name: string;
  type: BatchJob['type'];
  configParentResourceType: BatchJob['type'];
  nameChain: string[];
  _nestedResources: {
    triggerFunction: StpHelperLambdaFunction;
  };
};
export type BatchJobReferencableParam = 'jobDefinitionArn' | 'stateMachineArn' | 'logGroupArn';
