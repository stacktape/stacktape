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

export class CapacityProviderStrategyItem {
  CapacityProvider!: Value<string>;
  Weight?: Value<number>;
  Base?: Value<number>;
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
  TaskCount?: Value<number>;
  EnableExecuteCommand?: Value<boolean>;
  PlacementConstraints?: List<PlacementConstraint>;
  PropagateTags?: Value<string>;
  PlacementStrategy?: List<PlacementStrategy>;
  LaunchType?: Value<string>;
  CapacityProviderStrategy?: List<CapacityProviderStrategyItem>;
  ReferenceId?: Value<string>;
  NetworkConfiguration?: NetworkConfiguration;
  Tags?: { [key: string]: any };
  TaskDefinitionArn!: Value<string>;
  constructor(properties: EcsParameters) {
    Object.assign(this, properties);
  }
}

export class EventBridgeParameters {
  DetailType!: Value<string>;
  Source!: Value<string>;
  constructor(properties: EventBridgeParameters) {
    Object.assign(this, properties);
  }
}

export class FlexibleTimeWindow {
  Mode!: Value<string>;
  MaximumWindowInMinutes?: Value<number>;
  constructor(properties: FlexibleTimeWindow) {
    Object.assign(this, properties);
  }
}

export class KinesisParameters {
  PartitionKey!: Value<string>;
  constructor(properties: KinesisParameters) {
    Object.assign(this, properties);
  }
}

export class NetworkConfiguration {
  AwsvpcConfiguration?: AwsVpcConfiguration;
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

export class RetryPolicy {
  MaximumRetryAttempts?: Value<number>;
  MaximumEventAgeInSeconds?: Value<number>;
  constructor(properties: RetryPolicy) {
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
  MessageGroupId?: Value<string>;
  constructor(properties: SqsParameters) {
    Object.assign(this, properties);
  }
}

export class Target {
  Input?: Value<string>;
  SqsParameters?: SqsParameters;
  DeadLetterConfig?: DeadLetterConfig;
  EcsParameters?: EcsParameters;
  EventBridgeParameters?: EventBridgeParameters;
  Arn!: Value<string>;
  KinesisParameters?: KinesisParameters;
  SageMakerPipelineParameters?: SageMakerPipelineParameters;
  RetryPolicy?: RetryPolicy;
  RoleArn!: Value<string>;
  constructor(properties: Target) {
    Object.assign(this, properties);
  }
}
export interface ScheduleProperties {
  GroupName?: Value<string>;
  StartDate?: Value<string>;
  ScheduleExpression: Value<string>;
  Target: Target;
  Description?: Value<string>;
  KmsKeyArn?: Value<string>;
  State?: Value<string>;
  FlexibleTimeWindow: FlexibleTimeWindow;
  ScheduleExpressionTimezone?: Value<string>;
  EndDate?: Value<string>;
  Name?: Value<string>;
}
export default class Schedule extends ResourceBase<ScheduleProperties> {
  static AwsVpcConfiguration = AwsVpcConfiguration;
  static CapacityProviderStrategyItem = CapacityProviderStrategyItem;
  static DeadLetterConfig = DeadLetterConfig;
  static EcsParameters = EcsParameters;
  static EventBridgeParameters = EventBridgeParameters;
  static FlexibleTimeWindow = FlexibleTimeWindow;
  static KinesisParameters = KinesisParameters;
  static NetworkConfiguration = NetworkConfiguration;
  static PlacementConstraint = PlacementConstraint;
  static PlacementStrategy = PlacementStrategy;
  static RetryPolicy = RetryPolicy;
  static SageMakerPipelineParameter = SageMakerPipelineParameter;
  static SageMakerPipelineParameters = SageMakerPipelineParameters;
  static SqsParameters = SqsParameters;
  static Target = Target;
  constructor(properties: ScheduleProperties) {
    super('AWS::Scheduler::Schedule', properties);
  }
}
