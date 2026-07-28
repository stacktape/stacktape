import type { CustomResourceDefinition, CustomResourceInstance } from '@stacktape/config/custom-resources';

declare global {
type StpCustomResourceDefinition = CustomResourceDefinition['properties'] & {
  name: string;
  type: CustomResourceDefinition['type'];
  configParentResourceType: CustomResourceDefinition['type'];
  nameChain: string[];
  _nestedResources: {
    backingFunction: StpLambdaFunction;
  };
};
type StpCustomResource = CustomResourceInstance['properties'] & {
  name: string;
  type: CustomResourceInstance['type'];
  configParentResourceType: CustomResourceInstance['type'];
  nameChain: string[];
};
}
