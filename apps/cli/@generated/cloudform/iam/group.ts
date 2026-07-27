import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Policy {
  PolicyName!: Value<string>;
  PolicyDocument!: { [key: string]: any };
  constructor(properties: Policy) {
    Object.assign(this, properties);
  }
}
export interface GroupProperties {
  GroupName?: Value<string>;
  Path?: Value<string>;
  ManagedPolicyArns?: List<Value<string>>;
  Policies?: List<Policy>;
}
export default class Group extends ResourceBase<GroupProperties> {
  static Policy = Policy;
  constructor(properties?: GroupProperties) {
    super('AWS::IAM::Group', properties || {});
  }
}
