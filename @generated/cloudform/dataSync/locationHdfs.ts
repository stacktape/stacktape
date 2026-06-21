import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CmkSecretConfig {
  SecretArn?: Value<string>;
  KmsKeyArn?: Value<string>;
  constructor(properties: CmkSecretConfig) {
    Object.assign(this, properties);
  }
}

export class CustomSecretConfig {
  SecretArn!: Value<string>;
  SecretAccessRoleArn!: Value<string>;
  constructor(properties: CustomSecretConfig) {
    Object.assign(this, properties);
  }
}

export class ManagedSecretConfig {
  SecretArn!: Value<string>;
  constructor(properties: ManagedSecretConfig) {
    Object.assign(this, properties);
  }
}

export class NameNode {
  Port!: Value<number>;
  Hostname!: Value<string>;
  constructor(properties: NameNode) {
    Object.assign(this, properties);
  }
}

export class QopConfiguration {
  RpcProtection?: Value<string>;
  DataTransferProtection?: Value<string>;
  constructor(properties: QopConfiguration) {
    Object.assign(this, properties);
  }
}
export interface LocationHDFSProperties {
  KmsKeyProviderUri?: Value<string>;
  QopConfiguration?: QopConfiguration;
  KerberosPrincipal?: Value<string>;
  SimpleUser?: Value<string>;
  ReplicationFactor?: Value<number>;
  KerberosKeytab?: Value<string>;
  NameNodes: List<NameNode>;
  CmkSecretConfig?: CmkSecretConfig;
  Subdirectory?: Value<string>;
  KerberosKrb5Conf?: Value<string>;
  CustomSecretConfig?: CustomSecretConfig;
  BlockSize?: Value<number>;
  Tags?: List<ResourceTag>;
  AgentArns: List<Value<string>>;
  AuthenticationType: Value<string>;
}
export default class LocationHDFS extends ResourceBase<LocationHDFSProperties> {
  static CmkSecretConfig = CmkSecretConfig;
  static CustomSecretConfig = CustomSecretConfig;
  static ManagedSecretConfig = ManagedSecretConfig;
  static NameNode = NameNode;
  static QopConfiguration = QopConfiguration;
  constructor(properties: LocationHDFSProperties) {
    super('AWS::DataSync::LocationHDFS', properties);
  }
}
