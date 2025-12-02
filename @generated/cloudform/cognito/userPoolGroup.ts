import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface UserPoolGroupProperties {
  GroupName?: Value<string>;
  Description?: Value<string>;
  UserPoolId: Value<string>;
  Precedence?: Value<number>;
  RoleArn?: Value<string>;
}
export default class UserPoolGroup extends ResourceBase<UserPoolGroupProperties> {
  constructor(properties: UserPoolGroupProperties) {
    super('AWS::Cognito::UserPoolGroup', properties);
  }
}
