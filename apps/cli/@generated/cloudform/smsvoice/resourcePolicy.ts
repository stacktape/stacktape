import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourcePolicyProperties {
  ResourceArn: Value<string>;
  PolicyDocument: { [key: string]: any };
}
export default class ResourcePolicy extends ResourceBase<ResourcePolicyProperties> {
  constructor(properties: ResourcePolicyProperties) {
    super('AWS::SMSVOICE::ResourcePolicy', properties);
  }
}
