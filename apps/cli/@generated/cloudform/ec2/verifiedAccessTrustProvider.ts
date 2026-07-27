import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DeviceOptions {
  TenantId?: Value<string>;
  PublicSigningKeyUrl?: Value<string>;
  constructor(properties: DeviceOptions) {
    Object.assign(this, properties);
  }
}

export class NativeApplicationOidcOptions {
  TokenEndpoint?: Value<string>;
  Scope?: Value<string>;
  Issuer?: Value<string>;
  ClientSecret?: Value<string>;
  UserInfoEndpoint?: Value<string>;
  ClientId?: Value<string>;
  AuthorizationEndpoint?: Value<string>;
  PublicSigningKeyEndpoint?: Value<string>;
  constructor(properties: NativeApplicationOidcOptions) {
    Object.assign(this, properties);
  }
}

export class OidcOptions {
  TokenEndpoint?: Value<string>;
  Scope?: Value<string>;
  Issuer?: Value<string>;
  ClientSecret?: Value<string>;
  UserInfoEndpoint?: Value<string>;
  ClientId?: Value<string>;
  AuthorizationEndpoint?: Value<string>;
  constructor(properties: OidcOptions) {
    Object.assign(this, properties);
  }
}

export class SseSpecification {
  CustomerManagedKeyEnabled?: Value<boolean>;
  KmsKeyArn?: Value<string>;
  constructor(properties: SseSpecification) {
    Object.assign(this, properties);
  }
}
export interface VerifiedAccessTrustProviderProperties {
  PolicyReferenceName: Value<string>;
  DeviceOptions?: DeviceOptions;
  NativeApplicationOidcOptions?: NativeApplicationOidcOptions;
  DeviceTrustProviderType?: Value<string>;
  Description?: Value<string>;
  OidcOptions?: OidcOptions;
  TrustProviderType: Value<string>;
  SseSpecification?: SseSpecification;
  UserTrustProviderType?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class VerifiedAccessTrustProvider extends ResourceBase<VerifiedAccessTrustProviderProperties> {
  static DeviceOptions = DeviceOptions;
  static NativeApplicationOidcOptions = NativeApplicationOidcOptions;
  static OidcOptions = OidcOptions;
  static SseSpecification = SseSpecification;
  constructor(properties: VerifiedAccessTrustProviderProperties) {
    super('AWS::EC2::VerifiedAccessTrustProvider', properties);
  }
}
