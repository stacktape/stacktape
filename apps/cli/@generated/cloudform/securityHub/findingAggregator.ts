import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface FindingAggregatorProperties {
  RegionLinkingMode: Value<string>;
  Regions?: List<Value<string>>;
}
export default class FindingAggregator extends ResourceBase<FindingAggregatorProperties> {
  constructor(properties: FindingAggregatorProperties) {
    super('AWS::SecurityHub::FindingAggregator', properties);
  }
}
