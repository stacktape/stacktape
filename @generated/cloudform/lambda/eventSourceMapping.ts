import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AmazonManagedKafkaEventSourceConfig {
  ConsumerGroupId?: Value<string>;
  SchemaRegistryConfig?: SchemaRegistryConfig;
  constructor(properties: AmazonManagedKafkaEventSourceConfig) {
    Object.assign(this, properties);
  }
}

export class DestinationConfig {
  OnFailure?: OnFailure;
  constructor(properties: DestinationConfig) {
    Object.assign(this, properties);
  }
}

export class DocumentDBEventSourceConfig {
  FullDocument?: Value<string>;
  CollectionName?: Value<string>;
  DatabaseName?: Value<string>;
  constructor(properties: DocumentDBEventSourceConfig) {
    Object.assign(this, properties);
  }
}

export class Endpoints {
  KafkaBootstrapServers?: List<Value<string>>;
  constructor(properties: Endpoints) {
    Object.assign(this, properties);
  }
}

export class Filter {
  Pattern?: Value<string>;
  constructor(properties: Filter) {
    Object.assign(this, properties);
  }
}

export class FilterCriteria {
  Filters?: List<Filter>;
  constructor(properties: FilterCriteria) {
    Object.assign(this, properties);
  }
}

export class MetricsConfig {
  Metrics?: List<Value<string>>;
  constructor(properties: MetricsConfig) {
    Object.assign(this, properties);
  }
}

export class OnFailure {
  Destination?: Value<string>;
  constructor(properties: OnFailure) {
    Object.assign(this, properties);
  }
}

export class ProvisionedPollerConfig {
  MinimumPollers?: Value<number>;
  MaximumPollers?: Value<number>;
  constructor(properties: ProvisionedPollerConfig) {
    Object.assign(this, properties);
  }
}

export class ScalingConfig {
  MaximumConcurrency?: Value<number>;
  constructor(properties: ScalingConfig) {
    Object.assign(this, properties);
  }
}

export class SchemaRegistryAccessConfig {
  Type?: Value<string>;
  URI?: Value<string>;
  constructor(properties: SchemaRegistryAccessConfig) {
    Object.assign(this, properties);
  }
}

export class SchemaRegistryConfig {
  SchemaValidationConfigs?: List<SchemaValidationConfig>;
  SchemaRegistryURI?: Value<string>;
  EventRecordFormat?: Value<string>;
  AccessConfigs?: List<SchemaRegistryAccessConfig>;
  constructor(properties: SchemaRegistryConfig) {
    Object.assign(this, properties);
  }
}

export class SchemaValidationConfig {
  Attribute?: Value<string>;
  constructor(properties: SchemaValidationConfig) {
    Object.assign(this, properties);
  }
}

export class SelfManagedEventSource {
  Endpoints?: Endpoints;
  constructor(properties: SelfManagedEventSource) {
    Object.assign(this, properties);
  }
}

export class SelfManagedKafkaEventSourceConfig {
  ConsumerGroupId?: Value<string>;
  SchemaRegistryConfig?: SchemaRegistryConfig;
  constructor(properties: SelfManagedKafkaEventSourceConfig) {
    Object.assign(this, properties);
  }
}

export class SourceAccessConfiguration {
  Type?: Value<string>;
  URI?: Value<string>;
  constructor(properties: SourceAccessConfiguration) {
    Object.assign(this, properties);
  }
}
export interface EventSourceMappingProperties {
  StartingPosition?: Value<string>;
  SelfManagedEventSource?: SelfManagedEventSource;
  ParallelizationFactor?: Value<number>;
  FilterCriteria?: FilterCriteria;
  ProvisionedPollerConfig?: ProvisionedPollerConfig;
  MetricsConfig?: MetricsConfig;
  FunctionName: Value<string>;
  DestinationConfig?: DestinationConfig;
  KmsKeyArn?: Value<string>;
  AmazonManagedKafkaEventSourceConfig?: AmazonManagedKafkaEventSourceConfig;
  SourceAccessConfigurations?: List<SourceAccessConfiguration>;
  Tags?: List<ResourceTag>;
  MaximumBatchingWindowInSeconds?: Value<number>;
  BatchSize?: Value<number>;
  MaximumRetryAttempts?: Value<number>;
  Topics?: List<Value<string>>;
  ScalingConfig?: ScalingConfig;
  Enabled?: Value<boolean>;
  EventSourceArn?: Value<string>;
  SelfManagedKafkaEventSourceConfig?: SelfManagedKafkaEventSourceConfig;
  DocumentDBEventSourceConfig?: DocumentDBEventSourceConfig;
  TumblingWindowInSeconds?: Value<number>;
  BisectBatchOnFunctionError?: Value<boolean>;
  MaximumRecordAgeInSeconds?: Value<number>;
  StartingPositionTimestamp?: Value<number>;
  Queues?: List<Value<string>>;
  FunctionResponseTypes?: List<Value<string>>;
}
export default class EventSourceMapping extends ResourceBase<EventSourceMappingProperties> {
  static AmazonManagedKafkaEventSourceConfig = AmazonManagedKafkaEventSourceConfig;
  static DestinationConfig = DestinationConfig;
  static DocumentDBEventSourceConfig = DocumentDBEventSourceConfig;
  static Endpoints = Endpoints;
  static Filter = Filter;
  static FilterCriteria = FilterCriteria;
  static MetricsConfig = MetricsConfig;
  static OnFailure = OnFailure;
  static ProvisionedPollerConfig = ProvisionedPollerConfig;
  static ScalingConfig = ScalingConfig;
  static SchemaRegistryAccessConfig = SchemaRegistryAccessConfig;
  static SchemaRegistryConfig = SchemaRegistryConfig;
  static SchemaValidationConfig = SchemaValidationConfig;
  static SelfManagedEventSource = SelfManagedEventSource;
  static SelfManagedKafkaEventSourceConfig = SelfManagedKafkaEventSourceConfig;
  static SourceAccessConfiguration = SourceAccessConfiguration;
  constructor(properties: EventSourceMappingProperties) {
    super('AWS::Lambda::EventSourceMapping', properties);
  }
}
