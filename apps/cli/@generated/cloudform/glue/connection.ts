import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AuthenticationConfigurationInput {
  SecretArn?: Value<string>;
  KmsKeyArn?: Value<string>;
  OAuth2Properties?: OAuth2PropertiesInput;
  CustomAuthenticationCredentials?: { [key: string]: any };
  BasicAuthenticationCredentials?: BasicAuthenticationCredentials;
  AuthenticationType!: Value<string>;
  constructor(properties: AuthenticationConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class AuthorizationCodeProperties {
  AuthorizationCode?: Value<string>;
  RedirectUri?: Value<string>;
  constructor(properties: AuthorizationCodeProperties) {
    Object.assign(this, properties);
  }
}

export class BasicAuthenticationCredentials {
  Username?: Value<string>;
  Password?: Value<string>;
  constructor(properties: BasicAuthenticationCredentials) {
    Object.assign(this, properties);
  }
}

export class ConnectionInput {
  AuthenticationConfiguration?: AuthenticationConfigurationInput;
  PythonProperties?: { [key: string]: any };
  SparkProperties?: { [key: string]: any };
  Description?: Value<string>;
  ConnectionType!: Value<string>;
  MatchCriteria?: List<Value<string>>;
  PhysicalConnectionRequirements?: PhysicalConnectionRequirements;
  ConnectionProperties?: { [key: string]: any };
  AthenaProperties?: { [key: string]: any };
  ValidateForComputeEnvironments?: List<Value<string>>;
  ValidateCredentials?: Value<boolean>;
  Name?: Value<string>;
  constructor(properties: ConnectionInput) {
    Object.assign(this, properties);
  }
}

export class OAuth2ClientApplication {
  AWSManagedClientApplicationReference?: Value<string>;
  UserManagedClientApplicationClientId?: Value<string>;
  constructor(properties: OAuth2ClientApplication) {
    Object.assign(this, properties);
  }
}

export class OAuth2Credentials {
  UserManagedClientApplicationClientSecret?: Value<string>;
  JwtToken?: Value<string>;
  RefreshToken?: Value<string>;
  AccessToken?: Value<string>;
  constructor(properties: OAuth2Credentials) {
    Object.assign(this, properties);
  }
}

export class OAuth2PropertiesInput {
  AuthorizationCodeProperties?: AuthorizationCodeProperties;
  OAuth2ClientApplication?: OAuth2ClientApplication;
  TokenUrl?: Value<string>;
  OAuth2Credentials?: OAuth2Credentials;
  OAuth2GrantType?: Value<string>;
  TokenUrlParametersMap?: { [key: string]: any };
  constructor(properties: OAuth2PropertiesInput) {
    Object.assign(this, properties);
  }
}

export class PhysicalConnectionRequirements {
  AvailabilityZone?: Value<string>;
  SecurityGroupIdList?: List<Value<string>>;
  SubnetId?: Value<string>;
  constructor(properties: PhysicalConnectionRequirements) {
    Object.assign(this, properties);
  }
}
export interface ConnectionProperties {
  ConnectionInput: ConnectionInput;
  CatalogId: Value<string>;
}
export default class Connection extends ResourceBase<ConnectionProperties> {
  static AuthenticationConfigurationInput = AuthenticationConfigurationInput;
  static AuthorizationCodeProperties = AuthorizationCodeProperties;
  static BasicAuthenticationCredentials = BasicAuthenticationCredentials;
  static ConnectionInput = ConnectionInput;
  static OAuth2ClientApplication = OAuth2ClientApplication;
  static OAuth2Credentials = OAuth2Credentials;
  static OAuth2PropertiesInput = OAuth2PropertiesInput;
  static PhysicalConnectionRequirements = PhysicalConnectionRequirements;
  constructor(properties: ConnectionProperties) {
    super('AWS::Glue::Connection', properties);
  }
}
