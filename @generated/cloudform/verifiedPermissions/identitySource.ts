import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CognitoGroupConfiguration {
  GroupEntityType!: Value<string>;
  constructor(properties: CognitoGroupConfiguration) {
    Object.assign(this, properties);
  }
}

export class CognitoUserPoolConfiguration {
  UserPoolArn!: Value<string>;
  GroupConfiguration?: CognitoGroupConfiguration;
  ClientIds?: List<Value<string>>;
  constructor(properties: CognitoUserPoolConfiguration) {
    Object.assign(this, properties);
  }
}

export class IdentitySourceConfiguration {
  CognitoUserPoolConfiguration?: CognitoUserPoolConfiguration;
  OpenIdConnectConfiguration?: OpenIdConnectConfiguration;
  constructor(properties: IdentitySourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenIdConnectAccessTokenConfiguration {
  Audiences?: List<Value<string>>;
  PrincipalIdClaim?: Value<string>;
  constructor(properties: OpenIdConnectAccessTokenConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenIdConnectConfiguration {
  Issuer!: Value<string>;
  TokenSelection!: OpenIdConnectTokenSelection;
  GroupConfiguration?: OpenIdConnectGroupConfiguration;
  EntityIdPrefix?: Value<string>;
  constructor(properties: OpenIdConnectConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenIdConnectGroupConfiguration {
  GroupEntityType!: Value<string>;
  GroupClaim!: Value<string>;
  constructor(properties: OpenIdConnectGroupConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenIdConnectIdentityTokenConfiguration {
  ClientIds?: List<Value<string>>;
  PrincipalIdClaim?: Value<string>;
  constructor(properties: OpenIdConnectIdentityTokenConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenIdConnectTokenSelection {
  AccessTokenOnly?: OpenIdConnectAccessTokenConfiguration;
  IdentityTokenOnly?: OpenIdConnectIdentityTokenConfiguration;
  constructor(properties: OpenIdConnectTokenSelection) {
    Object.assign(this, properties);
  }
}
export interface IdentitySourceProperties {
  PrincipalEntityType?: Value<string>;
  Configuration: IdentitySourceConfiguration;
  PolicyStoreId: Value<string>;
}
export default class IdentitySource extends ResourceBase<IdentitySourceProperties> {
  static CognitoGroupConfiguration = CognitoGroupConfiguration;
  static CognitoUserPoolConfiguration = CognitoUserPoolConfiguration;
  static IdentitySourceConfiguration = IdentitySourceConfiguration;
  static OpenIdConnectAccessTokenConfiguration = OpenIdConnectAccessTokenConfiguration;
  static OpenIdConnectConfiguration = OpenIdConnectConfiguration;
  static OpenIdConnectGroupConfiguration = OpenIdConnectGroupConfiguration;
  static OpenIdConnectIdentityTokenConfiguration = OpenIdConnectIdentityTokenConfiguration;
  static OpenIdConnectTokenSelection = OpenIdConnectTokenSelection;
  constructor(properties: IdentitySourceProperties) {
    super('AWS::VerifiedPermissions::IdentitySource', properties);
  }
}
