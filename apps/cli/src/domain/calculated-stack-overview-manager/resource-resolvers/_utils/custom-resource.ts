import type { Intrinsic } from '@stacktape/cloudformation/intrinsics';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt } from '@stacktape/cloudformation/intrinsics';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { configManager } from '@domain-services/config-manager';

export const getCustomResource = <T>({
  serviceToken,
  properties
}: {
  serviceToken: string | Intrinsic;
  properties: T;
}) => {
  const customResource = cfnResource('AWS::CloudFormation::CustomResource', {
    ServiceToken: serviceToken
  });

  customResource.Properties = { ...customResource.Properties, ...properties };
  return customResource;
};

export const getStpServiceCustomResource = <T extends keyof StpServiceCustomResourceProperties>(
  properties: Pick<StpServiceCustomResourceProperties, T>
) => {
  return getCustomResource<Pick<StpServiceCustomResourceProperties, T>>({
    serviceToken: getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
    properties
  });
};
