import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface GlobalResolverProperties {
  IpAddressType?: Value<string>;
  Description?: Value<string>;
  ObservabilityRegion?: Value<string>;
  Regions: List<Value<string>>;
  ClientToken?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class GlobalResolver extends ResourceBase<GlobalResolverProperties> {
  constructor(properties: GlobalResolverProperties) {
    super('AWS::Route53GlobalResolver::GlobalResolver', properties);
  }
}
