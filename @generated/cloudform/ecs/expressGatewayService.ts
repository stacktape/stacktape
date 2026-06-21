import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoScalingArns {
  ScalableTarget?: Value<string>;
  ApplicationAutoScalingPolicies?: List<Value<string>>;
  constructor(properties: AutoScalingArns) {
    Object.assign(this, properties);
  }
}

export class ECSManagedResourceArns {
  LogGroups?: List<Value<string>>;
  ServiceSecurityGroups?: List<Value<string>>;
  MetricAlarms?: List<Value<string>>;
  IngressPath?: IngressPathArns;
  AutoScaling?: AutoScalingArns;
  constructor(properties: ECSManagedResourceArns) {
    Object.assign(this, properties);
  }
}

export class ExpressGatewayContainer {
  RepositoryCredentials?: ExpressGatewayRepositoryCredentials;
  Secrets?: List<Secret>;
  Command?: List<Value<string>>;
  AwsLogsConfiguration?: ExpressGatewayServiceAwsLogsConfiguration;
  ContainerPort?: Value<number>;
  Environment?: List<KeyValuePair>;
  Image!: Value<string>;
  constructor(properties: ExpressGatewayContainer) {
    Object.assign(this, properties);
  }
}

export class ExpressGatewayRepositoryCredentials {
  CredentialsParameter!: Value<string>;
  constructor(properties: ExpressGatewayRepositoryCredentials) {
    Object.assign(this, properties);
  }
}

export class ExpressGatewayScalingTarget {
  MinTaskCount?: Value<number>;
  AutoScalingMetric?: Value<string>;
  AutoScalingTargetValue?: Value<number>;
  MaxTaskCount?: Value<number>;
  constructor(properties: ExpressGatewayScalingTarget) {
    Object.assign(this, properties);
  }
}

export class ExpressGatewayServiceAwsLogsConfiguration {
  LogStreamPrefix!: Value<string>;
  LogGroup!: Value<string>;
  constructor(properties: ExpressGatewayServiceAwsLogsConfiguration) {
    Object.assign(this, properties);
  }
}

export class ExpressGatewayServiceConfiguration {
  ServiceRevisionArn?: Value<string>;
  ExecutionRoleArn?: Value<string>;
  TaskRoleArn?: Value<string>;
  ScalingTarget?: ExpressGatewayScalingTarget;
  IngressPaths?: List<IngressPathSummary>;
  PrimaryContainer?: ExpressGatewayContainer;
  Memory?: Value<string>;
  HealthCheckPath?: Value<string>;
  CreatedAt?: Value<string>;
  Cpu?: Value<string>;
  NetworkConfiguration?: ExpressGatewayServiceNetworkConfiguration;
  constructor(properties: ExpressGatewayServiceConfiguration) {
    Object.assign(this, properties);
  }
}

export class ExpressGatewayServiceNetworkConfiguration {
  SecurityGroups?: List<Value<string>>;
  Subnets?: List<Value<string>>;
  constructor(properties: ExpressGatewayServiceNetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class ExpressGatewayServiceStatus {
  StatusCode?: Value<string>;
  constructor(properties: ExpressGatewayServiceStatus) {
    Object.assign(this, properties);
  }
}

export class IngressPathArns {
  ListenerArn?: Value<string>;
  LoadBalancerArn?: Value<string>;
  TargetGroupArns?: List<Value<string>>;
  ListenerRuleArn?: Value<string>;
  LoadBalancerSecurityGroups?: List<Value<string>>;
  CertificateArn?: Value<string>;
  constructor(properties: IngressPathArns) {
    Object.assign(this, properties);
  }
}

export class IngressPathSummary {
  Endpoint?: Value<string>;
  AccessType?: Value<string>;
  constructor(properties: IngressPathSummary) {
    Object.assign(this, properties);
  }
}

export class KeyValuePair {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: KeyValuePair) {
    Object.assign(this, properties);
  }
}

export class Secret {
  ValueFrom!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Secret) {
    Object.assign(this, properties);
  }
}
export interface ExpressGatewayServiceProperties {
  TaskRoleArn?: Value<string>;
  ExecutionRoleArn: Value<string>;
  InfrastructureRoleArn: Value<string>;
  ScalingTarget?: ExpressGatewayScalingTarget;
  PrimaryContainer: ExpressGatewayContainer;
  ServiceName?: Value<string>;
  Memory?: Value<string>;
  HealthCheckPath?: Value<string>;
  Cluster?: Value<string>;
  Cpu?: Value<string>;
  NetworkConfiguration?: ExpressGatewayServiceNetworkConfiguration;
  Tags?: List<ResourceTag>;
}
export default class ExpressGatewayService extends ResourceBase<ExpressGatewayServiceProperties> {
  static AutoScalingArns = AutoScalingArns;
  static ECSManagedResourceArns = ECSManagedResourceArns;
  static ExpressGatewayContainer = ExpressGatewayContainer;
  static ExpressGatewayRepositoryCredentials = ExpressGatewayRepositoryCredentials;
  static ExpressGatewayScalingTarget = ExpressGatewayScalingTarget;
  static ExpressGatewayServiceAwsLogsConfiguration = ExpressGatewayServiceAwsLogsConfiguration;
  static ExpressGatewayServiceConfiguration = ExpressGatewayServiceConfiguration;
  static ExpressGatewayServiceNetworkConfiguration = ExpressGatewayServiceNetworkConfiguration;
  static ExpressGatewayServiceStatus = ExpressGatewayServiceStatus;
  static IngressPathArns = IngressPathArns;
  static IngressPathSummary = IngressPathSummary;
  static KeyValuePair = KeyValuePair;
  static Secret = Secret;
  constructor(properties: ExpressGatewayServiceProperties) {
    super('AWS::ECS::ExpressGatewayService', properties);
  }
}
