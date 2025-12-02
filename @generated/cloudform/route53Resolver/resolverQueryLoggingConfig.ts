import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResolverQueryLoggingConfigProperties {
  DestinationArn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class ResolverQueryLoggingConfig extends ResourceBase<ResolverQueryLoggingConfigProperties> {
  constructor(properties?: ResolverQueryLoggingConfigProperties) {
    super('AWS::Route53Resolver::ResolverQueryLoggingConfig', properties || {});
  }
}
