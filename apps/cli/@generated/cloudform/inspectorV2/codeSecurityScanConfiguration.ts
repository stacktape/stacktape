import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CodeSecurityScanConfigurationInner {
  continuousIntegrationScanConfiguration?: ContinuousIntegrationScanConfiguration;
  periodicScanConfiguration?: PeriodicScanConfiguration;
  ruleSetCategories!: List<Value<string>>;
  constructor(properties: CodeSecurityScanConfigurationInner) {
    Object.assign(this, properties);
  }
}

export class ContinuousIntegrationScanConfiguration {
  supportedEvents!: List<Value<string>>;
  constructor(properties: ContinuousIntegrationScanConfiguration) {
    Object.assign(this, properties);
  }
}

export class PeriodicScanConfiguration {
  frequencyExpression?: Value<string>;
  frequency?: Value<string>;
  constructor(properties: PeriodicScanConfiguration) {
    Object.assign(this, properties);
  }
}

export class ScopeSettings {
  projectSelectionScope?: Value<string>;
  constructor(properties: ScopeSettings) {
    Object.assign(this, properties);
  }
}
export interface CodeSecurityScanConfigurationProperties {
  ScopeSettings?: ScopeSettings;
  Configuration?: CodeSecurityScanConfiguration;
  Level?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class CodeSecurityScanConfiguration extends ResourceBase<CodeSecurityScanConfigurationProperties> {
  static CodeSecurityScanConfiguration = CodeSecurityScanConfigurationInner;
  static ContinuousIntegrationScanConfiguration = ContinuousIntegrationScanConfiguration;
  static PeriodicScanConfiguration = PeriodicScanConfiguration;
  static ScopeSettings = ScopeSettings;
  constructor(properties?: CodeSecurityScanConfigurationProperties) {
    super('AWS::InspectorV2::CodeSecurityScanConfiguration', properties || {});
  }
}
