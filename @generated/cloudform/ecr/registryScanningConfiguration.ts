import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class RepositoryFilter {
  FilterType!: Value<string>;
  Filter!: Value<string>;
  constructor(properties: RepositoryFilter) {
    Object.assign(this, properties);
  }
}

export class ScanningRule {
  RepositoryFilters!: List<RepositoryFilter>;
  ScanFrequency!: Value<string>;
  constructor(properties: ScanningRule) {
    Object.assign(this, properties);
  }
}
export interface RegistryScanningConfigurationProperties {
  ScanType: Value<string>;
  Rules: List<ScanningRule>;
}
export default class RegistryScanningConfiguration extends ResourceBase<RegistryScanningConfigurationProperties> {
  static RepositoryFilter = RepositoryFilter;
  static ScanningRule = ScanningRule;
  constructor(properties: RegistryScanningConfigurationProperties) {
    super('AWS::ECR::RegistryScanningConfiguration', properties);
  }
}
