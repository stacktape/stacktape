import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataCatalogConfig {
  TableName!: Value<string>;
  Database!: Value<string>;
  Catalog!: Value<string>;
  constructor(properties: DataCatalogConfig) {
    Object.assign(this, properties);
  }
}

export class FeatureDefinition {
  FeatureType!: Value<string>;
  FeatureName!: Value<string>;
  constructor(properties: FeatureDefinition) {
    Object.assign(this, properties);
  }
}

export class OfflineStoreConfig {
  DataCatalogConfig?: DataCatalogConfig;
  S3StorageConfig!: S3StorageConfig;
  DisableGlueTableCreation?: Value<boolean>;
  TableFormat?: Value<string>;
  constructor(properties: OfflineStoreConfig) {
    Object.assign(this, properties);
  }
}

export class OnlineStoreConfig {
  EnableOnlineStore?: Value<boolean>;
  StorageType?: Value<string>;
  SecurityConfig?: OnlineStoreSecurityConfig;
  TtlDuration?: TtlDuration;
  constructor(properties: OnlineStoreConfig) {
    Object.assign(this, properties);
  }
}

export class OnlineStoreSecurityConfig {
  KmsKeyId?: Value<string>;
  constructor(properties: OnlineStoreSecurityConfig) {
    Object.assign(this, properties);
  }
}

export class S3StorageConfig {
  KmsKeyId?: Value<string>;
  S3Uri!: Value<string>;
  constructor(properties: S3StorageConfig) {
    Object.assign(this, properties);
  }
}

export class ThroughputConfig {
  ProvisionedReadCapacityUnits?: Value<number>;
  ProvisionedWriteCapacityUnits?: Value<number>;
  ThroughputMode!: Value<string>;
  constructor(properties: ThroughputConfig) {
    Object.assign(this, properties);
  }
}

export class TtlDuration {
  Value?: Value<number>;
  Unit?: Value<string>;
  constructor(properties: TtlDuration) {
    Object.assign(this, properties);
  }
}
export interface FeatureGroupProperties {
  ThroughputConfig?: ThroughputConfig;
  Description?: Value<string>;
  OfflineStoreConfig?: OfflineStoreConfig;
  FeatureDefinitions: List<FeatureDefinition>;
  RecordIdentifierFeatureName: Value<string>;
  EventTimeFeatureName: Value<string>;
  FeatureGroupName: Value<string>;
  OnlineStoreConfig?: OnlineStoreConfig;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class FeatureGroup extends ResourceBase<FeatureGroupProperties> {
  static DataCatalogConfig = DataCatalogConfig;
  static FeatureDefinition = FeatureDefinition;
  static OfflineStoreConfig = OfflineStoreConfig;
  static OnlineStoreConfig = OnlineStoreConfig;
  static OnlineStoreSecurityConfig = OnlineStoreSecurityConfig;
  static S3StorageConfig = S3StorageConfig;
  static ThroughputConfig = ThroughputConfig;
  static TtlDuration = TtlDuration;
  constructor(properties: FeatureGroupProperties) {
    super('AWS::SageMaker::FeatureGroup', properties);
  }
}
