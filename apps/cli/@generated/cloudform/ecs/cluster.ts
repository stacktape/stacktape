import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityProviderStrategyItem {
  CapacityProvider?: Value<string>;
  Weight?: Value<number>;
  Base?: Value<number>;
  constructor(properties: CapacityProviderStrategyItem) {
    Object.assign(this, properties);
  }
}

export class ClusterConfiguration {
  ManagedStorageConfiguration?: ManagedStorageConfiguration;
  ExecuteCommandConfiguration?: ExecuteCommandConfiguration;
  constructor(properties: ClusterConfiguration) {
    Object.assign(this, properties);
  }
}

export class ClusterSettings {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: ClusterSettings) {
    Object.assign(this, properties);
  }
}

export class ExecuteCommandConfiguration {
  Logging?: Value<string>;
  KmsKeyId?: Value<string>;
  LogConfiguration?: ExecuteCommandLogConfiguration;
  constructor(properties: ExecuteCommandConfiguration) {
    Object.assign(this, properties);
  }
}

export class ExecuteCommandLogConfiguration {
  S3EncryptionEnabled?: Value<boolean>;
  CloudWatchEncryptionEnabled?: Value<boolean>;
  CloudWatchLogGroupName?: Value<string>;
  S3KeyPrefix?: Value<string>;
  S3BucketName?: Value<string>;
  constructor(properties: ExecuteCommandLogConfiguration) {
    Object.assign(this, properties);
  }
}

export class ManagedStorageConfiguration {
  FargateEphemeralStorageKmsKeyId?: Value<string>;
  KmsKeyId?: Value<string>;
  constructor(properties: ManagedStorageConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServiceConnectDefaults {
  Namespace?: Value<string>;
  constructor(properties: ServiceConnectDefaults) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  ClusterSettings?: List<ClusterSettings>;
  DefaultCapacityProviderStrategy?: List<CapacityProviderStrategyItem>;
  Configuration?: ClusterConfiguration;
  ServiceConnectDefaults?: ServiceConnectDefaults;
  CapacityProviders?: List<Value<string>>;
  ClusterName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static CapacityProviderStrategyItem = CapacityProviderStrategyItem;
  static ClusterConfiguration = ClusterConfiguration;
  static ClusterSettings = ClusterSettings;
  static ExecuteCommandConfiguration = ExecuteCommandConfiguration;
  static ExecuteCommandLogConfiguration = ExecuteCommandLogConfiguration;
  static ManagedStorageConfiguration = ManagedStorageConfiguration;
  static ServiceConnectDefaults = ServiceConnectDefaults;
  constructor(properties?: ClusterProperties) {
    super('AWS::ECS::Cluster', properties || {});
  }
}
