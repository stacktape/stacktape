import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ScheduledActionProperties {
  MinSize?: Value<number>;
  Recurrence?: Value<string>;
  TimeZone?: Value<string>;
  EndTime?: Value<string>;
  AutoScalingGroupName: Value<string>;
  StartTime?: Value<string>;
  DesiredCapacity?: Value<number>;
  MaxSize?: Value<number>;
}
export default class ScheduledAction extends ResourceBase<ScheduledActionProperties> {
  constructor(properties: ScheduledActionProperties) {
    super('AWS::AutoScaling::ScheduledAction', properties);
  }
}
