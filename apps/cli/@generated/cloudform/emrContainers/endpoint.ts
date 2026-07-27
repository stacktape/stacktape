import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Certificate {
  CertificateData?: Value<string>;
  CertificateArn?: Value<string>;
  constructor(properties: Certificate) {
    Object.assign(this, properties);
  }
}

export class CloudWatchMonitoringConfiguration {
  LogStreamNamePrefix?: Value<string>;
  LogGroupName!: Value<string>;
  constructor(properties: CloudWatchMonitoringConfiguration) {
    Object.assign(this, properties);
  }
}

export class ConfigurationOverrides {
  MonitoringConfiguration?: MonitoringConfiguration;
  ApplicationConfiguration?: List<EMREKSConfiguration>;
  constructor(properties: ConfigurationOverrides) {
    Object.assign(this, properties);
  }
}

export class ContainerLogRotationConfiguration {
  MaxFilesToKeep!: Value<number>;
  RotationSize!: Value<string>;
  constructor(properties: ContainerLogRotationConfiguration) {
    Object.assign(this, properties);
  }
}

export class EMREKSConfiguration {
  Properties?: { [key: string]: Value<string> };
  Configurations?: List<EMREKSConfiguration>;
  Classification!: Value<string>;
  constructor(properties: EMREKSConfiguration) {
    Object.assign(this, properties);
  }
}

export class MonitoringConfiguration {
  S3MonitoringConfiguration?: S3MonitoringConfiguration;
  ContainerLogRotationConfiguration?: ContainerLogRotationConfiguration;
  CloudWatchMonitoringConfiguration?: CloudWatchMonitoringConfiguration;
  PersistentAppUI?: Value<string>;
  constructor(properties: MonitoringConfiguration) {
    Object.assign(this, properties);
  }
}

export class S3MonitoringConfiguration {
  LogUri!: Value<string>;
  constructor(properties: S3MonitoringConfiguration) {
    Object.assign(this, properties);
  }
}
export interface EndpointProperties {
  ExecutionRoleArn: Value<string>;
  Type: Value<string>;
  ConfigurationOverrides?: ConfigurationOverrides;
  VirtualClusterId: Value<string>;
  ReleaseLabel: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class Endpoint extends ResourceBase<EndpointProperties> {
  static Certificate = Certificate;
  static CloudWatchMonitoringConfiguration = CloudWatchMonitoringConfiguration;
  static ConfigurationOverrides = ConfigurationOverrides;
  static ContainerLogRotationConfiguration = ContainerLogRotationConfiguration;
  static EMREKSConfiguration = EMREKSConfiguration;
  static MonitoringConfiguration = MonitoringConfiguration;
  static S3MonitoringConfiguration = S3MonitoringConfiguration;
  constructor(properties: EndpointProperties) {
    super('AWS::EMRContainers::Endpoint', properties);
  }
}
