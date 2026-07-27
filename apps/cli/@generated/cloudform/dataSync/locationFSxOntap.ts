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

export class NFS {
  MountOptions!: NfsMountOptions;
  constructor(properties: NFS) {
    Object.assign(this, properties);
  }
}

export class NfsMountOptions {
  Version?: Value<string>;
  constructor(properties: NfsMountOptions) {
    Object.assign(this, properties);
  }
}

export class Protocol {
  SMB?: SMB;
  NFS?: NFS;
  constructor(properties: Protocol) {
    Object.assign(this, properties);
  }
}

export class SMB {
  ManagedSecretConfig?: ManagedSecretConfig;
  User!: Value<string>;
  CmkSecretConfig?: CmkSecretConfig;
  CustomSecretConfig?: CustomSecretConfig;
  Domain?: Value<string>;
  MountOptions!: SmbMountOptions;
  Password?: Value<string>;
  constructor(properties: SMB) {
    Object.assign(this, properties);
  }
}

export class SmbMountOptions {
  Version?: Value<string>;
  constructor(properties: SmbMountOptions) {
    Object.assign(this, properties);
  }
}
export interface LocationFSxONTAPProperties {
  StorageVirtualMachineArn: Value<string>;
  Subdirectory?: Value<string>;
  Protocol?: Protocol;
  SecurityGroupArns: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class LocationFSxONTAP extends ResourceBase<LocationFSxONTAPProperties> {
  static CmkSecretConfig = CmkSecretConfig;
  static CustomSecretConfig = CustomSecretConfig;
  static ManagedSecretConfig = ManagedSecretConfig;
  static NFS = NFS;
  static NfsMountOptions = NfsMountOptions;
  static Protocol = Protocol;
  static SMB = SMB;
  static SmbMountOptions = SmbMountOptions;
  constructor(properties: LocationFSxONTAPProperties) {
    super('AWS::DataSync::LocationFSxONTAP', properties);
  }
}
