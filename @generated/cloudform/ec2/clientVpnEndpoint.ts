import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CertificateAuthenticationRequest {
  ClientRootCertificateChainArn!: Value<string>;
  constructor(properties: CertificateAuthenticationRequest) {
    Object.assign(this, properties);
  }
}

export class ClientAuthenticationRequest {
  MutualAuthentication?: CertificateAuthenticationRequest;
  Type!: Value<string>;
  FederatedAuthentication?: FederatedAuthenticationRequest;
  ActiveDirectory?: DirectoryServiceAuthenticationRequest;
  constructor(properties: ClientAuthenticationRequest) {
    Object.assign(this, properties);
  }
}

export class ClientConnectOptions {
  LambdaFunctionArn?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: ClientConnectOptions) {
    Object.assign(this, properties);
  }
}

export class ClientLoginBannerOptions {
  Enabled!: Value<boolean>;
  BannerText?: Value<string>;
  constructor(properties: ClientLoginBannerOptions) {
    Object.assign(this, properties);
  }
}

export class ClientRouteEnforcementOptions {
  Enforced?: Value<boolean>;
  constructor(properties: ClientRouteEnforcementOptions) {
    Object.assign(this, properties);
  }
}

export class ConnectionLogOptions {
  CloudwatchLogStream?: Value<string>;
  Enabled!: Value<boolean>;
  CloudwatchLogGroup?: Value<string>;
  constructor(properties: ConnectionLogOptions) {
    Object.assign(this, properties);
  }
}

export class DirectoryServiceAuthenticationRequest {
  DirectoryId!: Value<string>;
  constructor(properties: DirectoryServiceAuthenticationRequest) {
    Object.assign(this, properties);
  }
}

export class FederatedAuthenticationRequest {
  SelfServiceSAMLProviderArn?: Value<string>;
  SAMLProviderArn!: Value<string>;
  constructor(properties: FederatedAuthenticationRequest) {
    Object.assign(this, properties);
  }
}

export class TagSpecification {
  ResourceType!: Value<string>;
  Tags!: List<ResourceTag>;
  constructor(properties: TagSpecification) {
    Object.assign(this, properties);
  }
}
export interface ClientVpnEndpointProperties {
  ClientCidrBlock?: Value<string>;
  ClientConnectOptions?: ClientConnectOptions;
  Description?: Value<string>;
  ClientRouteEnforcementOptions?: ClientRouteEnforcementOptions;
  TagSpecifications?: List<TagSpecification>;
  AuthenticationOptions: List<ClientAuthenticationRequest>;
  ServerCertificateArn: Value<string>;
  SessionTimeoutHours?: Value<number>;
  DnsServers?: List<Value<string>>;
  SecurityGroupIds?: List<Value<string>>;
  DisconnectOnSessionTimeout?: Value<boolean>;
  ConnectionLogOptions: ConnectionLogOptions;
  SplitTunnel?: Value<boolean>;
  ClientLoginBannerOptions?: ClientLoginBannerOptions;
  VpcId?: Value<string>;
  SelfServicePortal?: Value<string>;
  TransportProtocol?: Value<string>;
  VpnPort?: Value<number>;
}
export default class ClientVpnEndpoint extends ResourceBase<ClientVpnEndpointProperties> {
  static CertificateAuthenticationRequest = CertificateAuthenticationRequest;
  static ClientAuthenticationRequest = ClientAuthenticationRequest;
  static ClientConnectOptions = ClientConnectOptions;
  static ClientLoginBannerOptions = ClientLoginBannerOptions;
  static ClientRouteEnforcementOptions = ClientRouteEnforcementOptions;
  static ConnectionLogOptions = ConnectionLogOptions;
  static DirectoryServiceAuthenticationRequest = DirectoryServiceAuthenticationRequest;
  static FederatedAuthenticationRequest = FederatedAuthenticationRequest;
  static TagSpecification = TagSpecification;
  constructor(properties: ClientVpnEndpointProperties) {
    super('AWS::EC2::ClientVpnEndpoint', properties);
  }
}
