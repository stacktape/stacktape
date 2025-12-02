import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AppSyncParameters {
  GraphQLOperation!: Value<string>;
  constructor(properties: AppSyncParameters) {
    Object.assign(this, properties);
  }
}

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

export class BatchParameters {
  ArrayProperties?: BatchArrayProperties;
  JobName!: Value<string>;
  RetryStrategy?: BatchRetryStrategy;
  JobDefinition!: Value<string>;
  constructor(properties: BatchParameters) {
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
  Base?: Value<number>;
  Weight?: Value<number>;
  constructor(properties: CapacityProviderStrategyItem) {
    Object.assign(this, properties);
  }
}

export class DeadLetterConfig {
  Arn?: Value<string>;
  constructor(properties: DeadLetterConfig) {
    Object.assign(this, properties);
  }
}

export class EcsParameters {
  PlatformVersion?: Value<string>;
  Group?: Value<string>;
  EnableECSManagedTags?: Value<boolean>;
  EnableExecuteCommand?: Value<boolean>;
  PlacementConstraints?: List<PlacementConstraint>;
  PropagateTags?: Value<string>;
  TaskCount?: Value<number>;
  PlacementStrategies?: List<PlacementStrategy>;
  CapacityProviderStrategy?: List<CapacityProviderStrategyItem>;
  LaunchType?: Value<string>;
  ReferenceId?: Value<string>;
  TagList?: List<ResourceTag>;
  NetworkConfiguration?: NetworkConfiguration;
  TaskDefinitionArn!: Value<string>;
  constructor(properties: EcsParameters) {
    Object.assign(this, properties);
  }
}

export class HttpParameters {
  PathParameterValues?: List<Value<string>>;
  HeaderParameters?: { [key: string]: Value<string> };
  QueryStringParameters?: { [key: string]: Value<string> };
  constructor(properties: HttpParameters) {
    Object.assign(this, properties);
  }
}

export class InputTransformer {
  InputPathsMap?: { [key: string]: Value<string> };
  InputTemplate!: Value<string>;
  constructor(properties: InputTransformer) {
    Object.assign(this, properties);
  }
}

export class KinesisParameters {
  PartitionKeyPath!: Value<string>;
  constructor(properties: KinesisParameters) {
    Object.assign(this, properties);
  }
}

export class NetworkConfiguration {
  AwsVpcConfiguration?: AwsVpcConfiguration;
  constructor(properties: NetworkConfiguration) {
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

export class RedshiftDataParameters {
  StatementName?: Value<string>;
  Sqls?: List<Value<string>>;
  Database!: Value<string>;
  SecretManagerArn?: Value<string>;
  DbUser?: Value<string>;
  Sql?: Value<string>;
  WithEvent?: Value<boolean>;
  constructor(properties: RedshiftDataParameters) {
    Object.assign(this, properties);
  }
}

export class RetryPolicy {
  MaximumRetryAttempts?: Value<number>;
  MaximumEventAgeInSeconds?: Value<number>;
  constructor(properties: RetryPolicy) {
    Object.assign(this, properties);
  }
}

export class RunCommandParameters {
  RunCommandTargets!: List<RunCommandTarget>;
  constructor(properties: RunCommandParameters) {
    Object.assign(this, properties);
  }
}

export class RunCommandTarget {
  Values!: List<Value<string>>;
  Key!: Value<string>;
  constructor(properties: RunCommandTarget) {
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

export class SageMakerPipelineParameters {
  PipelineParameterList?: List<SageMakerPipelineParameter>;
  constructor(properties: SageMakerPipelineParameters) {
    Object.assign(this, properties);
  }
}

export class SqsParameters {
  MessageGroupId!: Value<string>;
  constructor(properties: SqsParameters) {
    Object.assign(this, properties);
  }
}

export class Target {
  InputPath?: Value<string>;
  HttpParameters?: HttpParameters;
  DeadLetterConfig?: DeadLetterConfig;
  RunCommandParameters?: RunCommandParameters;
  InputTransformer?: InputTransformer;
  KinesisParameters?: KinesisParameters;
  RoleArn?: Value<string>;
  RedshiftDataParameters?: RedshiftDataParameters;
  AppSyncParameters?: AppSyncParameters;
  Input?: Value<string>;
  SqsParameters?: SqsParameters;
  EcsParameters?: EcsParameters;
  BatchParameters?: BatchParameters;
  Id!: Value<string>;
  Arn!: Value<string>;
  SageMakerPipelineParameters?: SageMakerPipelineParameters;
  RetryPolicy?: RetryPolicy;
  constructor(properties: Target) {
    Object.assign(this, properties);
  }
}
export interface RuleProperties {
  EventBusName?: Value<string>;
  EventPattern?: { [key: string]: any };
  ScheduleExpression?: Value<string>;
  Description?: Value<string>;
  State?: Value<string>;
  Targets?: List<Target>;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Rule extends ResourceBase<RuleProperties> {
  static AppSyncParameters = AppSyncParameters;
  static AwsVpcConfiguration = AwsVpcConfiguration;
  static BatchArrayProperties = BatchArrayProperties;
  static BatchParameters = BatchParameters;
  static BatchRetryStrategy = BatchRetryStrategy;
  static CapacityProviderStrategyItem = CapacityProviderStrategyItem;
  static DeadLetterConfig = DeadLetterConfig;
  static EcsParameters = EcsParameters;
  static HttpParameters = HttpParameters;
  static InputTransformer = InputTransformer;
  static KinesisParameters = KinesisParameters;
  static NetworkConfiguration = NetworkConfiguration;
  static PlacementConstraint = PlacementConstraint;
  static PlacementStrategy = PlacementStrategy;
  static RedshiftDataParameters = RedshiftDataParameters;
  static RetryPolicy = RetryPolicy;
  static RunCommandParameters = RunCommandParameters;
  static RunCommandTarget = RunCommandTarget;
  static SageMakerPipelineParameter = SageMakerPipelineParameter;
  static SageMakerPipelineParameters = SageMakerPipelineParameters;
  static SqsParameters = SqsParameters;
  static Target = Target;
  constructor(properties?: RuleProperties) {
    super('AWS::Events::Rule', properties || {});
  }
}
