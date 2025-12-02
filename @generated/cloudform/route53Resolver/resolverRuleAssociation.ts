import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResolverRuleAssociationProperties {
  VPCId: Value<string>;
  ResolverRuleId: Value<string>;
  Name?: Value<string>;
}
export default class ResolverRuleAssociation extends ResourceBase<ResolverRuleAssociationProperties> {
  constructor(properties: ResolverRuleAssociationProperties) {
    super('AWS::Route53Resolver::ResolverRuleAssociation', properties);
  }
}
