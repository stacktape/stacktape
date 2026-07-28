import type { AwsCdkConstruct } from '@stacktape/config/aws-cdk-construct';

declare global {
// `properties` is optional on the authored definition while `entryfilePath` is required inside it, so a flattened
// construct cannot promise the path is there. Consumers guard for it; see `validateAwsCdkConstructProps`.
type StpAwsCdkConstruct = Partial<NonNullable<AwsCdkConstruct['properties']>> & {
  name: string;
  type: AwsCdkConstruct['type'];
  configParentResourceType: AwsCdkConstruct['type'];
  nameChain: string[];
};
}
