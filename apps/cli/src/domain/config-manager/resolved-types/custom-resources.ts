import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { CustomResourceDefinition, CustomResourceInstance } from '@stacktape/config/custom-resources';

export type StpCustomResourceDefinition = CustomResourceDefinition['properties'] & {
  name: string;
  type: CustomResourceDefinition['type'];
  configParentResourceType: CustomResourceDefinition['type'];
  nameChain: string[];
  _nestedResources: {
    backingFunction: StpLambdaFunction;
  };
};
export type StpCustomResource = CustomResourceInstance['properties'] & {
  name: string;
  type: CustomResourceInstance['type'];
  configParentResourceType: CustomResourceInstance['type'];
  nameChain: string[];
};
