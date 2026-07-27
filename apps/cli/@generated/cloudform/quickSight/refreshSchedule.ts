import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class RefreshOnDay {
  DayOfWeek?: Value<string>;
  DayOfMonth?: Value<string>;
  constructor(properties: RefreshOnDay) {
    Object.assign(this, properties);
  }
}

export class RefreshScheduleMap {
  StartAfterDateTime?: Value<string>;
  ScheduleId?: Value<string>;
  ScheduleFrequency?: ScheduleFrequency;
  RefreshType?: Value<string>;
  constructor(properties: RefreshScheduleMap) {
    Object.assign(this, properties);
  }
}

export class ScheduleFrequency {
  TimeZone?: Value<string>;
  RefreshOnDay?: RefreshOnDay;
  TimeOfTheDay?: Value<string>;
  Interval?: Value<string>;
  constructor(properties: ScheduleFrequency) {
    Object.assign(this, properties);
  }
}
export interface RefreshScheduleProperties {
  Schedule?: RefreshScheduleMap;
  AwsAccountId?: Value<string>;
  DataSetId?: Value<string>;
}
export default class RefreshSchedule extends ResourceBase<RefreshScheduleProperties> {
  static RefreshOnDay = RefreshOnDay;
  static RefreshScheduleMap = RefreshScheduleMap;
  static ScheduleFrequency = ScheduleFrequency;
  constructor(properties?: RefreshScheduleProperties) {
    super('AWS::QuickSight::RefreshSchedule', properties || {});
  }
}
