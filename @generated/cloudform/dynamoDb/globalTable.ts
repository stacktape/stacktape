import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributeDefinition {
  AttributeType!: Value<string>;
  AttributeName!: Value<string>;
  constructor(properties: AttributeDefinition) {
    Object.assign(this, properties);
  }
}

export class CapacityAutoScalingSettings {
  MinCapacity!: Value<number>;
  SeedCapacity?: Value<number>;
  TargetTrackingScalingPolicyConfiguration!: TargetTrackingScalingPolicyConfiguration;
  MaxCapacity!: Value<number>;
  constructor(properties: CapacityAutoScalingSettings) {
    Object.assign(this, properties);
  }
}

export class ContributorInsightsSpecification {
  Mode?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: ContributorInsightsSpecification) {
    Object.assign(this, properties);
  }
}

export class GlobalSecondaryIndex {
  IndexName!: Value<string>;
  Projection!: Projection;
  KeySchema!: List<KeySchema>;
  WarmThroughput?: WarmThroughput;
  WriteProvisionedThroughputSettings?: WriteProvisionedThroughputSettings;
  WriteOnDemandThroughputSettings?: WriteOnDemandThroughputSettings;
  constructor(properties: GlobalSecondaryIndex) {
    Object.assign(this, properties);
  }
}

export class GlobalTableWitness {
  Region?: Value<string>;
  constructor(properties: GlobalTableWitness) {
    Object.assign(this, properties);
  }
}

export class KeySchema {
  KeyType!: Value<string>;
  AttributeName!: Value<string>;
  constructor(properties: KeySchema) {
    Object.assign(this, properties);
  }
}

export class KinesisStreamSpecification {
  ApproximateCreationDateTimePrecision?: Value<string>;
  StreamArn!: Value<string>;
  constructor(properties: KinesisStreamSpecification) {
    Object.assign(this, properties);
  }
}

export class LocalSecondaryIndex {
  IndexName!: Value<string>;
  Projection!: Projection;
  KeySchema!: List<KeySchema>;
  constructor(properties: LocalSecondaryIndex) {
    Object.assign(this, properties);
  }
}

export class PointInTimeRecoverySpecification {
  PointInTimeRecoveryEnabled?: Value<boolean>;
  RecoveryPeriodInDays?: Value<number>;
  constructor(properties: PointInTimeRecoverySpecification) {
    Object.assign(this, properties);
  }
}

export class Projection {
  ProjectionType?: Value<string>;
  NonKeyAttributes?: List<Value<string>>;
  constructor(properties: Projection) {
    Object.assign(this, properties);
  }
}

export class ReadOnDemandThroughputSettings {
  MaxReadRequestUnits?: Value<number>;
  constructor(properties: ReadOnDemandThroughputSettings) {
    Object.assign(this, properties);
  }
}

export class ReadProvisionedThroughputSettings {
  ReadCapacityUnits?: Value<number>;
  ReadCapacityAutoScalingSettings?: CapacityAutoScalingSettings;
  constructor(properties: ReadProvisionedThroughputSettings) {
    Object.assign(this, properties);
  }
}

export class ReplicaGlobalSecondaryIndexSpecification {
  IndexName!: Value<string>;
  ContributorInsightsSpecification?: ContributorInsightsSpecification;
  ReadProvisionedThroughputSettings?: ReadProvisionedThroughputSettings;
  ReadOnDemandThroughputSettings?: ReadOnDemandThroughputSettings;
  constructor(properties: ReplicaGlobalSecondaryIndexSpecification) {
    Object.assign(this, properties);
  }
}

export class ReplicaSSESpecification {
  KMSMasterKeyId!: Value<string>;
  constructor(properties: ReplicaSSESpecification) {
    Object.assign(this, properties);
  }
}

export class ReplicaSpecification {
  SSESpecification?: ReplicaSSESpecification;
  KinesisStreamSpecification?: KinesisStreamSpecification;
  ContributorInsightsSpecification?: ContributorInsightsSpecification;
  PointInTimeRecoverySpecification?: PointInTimeRecoverySpecification;
  ReplicaStreamSpecification?: ReplicaStreamSpecification;
  GlobalSecondaryIndexes?: List<ReplicaGlobalSecondaryIndexSpecification>;
  Region!: Value<string>;
  ResourcePolicy?: ResourcePolicy;
  ReadProvisionedThroughputSettings?: ReadProvisionedThroughputSettings;
  TableClass?: Value<string>;
  DeletionProtectionEnabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
  ReadOnDemandThroughputSettings?: ReadOnDemandThroughputSettings;
  constructor(properties: ReplicaSpecification) {
    Object.assign(this, properties);
  }
}

export class ReplicaStreamSpecification {
  ResourcePolicy!: ResourcePolicy;
  constructor(properties: ReplicaStreamSpecification) {
    Object.assign(this, properties);
  }
}

export class ResourcePolicy {
  PolicyDocument!: { [key: string]: any };
  constructor(properties: ResourcePolicy) {
    Object.assign(this, properties);
  }
}

export class SSESpecification {
  SSEEnabled!: Value<boolean>;
  SSEType?: Value<string>;
  constructor(properties: SSESpecification) {
    Object.assign(this, properties);
  }
}

export class StreamSpecification {
  StreamViewType!: Value<string>;
  constructor(properties: StreamSpecification) {
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

export class TimeToLiveSpecification {
  Enabled!: Value<boolean>;
  AttributeName?: Value<string>;
  constructor(properties: TimeToLiveSpecification) {
    Object.assign(this, properties);
  }
}

export class WarmThroughput {
  ReadUnitsPerSecond?: Value<number>;
  WriteUnitsPerSecond?: Value<number>;
  constructor(properties: WarmThroughput) {
    Object.assign(this, properties);
  }
}

export class WriteOnDemandThroughputSettings {
  MaxWriteRequestUnits?: Value<number>;
  constructor(properties: WriteOnDemandThroughputSettings) {
    Object.assign(this, properties);
  }
}

export class WriteProvisionedThroughputSettings {
  WriteCapacityAutoScalingSettings?: CapacityAutoScalingSettings;
  constructor(properties: WriteProvisionedThroughputSettings) {
    Object.assign(this, properties);
  }
}
export interface GlobalTableProperties {
  MultiRegionConsistency?: Value<string>;
  SSESpecification?: SSESpecification;
  StreamSpecification?: StreamSpecification;
  WarmThroughput?: WarmThroughput;
  Replicas: List<ReplicaSpecification>;
  WriteProvisionedThroughputSettings?: WriteProvisionedThroughputSettings;
  WriteOnDemandThroughputSettings?: WriteOnDemandThroughputSettings;
  GlobalTableWitnesses?: List<GlobalTableWitness>;
  TableName?: Value<string>;
  AttributeDefinitions: List<AttributeDefinition>;
  BillingMode?: Value<string>;
  GlobalSecondaryIndexes?: List<GlobalSecondaryIndex>;
  KeySchema: List<KeySchema>;
  LocalSecondaryIndexes?: List<LocalSecondaryIndex>;
  TimeToLiveSpecification?: TimeToLiveSpecification;
}
export default class GlobalTable extends ResourceBase<GlobalTableProperties> {
  static AttributeDefinition = AttributeDefinition;
  static CapacityAutoScalingSettings = CapacityAutoScalingSettings;
  static ContributorInsightsSpecification = ContributorInsightsSpecification;
  static GlobalSecondaryIndex = GlobalSecondaryIndex;
  static GlobalTableWitness = GlobalTableWitness;
  static KeySchema = KeySchema;
  static KinesisStreamSpecification = KinesisStreamSpecification;
  static LocalSecondaryIndex = LocalSecondaryIndex;
  static PointInTimeRecoverySpecification = PointInTimeRecoverySpecification;
  static Projection = Projection;
  static ReadOnDemandThroughputSettings = ReadOnDemandThroughputSettings;
  static ReadProvisionedThroughputSettings = ReadProvisionedThroughputSettings;
  static ReplicaGlobalSecondaryIndexSpecification = ReplicaGlobalSecondaryIndexSpecification;
  static ReplicaSSESpecification = ReplicaSSESpecification;
  static ReplicaSpecification = ReplicaSpecification;
  static ReplicaStreamSpecification = ReplicaStreamSpecification;
  static ResourcePolicy = ResourcePolicy;
  static SSESpecification = SSESpecification;
  static StreamSpecification = StreamSpecification;
  static TargetTrackingScalingPolicyConfiguration = TargetTrackingScalingPolicyConfiguration;
  static TimeToLiveSpecification = TimeToLiveSpecification;
  static WarmThroughput = WarmThroughput;
  static WriteOnDemandThroughputSettings = WriteOnDemandThroughputSettings;
  static WriteProvisionedThroughputSettings = WriteProvisionedThroughputSettings;
  constructor(properties: GlobalTableProperties) {
    super('AWS::DynamoDB::GlobalTable', properties);
  }
}
