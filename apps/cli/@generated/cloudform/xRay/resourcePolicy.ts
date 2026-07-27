import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourcePolicyProperties {
  BypassPolicyLockoutCheck?: Value<boolean>;
  PolicyName: Value<string>;
  PolicyDocument: Value<string>;
}
export default class ResourcePolicy extends ResourceBase<ResourcePolicyProperties> {
  constructor(properties: ResourcePolicyProperties) {
    super('AWS::XRay::ResourcePolicy', properties);
  }
}
