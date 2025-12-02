import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ApacheKafkaCluster {
  Vpc!: Vpc;
  BootstrapServers!: Value<string>;
  constructor(properties: ApacheKafkaCluster) {
    Object.assign(this, properties);
  }
}

export class AutoScaling {
  ScaleOutPolicy!: ScaleOutPolicy;
  ScaleInPolicy!: ScaleInPolicy;
  MaxWorkerCount!: Value<number>;
  MinWorkerCount!: Value<number>;
  McuCount!: Value<number>;
  constructor(properties: AutoScaling) {
    Object.assign(this, properties);
  }
}

export class Capacity {
  ProvisionedCapacity?: ProvisionedCapacity;
  AutoScaling?: AutoScaling;
  constructor(properties: Capacity) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLogsLogDelivery {
  LogGroup?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: CloudWatchLogsLogDelivery) {
    Object.assign(this, properties);
  }
}

export class CustomPlugin {
  CustomPluginArn!: Value<string>;
  Revision!: Value<number>;
  constructor(properties: CustomPlugin) {
    Object.assign(this, properties);
  }
}

export class FirehoseLogDelivery {
  DeliveryStream?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: FirehoseLogDelivery) {
    Object.assign(this, properties);
  }
}

export class KafkaCluster {
  ApacheKafkaCluster!: ApacheKafkaCluster;
  constructor(properties: KafkaCluster) {
    Object.assign(this, properties);
  }
}

export class KafkaClusterClientAuthentication {
  AuthenticationType!: Value<string>;
  constructor(properties: KafkaClusterClientAuthentication) {
    Object.assign(this, properties);
  }
}

export class KafkaClusterEncryptionInTransit {
  EncryptionType!: Value<string>;
  constructor(properties: KafkaClusterEncryptionInTransit) {
    Object.assign(this, properties);
  }
}

export class LogDelivery {
  WorkerLogDelivery!: WorkerLogDelivery;
  constructor(properties: LogDelivery) {
    Object.assign(this, properties);
  }
}

export class Plugin {
  CustomPlugin!: CustomPlugin;
  constructor(properties: Plugin) {
    Object.assign(this, properties);
  }
}

export class ProvisionedCapacity {
  WorkerCount!: Value<number>;
  McuCount?: Value<number>;
  constructor(properties: ProvisionedCapacity) {
    Object.assign(this, properties);
  }
}

export class S3LogDelivery {
  Bucket?: Value<string>;
  Enabled!: Value<boolean>;
  Prefix?: Value<string>;
  constructor(properties: S3LogDelivery) {
    Object.assign(this, properties);
  }
}

export class ScaleInPolicy {
  CpuUtilizationPercentage!: Value<number>;
  constructor(properties: ScaleInPolicy) {
    Object.assign(this, properties);
  }
}

export class ScaleOutPolicy {
  CpuUtilizationPercentage!: Value<number>;
  constructor(properties: ScaleOutPolicy) {
    Object.assign(this, properties);
  }
}

export class Vpc {
  SecurityGroups!: List<Value<string>>;
  Subnets!: List<Value<string>>;
  constructor(properties: Vpc) {
    Object.assign(this, properties);
  }
}

export class WorkerConfiguration {
  Revision!: Value<number>;
  WorkerConfigurationArn!: Value<string>;
  constructor(properties: WorkerConfiguration) {
    Object.assign(this, properties);
  }
}

export class WorkerLogDelivery {
  S3?: S3LogDelivery;
  Firehose?: FirehoseLogDelivery;
  CloudWatchLogs?: CloudWatchLogsLogDelivery;
  constructor(properties: WorkerLogDelivery) {
    Object.assign(this, properties);
  }
}
export interface ConnectorProperties {
  KafkaCluster: KafkaCluster;
  KafkaConnectVersion: Value<string>;
  ConnectorConfiguration: { [key: string]: Value<string> };
  LogDelivery?: LogDelivery;
  WorkerConfiguration?: WorkerConfiguration;
  Capacity: Capacity;
  KafkaClusterEncryptionInTransit: KafkaClusterEncryptionInTransit;
  ConnectorDescription?: Value<string>;
  KafkaClusterClientAuthentication: KafkaClusterClientAuthentication;
  ConnectorName: Value<string>;
  ServiceExecutionRoleArn: Value<string>;
  Tags?: List<ResourceTag>;
  Plugins: List<Plugin>;
}
export default class Connector extends ResourceBase<ConnectorProperties> {
  static ApacheKafkaCluster = ApacheKafkaCluster;
  static AutoScaling = AutoScaling;
  static Capacity = Capacity;
  static CloudWatchLogsLogDelivery = CloudWatchLogsLogDelivery;
  static CustomPlugin = CustomPlugin;
  static FirehoseLogDelivery = FirehoseLogDelivery;
  static KafkaCluster = KafkaCluster;
  static KafkaClusterClientAuthentication = KafkaClusterClientAuthentication;
  static KafkaClusterEncryptionInTransit = KafkaClusterEncryptionInTransit;
  static LogDelivery = LogDelivery;
  static Plugin = Plugin;
  static ProvisionedCapacity = ProvisionedCapacity;
  static S3LogDelivery = S3LogDelivery;
  static ScaleInPolicy = ScaleInPolicy;
  static ScaleOutPolicy = ScaleOutPolicy;
  static Vpc = Vpc;
  static WorkerConfiguration = WorkerConfiguration;
  static WorkerLogDelivery = WorkerLogDelivery;
  constructor(properties: ConnectorProperties) {
    super('AWS::KafkaConnect::Connector', properties);
  }
}
