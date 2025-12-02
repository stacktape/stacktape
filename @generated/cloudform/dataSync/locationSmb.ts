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

export class MountOptions {
  Version?: Value<string>;
  constructor(properties: MountOptions) {
    Object.assign(this, properties);
  }
}
export interface LocationSMBProperties {
  KerberosPrincipal?: Value<string>;
  User?: Value<string>;
  KerberosKeytab?: Value<string>;
  CmkSecretConfig?: CmkSecretConfig;
  Subdirectory?: Value<string>;
  ServerHostname?: Value<string>;
  KerberosKrb5Conf?: Value<string>;
  CustomSecretConfig?: CustomSecretConfig;
  Domain?: Value<string>;
  DnsIpAddresses?: List<Value<string>>;
  MountOptions?: MountOptions;
  AgentArns: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Password?: Value<string>;
  AuthenticationType?: Value<string>;
}
export default class LocationSMB extends ResourceBase<LocationSMBProperties> {
  static CmkSecretConfig = CmkSecretConfig;
  static CustomSecretConfig = CustomSecretConfig;
  static ManagedSecretConfig = ManagedSecretConfig;
  static MountOptions = MountOptions;
  constructor(properties: LocationSMBProperties) {
    super('AWS::DataSync::LocationSMB', properties);
  }
}
