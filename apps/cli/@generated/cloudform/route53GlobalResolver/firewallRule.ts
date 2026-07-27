import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface FirewallRuleProperties {
  Action: Value<string>;
  Description?: Value<string>;
  Priority?: Value<number>;
  DnsAdvancedProtection?: Value<string>;
  BlockOverrideTtl?: Value<number>;
  BlockOverrideDnsType?: Value<string>;
  Name: Value<string>;
  BlockOverrideDomain?: Value<string>;
  QType?: Value<string>;
  FirewallDomainListId?: Value<string>;
  ConfidenceThreshold?: Value<string>;
  DnsViewId: Value<string>;
  BlockResponse?: Value<string>;
  ClientToken?: Value<string>;
}
export default class FirewallRule extends ResourceBase<FirewallRuleProperties> {
  constructor(properties: FirewallRuleProperties) {
    super('AWS::Route53GlobalResolver::FirewallRule', properties);
  }
}
