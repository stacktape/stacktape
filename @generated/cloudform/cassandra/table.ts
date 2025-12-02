import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoScalingSetting {
  MaximumUnits?: Value<number>;
  ScalingPolicy?: ScalingPolicy;
  MinimumUnits?: Value<number>;
  AutoScalingDisabled?: Value<boolean>;
  constructor(properties: AutoScalingSetting) {
    Object.assign(this, properties);
  }
}

export class AutoScalingSpecification {
  ReadCapacityAutoScaling?: AutoScalingSetting;
  WriteCapacityAutoScaling?: AutoScalingSetting;
  constructor(properties: AutoScalingSpecification) {
    Object.assign(this, properties);
  }
}

export class BillingMode {
  Mode!: Value<string>;
  ProvisionedThroughput?: ProvisionedThroughput;
  constructor(properties: BillingMode) {
    Object.assign(this, properties);
  }
}

export class CdcSpecification {
  Status!: Value<string>;
  ViewType?: Value<string>;
  Tags?: List<ResourceTag>;
  constructor(properties: CdcSpecification) {
    Object.assign(this, properties);
  }
}

export class ClusteringKeyColumn {
  OrderBy?: Value<string>;
  Column!: Column;
  constructor(properties: ClusteringKeyColumn) {
    Object.assign(this, properties);
  }
}

export class Column {
  ColumnName!: Value<string>;
  ColumnType!: Value<string>;
  constructor(properties: Column) {
    Object.assign(this, properties);
  }
}

export class EncryptionSpecification {
  EncryptionType!: Value<string>;
  KmsKeyIdentifier?: Value<string>;
  constructor(properties: EncryptionSpecification) {
    Object.assign(this, properties);
  }
}

export class ProvisionedThroughput {
  WriteCapacityUnits!: Value<number>;
  ReadCapacityUnits!: Value<number>;
  constructor(properties: ProvisionedThroughput) {
    Object.assign(this, properties);
  }
}

export class ReplicaSpecification {
  ReadCapacityUnits?: Value<number>;
  Region!: Value<string>;
  ReadCapacityAutoScaling?: AutoScalingSetting;
  constructor(properties: ReplicaSpecification) {
    Object.assign(this, properties);
  }
}

export class ScalingPolicy {
  TargetTrackingScalingPolicyConfiguration?: TargetTrackingScalingPolicyConfiguration;
  constructor(properties: ScalingPolicy) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingScalingPolicyConfiguration {
  ScaleOutCooldown?: Value<number>;
  TargetValue!: Value<number>;
  DisableScaleIn?: Value<boolean>;
  ScaleInCooldown?: Value<number>;
  constructor(properties: TargetTrackingScalingPolicyConfiguration) {
    Object.assign(this, properties);
  }
}
export interface TableProperties {
  ReplicaSpecifications?: List<ReplicaSpecification>;
  ClusteringKeyColumns?: List<ClusteringKeyColumn>;
  KeyspaceName: Value<string>;
  EncryptionSpecification?: EncryptionSpecification;
  TableName?: Value<string>;
  PointInTimeRecoveryEnabled?: Value<boolean>;
  CdcSpecification?: CdcSpecification;
  AutoScalingSpecifications?: AutoScalingSpecification;
  ClientSideTimestampsEnabled?: Value<boolean>;
  PartitionKeyColumns: List<Column>;
  BillingMode?: BillingMode;
  DefaultTimeToLive?: Value<number>;
  RegularColumns?: List<Column>;
  Tags?: List<ResourceTag>;
}
export default class Table extends ResourceBase<TableProperties> {
  static AutoScalingSetting = AutoScalingSetting;
  static AutoScalingSpecification = AutoScalingSpecification;
  static BillingMode = BillingMode;
  static CdcSpecification = CdcSpecification;
  static ClusteringKeyColumn = ClusteringKeyColumn;
  static Column = Column;
  static EncryptionSpecification = EncryptionSpecification;
  static ProvisionedThroughput = ProvisionedThroughput;
  static ReplicaSpecification = ReplicaSpecification;
  static ScalingPolicy = ScalingPolicy;
  static TargetTrackingScalingPolicyConfiguration = TargetTrackingScalingPolicyConfiguration;
  constructor(properties: TableProperties) {
    super('AWS::Cassandra::Table', properties);
  }
}
