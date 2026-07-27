import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AuthPolicyProperties {
  Policy: { [key: string]: any };
  ResourceIdentifier: Value<string>;
}
export default class AuthPolicy extends ResourceBase<AuthPolicyProperties> {
  constructor(properties: AuthPolicyProperties) {
    super('AWS::VpcLattice::AuthPolicy', properties);
  }
}
