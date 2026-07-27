import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AccessPolicyProperties {
  Policy: Value<string>;
  Type: Value<string>;
  Description?: Value<string>;
  Name: Value<string>;
}
export default class AccessPolicy extends ResourceBase<AccessPolicyProperties> {
  constructor(properties: AccessPolicyProperties) {
    super('AWS::OpenSearchServerless::AccessPolicy', properties);
  }
}
