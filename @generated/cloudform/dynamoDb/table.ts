import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributeDefinition {
  AttributeType!: Value<string>;
  AttributeName!: Value<string>;
  constructor(properties: AttributeDefinition) {
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

export class Csv {
  Delimiter?: Value<string>;
  HeaderList?: List<Value<string>>;
  constructor(properties: Csv) {
    Object.assign(this, properties);
  }
}

export class GlobalSecondaryIndex {
  IndexName!: Value<string>;
  OnDemandThroughput?: OnDemandThroughput;
  ContributorInsightsSpecification?: ContributorInsightsSpecification;
  Projection!: Projection;
  ProvisionedThroughput?: ProvisionedThroughput;
  KeySchema!: List<KeySchema>;
  WarmThroughput?: WarmThroughput;
  constructor(properties: GlobalSecondaryIndex) {
    Object.assign(this, properties);
  }
}

export class ImportSourceSpecification {
  S3BucketSource!: S3BucketSource;
  InputFormat!: Value<string>;
  InputFormatOptions?: InputFormatOptions;
  InputCompressionType?: Value<string>;
  constructor(properties: ImportSourceSpecification) {
    Object.assign(this, properties);
  }
}

export class InputFormatOptions {
  Csv?: Csv;
  constructor(properties: InputFormatOptions) {
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

export class OnDemandThroughput {
  MaxReadRequestUnits?: Value<number>;
  MaxWriteRequestUnits?: Value<number>;
  constructor(properties: OnDemandThroughput) {
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
  NonKeyAttributes?: List<Value<string>>;
  ProjectionType?: Value<string>;
  constructor(properties: Projection) {
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

export class ResourcePolicy {
  PolicyDocument!: { [key: string]: any };
  constructor(properties: ResourcePolicy) {
    Object.assign(this, properties);
  }
}

export class S3BucketSource {
  S3Bucket!: Value<string>;
  S3KeyPrefix?: Value<string>;
  S3BucketOwner?: Value<string>;
  constructor(properties: S3BucketSource) {
    Object.assign(this, properties);
  }
}

export class SSESpecification {
  SSEEnabled!: Value<boolean>;
  SSEType?: Value<string>;
  KMSMasterKeyId?: Value<string>;
  constructor(properties: SSESpecification) {
    Object.assign(this, properties);
  }
}

export class StreamSpecification {
  StreamViewType!: Value<string>;
  ResourcePolicy?: ResourcePolicy;
  constructor(properties: StreamSpecification) {
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
export interface TableProperties {
  OnDemandThroughput?: OnDemandThroughput;
  SSESpecification?: SSESpecification;
  KinesisStreamSpecification?: KinesisStreamSpecification;
  StreamSpecification?: StreamSpecification;
  ContributorInsightsSpecification?: ContributorInsightsSpecification;
  ImportSourceSpecification?: ImportSourceSpecification;
  PointInTimeRecoverySpecification?: PointInTimeRecoverySpecification;
  ProvisionedThroughput?: ProvisionedThroughput;
  WarmThroughput?: WarmThroughput;
  TableName?: Value<string>;
  AttributeDefinitions?: List<AttributeDefinition>;
  GlobalSecondaryIndexes?: List<GlobalSecondaryIndex>;
  BillingMode?: Value<string>;
  ResourcePolicy?: ResourcePolicy;
  LocalSecondaryIndexes?: List<LocalSecondaryIndex>;
  KeySchema: List<KeySchema>;
  DeletionProtectionEnabled?: Value<boolean>;
  TableClass?: Value<string>;
  Tags?: List<ResourceTag>;
  TimeToLiveSpecification?: TimeToLiveSpecification;
}
export default class Table extends ResourceBase<TableProperties> {
  static AttributeDefinition = AttributeDefinition;
  static ContributorInsightsSpecification = ContributorInsightsSpecification;
  static Csv = Csv;
  static GlobalSecondaryIndex = GlobalSecondaryIndex;
  static ImportSourceSpecification = ImportSourceSpecification;
  static InputFormatOptions = InputFormatOptions;
  static KeySchema = KeySchema;
  static KinesisStreamSpecification = KinesisStreamSpecification;
  static LocalSecondaryIndex = LocalSecondaryIndex;
  static OnDemandThroughput = OnDemandThroughput;
  static PointInTimeRecoverySpecification = PointInTimeRecoverySpecification;
  static Projection = Projection;
  static ProvisionedThroughput = ProvisionedThroughput;
  static ResourcePolicy = ResourcePolicy;
  static S3BucketSource = S3BucketSource;
  static SSESpecification = SSESpecification;
  static StreamSpecification = StreamSpecification;
  static TimeToLiveSpecification = TimeToLiveSpecification;
  static WarmThroughput = WarmThroughput;
  constructor(properties: TableProperties) {
    super('AWS::DynamoDB::Table', properties);
  }
}
