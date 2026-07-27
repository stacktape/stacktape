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
  CapacityProvider?: Value<string>;
  Base?: Value<number>;
  Weight?: Value<number>;
  constructor(properties: CapacityProviderStrategyItem) {
    Object.assign(this, properties);
  }
}

export class LoadBalancer {
  TargetGroupArn?: Value<string>;
  ContainerName?: Value<string>;
  ContainerPort?: Value<number>;
  constructor(properties: LoadBalancer) {
    Object.assign(this, properties);
  }
}

export class NetworkConfiguration {
  AwsVpcConfiguration?: AwsVpcConfiguration;
  constructor(properties: NetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class Scale {
  Value?: Value<number>;
  Unit?: Value<string>;
  constructor(properties: Scale) {
    Object.assign(this, properties);
  }
}

export class ServiceRegistry {
  ContainerName?: Value<string>;
  Port?: Value<number>;
  ContainerPort?: Value<number>;
  RegistryArn?: Value<string>;
  constructor(properties: ServiceRegistry) {
    Object.assign(this, properties);
  }
}
export interface TaskSetProperties {
  PlatformVersion?: Value<string>;
  TaskDefinition: Value<string>;
  ExternalId?: Value<string>;
  Cluster: Value<string>;
  LoadBalancers?: List<LoadBalancer>;
  Service: Value<string>;
  Scale?: Scale;
  NetworkConfiguration?: NetworkConfiguration;
  ServiceRegistries?: List<ServiceRegistry>;
  CapacityProviderStrategy?: List<CapacityProviderStrategyItem>;
  LaunchType?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class TaskSet extends ResourceBase<TaskSetProperties> {
  static AwsVpcConfiguration = AwsVpcConfiguration;
  static CapacityProviderStrategyItem = CapacityProviderStrategyItem;
  static LoadBalancer = LoadBalancer;
  static NetworkConfiguration = NetworkConfiguration;
  static Scale = Scale;
  static ServiceRegistry = ServiceRegistry;
  constructor(properties: TaskSetProperties) {
    super('AWS::ECS::TaskSet', properties);
  }
}
