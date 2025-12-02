import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ResourceServerScopeType {
  ScopeName!: Value<string>;
  ScopeDescription!: Value<string>;
  constructor(properties: ResourceServerScopeType) {
    Object.assign(this, properties);
  }
}
export interface UserPoolResourceServerProperties {
  UserPoolId: Value<string>;
  Identifier: Value<string>;
  Scopes?: List<ResourceServerScopeType>;
  Name: Value<string>;
}
export default class UserPoolResourceServer extends ResourceBase<UserPoolResourceServerProperties> {
  static ResourceServerScopeType = ResourceServerScopeType;
  constructor(properties: UserPoolResourceServerProperties) {
    super('AWS::Cognito::UserPoolResourceServer', properties);
  }
}
