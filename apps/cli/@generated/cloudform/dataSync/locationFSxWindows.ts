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
export interface LocationFSxWindowsProperties {
  User: Value<string>;
  CmkSecretConfig?: CmkSecretConfig;
  Subdirectory?: Value<string>;
  FsxFilesystemArn?: Value<string>;
  CustomSecretConfig?: CustomSecretConfig;
  Domain?: Value<string>;
  SecurityGroupArns: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Password?: Value<string>;
}
export default class LocationFSxWindows extends ResourceBase<LocationFSxWindowsProperties> {
  static CmkSecretConfig = CmkSecretConfig;
  static CustomSecretConfig = CustomSecretConfig;
  static ManagedSecretConfig = ManagedSecretConfig;
  constructor(properties: LocationFSxWindowsProperties) {
    super('AWS::DataSync::LocationFSxWindows', properties);
  }
}
