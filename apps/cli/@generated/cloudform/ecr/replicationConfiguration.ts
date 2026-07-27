import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ReplicationConfigurationInner {
  Rules!: List<ReplicationRule>;
  constructor(properties: ReplicationConfigurationInner) {
    Object.assign(this, properties);
  }
}

export class ReplicationDestination {
  Region!: Value<string>;
  RegistryId!: Value<string>;
  constructor(properties: ReplicationDestination) {
    Object.assign(this, properties);
  }
}

export class ReplicationRule {
  RepositoryFilters?: List<RepositoryFilter>;
  Destinations!: List<ReplicationDestination>;
  constructor(properties: ReplicationRule) {
    Object.assign(this, properties);
  }
}

export class RepositoryFilter {
  FilterType!: Value<string>;
  Filter!: Value<string>;
  constructor(properties: RepositoryFilter) {
    Object.assign(this, properties);
  }
}
export interface ReplicationConfigurationProperties {
  ReplicationConfiguration: ReplicationConfiguration;
}
export default class ReplicationConfiguration extends ResourceBase<ReplicationConfigurationProperties> {
  static ReplicationConfiguration = ReplicationConfigurationInner;
  static ReplicationDestination = ReplicationDestination;
  static ReplicationRule = ReplicationRule;
  static RepositoryFilter = RepositoryFilter;
  constructor(properties: ReplicationConfigurationProperties) {
    super('AWS::ECR::ReplicationConfiguration', properties);
  }
}
