import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomEntityConfig {
  CustomDataIdentifiers!: List<Value<string>>;
  constructor(properties: CustomEntityConfig) {
    Object.assign(this, properties);
  }
}

export class LogRedactionConfiguration {
  CustomEntityConfig?: CustomEntityConfig;
  EntitiesToRedact!: List<Value<string>>;
  constructor(properties: LogRedactionConfiguration) {
    Object.assign(this, properties);
  }
}

export class LogsConfigurationPolicy {
  LogType?: Value<string>;
  FilterPattern?: Value<string>;
  AllowedAccountIds!: List<Value<string>>;
  LogRedactionConfiguration?: LogRedactionConfiguration;
  constructor(properties: LogsConfigurationPolicy) {
    Object.assign(this, properties);
  }
}

export class MetricsConfigurationPolicy {
  NoiseLevel!: Value<string>;
  constructor(properties: MetricsConfigurationPolicy) {
    Object.assign(this, properties);
  }
}

export class PrivacyConfiguration {
  Policies!: PrivacyConfigurationPolicies;
  constructor(properties: PrivacyConfiguration) {
    Object.assign(this, properties);
  }
}

export class PrivacyConfigurationPolicies {
  TrainedModelExports?: TrainedModelExportsConfigurationPolicy;
  TrainedModelInferenceJobs?: TrainedModelInferenceJobsConfigurationPolicy;
  TrainedModels?: TrainedModelsConfigurationPolicy;
  constructor(properties: PrivacyConfigurationPolicies) {
    Object.assign(this, properties);
  }
}

export class TrainedModelArtifactMaxSize {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: TrainedModelArtifactMaxSize) {
    Object.assign(this, properties);
  }
}

export class TrainedModelExportsConfigurationPolicy {
  FilesToExport!: List<Value<string>>;
  MaxSize!: TrainedModelExportsMaxSize;
  constructor(properties: TrainedModelExportsConfigurationPolicy) {
    Object.assign(this, properties);
  }
}

export class TrainedModelExportsMaxSize {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: TrainedModelExportsMaxSize) {
    Object.assign(this, properties);
  }
}

export class TrainedModelInferenceJobsConfigurationPolicy {
  MaxOutputSize?: TrainedModelInferenceMaxOutputSize;
  ContainerLogs?: List<LogsConfigurationPolicy>;
  constructor(properties: TrainedModelInferenceJobsConfigurationPolicy) {
    Object.assign(this, properties);
  }
}

export class TrainedModelInferenceMaxOutputSize {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: TrainedModelInferenceMaxOutputSize) {
    Object.assign(this, properties);
  }
}

export class TrainedModelsConfigurationPolicy {
  ContainerLogs?: List<LogsConfigurationPolicy>;
  MaxArtifactSize?: TrainedModelArtifactMaxSize;
  ContainerMetrics?: MetricsConfigurationPolicy;
  constructor(properties: TrainedModelsConfigurationPolicy) {
    Object.assign(this, properties);
  }
}
export interface ConfiguredModelAlgorithmAssociationProperties {
  MembershipIdentifier: Value<string>;
  Description?: Value<string>;
  PrivacyConfiguration?: PrivacyConfiguration;
  ConfiguredModelAlgorithmArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class ConfiguredModelAlgorithmAssociation extends ResourceBase<ConfiguredModelAlgorithmAssociationProperties> {
  static CustomEntityConfig = CustomEntityConfig;
  static LogRedactionConfiguration = LogRedactionConfiguration;
  static LogsConfigurationPolicy = LogsConfigurationPolicy;
  static MetricsConfigurationPolicy = MetricsConfigurationPolicy;
  static PrivacyConfiguration = PrivacyConfiguration;
  static PrivacyConfigurationPolicies = PrivacyConfigurationPolicies;
  static TrainedModelArtifactMaxSize = TrainedModelArtifactMaxSize;
  static TrainedModelExportsConfigurationPolicy = TrainedModelExportsConfigurationPolicy;
  static TrainedModelExportsMaxSize = TrainedModelExportsMaxSize;
  static TrainedModelInferenceJobsConfigurationPolicy = TrainedModelInferenceJobsConfigurationPolicy;
  static TrainedModelInferenceMaxOutputSize = TrainedModelInferenceMaxOutputSize;
  static TrainedModelsConfigurationPolicy = TrainedModelsConfigurationPolicy;
  constructor(properties: ConfiguredModelAlgorithmAssociationProperties) {
    super('AWS::CleanRoomsML::ConfiguredModelAlgorithmAssociation', properties);
  }
}
