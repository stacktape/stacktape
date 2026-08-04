import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { edgeFunctions } from './edge-functions';

export const edgeLambda: ServiceLambdaResolver<StpServiceCustomResourceProperties['edgeLambda']> = async (
  currentProps,
  previousProps,
  operation
) => {
  const { data } = await edgeFunctions([currentProps], previousProps ? [previousProps] : undefined, operation);
  return { data: { versionArn: data[currentProps.resourceName] }, physicalResourceId: currentProps.resourceName };
};
