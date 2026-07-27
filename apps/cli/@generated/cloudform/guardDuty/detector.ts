import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CFNDataSourceConfigurations {
  MalwareProtection?: CFNMalwareProtectionConfiguration;
  S3Logs?: CFNS3LogsConfiguration;
  Kubernetes?: CFNKubernetesConfiguration;
  constructor(properties: CFNDataSourceConfigurations) {
    Object.assign(this, properties);
  }
}

export class CFNFeatureAdditionalConfiguration {
  Status?: Value<string>;
  Name?: Value<string>;
  constructor(properties: CFNFeatureAdditionalConfiguration) {
    Object.assign(this, properties);
  }
}

export class CFNFeatureConfiguration {
  Status!: Value<string>;
  AdditionalConfiguration?: List<CFNFeatureAdditionalConfiguration>;
  Name!: Value<string>;
  constructor(properties: CFNFeatureConfiguration) {
    Object.assign(this, properties);
  }
}

export class CFNKubernetesAuditLogsConfiguration {
  Enable!: Value<boolean>;
  constructor(properties: CFNKubernetesAuditLogsConfiguration) {
    Object.assign(this, properties);
  }
}

export class CFNKubernetesConfiguration {
  AuditLogs!: CFNKubernetesAuditLogsConfiguration;
  constructor(properties: CFNKubernetesConfiguration) {
    Object.assign(this, properties);
  }
}

export class CFNMalwareProtectionConfiguration {
  ScanEc2InstanceWithFindings?: CFNScanEc2InstanceWithFindingsConfiguration;
  constructor(properties: CFNMalwareProtectionConfiguration) {
    Object.assign(this, properties);
  }
}

export class CFNS3LogsConfiguration {
  Enable!: Value<boolean>;
  constructor(properties: CFNS3LogsConfiguration) {
    Object.assign(this, properties);
  }
}

export class CFNScanEc2InstanceWithFindingsConfiguration {
  EbsVolumes?: Value<boolean>;
  constructor(properties: CFNScanEc2InstanceWithFindingsConfiguration) {
    Object.assign(this, properties);
  }
}

export class TagItem {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagItem) {
    Object.assign(this, properties);
  }
}
export interface DetectorProperties {
  FindingPublishingFrequency?: Value<string>;
  DataSources?: CFNDataSourceConfigurations;
  Enable: Value<boolean>;
  Features?: List<CFNFeatureConfiguration>;
  Tags?: List<TagItem>;
}
export default class Detector extends ResourceBase<DetectorProperties> {
  static CFNDataSourceConfigurations = CFNDataSourceConfigurations;
  static CFNFeatureAdditionalConfiguration = CFNFeatureAdditionalConfiguration;
  static CFNFeatureConfiguration = CFNFeatureConfiguration;
  static CFNKubernetesAuditLogsConfiguration = CFNKubernetesAuditLogsConfiguration;
  static CFNKubernetesConfiguration = CFNKubernetesConfiguration;
  static CFNMalwareProtectionConfiguration = CFNMalwareProtectionConfiguration;
  static CFNS3LogsConfiguration = CFNS3LogsConfiguration;
  static CFNScanEc2InstanceWithFindingsConfiguration = CFNScanEc2InstanceWithFindingsConfiguration;
  static TagItem = TagItem;
  constructor(properties: DetectorProperties) {
    super('AWS::GuardDuty::Detector', properties);
  }
}
