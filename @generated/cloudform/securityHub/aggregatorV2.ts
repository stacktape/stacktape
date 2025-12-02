import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface AggregatorV2Properties {
  RegionLinkingMode: Value<string>;
  LinkedRegions: List<Value<string>>;
  Tags?: { [key: string]: Value<string> };
}
export default class AggregatorV2 extends ResourceBase<AggregatorV2Properties> {
  constructor(properties: AggregatorV2Properties) {
    super('AWS::SecurityHub::AggregatorV2', properties);
  }
}
