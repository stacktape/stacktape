import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AwsVpcConfiguration {
  SecurityGroups?: List<Value<string>>;
  Subnets!: List<Value<string>>;
  AssignPublicIp?: Value<string>;
  constructor(properties: AwsVpcConfiguration) {
    Object.assign(this, properties);
  }
}

export class BatchArrayProperties {
  Size?: Value<number>;
  constructor(properties: BatchArrayProperties) {
    Object.assign(this, properties);
  }
}

export class BatchContainerOverrides {
  Command?: List<Value<string>>;
  Environment?: List<BatchEnvironmentVariable>;
  InstanceType?: Value<string>;
  ResourceRequirements?: List<BatchResourceRequirement>;
  constructor(properties: BatchContainerOverrides) {
    Object.assign(this, properties);
  }
}

export class BatchEnvironmentVariable {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: BatchEnvironmentVariable) {
    Object.assign(this, properties);
  }
}

export class BatchJobDependency {
  Type?: Value<string>;
  JobId?: Value<string>;
  constructor(properties: BatchJobDependency) {
    Object.assign(this, properties);
  }
}

export class BatchResourceRequirement {
  Type!: Value<string>;
  Value!: Value<string>;
  constructor(properties: BatchResourceRequirement) {
    Object.assign(this, properties);
  }
}

export class BatchRetryStrategy {
  Attempts?: Value<number>;
  constructor(properties: BatchRetryStrategy) {
    Object.assign(this, properties);
  }
}

export class CapacityProviderStrategyItem {
  CapacityProvider!: Value<string>;
  Weight?: Value<number>;
  Base?: Value<number>;
  constructor(properties: CapacityProviderStrategyItem) {
    Object.assign(this, properties);
  }
}

export class CloudwatchLogsLogDestination {
  LogGroupArn?: Value<string>;
  constructor(properties: CloudwatchLogsLogDestination) {
    Object.assign(this, properties);
  }
}

export class DeadLetterConfig {
  Arn?: Value<string>;
  constructor(properties: DeadLetterConfig) {
    Object.assign(this, properties);
  }
}

export class DimensionMapping {
  DimensionValueType!: Value<string>;
  DimensionValue!: Value<string>;
  DimensionName!: Value<string>;
  constructor(properties: DimensionMapping) {
    Object.assign(this, properties);
  }
}

export class EcsContainerOverride {
  MemoryReservation?: Value<number>;
  Command?: List<Value<string>>;
  Memory?: Value<number>;
  Cpu?: Value<number>;
  Environment?: List<EcsEnvironmentVariable>;
  ResourceRequirements?: List<EcsResourceRequirement>;
  EnvironmentFiles?: List<EcsEnvironmentFile>;
  Name?: Value<string>;
  constructor(properties: EcsContainerOverride) {
    Object.assign(this, properties);
  }
}

export class EcsEnvironmentFile {
  Type!: Value<string>;
  Value!: Value<string>;
  constructor(properties: EcsEnvironmentFile) {
    Object.assign(this, properties);
  }
}

export class EcsEnvironmentVariable {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: EcsEnvironmentVariable) {
    Object.assign(this, properties);
  }
}

export class EcsEphemeralStorage {
  SizeInGiB!: Value<number>;
  constructor(properties: EcsEphemeralStorage) {
    Object.assign(this, properties);
  }
}

export class EcsInferenceAcceleratorOverride {
  DeviceType?: Value<string>;
  DeviceName?: Value<string>;
  constructor(properties: EcsInferenceAcceleratorOverride) {
    Object.assign(this, properties);
  }
}

export class EcsResourceRequirement {
  Type!: Value<string>;
  Value!: Value<string>;
  constructor(properties: EcsResourceRequirement) {
    Object.assign(this, properties);
  }
}

export class EcsTaskOverride {
  ExecutionRoleArn?: Value<string>;
  TaskRoleArn?: Value<string>;
  Memory?: Value<string>;
  Cpu?: Value<string>;
  InferenceAcceleratorOverrides?: List<EcsInferenceAcceleratorOverride>;
  EphemeralStorage?: EcsEphemeralStorage;
  ContainerOverrides?: List<EcsContainerOverride>;
  constructor(properties: EcsTaskOverride) {
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

export class FirehoseLogDestination {
  DeliveryStreamArn?: Value<string>;
  constructor(properties: FirehoseLogDestination) {
    Object.assign(this, properties);
  }
}

export class MQBrokerAccessCredentials {
  BasicAuth!: Value<string>;
  constructor(properties: MQBrokerAccessCredentials) {
    Object.assign(this, properties);
  }
}

export class MSKAccessCredentials {
  ClientCertificateTlsAuth?: Value<string>;
  SaslScram512Auth?: Value<string>;
  constructor(properties: MSKAccessCredentials) {
    Object.assign(this, properties);
  }
}

export class MultiMeasureAttributeMapping {
  MultiMeasureAttributeName!: Value<string>;
  MeasureValueType!: Value<string>;
  MeasureValue!: Value<string>;
  constructor(properties: MultiMeasureAttributeMapping) {
    Object.assign(this, properties);
  }
}

export class MultiMeasureMapping {
  MultiMeasureName!: Value<string>;
  MultiMeasureAttributeMappings!: List<MultiMeasureAttributeMapping>;
  constructor(properties: MultiMeasureMapping) {
    Object.assign(this, properties);
  }
}

export class NetworkConfiguration {
  AwsvpcConfiguration?: AwsVpcConfiguration;
  constructor(properties: NetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class PipeEnrichmentHttpParameters {
  PathParameterValues?: List<Value<string>>;
  HeaderParameters?: { [key: string]: Value<string> };
  QueryStringParameters?: { [key: string]: Value<string> };
  constructor(properties: PipeEnrichmentHttpParameters) {
    Object.assign(this, properties);
  }
}

export class PipeEnrichmentParameters {
  HttpParameters?: PipeEnrichmentHttpParameters;
  InputTemplate?: Value<string>;
  constructor(properties: PipeEnrichmentParameters) {
    Object.assign(this, properties);
  }
}

export class PipeLogConfiguration {
  FirehoseLogDestination?: FirehoseLogDestination;
  CloudwatchLogsLogDestination?: CloudwatchLogsLogDestination;
  IncludeExecutionData?: List<Value<string>>;
  S3LogDestination?: S3LogDestination;
  Level?: Value<string>;
  constructor(properties: PipeLogConfiguration) {
    Object.assign(this, properties);
  }
}

export class PipeSourceActiveMQBrokerParameters {
  BatchSize?: Value<number>;
  QueueName!: Value<string>;
  Credentials!: MQBrokerAccessCredentials;
  MaximumBatchingWindowInSeconds?: Value<number>;
  constructor(properties: PipeSourceActiveMQBrokerParameters) {
    Object.assign(this, properties);
  }
}

export class PipeSourceDynamoDBStreamParameters {
  StartingPosition!: Value<string>;
  BatchSize?: Value<number>;
  MaximumRetryAttempts?: Value<number>;
  OnPartialBatchItemFailure?: Value<string>;
  DeadLetterConfig?: DeadLetterConfig;
  ParallelizationFactor?: Value<number>;
  MaximumRecordAgeInSeconds?: Value<number>;
  MaximumBatchingWindowInSeconds?: Value<number>;
  constructor(properties: PipeSourceDynamoDBStreamParameters) {
    Object.assign(this, properties);
  }
}

export class PipeSourceKinesisStreamParameters {
  StartingPosition!: Value<string>;
  BatchSize?: Value<number>;
  MaximumRetryAttempts?: Value<number>;
  OnPartialBatchItemFailure?: Value<string>;
  DeadLetterConfig?: DeadLetterConfig;
  ParallelizationFactor?: Value<number>;
  MaximumRecordAgeInSeconds?: Value<number>;
  StartingPositionTimestamp?: Value<string>;
  MaximumBatchingWindowInSeconds?: Value<number>;
  constructor(properties: PipeSourceKinesisStreamParameters) {
    Object.assign(this, properties);
  }
}

export class PipeSourceManagedStreamingKafkaParameters {
  StartingPosition?: Value<string>;
  BatchSize?: Value<number>;
  ConsumerGroupID?: Value<string>;
  Credentials?: MSKAccessCredentials;
  TopicName!: Value<string>;
  MaximumBatchingWindowInSeconds?: Value<number>;
  constructor(properties: PipeSourceManagedStreamingKafkaParameters) {
    Object.assign(this, properties);
  }
}

export class PipeSourceParameters {
  ManagedStreamingKafkaParameters?: PipeSourceManagedStreamingKafkaParameters;
  DynamoDBStreamParameters?: PipeSourceDynamoDBStreamParameters;
  SelfManagedKafkaParameters?: PipeSourceSelfManagedKafkaParameters;
  RabbitMQBrokerParameters?: PipeSourceRabbitMQBrokerParameters;
  SqsQueueParameters?: PipeSourceSqsQueueParameters;
  KinesisStreamParameters?: PipeSourceKinesisStreamParameters;
  FilterCriteria?: FilterCriteria;
  ActiveMQBrokerParameters?: PipeSourceActiveMQBrokerParameters;
  constructor(properties: PipeSourceParameters) {
    Object.assign(this, properties);
  }
}

export class PipeSourceRabbitMQBrokerParameters {
  BatchSize?: Value<number>;
  VirtualHost?: Value<string>;
  QueueName!: Value<string>;
  Credentials!: MQBrokerAccessCredentials;
  MaximumBatchingWindowInSeconds?: Value<number>;
  constructor(properties: PipeSourceRabbitMQBrokerParameters) {
    Object.assign(this, properties);
  }
}

export class PipeSourceSelfManagedKafkaParameters {
  StartingPosition?: Value<string>;
  BatchSize?: Value<number>;
  ConsumerGroupID?: Value<string>;
  AdditionalBootstrapServers?: List<Value<string>>;
  Vpc?: SelfManagedKafkaAccessConfigurationVpc;
  Credentials?: SelfManagedKafkaAccessConfigurationCredentials;
  ServerRootCaCertificate?: Value<string>;
  TopicName!: Value<string>;
  MaximumBatchingWindowInSeconds?: Value<number>;
  constructor(properties: PipeSourceSelfManagedKafkaParameters) {
    Object.assign(this, properties);
  }
}

export class PipeSourceSqsQueueParameters {
  BatchSize?: Value<number>;
  MaximumBatchingWindowInSeconds?: Value<number>;
  constructor(properties: PipeSourceSqsQueueParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetBatchJobParameters {
  DependsOn?: List<BatchJobDependency>;
  Parameters?: { [key: string]: Value<string> };
  ArrayProperties?: BatchArrayProperties;
  JobName!: Value<string>;
  RetryStrategy?: BatchRetryStrategy;
  JobDefinition!: Value<string>;
  ContainerOverrides?: BatchContainerOverrides;
  constructor(properties: PipeTargetBatchJobParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetCloudWatchLogsParameters {
  LogStreamName?: Value<string>;
  Timestamp?: Value<string>;
  constructor(properties: PipeTargetCloudWatchLogsParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetEcsTaskParameters {
  PlatformVersion?: Value<string>;
  Group?: Value<string>;
  EnableECSManagedTags?: Value<boolean>;
  TaskCount?: Value<number>;
  EnableExecuteCommand?: Value<boolean>;
  PlacementConstraints?: List<PlacementConstraint>;
  PropagateTags?: Value<string>;
  PlacementStrategy?: List<PlacementStrategy>;
  LaunchType?: Value<string>;
  CapacityProviderStrategy?: List<CapacityProviderStrategyItem>;
  ReferenceId?: Value<string>;
  Overrides?: EcsTaskOverride;
  NetworkConfiguration?: NetworkConfiguration;
  Tags?: List<ResourceTag>;
  TaskDefinitionArn!: Value<string>;
  constructor(properties: PipeTargetEcsTaskParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetEventBridgeEventBusParameters {
  DetailType?: Value<string>;
  EndpointId?: Value<string>;
  Time?: Value<string>;
  Resources?: List<Value<string>>;
  Source?: Value<string>;
  constructor(properties: PipeTargetEventBridgeEventBusParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetHttpParameters {
  PathParameterValues?: List<Value<string>>;
  HeaderParameters?: { [key: string]: Value<string> };
  QueryStringParameters?: { [key: string]: Value<string> };
  constructor(properties: PipeTargetHttpParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetKinesisStreamParameters {
  PartitionKey!: Value<string>;
  constructor(properties: PipeTargetKinesisStreamParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetLambdaFunctionParameters {
  InvocationType?: Value<string>;
  constructor(properties: PipeTargetLambdaFunctionParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetParameters {
  StepFunctionStateMachineParameters?: PipeTargetStateMachineParameters;
  HttpParameters?: PipeTargetHttpParameters;
  TimestreamParameters?: PipeTargetTimestreamParameters;
  InputTemplate?: Value<string>;
  EventBridgeEventBusParameters?: PipeTargetEventBridgeEventBusParameters;
  LambdaFunctionParameters?: PipeTargetLambdaFunctionParameters;
  BatchJobParameters?: PipeTargetBatchJobParameters;
  RedshiftDataParameters?: PipeTargetRedshiftDataParameters;
  SqsQueueParameters?: PipeTargetSqsQueueParameters;
  CloudWatchLogsParameters?: PipeTargetCloudWatchLogsParameters;
  KinesisStreamParameters?: PipeTargetKinesisStreamParameters;
  SageMakerPipelineParameters?: PipeTargetSageMakerPipelineParameters;
  EcsTaskParameters?: PipeTargetEcsTaskParameters;
  constructor(properties: PipeTargetParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetRedshiftDataParameters {
  StatementName?: Value<string>;
  Sqls!: List<Value<string>>;
  Database!: Value<string>;
  SecretManagerArn?: Value<string>;
  DbUser?: Value<string>;
  WithEvent?: Value<boolean>;
  constructor(properties: PipeTargetRedshiftDataParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetSageMakerPipelineParameters {
  PipelineParameterList?: List<SageMakerPipelineParameter>;
  constructor(properties: PipeTargetSageMakerPipelineParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetSqsQueueParameters {
  MessageGroupId?: Value<string>;
  MessageDeduplicationId?: Value<string>;
  constructor(properties: PipeTargetSqsQueueParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetStateMachineParameters {
  InvocationType?: Value<string>;
  constructor(properties: PipeTargetStateMachineParameters) {
    Object.assign(this, properties);
  }
}

export class PipeTargetTimestreamParameters {
  VersionValue!: Value<string>;
  DimensionMappings!: List<DimensionMapping>;
  EpochTimeUnit?: Value<string>;
  TimeFieldType?: Value<string>;
  TimestampFormat?: Value<string>;
  MultiMeasureMappings?: List<MultiMeasureMapping>;
  TimeValue!: Value<string>;
  SingleMeasureMappings?: List<SingleMeasureMapping>;
  constructor(properties: PipeTargetTimestreamParameters) {
    Object.assign(this, properties);
  }
}

export class PlacementConstraint {
  Type?: Value<string>;
  Expression?: Value<string>;
  constructor(properties: PlacementConstraint) {
    Object.assign(this, properties);
  }
}

export class PlacementStrategy {
  Field?: Value<string>;
  Type?: Value<string>;
  constructor(properties: PlacementStrategy) {
    Object.assign(this, properties);
  }
}

export class S3LogDestination {
  BucketName?: Value<string>;
  OutputFormat?: Value<string>;
  Prefix?: Value<string>;
  BucketOwner?: Value<string>;
  constructor(properties: S3LogDestination) {
    Object.assign(this, properties);
  }
}

export class SageMakerPipelineParameter {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: SageMakerPipelineParameter) {
    Object.assign(this, properties);
  }
}

export class SelfManagedKafkaAccessConfigurationCredentials {
  BasicAuth?: Value<string>;
  SaslScram256Auth?: Value<string>;
  ClientCertificateTlsAuth?: Value<string>;
  SaslScram512Auth?: Value<string>;
  constructor(properties: SelfManagedKafkaAccessConfigurationCredentials) {
    Object.assign(this, properties);
  }
}

export class SelfManagedKafkaAccessConfigurationVpc {
  Subnets?: List<Value<string>>;
  SecurityGroup?: List<Value<string>>;
  constructor(properties: SelfManagedKafkaAccessConfigurationVpc) {
    Object.assign(this, properties);
  }
}

export class SingleMeasureMapping {
  MeasureName!: Value<string>;
  MeasureValueType!: Value<string>;
  MeasureValue!: Value<string>;
  constructor(properties: SingleMeasureMapping) {
    Object.assign(this, properties);
  }
}
export interface PipeProperties {
  Enrichment?: Value<string>;
  KmsKeyIdentifier?: Value<string>;
  Description?: Value<string>;
  TargetParameters?: PipeTargetParameters;
  LogConfiguration?: PipeLogConfiguration;
  EnrichmentParameters?: PipeEnrichmentParameters;
  RoleArn: Value<string>;
  Source: Value<string>;
  Name?: Value<string>;
  Target: Value<string>;
  DesiredState?: Value<string>;
  SourceParameters?: PipeSourceParameters;
  Tags?: { [key: string]: Value<string> };
}
export default class Pipe extends ResourceBase<PipeProperties> {
  static AwsVpcConfiguration = AwsVpcConfiguration;
  static BatchArrayProperties = BatchArrayProperties;
  static BatchContainerOverrides = BatchContainerOverrides;
  static BatchEnvironmentVariable = BatchEnvironmentVariable;
  static BatchJobDependency = BatchJobDependency;
  static BatchResourceRequirement = BatchResourceRequirement;
  static BatchRetryStrategy = BatchRetryStrategy;
  static CapacityProviderStrategyItem = CapacityProviderStrategyItem;
  static CloudwatchLogsLogDestination = CloudwatchLogsLogDestination;
  static DeadLetterConfig = DeadLetterConfig;
  static DimensionMapping = DimensionMapping;
  static EcsContainerOverride = EcsContainerOverride;
  static EcsEnvironmentFile = EcsEnvironmentFile;
  static EcsEnvironmentVariable = EcsEnvironmentVariable;
  static EcsEphemeralStorage = EcsEphemeralStorage;
  static EcsInferenceAcceleratorOverride = EcsInferenceAcceleratorOverride;
  static EcsResourceRequirement = EcsResourceRequirement;
  static EcsTaskOverride = EcsTaskOverride;
  static Filter = Filter;
  static FilterCriteria = FilterCriteria;
  static FirehoseLogDestination = FirehoseLogDestination;
  static MQBrokerAccessCredentials = MQBrokerAccessCredentials;
  static MSKAccessCredentials = MSKAccessCredentials;
  static MultiMeasureAttributeMapping = MultiMeasureAttributeMapping;
  static MultiMeasureMapping = MultiMeasureMapping;
  static NetworkConfiguration = NetworkConfiguration;
  static PipeEnrichmentHttpParameters = PipeEnrichmentHttpParameters;
  static PipeEnrichmentParameters = PipeEnrichmentParameters;
  static PipeLogConfiguration = PipeLogConfiguration;
  static PipeSourceActiveMQBrokerParameters = PipeSourceActiveMQBrokerParameters;
  static PipeSourceDynamoDBStreamParameters = PipeSourceDynamoDBStreamParameters;
  static PipeSourceKinesisStreamParameters = PipeSourceKinesisStreamParameters;
  static PipeSourceManagedStreamingKafkaParameters = PipeSourceManagedStreamingKafkaParameters;
  static PipeSourceParameters = PipeSourceParameters;
  static PipeSourceRabbitMQBrokerParameters = PipeSourceRabbitMQBrokerParameters;
  static PipeSourceSelfManagedKafkaParameters = PipeSourceSelfManagedKafkaParameters;
  static PipeSourceSqsQueueParameters = PipeSourceSqsQueueParameters;
  static PipeTargetBatchJobParameters = PipeTargetBatchJobParameters;
  static PipeTargetCloudWatchLogsParameters = PipeTargetCloudWatchLogsParameters;
  static PipeTargetEcsTaskParameters = PipeTargetEcsTaskParameters;
  static PipeTargetEventBridgeEventBusParameters = PipeTargetEventBridgeEventBusParameters;
  static PipeTargetHttpParameters = PipeTargetHttpParameters;
  static PipeTargetKinesisStreamParameters = PipeTargetKinesisStreamParameters;
  static PipeTargetLambdaFunctionParameters = PipeTargetLambdaFunctionParameters;
  static PipeTargetParameters = PipeTargetParameters;
  static PipeTargetRedshiftDataParameters = PipeTargetRedshiftDataParameters;
  static PipeTargetSageMakerPipelineParameters = PipeTargetSageMakerPipelineParameters;
  static PipeTargetSqsQueueParameters = PipeTargetSqsQueueParameters;
  static PipeTargetStateMachineParameters = PipeTargetStateMachineParameters;
  static PipeTargetTimestreamParameters = PipeTargetTimestreamParameters;
  static PlacementConstraint = PlacementConstraint;
  static PlacementStrategy = PlacementStrategy;
  static S3LogDestination = S3LogDestination;
  static SageMakerPipelineParameter = SageMakerPipelineParameter;
  static SelfManagedKafkaAccessConfigurationCredentials = SelfManagedKafkaAccessConfigurationCredentials;
  static SelfManagedKafkaAccessConfigurationVpc = SelfManagedKafkaAccessConfigurationVpc;
  static SingleMeasureMapping = SingleMeasureMapping;
  constructor(properties: PipeProperties) {
    super('AWS::Pipes::Pipe', properties);
  }
}
