import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EfsStorageConfiguration {
  MountPoint!: Value<string>;
  FileSystemId!: Value<string>;
  constructor(properties: EfsStorageConfiguration) {
    Object.assign(this, properties);
  }
}

export class FsxStorageConfiguration {
  MountPoint!: Value<string>;
  FileSystemId!: Value<string>;
  constructor(properties: FsxStorageConfiguration) {
    Object.assign(this, properties);
  }
}

export class HighAvailabilityConfig {
  DesiredCapacity!: Value<number>;
  constructor(properties: HighAvailabilityConfig) {
    Object.assign(this, properties);
  }
}

export class StorageConfiguration {
  Efs?: EfsStorageConfiguration;
  Fsx?: FsxStorageConfiguration;
  constructor(properties: StorageConfiguration) {
    Object.assign(this, properties);
  }
}
export interface EnvironmentProperties {
  Description?: Value<string>;
  EngineVersion?: Value<string>;
  KmsKeyId?: Value<string>;
  HighAvailabilityConfig?: HighAvailabilityConfig;
  PreferredMaintenanceWindow?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  Name: Value<string>;
  NetworkType?: Value<string>;
  EngineType: Value<string>;
  PubliclyAccessible?: Value<boolean>;
  InstanceType: Value<string>;
  StorageConfigurations?: List<StorageConfiguration>;
  Tags?: { [key: string]: Value<string> };
}
export default class Environment extends ResourceBase<EnvironmentProperties> {
  static EfsStorageConfiguration = EfsStorageConfiguration;
  static FsxStorageConfiguration = FsxStorageConfiguration;
  static HighAvailabilityConfig = HighAvailabilityConfig;
  static StorageConfiguration = StorageConfiguration;
  constructor(properties: EnvironmentProperties) {
    super('AWS::M2::Environment', properties);
  }
}
