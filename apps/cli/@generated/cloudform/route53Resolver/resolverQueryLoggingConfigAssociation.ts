import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResolverQueryLoggingConfigAssociationProperties {
  ResourceId?: Value<string>;
  ResolverQueryLogConfigId?: Value<string>;
}
export default class ResolverQueryLoggingConfigAssociation extends ResourceBase<ResolverQueryLoggingConfigAssociationProperties> {
  constructor(properties?: ResolverQueryLoggingConfigAssociationProperties) {
    super('AWS::Route53Resolver::ResolverQueryLoggingConfigAssociation', properties || {});
  }
}
