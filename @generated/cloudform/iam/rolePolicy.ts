import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface RolePolicyProperties {
  RoleName: Value<string>;
  PolicyName: Value<string>;
  PolicyDocument?: { [key: string]: any };
}
export default class RolePolicy extends ResourceBase<RolePolicyProperties> {
  constructor(properties: RolePolicyProperties) {
    super('AWS::IAM::RolePolicy', properties);
  }
}
