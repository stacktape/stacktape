import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourcePolicyProperties {
  Policy: { [key: string]: any };
  ResourceArn: Value<string>;
}
export default class ResourcePolicy extends ResourceBase<ResourcePolicyProperties> {
  constructor(properties: ResourcePolicyProperties) {
    super('AWS::VpcLattice::ResourcePolicy', properties);
  }
}
