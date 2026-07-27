import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccountAggregationSource {
  AllAwsRegions?: Value<boolean>;
  AwsRegions?: List<Value<string>>;
  AccountIds!: List<Value<string>>;
  constructor(properties: AccountAggregationSource) {
    Object.assign(this, properties);
  }
}

export class OrganizationAggregationSource {
  AllAwsRegions?: Value<boolean>;
  AwsRegions?: List<Value<string>>;
  RoleArn!: Value<string>;
  constructor(properties: OrganizationAggregationSource) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationAggregatorProperties {
  AccountAggregationSources?: List<AccountAggregationSource>;
  ConfigurationAggregatorName?: Value<string>;
  OrganizationAggregationSource?: OrganizationAggregationSource;
  Tags?: List<ResourceTag>;
}
export default class ConfigurationAggregator extends ResourceBase<ConfigurationAggregatorProperties> {
  static AccountAggregationSource = AccountAggregationSource;
  static OrganizationAggregationSource = OrganizationAggregationSource;
  constructor(properties?: ConfigurationAggregatorProperties) {
    super('AWS::Config::ConfigurationAggregator', properties || {});
  }
}
