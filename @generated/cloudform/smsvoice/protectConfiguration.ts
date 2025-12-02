import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CountryRule {
  ProtectStatus!: Value<string>;
  CountryCode!: Value<string>;
  constructor(properties: CountryRule) {
    Object.assign(this, properties);
  }
}

export class CountryRuleSet {
  VOICE?: List<CountryRule>;
  MMS?: List<CountryRule>;
  SMS?: List<CountryRule>;
  constructor(properties: CountryRuleSet) {
    Object.assign(this, properties);
  }
}
export interface ProtectConfigurationProperties {
  CountryRuleSet?: CountryRuleSet;
  DeletionProtectionEnabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
}
export default class ProtectConfiguration extends ResourceBase<ProtectConfigurationProperties> {
  static CountryRule = CountryRule;
  static CountryRuleSet = CountryRuleSet;
  constructor(properties?: ProtectConfigurationProperties) {
    super('AWS::SMSVOICE::ProtectConfiguration', properties || {});
  }
}
