import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ApiKeyAuthParameters {
  ApiKeyValue!: Value<string>;
  ApiKeyName!: Value<string>;
  constructor(properties: ApiKeyAuthParameters) {
    Object.assign(this, properties);
  }
}

export class AuthParameters {
  InvocationHttpParameters?: ConnectionHttpParameters;
  ConnectivityParameters?: ConnectivityParameters;
  BasicAuthParameters?: BasicAuthParameters;
  ApiKeyAuthParameters?: ApiKeyAuthParameters;
  OAuthParameters?: OAuthParameters;
  constructor(properties: AuthParameters) {
    Object.assign(this, properties);
  }
}

export class BasicAuthParameters {
  Username!: Value<string>;
  Password!: Value<string>;
  constructor(properties: BasicAuthParameters) {
    Object.assign(this, properties);
  }
}

export class ClientParameters {
  ClientSecret!: Value<string>;
  ClientID!: Value<string>;
  constructor(properties: ClientParameters) {
    Object.assign(this, properties);
  }
}

export class ConnectionHttpParameters {
  HeaderParameters?: List<Parameter>;
  QueryStringParameters?: List<Parameter>;
  BodyParameters?: List<Parameter>;
  constructor(properties: ConnectionHttpParameters) {
    Object.assign(this, properties);
  }
}

export class ConnectivityParameters {
  ResourceParameters!: ResourceParameters;
  constructor(properties: ConnectivityParameters) {
    Object.assign(this, properties);
  }
}

export class InvocationConnectivityParameters {
  ResourceParameters!: ResourceParameters;
  constructor(properties: InvocationConnectivityParameters) {
    Object.assign(this, properties);
  }
}

export class OAuthParameters {
  ClientParameters!: ClientParameters;
  OAuthHttpParameters?: ConnectionHttpParameters;
  AuthorizationEndpoint!: Value<string>;
  HttpMethod!: Value<string>;
  constructor(properties: OAuthParameters) {
    Object.assign(this, properties);
  }
}

export class Parameter {
  Value!: Value<string>;
  IsValueSecret?: Value<boolean>;
  Key!: Value<string>;
  constructor(properties: Parameter) {
    Object.assign(this, properties);
  }
}

export class ResourceParameters {
  ResourceAssociationArn?: Value<string>;
  ResourceConfigurationArn!: Value<string>;
  constructor(properties: ResourceParameters) {
    Object.assign(this, properties);
  }
}
export interface ConnectionProperties {
  AuthParameters?: AuthParameters;
  KmsKeyIdentifier?: Value<string>;
  Description?: Value<string>;
  InvocationConnectivityParameters?: InvocationConnectivityParameters;
  AuthorizationType?: Value<string>;
  Name?: Value<string>;
}
export default class Connection extends ResourceBase<ConnectionProperties> {
  static ApiKeyAuthParameters = ApiKeyAuthParameters;
  static AuthParameters = AuthParameters;
  static BasicAuthParameters = BasicAuthParameters;
  static ClientParameters = ClientParameters;
  static ConnectionHttpParameters = ConnectionHttpParameters;
  static ConnectivityParameters = ConnectivityParameters;
  static InvocationConnectivityParameters = InvocationConnectivityParameters;
  static OAuthParameters = OAuthParameters;
  static Parameter = Parameter;
  static ResourceParameters = ResourceParameters;
  constructor(properties?: ConnectionProperties) {
    super('AWS::Events::Connection', properties || {});
  }
}
