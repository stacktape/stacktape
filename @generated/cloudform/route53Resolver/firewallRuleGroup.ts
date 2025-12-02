import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FirewallRule {
  Qtype?: Value<string>;
  Action!: Value<string>;
  Priority!: Value<number>;
  BlockOverrideDomain?: Value<string>;
  DnsThreatProtection?: Value<string>;
  FirewallDomainListId?: Value<string>;
  FirewallThreatProtectionId?: Value<string>;
  ConfidenceThreshold?: Value<string>;
  BlockResponse?: Value<string>;
  BlockOverrideTtl?: Value<number>;
  BlockOverrideDnsType?: Value<string>;
  FirewallDomainRedirectionAction?: Value<string>;
  constructor(properties: FirewallRule) {
    Object.assign(this, properties);
  }
}
export interface FirewallRuleGroupProperties {
  FirewallRules?: List<FirewallRule>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class FirewallRuleGroup extends ResourceBase<FirewallRuleGroupProperties> {
  static FirewallRule = FirewallRule;
  constructor(properties?: FirewallRuleGroupProperties) {
    super('AWS::Route53Resolver::FirewallRuleGroup', properties || {});
  }
}
