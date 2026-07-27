import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FirewallAdvancedContentCategoryConfig {
  Category!: Value<string>;
  constructor(properties: FirewallAdvancedContentCategoryConfig) {
    Object.assign(this, properties);
  }
}

export class FirewallAdvancedThreatCategoryConfig {
  Category!: Value<string>;
  constructor(properties: FirewallAdvancedThreatCategoryConfig) {
    Object.assign(this, properties);
  }
}

export class FirewallRule {
  Qtype?: Value<string>;
  Action!: Value<string>;
  Priority!: Value<number>;
  BlockOverrideTtl?: Value<number>;
  BlockOverrideDnsType?: Value<string>;
  BlockOverrideDomain?: Value<string>;
  DnsThreatProtection?: Value<string>;
  FirewallDomainListId?: Value<string>;
  FirewallThreatProtectionId?: Value<string>;
  ConfidenceThreshold?: Value<string>;
  BlockResponse?: Value<string>;
  FirewallRuleType?: FirewallRuleType;
  FirewallDomainRedirectionAction?: Value<string>;
  constructor(properties: FirewallRule) {
    Object.assign(this, properties);
  }
}

export class FirewallRuleType {
  FirewallAdvancedThreatCategory?: FirewallAdvancedThreatCategoryConfig;
  FirewallAdvancedContentCategory?: FirewallAdvancedContentCategoryConfig;
  constructor(properties: FirewallRuleType) {
    Object.assign(this, properties);
  }
}
export interface FirewallRuleGroupProperties {
  FirewallRules?: List<FirewallRule>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class FirewallRuleGroup extends ResourceBase<FirewallRuleGroupProperties> {
  static FirewallAdvancedContentCategoryConfig = FirewallAdvancedContentCategoryConfig;
  static FirewallAdvancedThreatCategoryConfig = FirewallAdvancedThreatCategoryConfig;
  static FirewallRule = FirewallRule;
  static FirewallRuleType = FirewallRuleType;
  constructor(properties?: FirewallRuleGroupProperties) {
    super('AWS::Route53Resolver::FirewallRuleGroup', properties || {});
  }
}
