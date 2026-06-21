import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class RepositoryFilter {
  FilterType!: Value<string>;
  Filter!: Value<string>;
  constructor(properties: RepositoryFilter) {
    Object.assign(this, properties);
  }
}

export class Rule {
  RepositoryFilters?: List<RepositoryFilter>;
  SigningProfileArn!: Value<string>;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}
export interface SigningConfigurationProperties {
  Rules: List<Rule>;
}
export default class SigningConfiguration extends ResourceBase<SigningConfigurationProperties> {
  static RepositoryFilter = RepositoryFilter;
  static Rule = Rule;
  constructor(properties: SigningConfigurationProperties) {
    super('AWS::ECR::SigningConfiguration', properties);
  }
}
