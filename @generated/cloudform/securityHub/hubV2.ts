import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface HubV2Properties {
  Tags?: { [key: string]: Value<string> };
}
export default class HubV2 extends ResourceBase<HubV2Properties> {
  constructor(properties?: HubV2Properties) {
    super('AWS::SecurityHub::HubV2', properties || {});
  }
}
