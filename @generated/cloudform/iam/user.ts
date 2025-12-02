import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LoginProfile {
  PasswordResetRequired?: Value<boolean>;
  Password!: Value<string>;
  constructor(properties: LoginProfile) {
    Object.assign(this, properties);
  }
}

export class Policy {
  PolicyName!: Value<string>;
  PolicyDocument!: { [key: string]: any };
  constructor(properties: Policy) {
    Object.assign(this, properties);
  }
}
export interface UserProperties {
  Path?: Value<string>;
  ManagedPolicyArns?: List<Value<string>>;
  Policies?: List<Policy>;
  UserName?: Value<string>;
  Groups?: List<Value<string>>;
  LoginProfile?: LoginProfile;
  Tags?: List<ResourceTag>;
  PermissionsBoundary?: Value<string>;
}
export default class User extends ResourceBase<UserProperties> {
  static LoginProfile = LoginProfile;
  static Policy = Policy;
  constructor(properties?: UserProperties) {
    super('AWS::IAM::User', properties || {});
  }
}
