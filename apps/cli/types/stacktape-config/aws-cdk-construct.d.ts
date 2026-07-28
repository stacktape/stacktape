import type { AwsCdkConstruct } from '@stacktape/config/aws-cdk-construct';

declare global {
type StpAwsCdkConstruct = AwsCdkConstruct['properties'] & {
  name: string;
  type: AwsCdkConstruct['type'];
  configParentResourceType: AwsCdkConstruct['type'];
  nameChain: string[];
};
}
