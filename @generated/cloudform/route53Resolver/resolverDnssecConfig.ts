import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResolverDNSSECConfigProperties {
  ResourceId?: Value<string>;
}
export default class ResolverDNSSECConfig extends ResourceBase<ResolverDNSSECConfigProperties> {
  constructor(properties?: ResolverDNSSECConfigProperties) {
    super('AWS::Route53Resolver::ResolverDNSSECConfig', properties || {});
  }
}
