import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class APIKeyConnectionMetadata {
  ApiKey!: Value<string>;
  Email?: Value<string>;
  BaseEndpoint!: Value<string>;
  constructor(properties: APIKeyConnectionMetadata) {
    Object.assign(this, properties);
  }
}

export class AuthConfig {
  AuthenticationMetadata!: AuthenticationMetadata;
  AuthenticationType!: Value<string>;
  constructor(properties: AuthConfig) {
    Object.assign(this, properties);
  }
}

export class AuthenticationMetadata {
  BasicAuthConnectionMetadata?: BasicAuthConnectionMetadata;
  IamConnectionMetadata?: IAMConnectionMetadata;
  AuthorizationCodeGrantMetadata?: AuthorizationCodeGrantMetadata;
  ClientCredentialsGrantMetadata?: ClientCredentialsGrantMetadata;
  NoneConnectionMetadata?: NoneConnectionMetadata;
  ApiKeyConnectionMetadata?: APIKeyConnectionMetadata;
  constructor(properties: AuthenticationMetadata) {
    Object.assign(this, properties);
  }
}

export class AuthorizationCodeGrantCredentialsDetails {
  AuthorizationCodeGrantDetails!: AuthorizationCodeGrantDetails;
  constructor(properties: AuthorizationCodeGrantCredentialsDetails) {
    Object.assign(this, properties);
  }
}

export class AuthorizationCodeGrantDetails {
  TokenEndpoint!: Value<string>;
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  AuthorizationEndpoint!: Value<string>;
  constructor(properties: AuthorizationCodeGrantDetails) {
    Object.assign(this, properties);
  }
}

export class AuthorizationCodeGrantMetadata {
  BaseEndpoint!: Value<string>;
  RedirectUrl!: Value<string>;
  AuthorizationCodeGrantCredentialsSource?: Value<string>;
  AuthorizationCodeGrantCredentialsDetails?: AuthorizationCodeGrantCredentialsDetails;
  constructor(properties: AuthorizationCodeGrantMetadata) {
    Object.assign(this, properties);
  }
}

export class BasicAuthConnectionMetadata {
  BaseEndpoint!: Value<string>;
  Username!: Value<string>;
  Password!: Value<string>;
  constructor(properties: BasicAuthConnectionMetadata) {
    Object.assign(this, properties);
  }
}

export class ClientCredentialsDetails {
  ClientCredentialsGrantDetails!: ClientCredentialsGrantDetails;
  constructor(properties: ClientCredentialsDetails) {
    Object.assign(this, properties);
  }
}

export class ClientCredentialsGrantDetails {
  TokenEndpoint!: Value<string>;
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: ClientCredentialsGrantDetails) {
    Object.assign(this, properties);
  }
}

export class ClientCredentialsGrantMetadata {
  BaseEndpoint!: Value<string>;
  ClientCredentialsSource?: Value<string>;
  ClientCredentialsDetails?: ClientCredentialsDetails;
  constructor(properties: ClientCredentialsGrantMetadata) {
    Object.assign(this, properties);
  }
}

export class IAMConnectionMetadata {
  RoleArn!: Value<string>;
  constructor(properties: IAMConnectionMetadata) {
    Object.assign(this, properties);
  }
}

export class NoneConnectionMetadata {
  BaseEndpoint!: Value<string>;
  constructor(properties: NoneConnectionMetadata) {
    Object.assign(this, properties);
  }
}

export class ResourcePermission {
  Actions!: List<Value<string>>;
  Principal!: Value<string>;
  constructor(properties: ResourcePermission) {
    Object.assign(this, properties);
  }
}
export interface ActionConnectorProperties {
  AuthenticationConfig?: AuthConfig;
  Type: Value<string>;
  Description?: Value<string>;
  ActionConnectorId: Value<string>;
  AwsAccountId: Value<string>;
  Permissions?: List<ResourcePermission>;
  VpcConnectionArn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ActionConnector extends ResourceBase<ActionConnectorProperties> {
  static APIKeyConnectionMetadata = APIKeyConnectionMetadata;
  static AuthConfig = AuthConfig;
  static AuthenticationMetadata = AuthenticationMetadata;
  static AuthorizationCodeGrantCredentialsDetails = AuthorizationCodeGrantCredentialsDetails;
  static AuthorizationCodeGrantDetails = AuthorizationCodeGrantDetails;
  static AuthorizationCodeGrantMetadata = AuthorizationCodeGrantMetadata;
  static BasicAuthConnectionMetadata = BasicAuthConnectionMetadata;
  static ClientCredentialsDetails = ClientCredentialsDetails;
  static ClientCredentialsGrantDetails = ClientCredentialsGrantDetails;
  static ClientCredentialsGrantMetadata = ClientCredentialsGrantMetadata;
  static IAMConnectionMetadata = IAMConnectionMetadata;
  static NoneConnectionMetadata = NoneConnectionMetadata;
  static ResourcePermission = ResourcePermission;
  constructor(properties: ActionConnectorProperties) {
    super('AWS::QuickSight::ActionConnector', properties);
  }
}
