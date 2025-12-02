import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdvancedConfiguration {
  TestListenerRule?: Value<string>;
  AlternateTargetGroupArn!: Value<string>;
  ProductionListenerRule?: Value<string>;
  RoleArn?: Value<string>;
  constructor(properties: AdvancedConfiguration) {
    Object.assign(this, properties);
  }
}

export class AwsVpcConfiguration {
  SecurityGroups?: List<Value<string>>;
  Subnets?: List<Value<string>>;
  AssignPublicIp?: Value<string>;
  constructor(properties: AwsVpcConfiguration) {
    Object.assign(this, properties);
  }
}

export class CanaryConfiguration {
  CanaryPercent?: Value<number>;
  CanaryBakeTimeInMinutes?: Value<number>;
  constructor(properties: CanaryConfiguration) {
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

export class DeploymentAlarms {
  AlarmNames!: List<Value<string>>;
  Enable!: Value<boolean>;
  Rollback!: Value<boolean>;
  constructor(properties: DeploymentAlarms) {
    Object.assign(this, properties);
  }
}

export class DeploymentCircuitBreaker {
  Enable!: Value<boolean>;
  Rollback!: Value<boolean>;
  constructor(properties: DeploymentCircuitBreaker) {
    Object.assign(this, properties);
  }
}

export class DeploymentConfiguration {
  CanaryConfiguration?: CanaryConfiguration;
  BakeTimeInMinutes?: Value<number>;
  LifecycleHooks?: List<DeploymentLifecycleHook>;
  Alarms?: DeploymentAlarms;
  Strategy?: Value<string>;
  DeploymentCircuitBreaker?: DeploymentCircuitBreaker;
  MaximumPercent?: Value<number>;
  MinimumHealthyPercent?: Value<number>;
  LinearConfiguration?: LinearConfiguration;
  constructor(properties: DeploymentConfiguration) {
    Object.assign(this, properties);
  }
}

export class DeploymentController {
  Type?: Value<string>;
  constructor(properties: DeploymentController) {
    Object.assign(this, properties);
  }
}

export class DeploymentLifecycleHook {
  LifecycleStages!: List<Value<string>>;
  HookTargetArn!: Value<string>;
  HookDetails?: { [key: string]: any };
  RoleArn!: Value<string>;
  constructor(properties: DeploymentLifecycleHook) {
    Object.assign(this, properties);
  }
}

export class EBSTagSpecification {
  PropagateTags?: Value<string>;
  ResourceType!: Value<string>;
  Tags?: List<ResourceTag>;
  constructor(properties: EBSTagSpecification) {
    Object.assign(this, properties);
  }
}

export class ForceNewDeployment {
  EnableForceNewDeployment!: Value<boolean>;
  ForceNewDeploymentNonce?: Value<string>;
  constructor(properties: ForceNewDeployment) {
    Object.assign(this, properties);
  }
}

export class LinearConfiguration {
  StepBakeTimeInMinutes?: Value<number>;
  StepPercent?: Value<number>;
  constructor(properties: LinearConfiguration) {
    Object.assign(this, properties);
  }
}

export class LoadBalancer {
  TargetGroupArn?: Value<string>;
  LoadBalancerName?: Value<string>;
  ContainerName?: Value<string>;
  ContainerPort?: Value<number>;
  AdvancedConfiguration?: AdvancedConfiguration;
  constructor(properties: LoadBalancer) {
    Object.assign(this, properties);
  }
}

export class LogConfiguration {
  SecretOptions?: List<Secret>;
  Options?: { [key: string]: Value<string> };
  LogDriver?: Value<string>;
  constructor(properties: LogConfiguration) {
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
  Type!: Value<string>;
  Expression?: Value<string>;
  constructor(properties: PlacementConstraint) {
    Object.assign(this, properties);
  }
}

export class PlacementStrategy {
  Field?: Value<string>;
  Type!: Value<string>;
  constructor(properties: PlacementStrategy) {
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

export class ServiceConnectAccessLogConfiguration {
  Format!: Value<string>;
  IncludeQueryParameters?: Value<string>;
  constructor(properties: ServiceConnectAccessLogConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServiceConnectClientAlias {
  DnsName?: Value<string>;
  TestTrafficRules?: ServiceConnectTestTrafficRules;
  Port!: Value<number>;
  constructor(properties: ServiceConnectClientAlias) {
    Object.assign(this, properties);
  }
}

export class ServiceConnectConfiguration {
  Services?: List<ServiceConnectService>;
  AccessLogConfiguration?: ServiceConnectAccessLogConfiguration;
  Enabled!: Value<boolean>;
  LogConfiguration?: LogConfiguration;
  Namespace?: Value<string>;
  constructor(properties: ServiceConnectConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServiceConnectService {
  Timeout?: TimeoutConfiguration;
  IngressPortOverride?: Value<number>;
  ClientAliases?: List<ServiceConnectClientAlias>;
  Tls?: ServiceConnectTlsConfiguration;
  DiscoveryName?: Value<string>;
  PortName!: Value<string>;
  constructor(properties: ServiceConnectService) {
    Object.assign(this, properties);
  }
}

export class ServiceConnectTestTrafficRules {
  Header!: ServiceConnectTestTrafficRulesHeader;
  constructor(properties: ServiceConnectTestTrafficRules) {
    Object.assign(this, properties);
  }
}

export class ServiceConnectTestTrafficRulesHeader {
  Value?: ServiceConnectTestTrafficRulesHeaderValue;
  Name!: Value<string>;
  constructor(properties: ServiceConnectTestTrafficRulesHeader) {
    Object.assign(this, properties);
  }
}

export class ServiceConnectTestTrafficRulesHeaderValue {
  Exact!: Value<string>;
  constructor(properties: ServiceConnectTestTrafficRulesHeaderValue) {
    Object.assign(this, properties);
  }
}

export class ServiceConnectTlsCertificateAuthority {
  AwsPcaAuthorityArn?: Value<string>;
  constructor(properties: ServiceConnectTlsCertificateAuthority) {
    Object.assign(this, properties);
  }
}

export class ServiceConnectTlsConfiguration {
  IssuerCertificateAuthority!: ServiceConnectTlsCertificateAuthority;
  KmsKey?: Value<string>;
  RoleArn?: Value<string>;
  constructor(properties: ServiceConnectTlsConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServiceManagedEBSVolumeConfiguration {
  SnapshotId?: Value<string>;
  VolumeType?: Value<string>;
  KmsKeyId?: Value<string>;
  TagSpecifications?: List<EBSTagSpecification>;
  FilesystemType?: Value<string>;
  Encrypted?: Value<boolean>;
  Throughput?: Value<number>;
  VolumeInitializationRate?: Value<number>;
  Iops?: Value<number>;
  SizeInGiB?: Value<number>;
  RoleArn!: Value<string>;
  constructor(properties: ServiceManagedEBSVolumeConfiguration) {
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

export class ServiceVolumeConfiguration {
  ManagedEBSVolume?: ServiceManagedEBSVolumeConfiguration;
  Name!: Value<string>;
  constructor(properties: ServiceVolumeConfiguration) {
    Object.assign(this, properties);
  }
}

export class TimeoutConfiguration {
  PerRequestTimeoutSeconds?: Value<number>;
  IdleTimeoutSeconds?: Value<number>;
  constructor(properties: TimeoutConfiguration) {
    Object.assign(this, properties);
  }
}

export class VpcLatticeConfiguration {
  TargetGroupArn!: Value<string>;
  PortName!: Value<string>;
  RoleArn!: Value<string>;
  constructor(properties: VpcLatticeConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ServiceProperties {
  PlatformVersion?: Value<string>;
  PropagateTags?: Value<string>;
  PlacementStrategies?: List<PlacementStrategy>;
  ServiceRegistries?: List<ServiceRegistry>;
  VolumeConfigurations?: List<ServiceVolumeConfiguration>;
  CapacityProviderStrategy?: List<CapacityProviderStrategyItem>;
  LaunchType?: Value<string>;
  AvailabilityZoneRebalancing?: Value<string>;
  SchedulingStrategy?: Value<string>;
  NetworkConfiguration?: NetworkConfiguration;
  Tags?: List<ResourceTag>;
  ForceNewDeployment?: ForceNewDeployment;
  HealthCheckGracePeriodSeconds?: Value<number>;
  EnableECSManagedTags?: Value<boolean>;
  EnableExecuteCommand?: Value<boolean>;
  PlacementConstraints?: List<PlacementConstraint>;
  Cluster?: Value<string>;
  LoadBalancers?: List<LoadBalancer>;
  ServiceConnectConfiguration?: ServiceConnectConfiguration;
  DesiredCount?: Value<number>;
  VpcLatticeConfigurations?: List<VpcLatticeConfiguration>;
  DeploymentController?: DeploymentController;
  Role?: Value<string>;
  TaskDefinition?: Value<string>;
  ServiceName?: Value<string>;
  DeploymentConfiguration?: DeploymentConfiguration;
}
export default class Service extends ResourceBase<ServiceProperties> {
  static AdvancedConfiguration = AdvancedConfiguration;
  static AwsVpcConfiguration = AwsVpcConfiguration;
  static CanaryConfiguration = CanaryConfiguration;
  static CapacityProviderStrategyItem = CapacityProviderStrategyItem;
  static DeploymentAlarms = DeploymentAlarms;
  static DeploymentCircuitBreaker = DeploymentCircuitBreaker;
  static DeploymentConfiguration = DeploymentConfiguration;
  static DeploymentController = DeploymentController;
  static DeploymentLifecycleHook = DeploymentLifecycleHook;
  static EBSTagSpecification = EBSTagSpecification;
  static ForceNewDeployment = ForceNewDeployment;
  static LinearConfiguration = LinearConfiguration;
  static LoadBalancer = LoadBalancer;
  static LogConfiguration = LogConfiguration;
  static NetworkConfiguration = NetworkConfiguration;
  static PlacementConstraint = PlacementConstraint;
  static PlacementStrategy = PlacementStrategy;
  static Secret = Secret;
  static ServiceConnectAccessLogConfiguration = ServiceConnectAccessLogConfiguration;
  static ServiceConnectClientAlias = ServiceConnectClientAlias;
  static ServiceConnectConfiguration = ServiceConnectConfiguration;
  static ServiceConnectService = ServiceConnectService;
  static ServiceConnectTestTrafficRules = ServiceConnectTestTrafficRules;
  static ServiceConnectTestTrafficRulesHeader = ServiceConnectTestTrafficRulesHeader;
  static ServiceConnectTestTrafficRulesHeaderValue = ServiceConnectTestTrafficRulesHeaderValue;
  static ServiceConnectTlsCertificateAuthority = ServiceConnectTlsCertificateAuthority;
  static ServiceConnectTlsConfiguration = ServiceConnectTlsConfiguration;
  static ServiceManagedEBSVolumeConfiguration = ServiceManagedEBSVolumeConfiguration;
  static ServiceRegistry = ServiceRegistry;
  static ServiceVolumeConfiguration = ServiceVolumeConfiguration;
  static TimeoutConfiguration = TimeoutConfiguration;
  static VpcLatticeConfiguration = VpcLatticeConfiguration;
  constructor(properties?: ServiceProperties) {
    super('AWS::ECS::Service', properties || {});
  }
}
