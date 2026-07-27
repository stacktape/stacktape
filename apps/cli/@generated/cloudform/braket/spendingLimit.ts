import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TimePeriod {
  EndAt!: Value<string>;
  StartAt!: Value<string>;
  constructor(properties: TimePeriod) {
    Object.assign(this, properties);
  }
}
export interface SpendingLimitProperties {
  SpendingLimit: Value<string>;
  DeviceArn: Value<string>;
  TimePeriod?: TimePeriod;
  Tags?: List<ResourceTag>;
}
export default class SpendingLimit extends ResourceBase<SpendingLimitProperties> {
  static TimePeriod = TimePeriod;
  constructor(properties: SpendingLimitProperties) {
    super('AWS::Braket::SpendingLimit', properties);
  }
}
