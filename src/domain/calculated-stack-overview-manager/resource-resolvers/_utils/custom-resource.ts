import CustomResource from '@cloudform/cloudFormation/customResource';
import { GetAtt } from '@cloudform/functions';
import { configManager } from '@domain-services/config-manager';

export const getCustomResource = <T>({
  serviceToken,
  properties
}: {
  serviceToken: string | IntrinsicFunction;
  properties: T;
}) => {
  const customResource = new CustomResource({
    ServiceToken: serviceToken
  });

  customResource.Properties = { ...customResource.Properties, ...properties };
  return customResource;
};

export const getStpServiceCustomResource = <T extends keyof StpServiceCustomResourceProperties>(
  properties: Pick<StpServiceCustomResourceProperties, T>
) => {
  return getCustomResource<Pick<StpServiceCustomResourceProperties, T>>({
    serviceToken: GetAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn'),
    properties
  });
};
