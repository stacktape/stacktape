import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface UserPoolIdentityProviderProperties {
  ProviderName: Value<string>;
  UserPoolId: Value<string>;
  AttributeMapping?: { [key: string]: Value<string> };
  ProviderDetails: { [key: string]: Value<string> };
  ProviderType: Value<string>;
  IdpIdentifiers?: List<Value<string>>;
}
export default class UserPoolIdentityProvider extends ResourceBase<UserPoolIdentityProviderProperties> {
  constructor(properties: UserPoolIdentityProviderProperties) {
    super('AWS::Cognito::UserPoolIdentityProvider', properties);
  }
}
