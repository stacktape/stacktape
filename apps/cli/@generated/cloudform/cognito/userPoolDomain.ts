import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomDomainConfigType {
  CertificateArn?: Value<string>;
  constructor(properties: CustomDomainConfigType) {
    Object.assign(this, properties);
  }
}
export interface UserPoolDomainProperties {
  UserPoolId: Value<string>;
  CustomDomainConfig?: CustomDomainConfigType;
  Domain: Value<string>;
  ManagedLoginVersion?: Value<number>;
}
export default class UserPoolDomain extends ResourceBase<UserPoolDomainProperties> {
  static CustomDomainConfigType = CustomDomainConfigType;
  constructor(properties: UserPoolDomainProperties) {
    super('AWS::Cognito::UserPoolDomain', properties);
  }
}
