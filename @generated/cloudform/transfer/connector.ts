import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class As2Config {
  Compression?: Value<string>;
  MessageSubject?: Value<string>;
  BasicAuthSecretId?: Value<string>;
  PartnerProfileId?: Value<string>;
  EncryptionAlgorithm?: Value<string>;
  SigningAlgorithm?: Value<string>;
  LocalProfileId?: Value<string>;
  MdnResponse?: Value<string>;
  MdnSigningAlgorithm?: Value<string>;
  PreserveContentType?: Value<string>;
  constructor(properties: As2Config) {
    Object.assign(this, properties);
  }
}

export class ConnectorEgressConfig {
  VpcLattice!: ConnectorVpcLatticeEgressConfig;
  constructor(properties: ConnectorEgressConfig) {
    Object.assign(this, properties);
  }
}

export class ConnectorVpcLatticeEgressConfig {
  ResourceConfigurationArn!: Value<string>;
  PortNumber?: Value<number>;
  constructor(properties: ConnectorVpcLatticeEgressConfig) {
    Object.assign(this, properties);
  }
}

export class SftpConfig {
  TrustedHostKeys?: List<Value<string>>;
  UserSecretId?: Value<string>;
  MaxConcurrentConnections?: Value<number>;
  constructor(properties: SftpConfig) {
    Object.assign(this, properties);
  }
}
export interface ConnectorProperties {
  As2Config?: As2Config;
  LoggingRole?: Value<string>;
  AccessRole: Value<string>;
  EgressType?: Value<string>;
  EgressConfig?: ConnectorEgressConfig;
  SecurityPolicyName?: Value<string>;
  SftpConfig?: SftpConfig;
  Url?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Connector extends ResourceBase<ConnectorProperties> {
  static As2Config = As2Config;
  static ConnectorEgressConfig = ConnectorEgressConfig;
  static ConnectorVpcLatticeEgressConfig = ConnectorVpcLatticeEgressConfig;
  static SftpConfig = SftpConfig;
  constructor(properties: ConnectorProperties) {
    super('AWS::Transfer::Connector', properties);
  }
}
