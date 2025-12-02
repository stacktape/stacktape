import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourceDefaultVersionProperties {
  VersionId?: Value<string>;
  TypeName?: Value<string>;
  TypeVersionArn?: Value<string>;
}
export default class ResourceDefaultVersion extends ResourceBase<ResourceDefaultVersionProperties> {
  constructor(properties?: ResourceDefaultVersionProperties) {
    super('AWS::CloudFormation::ResourceDefaultVersion', properties || {});
  }
}
