import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoStartConfiguration {
  Enabled?: Value<boolean>;
  constructor(properties: AutoStartConfiguration) {
    Object.assign(this, properties);
  }
}

export class AutoStopConfiguration {
  Enabled?: Value<boolean>;
  IdleTimeoutMinutes?: Value<number>;
  constructor(properties: AutoStopConfiguration) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLoggingConfiguration {
  EncryptionKeyArn?: Value<string>;
  Enabled?: Value<boolean>;
  LogStreamNamePrefix?: Value<string>;
  LogGroupName?: Value<string>;
  LogTypeMap?: List<LogTypeMapKeyValuePair>;
  constructor(properties: CloudWatchLoggingConfiguration) {
    Object.assign(this, properties);
  }
}

export class ConfigurationObject {
  Classification!: Value<string>;
  Properties?: { [key: string]: Value<string> };
  Configurations?: List<ConfigurationObject>;
  constructor(properties: ConfigurationObject) {
    Object.assign(this, properties);
  }
}

export class IdentityCenterConfiguration {
  IdentityCenterInstanceArn?: Value<string>;
  constructor(properties: IdentityCenterConfiguration) {
    Object.assign(this, properties);
  }
}

export class ImageConfigurationInput {
  ImageUri?: Value<string>;
  constructor(properties: ImageConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class InitialCapacityConfig {
  WorkerConfiguration!: WorkerConfiguration;
  WorkerCount!: Value<number>;
  constructor(properties: InitialCapacityConfig) {
    Object.assign(this, properties);
  }
}

export class InitialCapacityConfigKeyValuePair {
  Value!: InitialCapacityConfig;
  Key!: Value<string>;
  constructor(properties: InitialCapacityConfigKeyValuePair) {
    Object.assign(this, properties);
  }
}

export class InteractiveConfiguration {
  StudioEnabled?: Value<boolean>;
  LivyEndpointEnabled?: Value<boolean>;
  constructor(properties: InteractiveConfiguration) {
    Object.assign(this, properties);
  }
}

export class LogTypeMapKeyValuePair {
  Value!: List<Value<string>>;
  Key!: Value<string>;
  constructor(properties: LogTypeMapKeyValuePair) {
    Object.assign(this, properties);
  }
}

export class ManagedPersistenceMonitoringConfiguration {
  EncryptionKeyArn?: Value<string>;
  Enabled?: Value<boolean>;
  constructor(properties: ManagedPersistenceMonitoringConfiguration) {
    Object.assign(this, properties);
  }
}

export class MaximumAllowedResources {
  Memory!: Value<string>;
  Cpu!: Value<string>;
  Disk?: Value<string>;
  constructor(properties: MaximumAllowedResources) {
    Object.assign(this, properties);
  }
}

export class MonitoringConfiguration {
  S3MonitoringConfiguration?: S3MonitoringConfiguration;
  PrometheusMonitoringConfiguration?: PrometheusMonitoringConfiguration;
  ManagedPersistenceMonitoringConfiguration?: ManagedPersistenceMonitoringConfiguration;
  CloudWatchLoggingConfiguration?: CloudWatchLoggingConfiguration;
  constructor(properties: MonitoringConfiguration) {
    Object.assign(this, properties);
  }
}

export class NetworkConfiguration {
  SubnetIds?: List<Value<string>>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: NetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class PrometheusMonitoringConfiguration {
  RemoteWriteUrl?: Value<string>;
  constructor(properties: PrometheusMonitoringConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3MonitoringConfiguration {
  LogUri?: Value<string>;
  EncryptionKeyArn?: Value<string>;
  constructor(properties: S3MonitoringConfiguration) {
    Object.assign(this, properties);
  }
}

export class SchedulerConfiguration {
  QueueTimeoutMinutes?: Value<number>;
  MaxConcurrentRuns?: Value<number>;
  constructor(properties: SchedulerConfiguration) {
    Object.assign(this, properties);
  }
}

export class WorkerConfiguration {
  DiskType?: Value<string>;
  Memory!: Value<string>;
  Cpu!: Value<string>;
  Disk?: Value<string>;
  constructor(properties: WorkerConfiguration) {
    Object.assign(this, properties);
  }
}

export class WorkerTypeSpecificationInput {
  ImageConfiguration?: ImageConfigurationInput;
  constructor(properties: WorkerTypeSpecificationInput) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  AutoStartConfiguration?: AutoStartConfiguration;
  Architecture?: Value<string>;
  WorkerTypeSpecifications?: { [key: string]: WorkerTypeSpecificationInput };
  MonitoringConfiguration?: MonitoringConfiguration;
  MaximumCapacity?: MaximumAllowedResources;
  AutoStopConfiguration?: AutoStopConfiguration;
  RuntimeConfiguration?: List<ConfigurationObject>;
  Name?: Value<string>;
  Type: Value<string>;
  SchedulerConfiguration?: SchedulerConfiguration;
  InitialCapacity?: List<InitialCapacityConfigKeyValuePair>;
  InteractiveConfiguration?: InteractiveConfiguration;
  ImageConfiguration?: ImageConfigurationInput;
  NetworkConfiguration?: NetworkConfiguration;
  ReleaseLabel: Value<string>;
  IdentityCenterConfiguration?: IdentityCenterConfiguration;
  Tags?: List<ResourceTag>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static AutoStartConfiguration = AutoStartConfiguration;
  static AutoStopConfiguration = AutoStopConfiguration;
  static CloudWatchLoggingConfiguration = CloudWatchLoggingConfiguration;
  static ConfigurationObject = ConfigurationObject;
  static IdentityCenterConfiguration = IdentityCenterConfiguration;
  static ImageConfigurationInput = ImageConfigurationInput;
  static InitialCapacityConfig = InitialCapacityConfig;
  static InitialCapacityConfigKeyValuePair = InitialCapacityConfigKeyValuePair;
  static InteractiveConfiguration = InteractiveConfiguration;
  static LogTypeMapKeyValuePair = LogTypeMapKeyValuePair;
  static ManagedPersistenceMonitoringConfiguration = ManagedPersistenceMonitoringConfiguration;
  static MaximumAllowedResources = MaximumAllowedResources;
  static MonitoringConfiguration = MonitoringConfiguration;
  static NetworkConfiguration = NetworkConfiguration;
  static PrometheusMonitoringConfiguration = PrometheusMonitoringConfiguration;
  static S3MonitoringConfiguration = S3MonitoringConfiguration;
  static SchedulerConfiguration = SchedulerConfiguration;
  static WorkerConfiguration = WorkerConfiguration;
  static WorkerTypeSpecificationInput = WorkerTypeSpecificationInput;
  constructor(properties: ApplicationProperties) {
    super('AWS::EMRServerless::Application', properties);
  }
}
