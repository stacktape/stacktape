import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ParameterGroupProperties {
  Description: Value<string>;
  Properties?: { [key: string]: Value<string> };
  Tags?: List<ResourceTag>;
  CacheParameterGroupFamily: Value<string>;
}
export default class ParameterGroup extends ResourceBase<ParameterGroupProperties> {
  constructor(properties: ParameterGroupProperties) {
    super('AWS::ElastiCache::ParameterGroup', properties);
  }
}
